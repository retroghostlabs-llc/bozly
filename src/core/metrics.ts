/**
 * Server Metrics Tracker
 * Tracks uptime, request counts, response times, and other health metrics
 */

export interface HealthMetrics {
  status: "ok" | "degraded" | "error";
  version: string;
  uptime: number; // in seconds
  startedAt: string; // ISO timestamp
  responseTime: number; // in ms
  requestCount: number;
  errorCount: number;
  memoryUsage: {
    used: number; // in MB
    total: number; // in MB
    percentage: number; // 0-100
  };
  apiEndpoints: number;
  timestamp: string; // ISO timestamp
}

class MetricsTracker {
  private startTime: number;
  private requestCount = 0;
  private errorCount = 0;
  private apiEndpoints = 0;
  private lastResponseTime = 0;

  constructor() {
    this.startTime = Date.now();
  }

  getStartedAt(): string {
    return new Date(this.startTime).toISOString();
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  recordRequest(responseTime: number, isError = false): void {
    this.requestCount++;
    this.lastResponseTime = responseTime;
    if (isError) {
      this.errorCount++;
    }
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  getErrorCount(): number {
    return this.errorCount;
  }

  getLastResponseTime(): number {
    return this.lastResponseTime;
  }

  setApiEndpoints(count: number): void {
    this.apiEndpoints = count;
  }

  getApiEndpoints(): number {
    return this.apiEndpoints;
  }

  getMemoryUsage(): { used: number; total: number; percentage: number } {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
    const heapTotalMB = Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100;
    const percentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 10000) / 100;

    return {
      used: heapUsedMB,
      total: heapTotalMB,
      percentage,
    };
  }

  getHealthMetrics(version: string): HealthMetrics {
    const memoryUsage = this.getMemoryUsage();

    return {
      status: "ok",
      version,
      uptime: this.getUptime(),
      startedAt: this.getStartedAt(),
      responseTime: this.getLastResponseTime(),
      requestCount: this.getRequestCount(),
      errorCount: this.getErrorCount(),
      memoryUsage,
      apiEndpoints: this.getApiEndpoints(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton instance
let instance: MetricsTracker | null = null;

export function initializeMetrics(): MetricsTracker {
  if (!instance) {
    instance = new MetricsTracker();
  }
  return instance;
}

export function getMetrics(): MetricsTracker {
  if (!instance) {
    instance = new MetricsTracker();
  }
  return instance;
}
