/**
 * Memory Metrics Tracker
 * Tracks size, usage, quality, and trends for memory files
 * Enables data-driven decisions about archival vs local DB migration
 */

import path from "path";
import fs from "fs/promises";

export interface MemoryFileMetric {
  timestamp: string;
  nodeId: string;
  filePath: string;
  fileSizeMB: number;
  entryCount: number;
  averageEntrySize: number;
  oldestEntry: string;
  newestEntry: string;
  usageFrequency: number;
  qualityScore: number;
}

export interface ArchiveScore {
  ageScore: number;
  qualityScore: number;
  usageScore: number;
  finalScore: number;
  shouldArchive: boolean;
  reason: string;
}

export interface TrendAnalysis {
  totalMetrics: number;
  growthTrend: "increasing" | "stable" | "decreasing";
  sizeTrendMB: { start: number; end: number; change: number };
  qualityTrend: "increasing" | "stable" | "decreasing";
  usageTrend: "increasing" | "stable" | "decreasing";
}

export interface MetricsStatistics {
  totalMemories: number;
  totalSizeMB: number;
  averageQuality: number;
  averageUsageFrequency: number;
  largestFile: { path: string; sizeMB: number };
  oldestEntry: string;
  newestEntry: string;
}

export interface SizeRecommendations {
  oversizedFiles: Array<{
    filePath: string;
    fileSizeMB: number;
  }>;
  recommendation: string;
}

export interface MemoryMetricsLog {
  entries: MemoryFileMetric[];
  lastCalculated: string;
  totalFiles?: number;
  totalSizeMB?: number;
}

/**
 * Generates human-readable reason for archival recommendation
 */
function generateArchiveReason(metric: {
  daysOld: number;
  qualityScore: number;
  usageFrequency: number;
}): string {
  const reasons: string[] = [];

  if (metric.daysOld > 60) {
    reasons.push("old");
  }
  if (metric.qualityScore < 0.5) {
    reasons.push("low quality");
  }
  if (metric.usageFrequency === 0) {
    reasons.push("unused");
  }

  return reasons.length > 0 ? reasons.join(", ") : "candidate for review";
}

/**
 * Calculates archive score for a memory file
 *
 * Weighted scoring: Age (25%) + Quality (35%) + Usage (40%)
 * - Age: 0 (new) to 1 (90+ days old)
 * - Quality: inverted so low quality = high score
 * - Usage: inverted so unused = high score
 * - Final: > 0.6 threshold = should archive
 */
export function calculateArchiveScore(metric: {
  timestamp: string;
  qualityScore: number;
  usageFrequency: number;
  daysOld: number;
}): ArchiveScore {
  const ageScore = Math.min(metric.daysOld / 90, 1);
  const qualityScore = 1 - metric.qualityScore;
  const usageScore = Math.max(1 - metric.usageFrequency / 10, 0);

  const finalScore = ageScore * 0.25 + qualityScore * 0.35 + usageScore * 0.4;
  const shouldArchive = finalScore > 0.6;
  const reason = generateArchiveReason(metric);

  return {
    ageScore,
    qualityScore,
    usageScore,
    finalScore,
    shouldArchive,
    reason,
  };
}

export class MemoryMetricsRecorder {
  private bozlyHome: string;
  private metricsPath: string;
  private metrics: MemoryMetricsLog = { entries: [], lastCalculated: "" };

  constructor(bozlyHome: string) {
    this.bozlyHome = bozlyHome;
    this.metricsPath = path.join(bozlyHome, "memory-metrics.json");
  }

  async initialize(): Promise<void> {
    try {
      const content = await fs.readFile(this.metricsPath, "utf-8");
      this.metrics = JSON.parse(content);
    } catch {
      // File doesn't exist yet, use empty metrics
      this.metrics = { entries: [], lastCalculated: "" };
    }
  }

  async recordMetric(metric: MemoryFileMetric): Promise<void> {
    // Ensure initialized
    if (!this.metrics.entries) {
      await this.initialize();
    }

    // Add new metric
    this.metrics.entries.push(metric);
    this.metrics.lastCalculated = new Date().toISOString();

    // Update summary stats
    this.metrics.totalFiles = this.metrics.entries.length;
    this.metrics.totalSizeMB = this.metrics.entries.reduce((sum, m) => sum + m.fileSizeMB, 0);

    // Persist to disk
    await fs.writeFile(this.metricsPath, JSON.stringify(this.metrics, null, 2));
  }

  async getMetricsByNodeId(nodeId: string): Promise<MemoryFileMetric[]> {
    await this.initialize();
    return this.metrics.entries.filter((m) => m.nodeId === nodeId);
  }

  async getAllMetrics(): Promise<MemoryFileMetric[]> {
    await this.initialize();
    return this.metrics.entries;
  }

