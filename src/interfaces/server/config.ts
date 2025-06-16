/**
 * Server configuration interfaces
 */

/**
 * Main server configuration interface
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

/**
 * Augment AI integration configuration
 */
export interface AugmentConfig {
  enabled: boolean;
  apiEndpoint?: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
