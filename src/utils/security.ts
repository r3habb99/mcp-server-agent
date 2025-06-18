/**
 * Enhanced security utilities and middleware
 */

import path from 'path';
import fs from 'fs-extra';
import { logWarn, logError, logDebug } from './logger.js';
import { securityConfig } from '../server/config.js';
import { rateLimiter } from './rateLimiter.js';

/**
 * Enhanced path validation with additional security checks
 */
export class SecurityValidator {
  private static readonly DANGEROUS_PATTERNS = [
    /\.\./,                    // Path traversal
    /\/etc\/passwd/i,          // System files
    /\/etc\/shadow/i,          // System files
    /\/proc\//i,               // Process filesystem
    /\/sys\//i,                // System filesystem
    /\/dev\//i,                // Device files
    /\/boot\//i,               // Boot files
    /\/root\//i,               // Root directory
    /\\\\[a-z]+\$/i,          // Windows UNC paths
    /^[a-z]:\\/i,             // Windows drive paths
    /\0/,                      // Null bytes
    /[\x00-\x1f\x7f-\x9f]/,   // Control characters
  ];

  private static readonly DANGEROUS_COMMANDS = [
    'rm', 'rmdir', 'del', 'format', 'fdisk',
    'mkfs', 'dd', 'shutdown', 'reboot', 'halt',
    'poweroff', 'init', 'kill', 'killall',
    'sudo', 'su', 'passwd', 'chown', 'chmod',
    'mount', 'umount', 'crontab', 'at',
    'nc', 'netcat', 'telnet', 'ssh', 'scp',
    'wget', 'curl', 'ftp', 'tftp'
  ];

  /**
   * Enhanced path validation
   */
  static validatePath(inputPath: string, options: {
    allowAbsolute?: boolean;
    maxLength?: number;
    allowedExtensions?: string[];
    blockedExtensions?: string[];
  } = {}): string {
    const {
      allowAbsolute = false,
      maxLength = 1000,
      allowedExtensions,
      blockedExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif']
    } = options;

    // Basic validation
    if (!inputPath || typeof inputPath !== 'string') {
      throw new Error('Invalid path: must be a non-empty string');
    }

    if (inputPath.length > maxLength) {
      throw new Error(`Path too long: ${inputPath.length} characters (max: ${maxLength})`);
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(inputPath)) {
        logWarn('Dangerous path pattern detected', { path: inputPath, pattern: pattern.source });
        throw new Error('Path contains dangerous patterns');
      }
    }

    // Normalize the path
    const normalizedPath = path.normalize(inputPath);

    // Check for path traversal after normalization
    if (normalizedPath.includes('..')) {
      throw new Error('Path traversal detected after normalization');
    }

    // Validate absolute vs relative paths
    if (path.isAbsolute(normalizedPath) && !allowAbsolute) {
      throw new Error('Absolute paths not allowed');
    }

    // Check file extension
    const ext = path.extname(normalizedPath).toLowerCase();
    if (ext) {
      if (blockedExtensions.includes(ext)) {
        throw new Error(`File extension not allowed: ${ext}`);
      }
      
      if (allowedExtensions && !allowedExtensions.includes(ext)) {
        throw new Error(`File extension not in allowed list: ${ext}`);
      }
    }

    // Resolve to absolute path for final validation
    const absolutePath = path.resolve(normalizedPath);

    // Check against allowed directories
    const isInAllowedDir = securityConfig.allowedDirectories.some(allowedDir => {
      const resolvedAllowedDir = path.resolve(allowedDir);
      return absolutePath.startsWith(resolvedAllowedDir);
    });

    if (!isInAllowedDir) {
      throw new Error('Path not within allowed directories');
    }

    // Check against blocked directories
    const isInBlockedDir = securityConfig.blockedDirectories.some(blockedDir => {
      const resolvedBlockedDir = path.resolve(blockedDir);
      return absolutePath.startsWith(resolvedBlockedDir);
    });

    if (isInBlockedDir) {
      throw new Error('Path within blocked directory');
    }

