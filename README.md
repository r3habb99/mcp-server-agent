# Augment MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✅ Status: PRODUCTION READY

**Fully functional and optimized MCP server** with organized TypeScript architecture, comprehensive features, and enterprise-grade security. Ready for production use with Claude Desktop and other MCP clients.

### 🚀 Quick Start

```bash
# Install dependencies and build
npm install && npm run build

# Run basic tests to verify functionality
npm test

# Start the server
npm start
```

📖 **See [SETUP.md](./SETUP.md) for detailed Claude Desktop integration instructions.**

---

## 🎯 Overview

A **production-ready Model Context Protocol (MCP) server** designed for seamless local system integration with AI assistants. Built with TypeScript and featuring a clean, organized architecture, this server provides comprehensive tools, resources, and AI-powered prompts for development workflows.

### 🏗️ Architecture Highlights

- **🎨 Clean TypeScript Architecture**: Organized interfaces by domain for maximum maintainability
- **🔒 Enterprise Security**: Path traversal protection, input validation, and configurable access controls
- **⚡ High Performance**: Intelligent caching, concurrency limits, and memory management
- **🧩 Modular Design**: Domain-specific services with clear separation of concerns
- **🔧 Highly Configurable**: Feature flags, environment-based configuration, and runtime customization

## 🌟 Features

### 🛠️ Comprehensive Tools Suite

| Category | Tools | Description |
|----------|-------|-------------|
| **📁 File Operations** | `read-file`, `write-file`, `copy-file`, `move-file`, `delete-file`, `create-directory`, `list-directory` | Complete file system management with security validation |
| **💻 System Information** | `get-system-info`, `get-process-list`, `get-network-info`, `get-disk-usage` | Real-time system monitoring and diagnostics |
| **⚙️ Process Management** | `execute-command`, `kill-process`, `get-process-info` | Safe command execution with timeout protection |
| **🔍 Search & Analysis** | `search-files`, `search-content`, `analyze-code` | Advanced search with regex support and AI-powered analysis |
| **🤖 AI Integration** | `analyze-code`, `review-code`, `explain-code` | Augment AI-powered development assistance |

### 📚 Dynamic Resources

| Resource Type | URI Pattern | Capabilities |
|---------------|-------------|--------------|
| **📄 File Content** | `file://{path}` | Direct file access with MIME type detection |
| **📂 Directory Listings** | `directory://{path}` | Hierarchical directory browsing |
| **📊 System Metrics** | `system://status`, `system://processes` | Live system performance data |
| **🌐 Network Info** | `network://interfaces`, `network://connections` | Network topology and connection status |
| **⚙️ Server Config** | `config://current`, `config://capabilities` | Runtime configuration and feature status |

### 💡 AI-Powered Prompts

| Prompt Category | Available Prompts | Use Cases |
|-----------------|-------------------|-----------|
| **🔍 Code Review** | `code-review` | Security, performance, maintainability analysis |
| **📖 Documentation** | `generate-docs` | JSDoc, Markdown, API documentation generation |
| **🐛 Debugging** | `debug-code`, `explain-error` | Issue diagnosis and resolution guidance |
| **🧪 Testing** | `generate-tests` | Unit test generation for multiple frameworks |
| **📋 Analysis** | `analyze-file`, `project-overview` | Code quality and project structure analysis |

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

## Usage

### Basic Usage

```bash
# Start the server
npm start

# Or run directly
node build/server/index.js
```

### Development Mode

```bash
# Run with hot reload
npm run dev
```

### Command Line Options

```bash
# Show help
augment-mcp-server --help

# Show version
augment-mcp-server --version

# Show current configuration
augment-mcp-server --config
```

## Configuration

The server can be configured using environment variables:

### Core Settings

```bash
# Logging
LOG_LEVEL=info                    # error, warn, info, debug
LOG_FILE=/path/to/logfile        # Optional log file path

# Security
MAX_FILE_SIZE=104857600          # Maximum file size (100MB)
MAX_BATCH_SIZE=100               # Maximum batch operation size
COMMAND_TIMEOUT=30000            # Command timeout in milliseconds
ALLOWED_DIRECTORIES=.,./src      # Comma-separated allowed directories
BLOCKED_DIRECTORIES=/etc,/usr    # Comma-separated blocked directories

# Performance
CACHE_ENABLED=true               # Enable caching
CACHE_TTL=300000                 # Cache TTL in milliseconds
MAX_CONCURRENT_FILE_OPS=10       # Max concurrent file operations
MAX_CONCURRENT_SEARCHES=5        # Max concurrent searches
```

### Augment AI Integration

```bash
AUGMENT_ENABLED=true                           # Enable Augment AI features
AUGMENT_API_ENDPOINT=http://localhost:8080     # Augment AI API endpoint
AUGMENT_API_KEY=your-api-key                   # API key (if required)
AUGMENT_MODEL=claude-3-sonnet                  # AI model to use
AUGMENT_MAX_TOKENS=4096                        # Maximum tokens per request
AUGMENT_TEMPERATURE=0.7                        # AI temperature setting
```

