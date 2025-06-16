/**
 * Central Interfaces Export File
 *
 * This is the SINGLE ENTRY POINT for all interface imports in the application.
 * Import all interfaces from this file using: `import type { ... } from '../interfaces/index.js'`
 *
 * This file re-exports all interfaces from their respective domain-specific modules:
 *
 * - server: Server configuration and setup (ServerConfig, AugmentConfig)
 * - file: File system operations and information (FileInfo, FileOperation, SearchOptions, SearchResult)
 * - system: System information, health, and monitoring (SystemInfo, ProcessInfo, NetworkInfo, HealthCheck, LogEntry)
 * - mcp: Model Context Protocol related interfaces (ToolResult, ResourceContent, PromptMessage)
 * - analysis: Code analysis and evaluation (CodeAnalysisResult)
 * - git: Git repository integration (GitInfo)
 *
 * Example usage:
 * ```typescript
 * import type { ServerConfig, FileInfo, SystemInfo } from '../interfaces/index.js';
 * ```
 */

// Server configuration interfaces
export * from './server/index.js';

// File operation interfaces
export * from './file/index.js';

// System information interfaces
export * from './system/index.js';

// MCP protocol interfaces
export * from './mcp/index.js';

// Code analysis interfaces
export * from './analysis/index.js';

// Git integration interfaces
export * from './git/index.js';
