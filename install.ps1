# Augment MCP Server Installation Script for Windows
# Run this script in PowerShell as Administrator

param(
    [string]$InstallDir = "C:\Program Files\MCP-Server",
    [switch]$Service,
    [switch]$Test,
    [switch]$Help
)

# Colors for output
$Colors = @{
    Info = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
}

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] " -NoNewline
    Write-Host "[$Level] " -ForegroundColor $Colors[$Level] -NoNewline
    Write-Host $Message
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-Requirements {
    Write-Log "Checking system requirements..." "Info"
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        
        if ($versionNumber -lt 18) {
            Write-Log "Node.js version 18+ is required. Current version: $nodeVersion" "Error"
            exit 1
        }
        
        Write-Log "Node.js version: $nodeVersion" "Success"
    }
    catch {
        Write-Log "Node.js is not installed. Please install Node.js 18+ first." "Error"
        Write-Log "Download from: https://nodejs.org/" "Info"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Log "npm version: $npmVersion" "Success"
    }
    catch {
        Write-Log "npm is not installed." "Error"
        exit 1
    }
    
    Write-Log "Requirements check passed" "Success"
}

function Install-Server {
    param([string]$InstallPath)
    
    Write-Log "Installing MCP server to $InstallPath..." "Info"
    
    # Create installation directory
    if (!(Test-Path $InstallPath)) {
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    }
    
    # Copy files
    Write-Log "Copying files..." "Info"
    Copy-Item -Path ".\*" -Destination $InstallPath -Recurse -Force -Exclude @(".git", "node_modules", "build")
    
    Set-Location $InstallPath
    
    # Install dependencies
    Write-Log "Installing dependencies..." "Info"
    npm install --production
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to install dependencies" "Error"
        exit 1
    }
    
    # Build the project
    Write-Log "Building the project..." "Info"
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to build project" "Error"
        exit 1
    }
    
    Write-Log "Server installed successfully" "Success"
}

function Setup-Environment {
    param([string]$InstallPath)
    
    Write-Log "Setting up environment configuration..." "Info"
    
    $envFile = Join-Path $InstallPath ".env"
    
    if (!(Test-Path $envFile)) {
        $envContent = @"
NODE_ENV=production
LOG_LEVEL=info
MAX_FILE_SIZE=52428800
CACHE_ENABLED=true
RATE_LIMITING_ENABLED=true
FEATURE_FILE_OPERATIONS=true
FEATURE_SYSTEM_INFO=true
AUGMENT_ENABLED=false
"@
        
        Set-Content -Path $envFile -Value $envContent
        Write-Log "Environment configuration created" "Success"
    }
    else {
        Write-Log "Environment file already exists" "Info"
    }
}

function Setup-WindowsService {
    param([string]$InstallPath)
    
    Write-Log "Setting up Windows service..." "Info"
    
    # Check if NSSM is available
    if (!(Get-Command "nssm" -ErrorAction SilentlyContinue)) {
        Write-Log "NSSM (Non-Sucking Service Manager) is required for Windows service installation" "Warning"
        Write-Log "Please install NSSM from: https://nssm.cc/download" "Info"
        Write-Log "Or use Chocolatey: choco install nssm" "Info"
        return
    }
    
    $serviceName = "AugmentMCPServer"
    $nodeExe = (Get-Command node).Source
    $serverScript = Join-Path $InstallPath "build\server\index.js"
    
    # Remove existing service if it exists
    $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Log "Removing existing service..." "Info"
        nssm remove $serviceName confirm
    }
    
    # Install new service
    nssm install $serviceName $nodeExe $serverScript
    nssm set $serviceName AppDirectory $InstallPath
    nssm set $serviceName AppEnvironmentExtra "NODE_ENV=production"
    nssm set $serviceName Description "Augment MCP Server for Claude Desktop integration"
    nssm set $serviceName Start SERVICE_AUTO_START
    
    Write-Log "Windows service configured" "Success"
    Write-Log "Service name: $serviceName" "Info"
}