### Feature Flags

```bash
# Core Features
FEATURE_FILE_OPERATIONS=true        # Enable file operations
FEATURE_SYSTEM_INFO=true            # Enable system information tools
FEATURE_PROCESS_MANAGEMENT=true     # Enable process management
FEATURE_NETWORK_INFO=true           # Enable network information
FEATURE_CODE_ANALYSIS=true          # Enable code analysis tools
FEATURE_SEARCH_OPERATIONS=true      # Enable search operations

# Resources
FEATURE_FILE_RESOURCES=true         # Enable file resources
FEATURE_SYSTEM_RESOURCES=true       # Enable system resources
FEATURE_LOG_RESOURCES=true          # Enable log resources

# Prompts
FEATURE_CODE_REVIEW_PROMPTS=true    # Enable code review prompts
FEATURE_DOCUMENTATION_PROMPTS=true  # Enable documentation prompts
FEATURE_DEBUGGING_PROMPTS=true      # Enable debugging prompts

# Experimental
EXPERIMENTAL_AI_INTEGRATION=false   # Enable experimental AI features
EXPERIMENTAL_ADVANCED_ANALYTICS=false
EXPERIMENTAL_REAL_TIME_MONITORING=false
```

## Integration with Claude Desktop

To use this server with Claude Desktop, add the following to your `claude_desktop_config.json`:

### macOS/Linux

```json
{
  "mcpServers": {
    "augment-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/augment-mcp-server/build/server/index.js"],
      "env": {
        "LOG_LEVEL": "info",
        "AUGMENT_ENABLED": "true"
      }
    }
  }
}
```

### Windows

```json
{
  "mcpServers": {
    "augment-mcp-server": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\augment-mcp-server\\build\\server\\index.js"],
      "env": {
        "LOG_LEVEL": "info",
        "AUGMENT_ENABLED": "true"
      }
    }
  }
}
```

## Development

### 🏗️ Project Architecture

```typescript
src/
├── 🖥️  server/                    # Server implementation layer
│   ├── index.ts                  # Main server entry point with graceful shutdown
│   ├── config.ts                 # Environment-based configuration management
│   └── handlers/                 # MCP protocol handlers
│       ├── tools.ts              # Tool implementations with validation
│       ├── resources.ts          # Resource providers with caching
│       └── prompts.ts            # AI-powered prompt templates
├── 🔧 services/                  # Business logic layer
│   ├── fileService.ts            # File system operations with security
│   ├── systemService.ts          # System information and monitoring
│   └── augmentService.ts         # Augment AI integration service
├── 🎯 interfaces/                # Organized TypeScript interfaces
│   ├── server/                   # Server configuration interfaces
│   ├── file/                     # File operation interfaces
│   ├── system/                   # System information interfaces
│   ├── mcp/                      # MCP protocol interfaces
│   ├── analysis/                 # Code analysis interfaces
│   ├── git/                      # Git integration interfaces
│   └── index.ts                  # Central interface export hub
└── 🛠️  utils/                    # Utility functions
    ├── logger.ts                 # Structured logging with Winston
    └── validation.ts             # Zod-based input validation schemas
```

#### 🎨 Interface Organization

Our TypeScript interfaces are organized by domain for maximum maintainability:

```typescript
// Single import point for all interfaces
import type {
  ServerConfig, AugmentConfig,           // Server configuration
  FileInfo, SearchOptions, SearchResult, // File operations
  SystemInfo, ProcessInfo, HealthCheck,  // System information
  ToolResult, ResourceContent,           // MCP protocol
  CodeAnalysisResult                     // Code analysis
} from '../interfaces/index.js';
```

**Benefits:**

- 🎯 **Domain-specific organization** - Related interfaces grouped together
- 🔄 **Single import point** - All interfaces available from one central location
- 📝 **Clear documentation** - Each domain has specific purpose and examples
- 🔧 **Easy maintenance** - Add new interfaces to appropriate domain
- 🚀 **Better IDE support** - Improved autocomplete and navigation

### 🔧 Development Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **🏗️ Build** | `npm run build` | Compile TypeScript to JavaScript with type checking |
| **🚀 Start** | `npm start` | Start the production server |
| **⚡ Development** | `npm run dev` | Run with hot reload and debug logging |
| **🧪 Test** | `npm test` | Run comprehensive test suite |
| **👀 Test Watch** | `npm run test:watch` | Run tests in watch mode for development |
| **🔍 Lint** | `npm run lint` | Check code quality with ESLint |
| **🔧 Lint Fix** | `npm run lint:fix` | Auto-fix linting issues |
| **🧹 Clean** | `npm run clean` | Remove build artifacts |

```bash
# Development workflow
npm install              # Install dependencies
npm run build           # Build the project
npm test               # Verify everything works
npm start              # Start the server
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run specific test file
npm test -- fileService.test.ts

# Run tests in watch mode
npm run test:watch
```

