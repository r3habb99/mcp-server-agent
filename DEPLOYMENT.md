# MCP Server Deployment Guide

This guide covers how to deploy and use the Augment MCP Server across different systems and environments.

## 🚀 Quick Deployment Options

### Option 1: Local Development Setup
```bash
# Clone/copy the project
git clone <your-repo> mcp-server
cd mcp-server

# Install and build
npm install
npm run build

# Configure environment
cp .env .env.local
# Edit .env.local with your settings

# Test the server
node test-basic.js

# Start the server
npm start
```

### Option 2: Global Installation (Recommended for Production)
```bash
# Install globally
npm install -g .

# Or create a symlink
npm link

# Run from anywhere
augment-mcp-server --help
```

### Option 3: Docker Deployment (Coming Soon)
```bash
# Build Docker image
docker build -t augment-mcp-server .

# Run container
docker run -p 3000:3000 augment-mcp-server
```

## 🖥️ Platform-Specific Setup

### Linux (Ubuntu/Debian)
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <repo> /opt/mcp-server
cd /opt/mcp-server
npm install
npm run build

# Create systemd service
sudo cp deployment/mcp-server.service /etc/systemd/system/
sudo systemctl enable mcp-server
sudo systemctl start mcp-server
```

### macOS
```bash
# Install Node.js via Homebrew
brew install node@18

# Setup the server
git clone <repo> ~/mcp-server
cd ~/mcp-server
npm install
npm run build

# Add to Claude Desktop config
# See Claude Desktop Configuration section below
```

### Windows
```powershell
# Install Node.js from nodejs.org or via Chocolatey
choco install nodejs

# Setup the server
git clone <repo> C:\mcp-server
cd C:\mcp-server
npm install
npm run build

# Add to Claude Desktop config
# Config file location: %APPDATA%\Claude\claude_desktop_config.json
```

## 🔧 Claude Desktop Configuration

### Configuration File Locations
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Basic Configuration
```json
{
  "mcpServers": {
    "augment-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/server/index.js"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "warn"
      }
    }
  }
}
```

### Advanced Configuration with Environment Variables
```json
{
  "mcpServers": {
    "augment-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/server/index.js"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info",
        "MAX_FILE_SIZE": "52428800",
        "ALLOWED_DIRECTORIES": ".,./src,./docs,./projects",
        "CACHE_ENABLED": "true",
        "FEATURE_CODE_ANALYSIS": "true",
        "AUGMENT_ENABLED": "false"
      }
    }
  }
}
```

### Multiple Environment Setup
```json
{
  "mcpServers": {
    "mcp-dev": {
      "command": "node",
      "args": ["/path/to/mcp-server/build/server/index.js"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug",
        "ALLOWED_DIRECTORIES": ".,./src,./test-projects"
      }
    },
    "mcp-prod": {
      "command": "node", 
      "args": ["/path/to/mcp-server/build/server/index.js"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "warn",
        "ALLOWED_DIRECTORIES": ".,./production-projects"
      }
    }
  }
}
```

## 🌐 Network/Remote Setup

### SSH Tunnel Setup
```bash
# On remote server
cd /opt/mcp-server
npm start

# On local machine (for Claude Desktop)
ssh -L 8080:localhost:8080 user@remote-server

# Claude Desktop config
{
  "mcpServers": {
    "remote-mcp": {
      "command": "node",
      "args": ["/path/to/local/proxy-script.js"],
      "env": {
        "REMOTE_HOST": "localhost:8080"
      }
    }
  }
}
```

### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
```

## 🔒 Security Considerations

### Production Security Settings
```bash
# In .env or environment
NODE_ENV=production
LOG_LEVEL=warn

# Restrict file access
ALLOWED_DIRECTORIES=./projects,./documents
BLOCKED_DIRECTORIES=/etc,/usr,/bin,/sbin,/boot,/sys,/proc,/dev,/root,/home

# Limit resources
MAX_FILE_SIZE=10485760  # 10MB
MAX_BATCH_SIZE=50
COMMAND_TIMEOUT=15000   # 15 seconds
MAX_CONCURRENT_FILE_OPS=5

# Enable rate limiting
RATE_LIMITING_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=50
```

### Firewall Configuration
```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 📊 Monitoring & Logging

### Log File Setup
```bash
# Create log directory
mkdir -p /var/log/mcp-server

# Set environment variable
LOG_FILE=/var/log/mcp-server/mcp-server.log

# Rotate logs with logrotate
sudo cp deployment/logrotate.conf /etc/logrotate.d/mcp-server
```

### Health Monitoring
```bash
# Check server health
curl http://localhost:3000/health

# Monitor with systemd
sudo systemctl status mcp-server

# View logs
sudo journalctl -u mcp-server -f
```

## 🔄 Updates & Maintenance

### Updating the Server
```bash
# Pull latest changes
git pull origin main

# Reinstall dependencies
npm install

# Rebuild
npm run build

# Restart service
sudo systemctl restart mcp-server
```

### Backup Configuration
```bash
# Backup important files
tar -czf mcp-backup-$(date +%Y%m%d).tar.gz \
  .env \
  package.json \
  src/ \
  deployment/
```

## 🐛 Troubleshooting

### Common Issues

1. **Server won't start**
   ```bash
   # Check Node.js version
   node --version  # Should be 18+
   
   # Check build
   npm run build
   
   # Check permissions
   ls -la build/server/index.js
   ```

2. **Claude Desktop can't connect**
   ```bash
   # Test server manually
   node build/server/index.js --help
   
   # Check absolute paths in config
   # Restart Claude Desktop completely
   ```

3. **Permission denied errors**
   ```bash
   # Check allowed directories
   echo $ALLOWED_DIRECTORIES
   
   # Verify file permissions
   ls -la /path/to/target/directory
   ```

4. **High memory usage**
   ```bash
   # Reduce cache size
   CACHE_MAX_SIZE=50
   MAX_CONCURRENT_FILE_OPS=3
   
   # Monitor memory
   node --max-old-space-size=512 build/server/index.js
   ```

## 📞 Support

- Check logs: `tail -f /var/log/mcp-server/mcp-server.log`
- Test basic functionality: `node test-basic.js`
- Verify configuration: `node build/server/index.js --config`
- Review environment: `printenv | grep -E "(NODE_|LOG_|MAX_|AUGMENT_)"`
