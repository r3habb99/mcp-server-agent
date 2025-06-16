/**
 * Server configuration for the Augment MCP Server
 */

import type { ServerConfig, AugmentConfig } from '../types/index.js';

export const defaultConfig: ServerConfig = {
  name: 'augment-mcp-server',
  version: '1.0.0',
  description: 'A comprehensive MCP server for local system integration with Augment AI',
  capabilities: {
    tools: true,
    resources: true,
    prompts: true,
  },
  logging: {
    level: (process.env['LOG_LEVEL'] as 'error' | 'warn' | 'info' | 'debug') || 'info',
    file: process.env['LOG_FILE'],
  },
};

export const augmentConfig: AugmentConfig = {
  enabled: process.env['AUGMENT_ENABLED'] === 'true',
  apiEndpoint: process.env['AUGMENT_API_ENDPOINT'] || 'http://localhost:8080',
  apiKey: process.env['AUGMENT_API_KEY'],
  model: process.env['AUGMENT_MODEL'] || 'claude-3-sonnet',
  maxTokens: parseInt(process.env['AUGMENT_MAX_TOKENS'] || '4096'),
  temperature: parseFloat(process.env['AUGMENT_TEMPERATURE'] || '0.7'),
};

// Security configuration
export const securityConfig = {
  // Maximum file size for operations (100MB)
  maxFileSize: parseInt(process.env['MAX_FILE_SIZE'] || '104857600'),

  // Maximum number of files to process in batch operations
  maxBatchSize: parseInt(process.env['MAX_BATCH_SIZE'] || '100'),
  
  // Allowed file extensions for text operations
  allowedTextExtensions: (process.env['ALLOWED_TEXT_EXTENSIONS'] ||
    '.txt,.md,.json,.js,.ts,.jsx,.tsx,.html,.css,.scss,.sass,.less,.xml,.yaml,.yml,.toml,.ini,.py,.rb,.php,.java,.c,.cpp,.h,.go,.rs,.swift,.kt,.scala,.sh,.bash,.zsh,.fish,.sql,.graphql,.proto,.log,.conf,.config'
  ).split(','),

  // Allowed directories for file operations (relative to process.cwd())
  allowedDirectories: (process.env['ALLOWED_DIRECTORIES'] ||
    '.,./src,./docs,./tests,./examples,./data'
  ).split(','),

  // Blocked directories
  blockedDirectories: (process.env['BLOCKED_DIRECTORIES'] ||
    '/etc,/usr,/bin,/sbin,/boot,/sys,/proc,/dev,/root'
  ).split(','),

  // Command execution timeout (30 seconds)
  commandTimeout: parseInt(process.env['COMMAND_TIMEOUT'] || '30000'),

  // Maximum search results
  maxSearchResults: parseInt(process.env['MAX_SEARCH_RESULTS'] || '1000'),
  
  // Rate limiting
  rateLimiting: {
    enabled: process.env['RATE_LIMITING_ENABLED'] === 'true',
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW'] || '60000'), // 1 minute
    maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'),
  },
};

// Performance configuration
export const performanceConfig = {
  // Cache settings
  cache: {
    enabled: process.env['CACHE_ENABLED'] !== 'false',
    ttl: parseInt(process.env['CACHE_TTL'] || '300000'), // 5 minutes
    maxSize: parseInt(process.env['CACHE_MAX_SIZE'] || '100'), // 100 entries
  },

  // Concurrent operation limits
  concurrency: {
    maxConcurrentFileOps: parseInt(process.env['MAX_CONCURRENT_FILE_OPS'] || '10'),
    maxConcurrentSearches: parseInt(process.env['MAX_CONCURRENT_SEARCHES'] || '5'),
    maxConcurrentCommands: parseInt(process.env['MAX_CONCURRENT_COMMANDS'] || '3'),
  },

  // Memory limits
  memory: {
    maxHeapUsage: parseInt(process.env['MAX_HEAP_USAGE'] || '1073741824'), // 1GB
    gcThreshold: parseFloat(process.env['GC_THRESHOLD'] || '0.8'), // 80%
  },
};

// Feature flags
export const featureFlags = {
  // Enable/disable specific tools
  fileOperations: process.env['FEATURE_FILE_OPERATIONS'] !== 'false',
  systemInfo: process.env['FEATURE_SYSTEM_INFO'] !== 'false',
  processManagement: process.env['FEATURE_PROCESS_MANAGEMENT'] !== 'false',
  networkInfo: process.env['FEATURE_NETWORK_INFO'] !== 'false',
  gitIntegration: process.env['FEATURE_GIT_INTEGRATION'] !== 'false',
  codeAnalysis: process.env['FEATURE_CODE_ANALYSIS'] !== 'false',
  searchOperations: process.env['FEATURE_SEARCH_OPERATIONS'] !== 'false',

  // Enable/disable specific resources
  fileResources: process.env['FEATURE_FILE_RESOURCES'] !== 'false',
  systemResources: process.env['FEATURE_SYSTEM_RESOURCES'] !== 'false',
  logResources: process.env['FEATURE_LOG_RESOURCES'] !== 'false',

  // Enable/disable specific prompts
  codeReviewPrompts: process.env['FEATURE_CODE_REVIEW_PROMPTS'] !== 'false',
  documentationPrompts: process.env['FEATURE_DOCUMENTATION_PROMPTS'] !== 'false',
  debuggingPrompts: process.env['FEATURE_DEBUGGING_PROMPTS'] !== 'false',

  // Experimental features
  experimental: {
    aiIntegration: process.env['EXPERIMENTAL_AI_INTEGRATION'] === 'true',
    advancedAnalytics: process.env['EXPERIMENTAL_ADVANCED_ANALYTICS'] === 'true',
    realTimeMonitoring: process.env['EXPERIMENTAL_REAL_TIME_MONITORING'] === 'true',
  },
};

// Environment-specific overrides
export const getEnvironmentConfig = () => {
  const env = process.env['NODE_ENV'] || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...defaultConfig,
        logging: {
          ...defaultConfig.logging,
          level: 'warn' as const,
        },
      };
    
    case 'test':
      return {
        ...defaultConfig,
        logging: {
          ...defaultConfig.logging,
          level: 'error' as const,
        },
      };
    
    case 'development':
    default:
      return {
        ...defaultConfig,
        logging: {
          ...defaultConfig.logging,
          level: 'debug' as const,
        },
      };
  }
};

// Validation function for configuration
export const validateConfig = (config: ServerConfig): void => {
  if (!config.name || config.name.trim().length === 0) {
    throw new Error('Server name is required');
  }
  
  if (!config.version || config.version.trim().length === 0) {
    throw new Error('Server version is required');
  }
  
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLogLevels.includes(config.logging.level)) {
    throw new Error(`Invalid log level: ${config.logging.level}`);
  }
  
  // Validate security settings
  if (securityConfig.maxFileSize <= 0) {
    throw new Error('Max file size must be positive');
  }
  
  if (securityConfig.maxBatchSize <= 0) {
    throw new Error('Max batch size must be positive');
  }
  
  if (securityConfig.commandTimeout <= 0) {
    throw new Error('Command timeout must be positive');
  }
};

// Export the final configuration
export const config = getEnvironmentConfig();

// Validate configuration on module load
validateConfig(config);
