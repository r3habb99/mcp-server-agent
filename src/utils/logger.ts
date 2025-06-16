/**
 * Logging utility for the MCP server
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'augment-mcp-server' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
      })
    )
  }));
}

// Create a stream object for Morgan HTTP logging
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;

// Helper functions for structured logging
export const logError = (message: string, error?: Error, meta?: Record<string, unknown>) => {
  logger.error(message, { error: error?.stack || error, ...meta });
};

export const logInfo = (message: string, meta?: Record<string, unknown>) => {
  logger.info(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>) => {
  logger.debug(message, meta);
};

export const logWarn = (message: string, meta?: Record<string, unknown>) => {
  logger.warn(message, meta);
};

// Performance logging helper
export const logPerformance = (operation: string, startTime: number, meta?: Record<string, unknown>) => {
  const duration = Date.now() - startTime;
  logger.info(`Performance: ${operation}`, { duration, ...meta });
};

// Tool execution logging
export const logToolExecution = (toolName: string, params: Record<string, unknown>, duration: number, success: boolean) => {
  logger.info(`Tool executed: ${toolName}`, {
    tool: toolName,
    params,
    duration,
    success,
    type: 'tool_execution'
  });
};

// Resource access logging
export const logResourceAccess = (resourceUri: string, success: boolean, duration: number) => {
  logger.info(`Resource accessed: ${resourceUri}`, {
    resource: resourceUri,
    success,
    duration,
    type: 'resource_access'
  });
};

// Prompt execution logging
export const logPromptExecution = (promptName: string, args: Record<string, unknown>, success: boolean) => {
  logger.info(`Prompt executed: ${promptName}`, {
    prompt: promptName,
    args,
    success,
    type: 'prompt_execution'
  });
};
