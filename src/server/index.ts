#!/usr/bin/env node

/**
 * Augment MCP Server - Main entry point
 * 
 * A comprehensive Model Context Protocol server for local system integration
 * with Augment AI capabilities.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './handlers/tools.js';
import { registerResources } from './handlers/resources.js';
import { registerPrompts } from './handlers/prompts.js';
import { config, securityConfig, performanceConfig, featureFlags } from './config.js';
import { SystemService } from '../services/systemService.js';
import { logInfo, logError, logWarn } from '../utils/logger.js';

// Global error handlers
process.on('uncaughtException', (error) => {
  logError('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled rejection', reason as Error, { promise });
  process.exit(1);
});

// Graceful shutdown handling
let server: McpServer | null = null;
let systemService: SystemService | null = null;

const gracefulShutdown = (signal: string) => {
  logInfo(`Received ${signal}, shutting down gracefully...`);
  
  if (systemService) {
    systemService.cleanup();
  }
  
  if (server) {
    server.close();
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Initialize and start the MCP server
 */
async function startServer(): Promise<void> {
  try {
    logInfo('Starting Augment MCP Server', {
      version: config.version,
      name: config.name,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    });

    // Validate environment
    await validateEnvironment();

    // Create MCP server instance
    server = new McpServer({
      name: config.name,
      version: config.version,
    });

    // Initialize services
    systemService = new SystemService();

    // Register capabilities based on feature flags
    if (featureFlags.fileOperations) {
      logInfo('Registering file operation tools');
      registerTools(server);
    }

    if (featureFlags.fileResources) {
      logInfo('Registering file and system resources');
      registerResources(server);
    }

    if (featureFlags.codeReviewPrompts || featureFlags.documentationPrompts || featureFlags.debuggingPrompts) {
      logInfo('Registering AI-powered prompts');
      registerPrompts(server);
    }

    // Log registered capabilities
    logServerCapabilities();

    // Create transport and connect
    const transport = new StdioServerTransport();
    
    logInfo('Connecting to transport...');
    await server.connect(transport);
    
    logInfo('Augment MCP Server started successfully', {
      transport: 'stdio',
      capabilities: {
        tools: featureFlags.fileOperations,
        resources: featureFlags.fileResources,
        prompts: featureFlags.codeReviewPrompts || featureFlags.documentationPrompts,
      },
    });

    // Start health monitoring if enabled
    if (featureFlags.experimental.realTimeMonitoring) {
      startHealthMonitoring();
    }

  } catch (error) {
    logError('Failed to start server', error as Error);
    process.exit(1);
  }
}

/**
 * Validate the environment and configuration
 */
async function validateEnvironment(): Promise<void> {
  logInfo('Validating environment...');

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    throw new Error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
  }

  // Check memory limits
  const totalMemory = process.memoryUsage();
  if (totalMemory.heapUsed > performanceConfig.memory.maxHeapUsage * 0.8) {
    logWarn('High memory usage detected', { 
      heapUsed: totalMemory.heapUsed,
      maxHeapUsage: performanceConfig.memory.maxHeapUsage 
    });
  }

  // Validate security configuration
  if (securityConfig.maxFileSize <= 0) {
    throw new Error('Invalid security configuration: maxFileSize must be positive');
  }

  // Check write permissions for logs
  try {
    const fs = await import('fs-extra');
    await fs.ensureDir('./logs');
  } catch (error) {
    logWarn('Cannot create logs directory', { error });
  }

  logInfo('Environment validation completed');
}

/**
 * Log server capabilities and configuration
 */
