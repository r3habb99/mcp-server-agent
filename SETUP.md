# MCP Server Setup Guide

## Overview

This is a fully functional Model Context Protocol (MCP) server built with Node.js and TypeScript. It provides file operations, system information, and AI-powered code analysis tools for use with Claude Desktop and other MCP clients.

## Features

### 🛠️ Tools Available
- **File Operations**: read-file, write-file, copy-path, move-path, delete-path, create-directory, list-directory
- **Search**: search-files with regex support
- **System Info**: get-system-info, get-processes, execute-command
- **Code Analysis**: analyze-code, review-code (when Augment service is available)

### 📚 Resources Available
- **file://**: Access any file content
- **directory://**: List directory contents
- **system://**: Get system information

### 💬 Prompts Available
- **code-review**: Generate comprehensive code reviews
- **generate-docs**: Create documentation for code
- **explain-code**: Explain code for different audiences
- **debug-help**: Help debug code issues
- **generate-tests**: Generate test cases
- **analyze-file**: Analyze files for various aspects
- **project-overview**: Generate project overviews

## Installation & Setup

### 1. Build the Server
```bash
npm install
npm run build
```

### 2. Test the Server
```bash
# Run basic functionality test
node test-basic.js

# Or test manually
node build/server/index.js --help
```

### 3. Configure Claude Desktop

Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "augment-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/your/mcp-server/build/server/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/your/mcp-server` with the actual absolute path to this project directory.

### 4. Restart Claude Desktop

After adding the configuration, restart Claude Desktop completely.

## Usage Examples

### File Operations
```
Can you read the contents of package.json?
```

### System Information
```
What's the current system information?
```

### Code Analysis
```
Please review this TypeScript code: [paste code]
```

### Search
```
Search for "TODO" comments in the src directory
```

## Configuration

### Environment Variables
- `NODE_ENV`: Set to 'production' for production use
- `LOG_LEVEL`: Control logging verbosity (error, warn, info, debug)
- `MAX_FILE_SIZE`: Maximum file size to read (default: 10MB)
- `AUGMENT_ENABLED`: Enable/disable Augment AI features

### Security
The server includes built-in security measures:
- File size limits
- Path validation to prevent directory traversal
- Command execution timeouts
- Input validation with Zod schemas

## Troubleshooting

### Server Won't Start
1. Check that Node.js version is 18+ 
2. Verify all dependencies are installed: `npm install`
3. Ensure the build completed successfully: `npm run build`

### Claude Desktop Can't Connect
1. Verify the absolute path in the config is correct
2. Check that the server starts manually: `node build/server/index.js --help`
3. Restart Claude Desktop after config changes
4. Check Claude Desktop logs for error messages

### Permission Issues
1. Ensure the server has read/write permissions for target directories
2. On Unix systems, you may need to adjust file permissions

## Development

### Running in Development
```bash
npm run dev
```

### Running Tests
```bash
# Basic functionality test
node test-basic.js

# Full test suite (if Jest is configured)
npm test
```

### Adding New Tools
1. Add tool implementation in `src/server/handlers/tools.ts`
2. Add validation schemas in `src/utils/validation.ts`
3. Update service classes in `src/services/` as needed
4. Rebuild: `npm run build`

## Support

For issues or questions:
1. Check the logs in the terminal where Claude Desktop is running
2. Verify the server works independently with the test script
3. Review the MCP specification at https://modelcontextprotocol.io/

## License

This project is licensed under the MIT License.
