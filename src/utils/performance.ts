/**
 * Performance monitoring and optimization utilities
 */

import { performance } from 'perf_hooks';
import { logInfo, logWarn, logDebug } from './logger.js';
import { performanceConfig } from '../server/config.js';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  memory?: NodeJS.MemoryUsage;
  metadata?: Record<string, any>;
}

interface ConcurrencyLimiter {
  maxConcurrent: number;
  current: number;
  queue: Array<() => void>;
}

/**
 * Performance monitor for tracking operation metrics
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000;
  private readonly concurrencyLimiters = new Map<string, ConcurrencyLimiter>();

  constructor() {
    // Initialize concurrency limiters
    this.concurrencyLimiters.set('fileOps', {
      maxConcurrent: performanceConfig.concurrency.maxConcurrentFileOps,
      current: 0,
      queue: [],
    });

    this.concurrencyLimiters.set('searches', {
      maxConcurrent: performanceConfig.concurrency.maxConcurrentSearches,
      current: 0,
      queue: [],
    });

    this.concurrencyLimiters.set('commands', {
      maxConcurrent: performanceConfig.concurrency.maxConcurrentCommands,
      current: 0,
      queue: [],
    });

    logDebug('Performance monitor initialized', {
      maxMetrics: this.maxMetrics,
      concurrencyLimits: Object.fromEntries(
        Array.from(this.concurrencyLimiters.entries()).map(([key, limiter]) => [
          key,
          limiter.maxConcurrent,
        ])
      ),
    });
  }

  /**
   * Start timing an operation
   */
  startTiming(name: string, metadata?: Record<string, any>): () => void {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    return () => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        name,
        duration,
        timestamp: Date.now(),
        memory: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        },
        metadata,
      };

      this.addMetric(metric);

      // Log slow operations
      if (duration > 1000) {
        logWarn('Slow operation detected', {
          name,
          duration: `${duration.toFixed(2)}ms`,
          memoryDelta: `${(metric.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          metadata,
        });
      } else {
        logDebug('Operation completed', {
          name,
          duration: `${duration.toFixed(2)}ms`,
          metadata,
        });
      }
    };
  }

  /**
   * Time an async operation
   */
  async timeOperation<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const endTiming = this.startTiming(name, metadata);
    try {
      const result = await operation();
      return result;
    } finally {
      endTiming();
    }
  }

  /**
   * Add a performance metric
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindowMs = 300000): {
    totalOperations: number;
    averageDuration: number;
    slowestOperations: PerformanceMetric[];
    operationCounts: Record<string, number>;
    memoryTrend: number;
  } {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(
      (m) => now - m.timestamp <= timeWindowMs
    );

    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        slowestOperations: [],
        operationCounts: {},
        memoryTrend: 0,
      };
    }

    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalDuration / recentMetrics.length;

    const slowestOperations = recentMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const operationCounts = recentMetrics.reduce((counts, m) => {
      counts[m.name] = (counts[m.name] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const memoryDeltas = recentMetrics
      .filter((m) => m.memory)
      .map((m) => m.memory!.heapUsed);
    const memoryTrend =
      memoryDeltas.length > 0
        ? memoryDeltas.reduce((sum, delta) => sum + delta, 0) / memoryDeltas.length
        : 0;

    return {
      totalOperations: recentMetrics.length,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowestOperations,
      operationCounts,
      memoryTrend: Math.round(memoryTrend / 1024 / 1024 * 100) / 100, // MB
    };
  }

  /**
   * Execute operation with concurrency limiting
   */
  async withConcurrencyLimit<T>(
    category: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const limiter = this.concurrencyLimiters.get(category);
    if (!limiter) {
      throw new Error(`Unknown concurrency category: ${category}`);
    }

    // Wait for available slot
    if (limiter.current >= limiter.maxConcurrent) {
      await new Promise<void>((resolve) => {
        limiter.queue.push(resolve);
      });
    }

    limiter.current++;

    try {
      const result = await operation();
      return result;
    } finally {
      limiter.current--;

      // Process queue
      const next = limiter.queue.shift();
      if (next) {
        next();
      }
    }
  }

  /**
   * Get concurrency statistics
   */
  getConcurrencyStats(): Record<string, {
    maxConcurrent: number;
    current: number;
    queued: number;
  }> {
    const stats: Record<string, any> = {};
    
    for (const [category, limiter] of this.concurrencyLimiters.entries()) {
      stats[category] = {
        maxConcurrent: limiter.maxConcurrent,
        current: limiter.current,
        queued: limiter.queue.length,
      };
    }

    return stats;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    logInfo('Performance metrics cleared');
  }
}

/**
 * Memory monitor for tracking memory usage
 */
export class MemoryMonitor {
  private readonly gcThreshold: number;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.gcThreshold = performanceConfig.memory.gcThreshold;
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs = 30000): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);

    logInfo('Memory monitoring started', { intervalMs, gcThreshold: this.gcThreshold });
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logInfo('Memory monitoring stopped');
    }
  }

  /**
   * Check current memory usage
   */
  private checkMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    if (heapUsagePercent > this.gcThreshold * 100) {
      logWarn('High memory usage detected', {
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        heapUsagePercent: `${heapUsagePercent.toFixed(2)}%`,
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        logInfo('Forced garbage collection');
      }
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): {
    heapUsed: number;
    heapTotal: number;
    heapUsagePercent: number;
    rss: number;
    external: number;
    arrayBuffers: number;
  } {
    const memoryUsage = process.memoryUsage();
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    return {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      heapUsagePercent: Math.round(heapUsagePercent * 100) / 100,
      rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100, // MB
      arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024 * 100) / 100, // MB
    };
  }
}

// Global instances
export const performanceMonitor = new PerformanceMonitor();
export const memoryMonitor = new MemoryMonitor();

/**
 * Performance decorator for methods
 */
export function timed(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.timeOperation(
        operationName,
        () => originalMethod.apply(this, args),
        { args: args.length }
      );
    };

    return descriptor;
  };
}

/**
 * Concurrency limiting decorator
 */
export function withConcurrencyLimit(category: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.withConcurrencyLimit(category, () =>
        originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

/**
 * Create a performance-monitored version of a function
 */
export function createTimedFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return performanceMonitor.timeOperation(
      name,
      () => fn(...args),
      { args: args.length }
    );
  };
}

/**
 * Create a concurrency-limited version of a function
 */
export function createConcurrencyLimitedFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  category: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return performanceMonitor.withConcurrencyLimit(category, () => fn(...args));
  };
}
