#!/bin/bash

# Augment MCP Server Installation Script
# This script helps install and configure the MCP server on Linux/macOS systems

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_INSTALL_DIR="/opt/mcp-server"
DEFAULT_USER="mcp"
SERVICE_NAME="mcp-server"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
    
    log_success "Requirements check passed"
}

install_server() {
    local install_dir=${1:-$DEFAULT_INSTALL_DIR}
    
    log_info "Installing MCP server to $install_dir..."
    
    # Create installation directory
    sudo mkdir -p "$install_dir"
    
    # Copy files
    sudo cp -r . "$install_dir/"
    cd "$install_dir"
    
    # Install dependencies
    log_info "Installing dependencies..."
    sudo npm install --production
    
    # Build the project
    log_info "Building the project..."
    sudo npm run build
    
    # Set permissions
    sudo chown -R root:root "$install_dir"
    sudo chmod +x "$install_dir/build/server/index.js"
    
    log_success "Server installed successfully"
}

create_user() {
    local username=${1:-$DEFAULT_USER}
    
    if id "$username" &>/dev/null; then
        log_info "User $username already exists"
    else
        log_info "Creating user $username..."
        sudo useradd -r -s /bin/false -d /nonexistent "$username"
        log_success "User $username created"
    fi
}

setup_systemd_service() {
    local install_dir=${1:-$DEFAULT_INSTALL_DIR}
    local username=${2:-$DEFAULT_USER}
    
    log_info "Setting up systemd service..."
    
    # Create service file
    sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Augment MCP Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=$username
Group=$username
WorkingDirectory=$install_dir
ExecStart=/usr/bin/node $install_dir/build/server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=LOG_LEVEL=info
Environment=LOG_FILE=/var/log/$SERVICE_NAME/$SERVICE_NAME.log

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF

    # Create log directory
    sudo mkdir -p "/var/log/$SERVICE_NAME"
    sudo chown "$username:$username" "/var/log/$SERVICE_NAME"
    
    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    
    log_success "Systemd service configured"
}

setup_environment() {
    local install_dir=${1:-$DEFAULT_INSTALL_DIR}
    
    log_info "Setting up environment configuration..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f "$install_dir/.env" ]; then
        sudo cp "$install_dir/.env" "$install_dir/.env.production"
        
        # Set production defaults
        sudo tee "$install_dir/.env" > /dev/null <<EOF
NODE_ENV=production
LOG_LEVEL=info
LOG_FILE=/var/log/$SERVICE_NAME/$SERVICE_NAME.log
MAX_FILE_SIZE=52428800
CACHE_ENABLED=true
RATE_LIMITING_ENABLED=true
FEATURE_FILE_OPERATIONS=true
FEATURE_SYSTEM_INFO=true
AUGMENT_ENABLED=false
EOF
        
        log_success "Environment configuration created"
    else
        log_info "Environment file already exists"
    fi
}

configure_claude_desktop() {
    local install_dir=${1:-$DEFAULT_INSTALL_DIR}
    
    log_info "Generating Claude Desktop configuration..."
    
    cat > claude_desktop_config.json <<EOF
{
  "mcpServers": {
    "augment-mcp-server": {
      "command": "node",
      "args": ["$install_dir/build/server/index.js"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
EOF
    
    log_success "Claude Desktop configuration saved to claude_desktop_config.json"
    log_info "Copy this configuration to your Claude Desktop config file:"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log_info "  macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_info "  Linux: ~/.config/Claude/claude_desktop_config.json"
    fi
}

test_installation() {
    local install_dir=${1:-$DEFAULT_INSTALL_DIR}
    
    log_info "Testing installation..."
    
    # Test basic functionality
    cd "$install_dir"
    if sudo -u root node test-basic.js; then
        log_success "Basic functionality test passed"
    else
        log_error "Basic functionality test failed"
        return 1
    fi
    
    # Test service start
    if sudo systemctl start "$SERVICE_NAME"; then
        sleep 2
        if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
            log_success "Service started successfully"
            sudo systemctl stop "$SERVICE_NAME"
        else
            log_error "Service failed to start"
            return 1
        fi
    else
        log_error "Failed to start service"
        return 1
    fi
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --dir DIR        Installation directory (default: $DEFAULT_INSTALL_DIR)"
    echo "  -u, --user USER      Service user (default: $DEFAULT_USER)"
    echo "  -s, --service        Install as systemd service"
    echo "  -t, --test           Run tests after installation"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Basic installation"
    echo "  $0 -s                        # Install with systemd service"
    echo "  $0 -d /home/user/mcp-server  # Custom installation directory"
    echo "  $0 -s -t                     # Install service and run tests"
}

# Main installation function
main() {
    local install_dir="$DEFAULT_INSTALL_DIR"
    local username="$DEFAULT_USER"
    local install_service=false
    local run_tests=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--dir)
                install_dir="$2"
                shift 2
                ;;
            -u|--user)
                username="$2"
                shift 2
                ;;
            -s|--service)
                install_service=true
                shift
                ;;
            -t|--test)
                run_tests=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    log_info "Starting MCP Server installation..."
    log_info "Installation directory: $install_dir"
    log_info "Service user: $username"
    
    # Check if running as root for system installation
    if [[ $EUID -ne 0 ]] && [[ "$install_dir" == "/opt/"* || "$install_service" == true ]]; then
        log_error "This script must be run as root for system installation"
        log_info "Try: sudo $0 $*"
        exit 1
    fi
    
    # Run installation steps
    check_requirements
    install_server "$install_dir"
    setup_environment "$install_dir"
    
    if [ "$install_service" = true ]; then
        create_user "$username"
        setup_systemd_service "$install_dir" "$username"
    fi
    
    configure_claude_desktop "$install_dir"
    
    if [ "$run_tests" = true ]; then
        test_installation "$install_dir"
    fi
    
    log_success "Installation completed successfully!"
    echo ""
    log_info "Next steps:"
    echo "1. Copy claude_desktop_config.json to your Claude Desktop configuration"
    echo "2. Restart Claude Desktop"
    
    if [ "$install_service" = true ]; then
        echo "3. Start the service: sudo systemctl start $SERVICE_NAME"
        echo "4. Check service status: sudo systemctl status $SERVICE_NAME"
    else
        echo "3. Start the server: cd $install_dir && npm start"
    fi
    
    echo ""
    log_info "For more information, see DEPLOYMENT.md"
}

# Run main function with all arguments
main "$@"
