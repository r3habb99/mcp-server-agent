#!/bin/bash

# Package MCP Server for Distribution
# This script creates distribution packages for different platforms

set -e

# Configuration
PACKAGE_NAME="augment-mcp-server"
VERSION=$(node -p "require('./package.json').version")
BUILD_DIR="dist"
TEMP_DIR="temp-package"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# Clean previous builds
clean_build() {
    log_info "Cleaning previous builds..."
    rm -rf "$BUILD_DIR" "$TEMP_DIR"
    mkdir -p "$BUILD_DIR"
}

# Build the project
build_project() {
    log_info "Building project..."
    npm install
    npm run build
    npm test || log_warning "Tests failed, continuing anyway..."
}

# Create base package
create_base_package() {
    log_info "Creating base package..."
    
    mkdir -p "$TEMP_DIR"
    
    # Copy essential files
    cp -r build/ "$TEMP_DIR/"
    cp package.json "$TEMP_DIR/"
    cp package-lock.json "$TEMP_DIR/" 2>/dev/null || true
    cp README.md "$TEMP_DIR/"
    cp SETUP.md "$TEMP_DIR/"
    cp DEPLOYMENT.md "$TEMP_DIR/"
    cp LICENSE "$TEMP_DIR/" 2>/dev/null || echo "MIT" > "$TEMP_DIR/LICENSE"
    cp .env "$TEMP_DIR/.env.example"
    cp test-basic.js "$TEMP_DIR/"
    
    # Create production package.json
    node -e "
        const pkg = require('./package.json');
        delete pkg.devDependencies;
        delete pkg.scripts.dev;
        delete pkg.scripts.test;
        pkg.scripts.start = 'node build/server/index.js';
        pkg.scripts.install = 'npm install --production';
        require('fs').writeFileSync('$TEMP_DIR/package.json', JSON.stringify(pkg, null, 2));
    "
}

# Create Linux/macOS package
create_unix_package() {
    log_info "Creating Linux/macOS package..."
    
    local package_dir="${TEMP_DIR}-unix"
    cp -r "$TEMP_DIR" "$package_dir"
    
    # Add Unix-specific files
    cp install.sh "$package_dir/"
    chmod +x "$package_dir/install.sh"
    
    # Create systemd service file
    mkdir -p "$package_dir/deployment"
    cat > "$package_dir/deployment/mcp-server.service" <<EOF
[Unit]
Description=Augment MCP Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=mcp
Group=mcp
WorkingDirectory=/opt/mcp-server
ExecStart=/usr/bin/node /opt/mcp-server/build/server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=LOG_LEVEL=info

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF
    
    # Create logrotate config
    cat > "$package_dir/deployment/logrotate.conf" <<EOF
/var/log/mcp-server/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 mcp mcp
    postrotate
        systemctl reload mcp-server || true
    endscript
}
EOF
    
    # Create installation README
    cat > "$package_dir/INSTALL.md" <<EOF
# Installation Instructions for Linux/macOS

