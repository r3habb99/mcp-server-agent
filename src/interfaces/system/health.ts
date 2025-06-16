/**
 * System health and logging interfaces
 */

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  meta?: Record<string, unknown>;
}

/**
 * Health check interface
 */
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, {
    status: 'pass' | 'fail';
    message?: string;
    duration?: number;
  }>;
  timestamp: Date;
}
