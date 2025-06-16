# Augment MCP Server

## ✅ Status: WORKING & READY TO USE

**All compilation errors have been fixed!** This MCP server is fully functional and ready for use with Claude Desktop.

### Quick Start

```bash
npm install && npm run build && node test-basic.js
```

See [SETUP.md](./SETUP.md) for detailed setup instructions with Claude Desktop.

---

A comprehensive Model Context Protocol (MCP) server for local system integration with Augment AI capabilities. This server provides tools, resources, and prompts for file operations, system information, code analysis, and AI-powered development assistance.

## Features

### 🛠️ Tools

- **File Operations**: Read, write, copy, move, delete files and directories
- **System Information**: Get CPU, memory, disk, and network information
- **Process Management**: List, start, and manage system processes
- **Command Execution**: Execute system commands safely
- **File Search**: Search for files and content with regex support
- **Code Analysis**: AI-powered code analysis and review (when Augment AI is enabled)

### 📚 Resources

- **File Content**: Access file contents via URI
- **Directory Listings**: Browse directory structures
- **System Status**: Real-time system health and performance metrics
- **Process Lists**: Current running processes
- **Network Information**: Network interfaces and connections
- **Server Configuration**: Current server settings and capabilities

### 💡 Prompts

- **Code Review**: AI-powered code review with focus areas
- **Documentation Generation**: Generate docs in various formats
- **Code Explanation**: Explain code for different audiences
- **Debugging Assistance**: Help debug code issues
- **Test Generation**: Generate test suites
- **File Analysis**: Analyze files for structure, quality, security
- **Project Overview**: High-level project analysis

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

### Project Structure

```
src/
├── server/
│   ├── index.ts              # Main server entry point
│   ├── config.ts             # Configuration management
│   └── handlers/             # Request handlers
│       ├── tools.ts          # Tool implementations
│       ├── resources.ts      # Resource implementations
│       └── prompts.ts        # Prompt implementations
├── services/                 # Business logic services
│   ├── fileService.ts        # File system operations
│   ├── systemService.ts      # System information
│   └── augmentService.ts     # Augment AI integration
├── types/                    # TypeScript type definitions
│   └── index.ts
└── utils/                    # Utility functions
    ├── logger.ts             # Logging utilities
    └── validation.ts         # Input validation
```

### Available Scripts

```bash
npm run build          # Build the project
npm run dev            # Run in development mode with hot reload
npm start              # Start the built server
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run clean          # Clean build directory
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

## Security Considerations

- **Path Traversal Protection**: All file paths are validated to prevent directory traversal attacks
- **Command Execution Limits**: Dangerous commands are blocked, and execution is limited by timeout
- **File Size Limits**: Maximum file sizes are enforced to prevent resource exhaustion
- **Directory Restrictions**: Access is limited to allowed directories only
- **Input Validation**: All inputs are validated using Zod schemas
- **Rate Limiting**: Optional rate limiting for API requests

## Performance

- **Caching**: Intelligent caching of frequently accessed data
- **Concurrency Limits**: Configurable limits on concurrent operations
- **Memory Management**: Automatic garbage collection and memory monitoring
- **Streaming**: Large files are handled with streaming where possible

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

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues and questions:

- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting section

## Changelog

### v1.0.0

- Initial release
- Core MCP server functionality
- File operations tools
- System information tools
- AI-powered prompts
- Comprehensive logging and monitoring
- Security and performance optimizations