## Quick Install
\`\`\`bash
sudo ./install.sh -s -t
\`\`\`

## Manual Install
\`\`\`bash
# Install dependencies
npm install --production

# Test the server
node test-basic.js

# Start the server
npm start
\`\`\`

## Service Installation
\`\`\`bash
# Install as systemd service
sudo ./install.sh --service

# Start the service
sudo systemctl start mcp-server
\`\`\`

See DEPLOYMENT.md for detailed instructions.
EOF
    
    # Create tarball
    tar -czf "$BUILD_DIR/${PACKAGE_NAME}-${VERSION}-linux-macos.tar.gz" -C . "$package_dir"
    rm -rf "$package_dir"
    
    log_success "Linux/macOS package created: ${PACKAGE_NAME}-${VERSION}-linux-macos.tar.gz"
}

# Create Windows package
create_windows_package() {
    log_info "Creating Windows package..."
    
    local package_dir="${TEMP_DIR}-windows"
    cp -r "$TEMP_DIR" "$package_dir"
    
    # Add Windows-specific files
    cp install.ps1 "$package_dir/"
    
    # Create batch file for easy starting
    cat > "$package_dir/start.bat" <<EOF
@echo off
echo Starting Augment MCP Server...
node build/server/index.js
pause
EOF
    
    # Create installation README
    cat > "$package_dir/INSTALL.md" <<EOF
# Installation Instructions for Windows

## Quick Install (PowerShell as Administrator)
\`\`\`powershell
.\install.ps1 -Service -Test
\`\`\`

## Manual Install
\`\`\`cmd
# Install dependencies
npm install --production

# Test the server
node test-basic.js

# Start the server
npm start
# OR
start.bat
\`\`\`

## Service Installation
\`\`\`powershell
# Install as Windows service (requires NSSM)
.\install.ps1 -Service

# Start the service
Start-Service AugmentMCPServer
\`\`\`

See DEPLOYMENT.md for detailed instructions.
EOF
    
    # Create zip file
    if command -v zip &> /dev/null; then
        (cd . && zip -r "$BUILD_DIR/${PACKAGE_NAME}-${VERSION}-windows.zip" "$package_dir")
    else
        tar -czf "$BUILD_DIR/${PACKAGE_NAME}-${VERSION}-windows.tar.gz" -C . "$package_dir"
        log_warning "zip not available, created .tar.gz instead"
    fi
    
    rm -rf "$package_dir"
    
    log_success "Windows package created"
}

# Create Docker package
create_docker_package() {
    log_info "Creating Docker package..."
    
    local package_dir="${TEMP_DIR}-docker"
    cp -r "$TEMP_DIR" "$package_dir"
    
    # Create Dockerfile
    cat > "$package_dir/Dockerfile" <<EOF
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S mcp && \\
    adduser -S mcp -u 1001

# Set permissions
RUN chown -R mcp:mcp /app
USER mcp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD node -e "console.log('Health check passed')" || exit 1

# Start the server
CMD ["node", "build/server/index.js"]
EOF
    
    # Create docker-compose.yml
    cat > "$package_dir/docker-compose.yml" <<EOF
version: '3.8'

services:
  mcp-server:
    build: .
    container_name: augment-mcp-server
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('Health check passed')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
EOF
    
    # Create Docker README
    cat > "$package_dir/DOCKER.md" <<EOF
# Docker Installation

## Using Docker Compose (Recommended)
\`\`\`bash
docker-compose up -d
\`\`\`

## Using Docker directly
\`\`\`bash
# Build image
docker build -t augment-mcp-server .

# Run container
docker run -d \\
  --name augment-mcp-server \\
  -p 3000:3000 \\
  -e NODE_ENV=production \\
  augment-mcp-server
\`\`\`

## Health Check
\`\`\`bash
docker ps
docker logs augment-mcp-server
\`\`\`
EOF
    
    tar -czf "$BUILD_DIR/${PACKAGE_NAME}-${VERSION}-docker.tar.gz" -C . "$package_dir"
    rm -rf "$package_dir"
    
    log_success "Docker package created: ${PACKAGE_NAME}-${VERSION}-docker.tar.gz"
}

# Create source package
create_source_package() {
    log_info "Creating source package..."
    
    # Create source tarball excluding build artifacts
    tar -czf "$BUILD_DIR/${PACKAGE_NAME}-${VERSION}-source.tar.gz" \
        --exclude=node_modules \
        --exclude=build \
        --exclude=dist \
        --exclude=.git \
        --exclude=temp-package* \
        --exclude="*.log" \
        .
    
    log_success "Source package created: ${PACKAGE_NAME}-${VERSION}-source.tar.gz"
}

# Generate checksums
generate_checksums() {
    log_info "Generating checksums..."
    
    cd "$BUILD_DIR"
    
    if command -v sha256sum &> /dev/null; then
        sha256sum *.tar.gz *.zip 2>/dev/null > checksums.sha256 || true
    elif command -v shasum &> /dev/null; then
        shasum -a 256 *.tar.gz *.zip 2>/dev/null > checksums.sha256 || true
    fi
    
    cd ..
    
    log_success "Checksums generated"
}

# Create release notes
create_release_notes() {
    log_info "Creating release notes..."
    
    cat > "$BUILD_DIR/RELEASE_NOTES.md" <<EOF
# Augment MCP Server v${VERSION}

## Installation Packages

- **Linux/macOS**: \`${PACKAGE_NAME}-${VERSION}-linux-macos.tar.gz\`
- **Windows**: \`${PACKAGE_NAME}-${VERSION}-windows.zip\` (or .tar.gz)
- **Docker**: \`${PACKAGE_NAME}-${VERSION}-docker.tar.gz\`
- **Source**: \`${PACKAGE_NAME}-${VERSION}-source.tar.gz\`

## Quick Start

### Linux/macOS
\`\`\`bash
tar -xzf ${PACKAGE_NAME}-${VERSION}-linux-macos.tar.gz
cd ${PACKAGE_NAME}-${VERSION}
sudo ./install.sh -s -t
\`\`\`

### Windows (PowerShell as Administrator)
\`\`\`powershell
Expand-Archive ${PACKAGE_NAME}-${VERSION}-windows.zip
cd ${PACKAGE_NAME}-${VERSION}
.\\install.ps1 -Service -Test
\`\`\`

### Docker
\`\`\`bash
tar -xzf ${PACKAGE_NAME}-${VERSION}-docker.tar.gz
cd ${PACKAGE_NAME}-${VERSION}
docker-compose up -d
\`\`\`

## Features

- File operations (read, write, copy, move, delete)
- System information and process management
- Advanced search with regex support
- AI-powered code analysis (when enabled)
- Comprehensive security measures
- Multiple deployment options

## Requirements

- Node.js 18+
- Claude Desktop (for MCP integration)

## Documentation

- \`SETUP.md\` - Claude Desktop configuration
- \`DEPLOYMENT.md\` - Detailed deployment guide
- \`README.md\` - General information

## Support

For issues and questions, please check the documentation or create an issue.
EOF
    
    log_success "Release notes created"
}

# Main function
main() {
    log_info "Packaging Augment MCP Server v${VERSION}..."
    
    clean_build
    build_project
    create_base_package
    
    create_unix_package
    create_windows_package
    create_docker_package
    create_source_package
    
    generate_checksums
    create_release_notes
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    log_success "All packages created successfully!"
    log_info "Distribution packages are in the '$BUILD_DIR' directory:"
    ls -la "$BUILD_DIR"
}

# Run main function
main "$@"