  async getTrendAnalysis(days: number = 30, nodeId?: string): Promise<TrendAnalysis> {
    await this.initialize();

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    let filtered = this.metrics.entries.filter(
      (m) => new Date(m.timestamp).getTime() >= cutoffTime
    );

    if (nodeId) {
      filtered = filtered.filter((m) => m.nodeId === nodeId);
    }

    if (filtered.length < 2) {
      return {
        totalMetrics: filtered.length,
        growthTrend: "stable",
        sizeTrendMB: {
          start: filtered.length > 0 ? filtered[0].fileSizeMB : 0,
          end: filtered.length > 0 ? filtered[filtered.length - 1].fileSizeMB : 0,
          change: 0,
        },
        qualityTrend: "stable",
        usageTrend: "stable",
      };
    }

    // Sort by timestamp
    filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate size trend
    const startSize = filtered[0].fileSizeMB;
    const endSize = filtered[filtered.length - 1].fileSizeMB;
    const sizeChange = endSize - startSize;
    const growthTrend =
      sizeChange > 0.5 ? "increasing" : sizeChange < -0.5 ? "decreasing" : "stable";

    // Calculate quality trend
    const startQuality = filtered[0].qualityScore;
    const endQuality = filtered[filtered.length - 1].qualityScore;
    const qualityChange = endQuality - startQuality;
    const qualityTrend =
      qualityChange > 0.1 ? "increasing" : qualityChange < -0.1 ? "decreasing" : "stable";

    // Calculate usage trend
    const startUsage = filtered[0].usageFrequency;
    const endUsage = filtered[filtered.length - 1].usageFrequency;
    const usageChange = endUsage - startUsage;
    const usageTrend = usageChange > 1 ? "increasing" : usageChange < -1 ? "decreasing" : "stable";

    return {
      totalMetrics: filtered.length,
      growthTrend,
      sizeTrendMB: {
        start: startSize,
        end: endSize,
        change: sizeChange,
      },
      qualityTrend,
      usageTrend,
    };
  }

  async getStatistics(): Promise<MetricsStatistics> {
    await this.initialize();

    if (this.metrics.entries.length === 0) {
      return {
        totalMemories: 0,
        totalSizeMB: 0,
        averageQuality: 0,
        averageUsageFrequency: 0,
        largestFile: { path: "", sizeMB: 0 },
        oldestEntry: "",
        newestEntry: "",
      };
    }

    const totalSize = this.metrics.entries.reduce((sum, m) => sum + m.fileSizeMB, 0);
    const avgQuality =
      this.metrics.entries.reduce((sum, m) => sum + m.qualityScore, 0) /
      this.metrics.entries.length;
    const avgUsage =
      this.metrics.entries.reduce((sum, m) => sum + m.usageFrequency, 0) /
      this.metrics.entries.length;

    const largestFile = this.metrics.entries.reduce((max, m) =>
      m.fileSizeMB > max.fileSizeMB ? m : max
    );

    const oldestEntry = this.metrics.entries.reduce((min, m) =>
      m.oldestEntry < min.oldestEntry ? m : min
    );

    const newestEntry = this.metrics.entries.reduce((max, m) =>
      m.newestEntry > max.newestEntry ? m : max
    );

    return {
      totalMemories: this.metrics.entries.length,
      totalSizeMB: totalSize,
      averageQuality: avgQuality,
      averageUsageFrequency: avgUsage,
      largestFile: {
        path: largestFile.filePath,
        sizeMB: largestFile.fileSizeMB,
      },
      oldestEntry: oldestEntry.oldestEntry,
      newestEntry: newestEntry.newestEntry,
    };
  }

  async getArchivableCandidates(
    threshold: number = 0.6,
    nodeId?: string
  ): Promise<Array<MemoryFileMetric & { archiveScore: ArchiveScore }>> {
    await this.initialize();

    let filtered = this.metrics.entries;
    if (nodeId) {
      filtered = filtered.filter((m) => m.nodeId === nodeId);
    }

    const candidates = filtered
      .map((metric) => {
        const daysOld = Math.floor(
          (Date.now() - new Date(metric.timestamp).getTime()) / (24 * 60 * 60 * 1000)
        );

        const archiveScore = calculateArchiveScore({
          timestamp: metric.timestamp,
          qualityScore: metric.qualityScore,
          usageFrequency: metric.usageFrequency,
          daysOld,
        });

        return { ...metric, archiveScore };
      })
      .filter((m) => m.archiveScore.finalScore >= threshold)
      .sort((a, b) => b.archiveScore.finalScore - a.archiveScore.finalScore);

    return candidates;
  }

  async getSizeRecommendations(): Promise<SizeRecommendations> {
    await this.initialize();

    const oversizedFiles = this.metrics.entries
      .filter((m) => m.fileSizeMB > 5) // 5MB threshold
      .map((m) => ({
        filePath: m.filePath,
        fileSizeMB: m.fileSizeMB,
      }))
      .sort((a, b) => b.fileSizeMB - a.fileSizeMB);

    return {
      oversizedFiles,
      recommendation:
        oversizedFiles.length > 0
          ? "Consider using local database for oversized files"
          : "All memory files within size limits",
    };
  }
}

export default MemoryMetricsRecorder;