## 🔒 Security & Performance

### 🛡️ Enterprise Security Features

| Security Layer | Implementation | Benefits |
|----------------|----------------|----------|
| **🚫 Path Traversal Protection** | Comprehensive path validation and sanitization | Prevents unauthorized file system access |
| **⏱️ Command Execution Limits** | Timeout protection and command filtering | Prevents system resource abuse |
| **📏 File Size Limits** | Configurable maximum file sizes | Protects against resource exhaustion |
| **📁 Directory Restrictions** | Allowlist/blocklist directory access | Limits scope of file operations |
| **✅ Input Validation** | Zod schema-based validation | Ensures data integrity and type safety |
| **🚦 Rate Limiting** | Optional request throttling | Prevents API abuse and DoS attacks |

### ⚡ Performance Optimizations

| Feature | Implementation | Impact |
|---------|----------------|--------|
| **🗄️ Intelligent Caching** | TTL-based caching with configurable size limits | Reduces I/O operations and improves response times |
| **🔄 Concurrency Control** | Configurable limits on parallel operations | Prevents resource contention and system overload |
| **🧠 Memory Management** | Automatic GC triggers and heap monitoring | Maintains stable memory usage |
| **📡 Streaming Support** | Large file handling with streams | Enables processing of files larger than available RAM |
| **📊 Health Monitoring** | Real-time system health checks | Proactive performance issue detection |

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check Node.js version (18+ required)
   - Verify all dependencies are installed
   - Check log files for error details

2. **File operations fail**
   - Verify file paths are within allowed directories
   - Check file permissions
   - Ensure file sizes are within limits

3. **Augment AI features not working**
   - Verify `AUGMENT_ENABLED=true`
   - Check API endpoint configuration
   - Verify network connectivity

### Debugging

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

Check log files:

```bash
tail -f logs/combined.log
tail -f logs/error.log
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 🎯 Why Choose Augment MCP Server?

| Advantage | Description | Benefit |
|-----------|-------------|---------|
| **🏗️ Clean Architecture** | Domain-organized TypeScript interfaces with single import point | Easy maintenance and development |
| **🔒 Production Security** | Enterprise-grade security with comprehensive validation | Safe for production environments |
| **⚡ High Performance** | Intelligent caching and resource management | Scales with your needs |
| **🤖 AI Integration** | Built-in Augment AI support for development workflows | Enhanced productivity |
| **🔧 Highly Configurable** | Extensive feature flags and environment configuration | Adapts to any use case |
| **📖 Well Documented** | Comprehensive documentation and examples | Quick onboarding |

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

### Getting Help

| Resource | Description | Link |
|----------|-------------|------|
| **📚 Documentation** | Complete setup and usage guides | [SETUP.md](./SETUP.md) |
| **🐛 Issues** | Bug reports and feature requests | [GitHub Issues](https://github.com/your-repo/augment-mcp-server/issues) |
| **💬 Discussions** | Community support and questions | [GitHub Discussions](https://github.com/your-repo/augment-mcp-server/discussions) |
| **📖 Troubleshooting** | Common issues and solutions | See troubleshooting section above |

### Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- 🔧 Setting up the development environment
- 🧪 Running tests and quality checks
- 📝 Documentation standards
- 🚀 Submitting pull requests

## 📋 Changelog

### v1.0.0 - Production Release 🎉

#### 🏗️ Architecture Improvements

- **✨ Organized TypeScript Interfaces**: Refactored monolithic types into domain-specific interface modules
- **🎯 Central Import System**: Single entry point for all interfaces via `src/interfaces/index.ts`
- **🧹 Clean Architecture**: Removed redundant types directory, streamlined import structure
- **📝 Enhanced Documentation**: Comprehensive interface documentation with usage examples

#### 🚀 Core Features

- **🛠️ Complete MCP Implementation**: Full Model Context Protocol server with tools, resources, and prompts
- **📁 Advanced File Operations**: Secure file system management with validation and safety checks
- **💻 System Integration**: Real-time system monitoring, process management, and network information
- **🤖 AI-Powered Development**: Augment AI integration for code analysis, review, and documentation
- **🔍 Smart Search**: Advanced file and content search with regex support

#### 🔒 Security & Performance Enhancements

- **🛡️ Enterprise Security**: Path traversal protection, input validation, and access controls
- **⚡ Performance Optimizations**: Intelligent caching, concurrency limits, and memory management
- **📊 Health Monitoring**: Real-time system health checks and performance metrics
- **🔧 Configurable Features**: Extensive feature flags and environment-based configuration

#### 🧪 Quality Assurance

- **✅ Comprehensive Testing**: Full test suite with unit and integration tests
- **🔍 Code Quality**: ESLint configuration with strict TypeScript checking
- **📖 Documentation**: Complete README, setup guides, and API documentation
- **🚀 Production Ready**: Optimized build process and deployment scripts
