/**
 * Performance monitoring and optimization service
 */

import { logInfo, logWarn, logDebug } from '../utils/logger.js';
import { performanceMonitor, memoryMonitor } from '../utils/performance.js';
import { fileCache, systemInfoCache, searchCache } from '../utils/cache.js';
import { rateLimiter } from '../utils/rateLimiter.js';

interface PerformanceReport {
  timestamp: Date;
  uptime: number;
  performance: {
    totalOperations: number;
    averageDuration: number;
    slowestOperations: any[];
    operationCounts: Record<string, number>;
    memoryTrend: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    heapUsagePercent: number;
    rss: number;
    external: number;
    arrayBuffers: number;
  };
  cache: {
    fileCache: any;
    systemInfoCache: any;
    searchCache: any;
  };
  concurrency: Record<string, {
    maxConcurrent: number;
    current: number;
    queued: number;
  }>;
  rateLimiting: {
    enabled: boolean;
    activeEntries: number;
    windowMs: number;
    maxRequests: number;
  };
}

export class PerformanceService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private reportHistory: PerformanceReport[] = [];
  private readonly maxHistorySize = 100;

  constructor() {
    logDebug('Performance service initialized');
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs = 60000): void {
    if (this.monitoringInterval) {
      logWarn('Performance monitoring already started');
      return;
    }

    // Start memory monitoring
    memoryMonitor.startMonitoring(30000);

    // Start periodic performance reporting
    this.monitoringInterval = setInterval(() => {
      this.generateReport();
    }, intervalMs);

    logInfo('Performance monitoring started', { intervalMs });
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    memoryMonitor.stopMonitoring();
    logInfo('Performance monitoring stopped');
  }

  /**
   * Generate a performance report
   */
  generateReport(): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: new Date(),
      uptime: process.uptime(),
      performance: performanceMonitor.getStats(),
      memory: memoryMonitor.getMemoryStats(),
      cache: {
        fileCache: fileCache.getStats(),
        systemInfoCache: systemInfoCache.getStats(),
        searchCache: searchCache.getStats(),
      },
      concurrency: performanceMonitor.getConcurrencyStats(),
      rateLimiting: rateLimiter.getStats(),
    };

    // Add to history
    this.reportHistory.push(report);
    if (this.reportHistory.length > this.maxHistorySize) {
      this.reportHistory = this.reportHistory.slice(-this.maxHistorySize);
    }

    // Log performance warnings
    this.checkPerformanceThresholds(report);

    return report;
  }

  /**
   * Get the latest performance report
   */
  getLatestReport(): PerformanceReport | null {
    return this.reportHistory.length > 0 
      ? this.reportHistory[this.reportHistory.length - 1] 
      : null;
  }

  /**
   * Get performance history
   */
  getReportHistory(limit?: number): PerformanceReport[] {
    const reports = this.reportHistory;
    return limit ? reports.slice(-limit) : reports;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageResponseTime: number;
    cacheHitRate: number;
    memoryUsageTrend: number;
    errorRate: number;
    topSlowOperations: string[];
  } {
    if (this.reportHistory.length === 0) {
      return {
        averageResponseTime: 0,
        cacheHitRate: 0,
        memoryUsageTrend: 0,
        errorRate: 0,
        topSlowOperations: [],
      };
    }

    const recentReports = this.reportHistory.slice(-10); // Last 10 reports
    
    const avgResponseTime = recentReports.reduce(
      (sum, report) => sum + report.performance.averageDuration, 0
    ) / recentReports.length;

    const avgCacheHitRate = recentReports.reduce((sum, report) => {
      const totalHitRate = (
        report.cache.fileCache.hitRate +
        report.cache.systemInfoCache.hitRate +
        report.cache.searchCache.hitRate
      ) / 3;
      return sum + totalHitRate;
    }, 0) / recentReports.length;

    const memoryTrend = recentReports.reduce(
      (sum, report) => sum + report.performance.memoryTrend, 0
    ) / recentReports.length;

    // Get top slow operations from the latest report
    const latestReport = recentReports[recentReports.length - 1];
    const topSlowOperations = latestReport.performance.slowestOperations
      .slice(0, 5)
      .map(op => op.name);

    return {
      averageResponseTime: Math.round(avgResponseTime * 100) / 100,
      cacheHitRate: Math.round(avgCacheHitRate * 100) / 100,
      memoryUsageTrend: Math.round(memoryTrend * 100) / 100,
      errorRate: 0, // TODO: Implement error tracking
      topSlowOperations,
    };
  }

  /**
   * Optimize performance based on current metrics
   */
  optimizePerformance(): {
    actions: string[];
    recommendations: string[];
  } {
    const actions: string[] = [];
    const recommendations: string[] = [];
    const latestReport = this.getLatestReport();

    if (!latestReport) {
      return { actions, recommendations };
    }

    // Memory optimization
    if (latestReport.memory.heapUsagePercent > 80) {
      actions.push('Triggered garbage collection');
      if (global.gc) {
        global.gc();
      }
      
      recommendations.push('Consider increasing heap size or reducing cache sizes');
    }

    // Cache optimization
    const fileCacheHitRate = latestReport.cache.fileCache.hitRate;
    if (fileCacheHitRate < 50) {
      recommendations.push('File cache hit rate is low - consider increasing cache TTL');
    }

    // Concurrency optimization
    const concurrencyStats = latestReport.concurrency;
    for (const [category, stats] of Object.entries(concurrencyStats)) {
      if (stats.queued > stats.maxConcurrent) {
        recommendations.push(`High queue for ${category} - consider increasing concurrency limit`);
      }
    }

    // Performance optimization
    if (latestReport.performance.averageDuration > 1000) {
      recommendations.push('Average operation duration is high - investigate slow operations');
    }

    logInfo('Performance optimization completed', { 
      actionsCount: actions.length, 
      recommendationsCount: recommendations.length 
    });

    return { actions, recommendations };
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    fileCache.clear();
    systemInfoCache.clear();
    searchCache.clear();
    logInfo('All caches cleared');
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    performanceMonitor.clearMetrics();
    this.reportHistory = [];
    logInfo('Performance metrics reset');
  }

  /**
   * Check performance thresholds and log warnings
   */
  private checkPerformanceThresholds(report: PerformanceReport): void {
    // Memory threshold
    if (report.memory.heapUsagePercent > 85) {
      logWarn('High memory usage detected', {
        heapUsagePercent: report.memory.heapUsagePercent,
        heapUsed: `${report.memory.heapUsed}MB`,
      });
    }

    // Response time threshold
    if (report.performance.averageDuration > 2000) {
      logWarn('High average response time detected', {
        averageDuration: `${report.performance.averageDuration}ms`,
        slowestOperations: report.performance.slowestOperations.slice(0, 3),
      });
    }

    // Cache hit rate threshold
    const avgCacheHitRate = (
      report.cache.fileCache.hitRate +
      report.cache.systemInfoCache.hitRate +
      report.cache.searchCache.hitRate
    ) / 3;

    if (avgCacheHitRate < 30) {
      logWarn('Low cache hit rate detected', {
        averageHitRate: `${avgCacheHitRate.toFixed(2)}%`,
        fileCacheHitRate: `${report.cache.fileCache.hitRate}%`,
        systemCacheHitRate: `${report.cache.systemInfoCache.hitRate}%`,
        searchCacheHitRate: `${report.cache.searchCache.hitRate}%`,
      });
    }

    // Concurrency queue threshold
    for (const [category, stats] of Object.entries(report.concurrency)) {
      if (stats.queued > 5) {
        logWarn('High concurrency queue detected', {
          category,
          queued: stats.queued,
          current: stats.current,
          maxConcurrent: stats.maxConcurrent,
        });
      }
    }
  }

  /**
   * Shutdown the performance service
   */
  shutdown(): void {
    this.stopMonitoring();
    this.clearAllCaches();
    logInfo('Performance service shutdown');
  }
}
