/**
 * Type definitions for the Augment MCP Server
 */

export interface ServerConfig {
  name: string;
  version: string;
  description?: string;
  capabilities: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    file?: string;
  };
}

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  lastModified: Date;
  permissions: string;
  extension?: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  loadAverage: number[];
  cpuCount: number;
  hostname: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  command: string;
}

export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: Uint8Array;
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: {
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  };
}

export interface AugmentConfig {
  enabled: boolean;
  apiEndpoint?: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CodeAnalysisResult {
  language: string;
  linesOfCode: number;
  complexity: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
    column?: number;
  }>;
  suggestions: string[];
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'copy' | 'move' | 'mkdir';
  source: string;
  destination?: string;
  content?: string;
  options?: {
    recursive?: boolean;
    overwrite?: boolean;
    encoding?: string;
  };
}

export interface SearchOptions {
  pattern: string;
  directory: string;
  recursive?: boolean;
  includeHidden?: boolean;
  fileTypes?: string[];
  maxResults?: number;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

export interface GitInfo {
  isRepository: boolean;
  branch?: string;
  commit?: string;
  status?: {
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
  };
}

export interface NetworkInfo {
  interfaces: Array<{
    name: string;
    address: string;
    netmask: string;
    family: string;
    mac: string;
    internal: boolean;
  }>;
  connections: Array<{
    protocol: string;
    localAddress: string;
    localPort: number;
    remoteAddress?: string;
    remotePort?: number;
    state: string;
  }>;
}

export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, {
    status: 'pass' | 'fail';
    message?: string;
    duration?: number;
  }>;
  timestamp: Date;
}
