#!/bin/bash

# GitHub Setup Script for Augment MCP Server
# This script helps you prepare and push your MCP server to GitHub

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# Check if git is installed
check_git() {
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi
    log_success "Git is available"
}

# Check if this is already a git repository
check_git_repo() {
    if [ -d ".git" ]; then
        log_info "This is already a Git repository"
        return 0
    else
        log_info "Initializing Git repository..."
        git init
        return 1
    fi
}

# Build and test the project
build_and_test() {
    log_info "Building and testing the project..."
    
    # Install dependencies
    npm install
    
    # Build the project
    npm run build
    
    # Run tests
    if npm test; then
        log_success "Build and tests completed successfully"
    else
        log_warning "Tests failed, but continuing with setup"
    fi
}

# Prepare files for GitHub
prepare_files() {
    log_info "Preparing files for GitHub..."
    
    # Ensure .env is not committed (it should be in .gitignore)
    if [ -f ".env" ] && ! grep -q "^\.env$" .gitignore; then
        echo ".env" >> .gitignore
        log_info "Added .env to .gitignore"
    fi
    
    # Create .env.example if it doesn't exist
    if [ ! -f ".env.example" ] && [ -f ".env" ]; then
        cp .env .env.example
        log_info "Created .env.example from .env"
    fi
    
    log_success "Files prepared for GitHub"
}

# Get repository information from user
get_repo_info() {
    echo ""
    log_info "GitHub Repository Setup"
    echo "Please provide the following information:"
    
    # Get GitHub username
    read -p "Enter your GitHub username: " GITHUB_USERNAME
    if [ -z "$GITHUB_USERNAME" ]; then
        log_error "GitHub username is required"
        exit 1
    fi
    
    # Get repository name
    read -p "Enter repository name (default: augment-mcp-server): " REPO_NAME
    REPO_NAME=${REPO_NAME:-augment-mcp-server}
    
    # Construct repository URL
    REPO_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
    
    echo ""
    log_info "Repository URL: $REPO_URL"
    
    # Confirm
    read -p "Is this correct? (y/N): " CONFIRM
    if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
        log_info "Setup cancelled"
        exit 0
    fi
}

# Add and commit files
commit_files() {
    log_info "Adding and committing files..."
    
    # Add all files
    git add .
    
    # Check if there are changes to commit
    if git diff --staged --quiet; then
        log_warning "No changes to commit"
        return 0
    fi
    
    # Get commit message
    read -p "Enter commit message (default: Initial commit: Augment MCP Server): " COMMIT_MSG
    COMMIT_MSG=${COMMIT_MSG:-"Initial commit: Augment MCP Server"}
    
    # Commit
    git commit -m "$COMMIT_MSG"
    log_success "Files committed successfully"
}

# Set up remote and push
setup_remote_and_push() {
    log_info "Setting up remote repository and pushing..."
    
    # Check if remote already exists
    if git remote get-url origin &> /dev/null; then
        log_info "Remote 'origin' already exists"
        EXISTING_URL=$(git remote get-url origin)
        log_info "Current remote URL: $EXISTING_URL"
        
        read -p "Do you want to update the remote URL? (y/N): " UPDATE_REMOTE
        if [[ $UPDATE_REMOTE =~ ^[Yy]$ ]]; then
            git remote set-url origin "$REPO_URL"
            log_info "Remote URL updated"
        fi
    else
        # Add remote
        git remote add origin "$REPO_URL"
        log_info "Remote 'origin' added"
    fi
    
    # Set main branch
    git branch -M main
    
    # Push to GitHub
    log_info "Pushing to GitHub..."
    echo ""
    log_warning "You may be prompted for your GitHub credentials"
    log_info "If you have 2FA enabled, use a Personal Access Token instead of password"
    echo ""
    
    if git push -u origin main; then
        log_success "Successfully pushed to GitHub!"
    else
        log_error "Failed to push to GitHub"
        log_info "Please check:"
        log_info "1. Repository exists on GitHub: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
        log_info "2. You have push access to the repository"
        log_info "3. Your GitHub credentials are correct"
        exit 1
    fi
}

# Generate GitHub instructions
generate_instructions() {
    log_info "Generating user instructions..."
    
    cat > GITHUB_INSTRUCTIONS.md <<EOF
# 🚀 Augment MCP Server

**Repository**: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}

## Quick Install for Users

### Linux/macOS
\`\`\`bash
git clone https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git
cd ${REPO_NAME}
sudo ./install.sh -s -t
\`\`\`

### Windows (PowerShell as Administrator)
\`\`\`powershell
git clone https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git
cd ${REPO_NAME}
.\\install.ps1 -Service -Test
\`\`\`

### Claude Desktop Configuration
Add this to your Claude Desktop config file:

\`\`\`json
{
  "mcpServers": {
    "augment-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/${REPO_NAME}/build/server/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
\`\`\`

**Config file locations:**
- macOS: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
- Windows: \`%APPDATA%\\Claude\\claude_desktop_config.json\`
- Linux: \`~/.config/Claude/claude_desktop_config.json\`

## One-Line Install

### Linux/macOS
\`\`\`bash
curl -sSL https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/install.sh | sudo bash -s -- -s -t
\`\`\`

### Windows
\`\`\`powershell
iwr -useb https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/install.ps1 | iex
\`\`\`

## Features
- File operations (read, write, copy, move, delete)
- System information and process management
- Advanced search with regex support
- AI-powered code analysis
- Cross-platform support (Linux, macOS, Windows)
- Easy installation and configuration

For detailed documentation, see the repository files.
EOF

    log_success "Instructions saved to GITHUB_INSTRUCTIONS.md"
}

# Main function
main() {
    echo "🚀 GitHub Setup for Augment MCP Server"
    echo "======================================"
    
    check_git
    check_git_repo
    build_and_test
    prepare_files
    get_repo_info
    commit_files
    setup_remote_and_push
    generate_instructions
    
    echo ""
    log_success "🎉 GitHub setup completed successfully!"
    echo ""
    log_info "Your MCP server is now available at:"
    log_info "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
    echo ""
    log_info "Next steps:"
    echo "1. Create a release on GitHub with distribution packages"
    echo "2. Share the repository link with others"
    echo "3. Users can install with the commands in GITHUB_INSTRUCTIONS.md"
    echo ""
    log_info "To create distribution packages, run:"
    log_info "./package-for-distribution.sh"
}

# Run main function
main "$@"