function logServerCapabilities(): void {
  const capabilities = {
    tools: {
      fileOperations: featureFlags.fileOperations,
      systemInfo: featureFlags.systemInfo,
      processManagement: featureFlags.processManagement,
      networkInfo: featureFlags.networkInfo,
      codeAnalysis: featureFlags.codeAnalysis,
      searchOperations: featureFlags.searchOperations,
    },
    resources: {
      fileResources: featureFlags.fileResources,
      systemResources: featureFlags.systemResources,
      logResources: featureFlags.logResources,
    },
    prompts: {
      codeReview: featureFlags.codeReviewPrompts,
      documentation: featureFlags.documentationPrompts,
      debugging: featureFlags.debuggingPrompts,
    },
    experimental: featureFlags.experimental,
    security: {
      maxFileSize: securityConfig.maxFileSize,
      maxBatchSize: securityConfig.maxBatchSize,
      commandTimeout: securityConfig.commandTimeout,
      rateLimiting: securityConfig.rateLimiting.enabled,
    },
    performance: {
      cacheEnabled: performanceConfig.cache.enabled,
      maxConcurrentFileOps: performanceConfig.concurrency.maxConcurrentFileOps,
      maxConcurrentSearches: performanceConfig.concurrency.maxConcurrentSearches,
    },
  };

  logInfo('Server capabilities configured', capabilities);
}

/**
 * Start health monitoring (experimental feature)
 */
function startHealthMonitoring(): void {
  if (!systemService) return;

  logInfo('Starting health monitoring...');
  
  const healthCheckInterval = setInterval(async () => {
    try {
      const health = await systemService!.getHealthCheck();
      
      if (health.status !== 'healthy') {
        logWarn('System health check failed', { 
          status: health.status,
          checks: health.checks 
        });
      }
      
      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      if (heapUsagePercent > performanceConfig.memory.gcThreshold * 100) {
        logWarn('High memory usage detected', {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          heapUsagePercent: heapUsagePercent.toFixed(2),
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          logInfo('Forced garbage collection');
        }
      }
      
    } catch (error) {
      logError('Health monitoring error', error as Error);
    }
  }, 60000); // Check every minute

  // Clean up interval on shutdown
  process.on('exit', () => {
    clearInterval(healthCheckInterval);
  });
}

/**
 * Display usage information
 */
function showUsage(): void {
  console.log(`
Augment MCP Server v${config.version}

A comprehensive Model Context Protocol server for local system integration.

Usage:
  augment-mcp-server [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version information
  --config       Show current configuration

Environment Variables:
  LOG_LEVEL                    Set logging level (error, warn, info, debug)
  MAX_FILE_SIZE               Maximum file size for operations (bytes)
  MAX_BATCH_SIZE              Maximum batch size for operations
  COMMAND_TIMEOUT             Command execution timeout (ms)
  AUGMENT_ENABLED             Enable Augment AI integration (true/false)
  AUGMENT_API_ENDPOINT        Augment AI API endpoint URL
  FEATURE_FILE_OPERATIONS     Enable file operations (true/false)
  FEATURE_SYSTEM_INFO         Enable system info tools (true/false)
  EXPERIMENTAL_AI_INTEGRATION Enable experimental AI features (true/false)

Examples:
  # Start with debug logging
  LOG_LEVEL=debug augment-mcp-server
  
  # Start with Augment AI enabled
  AUGMENT_ENABLED=true AUGMENT_API_ENDPOINT=http://localhost:8080 augment-mcp-server
  
  # Start with limited features
  FEATURE_PROCESS_MANAGEMENT=false FEATURE_NETWORK_INFO=false augment-mcp-server

For more information, visit: https://github.com/your-repo/augment-mcp-server
`);
}

/**
 * Show version information
 */
function showVersion(): void {
  console.log(`${config.name} v${config.version}`);
  console.log(`Node.js ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
}

/**
 * Show current configuration
 */
function showConfig(): void {
  console.log('Current Configuration:');
  console.log(JSON.stringify({
    server: config,
    security: securityConfig,
    performance: performanceConfig,
    features: featureFlags,
  }, null, 2));
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showUsage();
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  showVersion();
  process.exit(0);
}

if (args.includes('--config')) {
  showConfig();
  process.exit(0);
}

// Start the server
startServer().catch((error) => {
  logError('Failed to start server', error);
  process.exit(1);
});