    return absolutePath;
  }

  /**
   * Validate command for execution
   */
  static validateCommand(command: string, args: string[] = []): void {
    if (!command || typeof command !== 'string') {
      throw new Error('Invalid command: must be a non-empty string');
    }

    // Check for dangerous commands
    const baseCommand = command.split(' ')[0].toLowerCase();
    if (this.DANGEROUS_COMMANDS.includes(baseCommand)) {
      logWarn('Dangerous command blocked', { command, args });
      throw new Error(`Dangerous command not allowed: ${baseCommand}`);
    }

    // Check for shell injection patterns
    const shellPatterns = [
      /[;&|`$(){}[\]]/,         // Shell metacharacters
      /\$\(/,                   // Command substitution
      /`[^`]*`/,                // Backtick command substitution
      /\|\s*\w+/,               // Pipes
      /&&|\|\|/,                // Logical operators
      />\s*\/|<\s*\//,          // Redirection to system paths
    ];

    const fullCommand = `${command} ${args.join(' ')}`;
    for (const pattern of shellPatterns) {
      if (pattern.test(fullCommand)) {
        logWarn('Shell injection pattern detected', { command: fullCommand, pattern: pattern.source });
        throw new Error('Command contains potentially dangerous patterns');
      }
    }

    // Validate arguments
    for (const arg of args) {
      if (typeof arg !== 'string') {
        throw new Error('All command arguments must be strings');
      }
      
      if (arg.length > 1000) {
        throw new Error('Command argument too long');
      }
    }
  }

  /**
   * Validate file content for safety
   */
  static async validateFileContent(filePath: string, maxSize: number = securityConfig.maxFileSize): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size > maxSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize})`);
      }

      // Check for binary files that might be dangerous
      if (stats.size > 0) {
        const buffer = await fs.readFile(filePath, { encoding: null });
        const nullByteIndex = buffer.indexOf(0);
        
        if (nullByteIndex !== -1 && nullByteIndex < Math.min(1024, buffer.length)) {
          // File contains null bytes early, likely binary
          const ext = path.extname(filePath).toLowerCase();
          const allowedBinaryExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip'];
          
          if (!allowedBinaryExts.includes(ext)) {
            logWarn('Suspicious binary file detected', { path: filePath, size: stats.size });
            throw new Error('Binary file type not allowed');
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Cannot validate file: ${filePath}`);
    }
  }

  /**
   * Sanitize input data
   */
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
        .replace(/\0/g, '')                    // Remove null bytes
        .trim()
        .substring(0, 10000);                  // Limit length
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitizeInput(key);
        sanitized[sanitizedKey] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }
}

/**
 * Security middleware for MCP operations
 */
export class SecurityMiddleware {
  /**
   * Wrap an operation with security checks
   */
  static withSecurity<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options: {
      rateLimitId?: string;
      validateArgs?: boolean;
      sanitizeArgs?: boolean;
      logAccess?: boolean;
    } = {}
  ): (...args: T) => Promise<R> {
    const {
      rateLimitId,
      sanitizeArgs = true,
      logAccess = true
    } = options;

    return async (...args: T): Promise<R> => {
      const startTime = Date.now();
      
      try {
        // Rate limiting
        if (rateLimitId) {
          const rateLimit = rateLimiter.checkLimit(rateLimitId);
          if (!rateLimit.allowed) {
            throw new Error(`Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`);
          }
        }

        // Sanitize arguments
        let processedArgs = args;
        if (sanitizeArgs) {
          processedArgs = SecurityValidator.sanitizeInput(args) as T;
        }

        // Log access if enabled
        if (logAccess) {
          logDebug('Security middleware: operation started', {
            operation: operation.name,
            rateLimitId,
            argsCount: args.length
          });
        }

        // Execute the operation
        const result = await operation(...processedArgs);

        // Log successful completion
        if (logAccess) {
          logDebug('Security middleware: operation completed', {
            operation: operation.name,
            duration: Date.now() - startTime
          });
        }

        return result;
      } catch (error) {
        logError('Security middleware: operation failed', error as Error, {
          operation: operation.name,
          duration: Date.now() - startTime,
          rateLimitId
        });
        throw error;
      }
    };
  }

  /**
   * Create a secure version of a function with comprehensive protection
   */
  static createSecureFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      name: string;
      rateLimitId?: string;
      pathValidation?: boolean;
      commandValidation?: boolean;
      maxExecutionTime?: number;
    }
  ): (...args: T) => Promise<R> {
    const {
      name,
      rateLimitId,
      maxExecutionTime = 30000
    } = options;

    return this.withSecurity(
      async (...args: T): Promise<R> => {
        // Set execution timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timeout: ${name} exceeded ${maxExecutionTime}ms`));
          }, maxExecutionTime);
        });

        // Execute with timeout
        return Promise.race([
          fn(...args),
          timeoutPromise
        ]);
      },
      {
        rateLimitId: rateLimitId || name,
        validateArgs: true,
        sanitizeArgs: true,
        logAccess: true
      }
    );
  }
}

/**
 * Export security utilities
 */
export const security = {
  validator: SecurityValidator,
  middleware: SecurityMiddleware,
  rateLimiter
};
