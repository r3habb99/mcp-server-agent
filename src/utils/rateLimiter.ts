/**
 * Rate limiting implementation for MCP server
 */

import { logWarn, logDebug } from './logger.js';
import { securityConfig, performanceConfig } from '../server/config.js';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly enabled: boolean;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.windowMs = securityConfig.rateLimiting.windowMs;
    this.maxRequests = securityConfig.rateLimiting.maxRequests;
    this.enabled = securityConfig.rateLimiting.enabled;

    if (this.enabled) {
      // Clean up expired entries every minute
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 60000);

      logDebug('Rate limiter initialized', {
        windowMs: this.windowMs,
        maxRequests: this.maxRequests,
        enabled: this.enabled
      });
    }
  }

  /**
   * Check if a request should be allowed
   */
  checkLimit(identifier: string): RateLimitResult {
    if (!this.enabled) {
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: Date.now() + this.windowMs
      };
    }

    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry) {
      // First request from this identifier
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
        firstRequest: now
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }

    // Check if the window has expired
    if (now >= entry.resetTime) {
      // Reset the window
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
        firstRequest: now
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }

    // Within the current window
    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      logWarn('Rate limit exceeded', {
        identifier,
        count: entry.count,
        maxRequests: this.maxRequests,
        resetTime: entry.resetTime
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }

    // Increment the count
    entry.count++;
    this.store.set(identifier, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Get current status for an identifier
   */
  getStatus(identifier: string): RateLimitResult {
    if (!this.enabled) {
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: Date.now() + this.windowMs
      };
    }

    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now >= entry.resetTime) {
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs
      };
    }

    return {
      allowed: entry.count < this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetTime: entry.resetTime,
      retryAfter: entry.count >= this.maxRequests ? Math.ceil((entry.resetTime - now) / 1000) : undefined
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
    logDebug('Rate limit reset', { identifier });
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [identifier, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(identifier);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logDebug('Rate limiter cleanup completed', {
        entriesRemoved: cleaned,
        remainingEntries: this.store.size
      });
    }
  }

  /**
   * Get statistics about the rate limiter
   */
  getStats(): {
    enabled: boolean;
    activeEntries: number;
    windowMs: number;
    maxRequests: number;
  } {
    return {
      enabled: this.enabled,
      activeEntries: this.store.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests
    };
  }

  /**
   * Shutdown the rate limiter
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
    logDebug('Rate limiter shutdown');
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware for MCP operations
 */
export function withRateLimit<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  identifier: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const result = rateLimiter.checkLimit(identifier);

    if (!result.allowed) {
      const error = new Error(`Rate limit exceeded. Try again in ${result.retryAfter} seconds.`);
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      (error as any).retryAfter = result.retryAfter;
      throw error;
    }

    return operation(...args);
  };
}

/**
 * Create a rate-limited version of a function
 */
export function createRateLimitedFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  getIdentifier: (...args: T) => string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const identifier = getIdentifier(...args);
    const result = rateLimiter.checkLimit(identifier);

    if (!result.allowed) {
      const error = new Error(`Rate limit exceeded. Try again in ${result.retryAfter} seconds.`);
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      (error as any).retryAfter = result.retryAfter;
      throw error;
    }

    return fn(...args);
  };
}
