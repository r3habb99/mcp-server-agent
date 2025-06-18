/**
 * Caching utilities for MCP server performance optimization
 */

import { logDebug, logInfo, logWarn } from './logger.js';
import { performanceConfig } from '../server/config.js';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * LRU Cache with TTL support and memory management
 */
export class LRUCache<T> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly enabled: boolean;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(options?: {
    maxSize?: number;
    ttl?: number;
    enabled?: boolean;
    cleanupIntervalMs?: number;
  }) {
    this.maxSize = options?.maxSize ?? performanceConfig.cache.maxSize;
    this.ttl = options?.ttl ?? performanceConfig.cache.ttl;
    this.enabled = options?.enabled ?? performanceConfig.cache.enabled;

    if (this.enabled) {
      // Clean up expired entries periodically
      const cleanupInterval = options?.cleanupIntervalMs ?? 60000; // 1 minute
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, cleanupInterval);

      logDebug('Cache initialized', {
        maxSize: this.maxSize,
        ttl: this.ttl,
        enabled: this.enabled,
      });
    }
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    if (!this.enabled) return undefined;

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    if (!this.enabled) return;

    const now = Date.now();
    const size = this.estimateSize(value);
    
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Evict entries if cache is full
    while (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      size,
    };

    this.cache.set(key, entry);
    
    logDebug('Cache entry added', { key, size, cacheSize: this.cache.size });
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    if (!this.enabled) return false;
    
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    if (!this.enabled) return false;
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
    logInfo('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    let memoryUsage = 0;
    for (const entry of this.cache.values()) {
      memoryUsage += entry.size;
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage,
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.stats.evictions++;
      logDebug('Cache entry evicted (LRU)', { key: firstKey });
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logDebug('Cache cleanup completed', {
        entriesRemoved: cleaned,
        remainingEntries: this.cache.size,
      });
    }
  }

  /**
   * Estimate memory size of a value
   */
  private estimateSize(value: T): number {
    try {
      if (typeof value === 'string') {
        return value.length * 2; // UTF-16 encoding
      }
      
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value).length * 2;
      }
      
      return 64; // Default size for primitives
    } catch {
      return 64; // Fallback size
    }
  }

  /**
   * Shutdown the cache
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    logDebug('Cache shutdown');
  }
}

/**
 * Cache decorator for methods
 */
export function cached<T extends any[], R>(
  cache: LRUCache<R>,
  keyGenerator: (...args: T) => string,
  options?: { ttl?: number }
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const cacheKey = keyGenerator(...args);
      
      // Try to get from cache
      const cached = cache.get(cacheKey);
      if (cached !== undefined) {
        logDebug('Cache hit', { method: propertyKey, key: cacheKey });
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      cache.set(cacheKey, result);
      logDebug('Cache miss - stored result', { method: propertyKey, key: cacheKey });
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Create a cached version of a function
 */
export function createCachedFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  cache: LRUCache<R>,
  keyGenerator: (...args: T) => string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const cacheKey = keyGenerator(...args);
    
    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Execute original function
    const result = await fn(...args);
    
    // Store in cache
    cache.set(cacheKey, result);
    
    return result;
  };
}

// Global cache instances
export const fileCache = new LRUCache<string>({
  maxSize: performanceConfig.cache.maxSize,
  ttl: performanceConfig.cache.ttl,
});

export const systemInfoCache = new LRUCache<any>({
  maxSize: 50,
  ttl: 30000, // 30 seconds for system info
});

export const searchCache = new LRUCache<any[]>({
  maxSize: 100,
  ttl: performanceConfig.cache.ttl,
});