function New-ClaudeDesktopConfig {
    param([string]$InstallPath)
    
    Write-Log "Generating Claude Desktop configuration..." "Info"
    
    $configPath = "claude_desktop_config.json"
    $serverPath = Join-Path $InstallPath "build\server\index.js"
    $serverPath = $serverPath -replace "\\", "\\"
    
    $config = @{
        mcpServers = @{
            "augment-mcp-server" = @{
                command = "node"
                args = @($serverPath)
                env = @{
                    NODE_ENV = "production"
                    LOG_LEVEL = "info"
                }
            }
        }
    } | ConvertTo-Json -Depth 4
    
    Set-Content -Path $configPath -Value $config
    
    Write-Log "Claude Desktop configuration saved to $configPath" "Success"
    Write-Log "Copy this configuration to your Claude Desktop config file:" "Info"
    Write-Log "  Windows: %APPDATA%\Claude\claude_desktop_config.json" "Info"
}

function Test-Installation {
    param([string]$InstallPath)
    
    Write-Log "Testing installation..." "Info"
    
    Set-Location $InstallPath
    
    # Test basic functionality
    if (Test-Path "test-basic.js") {
        node test-basic.js
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Basic functionality test passed" "Success"
        }
        else {
            Write-Log "Basic functionality test failed" "Error"
            return $false
        }
    }
    else {
        Write-Log "Test script not found, skipping tests" "Warning"
    }
    
    return $true
}

function Show-Usage {
    Write-Host @"
Augment MCP Server Installation Script for Windows

Usage: .\install.ps1 [OPTIONS]

Options:
  -InstallDir DIR    Installation directory (default: C:\Program Files\MCP-Server)
  -Service           Install as Windows service (requires NSSM)
  -Test              Run tests after installation
  -Help              Show this help message

Examples:
  .\install.ps1                                    # Basic installation
  .\install.ps1 -Service                           # Install with Windows service
  .\install.ps1 -InstallDir "C:\MCP-Server"        # Custom installation directory
  .\install.ps1 -Service -Test                     # Install service and run tests

Requirements:
  - PowerShell (Run as Administrator for system installation)
  - Node.js 18+
  - NSSM (for Windows service installation)

"@
}

# Main installation function
function Main {
    if ($Help) {
        Show-Usage
        exit 0
    }
    
    Write-Log "Starting MCP Server installation..." "Info"
    Write-Log "Installation directory: $InstallDir" "Info"
    
    # Check if running as administrator for system installation
    if ($InstallDir.StartsWith("C:\Program Files") -and !(Test-Administrator)) {
        Write-Log "This script must be run as Administrator for system installation" "Error"
        Write-Log "Please run PowerShell as Administrator and try again" "Info"
        exit 1
    }
    
    # Run installation steps
    Test-Requirements
    Install-Server $InstallDir
    Setup-Environment $InstallDir
    
    if ($Service) {
        Setup-WindowsService $InstallDir
    }
    
    New-ClaudeDesktopConfig $InstallDir
    
    if ($Test) {
        Test-Installation $InstallDir
    }
    
    Write-Log "Installation completed successfully!" "Success"
    Write-Host ""
    Write-Log "Next steps:" "Info"
    Write-Host "1. Copy claude_desktop_config.json to your Claude Desktop configuration"
    Write-Host "2. Restart Claude Desktop"
    
    if ($Service) {
        Write-Host "3. Start the service: Start-Service AugmentMCPServer"
        Write-Host "4. Check service status: Get-Service AugmentMCPServer"
    }
    else {
        Write-Host "3. Start the server: cd '$InstallDir' && npm start"
    }
    
    Write-Host ""
    Write-Log "For more information, see DEPLOYMENT.md" "Info"
}

# Run main function
Main
