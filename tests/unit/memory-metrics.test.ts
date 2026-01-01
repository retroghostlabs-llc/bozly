/**
 * Memory Metrics Unit Tests
 *
 * Comprehensive tests for MemoryMetrics tracking system covering:
 * - Recording memory file metrics (size, entries, quality, usage)
 * - Calculating archive scores (quality + age + usage weighted)
 * - Retrieving metrics by nodeId and date range
 * - Metrics trend analysis (growth, stability, decline)
 * - Archive recommendations (which files should be archived)
 * - Metrics persistence (save/load from disk)
 * - Statistics and reporting
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs/promises";
import { createTempDir, getTempDir, cleanupTempDir } from "../conftest.js";

describe("Memory Metrics Tracking", () => {
  let tempDir: string;
  let bozlyHome: string;
  let metricsPath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    bozlyHome = path.join(tempDir, ".bozly");
    metricsPath = path.join(bozlyHome, "memory-metrics.json");

    // Create basic directory structure
    await fs.mkdir(bozlyHome, { recursive: true });
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  describe("MemoryMetricsRecorder", () => {
    it("should record a memory file metric", async () => {
      // This test will FAIL because MemoryMetricsRecorder doesn't exist yet
      const { MemoryMetricsRecorder } = await import(
        "../../dist/memory/metrics.js"
      );

      const recorder = new MemoryMetricsRecorder(bozlyHome);

      const metric = {
        timestamp: new Date().toISOString(),
        nodeId: "music-vault",
        filePath: "~/.bozly/sessions/music-vault/2025/01/15/abc123/memory.md",
        fileSizeMB: 2.5,
        entryCount: 145,
        averageEntrySize: 18,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-15T10:30:00Z",
        usageFrequency: 5,
        qualityScore: 0.82,
      };

      await recorder.recordMetric(metric);

      // Verify metrics file exists
      const metricsFile = await fs.readFile(metricsPath, "utf-8");
      const metrics = JSON.parse(metricsFile);

      expect(metrics.entries).toHaveLength(1);
      expect(metrics.entries[0].nodeId).toBe("music-vault");
      expect(metrics.entries[0].fileSizeMB).toBe(2.5);
    });

    it("should append multiple metrics", async () => {
      const { MemoryMetricsRecorder } = await import(
        "../../dist/memory/metrics.js"
      );

      const recorder = new MemoryMetricsRecorder(bozlyHome);

      const metric1 = {
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        nodeId: "music-vault",
        filePath: "memory1.md",
        fileSizeMB: 2.0,
        entryCount: 100,
        averageEntrySize: 20,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-14T00:00:00Z",
        usageFrequency: 3,
        qualityScore: 0.75,
      };

      const metric2 = {
        timestamp: new Date().toISOString(),
        nodeId: "music-vault",
        filePath: "memory1.md",
        fileSizeMB: 2.5,
        entryCount: 145,
        averageEntrySize: 18,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-15T10:30:00Z",
        usageFrequency: 5,
        qualityScore: 0.82,
      };

      await recorder.recordMetric(metric1);
      await recorder.recordMetric(metric2);

      const metricsFile = await fs.readFile(metricsPath, "utf-8");
      const metrics = JSON.parse(metricsFile);

      expect(metrics.entries).toHaveLength(2);
      expect(metrics.entries[1].fileSizeMB).toBe(2.5);
    });
  });

  describe("Archive Score Calculation", () => {
    it("should calculate archive score (age + quality + usage weighted)", async () => {
      const { calculateArchiveScore } = await import(
        "../../dist/memory/metrics.js"
      );

      // Old, low-quality, unused memory → HIGH archive score (archive it!)
      const oldUnused = {
        timestamp: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days old
        qualityScore: 0.3,
        usageFrequency: 0,
        daysOld: 90,
      };

      const score = calculateArchiveScore(oldUnused);

      // Expected: high score because it's old, low quality, unused
      expect(score.finalScore).toBeGreaterThan(0.7);
      expect(score.shouldArchive).toBe(true);
      expect(score.reason).toContain("old");
    });

    it("should NOT archive new, high-quality, frequently-used memories", async () => {
      const { calculateArchiveScore } = await import(
        "../../dist/memory/metrics.js"
      );

      const recent = {
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days old
        qualityScore: 0.95,
        usageFrequency: 10,
        daysOld: 2,
      };

      const score = calculateArchiveScore(recent);

      expect(score.finalScore).toBeLessThan(0.4);
      expect(score.shouldArchive).toBe(false);
    });

    it("should balance age, quality, and usage in scoring", async () => {
      const { calculateArchiveScore } = await import(
        "../../dist/memory/metrics.js"
      );

      // Old (60 days) but high quality (0.85) and moderate usage (5)
      const balanced = {
        timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        qualityScore: 0.85,
        usageFrequency: 5,
        daysOld: 60,
      };

      const score = calculateArchiveScore(balanced);

      // Should be borderline - high quality keeps it, but age pushes toward archive
      expect(score.finalScore).toBeGreaterThan(0.4);
      expect(score.finalScore).toBeLessThan(0.7);
    });

    it("should weight usage frequency highly", async () => {
      const { calculateArchiveScore } = await import(
        "../../dist/memory/metrics.js"
      );

      const frequentlyUsed = {
        timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        qualityScore: 0.5, // Low quality
        usageFrequency: 15, // Frequently used!
        daysOld: 45,
      };

      const score = calculateArchiveScore(frequentlyUsed);

      // High usage should keep it despite low quality
      expect(score.finalScore).toBeLessThan(0.6);
      expect(score.shouldArchive).toBe(false);
    });
  });

  describe("Metrics Queries", () => {
    it("should retrieve metrics for a specific nodeId", async () => {
      const { MemoryMetricsRecorder } = await import(
        "../../dist/memory/metrics.js"
      );

      const recorder = new MemoryMetricsRecorder(bozlyHome);

      // Record metrics for two nodes
      await recorder.recordMetric({
        timestamp: new Date().toISOString(),
        nodeId: "music-vault",
        filePath: "memory1.md",
        fileSizeMB: 2.0,
        entryCount: 100,
        averageEntrySize: 20,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-15T00:00:00Z",
        usageFrequency: 3,
        qualityScore: 0.75,
      });

      await recorder.recordMetric({
        timestamp: new Date().toISOString(),
        nodeId: "journal-vault",
        filePath: "memory2.md",
        fileSizeMB: 1.5,
        entryCount: 80,
        averageEntrySize: 19,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-15T00:00:00Z",
        usageFrequency: 2,
        qualityScore: 0.68,
      });

      const musicMetrics = await recorder.getMetricsByNodeId("music-vault");

      expect(musicMetrics).toHaveLength(1);
      expect(musicMetrics[0].nodeId).toBe("music-vault");
    });

    it("should get metrics trend over 30 days", async () => {
      const { MemoryMetricsRecorder } = await import(
        "../../dist/memory/metrics.js"
      );

      const recorder = new MemoryMetricsRecorder(bozlyHome);

      // Record metrics over 3 days showing growth
      const now = Date.now();

      await recorder.recordMetric({
        timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        nodeId: "vault",
        filePath: "memory.md",
        fileSizeMB: 1.0,
        entryCount: 50,
        averageEntrySize: 20,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-13T00:00:00Z",
        usageFrequency: 1,
        qualityScore: 0.5,
      });

      await recorder.recordMetric({
        timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
        nodeId: "vault",
        filePath: "memory.md",
        fileSizeMB: 1.8,
        entryCount: 90,
        averageEntrySize: 20,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-14T00:00:00Z",
        usageFrequency: 3,
        qualityScore: 0.65,
      });

      await recorder.recordMetric({
        timestamp: new Date(now).toISOString(),
        nodeId: "vault",
        filePath: "memory.md",
        fileSizeMB: 2.5,
        entryCount: 145,
        averageEntrySize: 18,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-15T00:00:00Z",
        usageFrequency: 5,
        qualityScore: 0.82,
      });

      const trend = await recorder.getTrendAnalysis(30, "vault");

      expect(trend.totalMetrics).toBe(3);
      expect(trend.growthTrend).toBe("increasing");
      expect(trend.sizeTrendMB).toEqual({ start: 1.0, end: 2.5, change: 1.5 });
      expect(trend.qualityTrend).toBe("increasing");
    });
  });

  describe("Metrics Statistics", () => {
    it("should calculate total size across all memories", async () => {
      const { MemoryMetricsRecorder } = await import(
        "../../dist/memory/metrics.js"
      );

      const recorder = new MemoryMetricsRecorder(bozlyHome);

      await recorder.recordMetric({
        timestamp: new Date().toISOString(),
        nodeId: "vault1",
        filePath: "memory1.md",
        fileSizeMB: 2.0,
        entryCount: 100,
        averageEntrySize: 20,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-15T00:00:00Z",
        usageFrequency: 3,
        qualityScore: 0.75,
      });

      await recorder.recordMetric({
        timestamp: new Date().toISOString(),
        nodeId: "vault2",
        filePath: "memory2.md",
        fileSizeMB: 1.5,
        entryCount: 80,
        averageEntrySize: 19,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-15T00:00:00Z",
        usageFrequency: 2,
        qualityScore: 0.68,
      });

      const stats = await recorder.getStatistics();

      expect(stats.totalMemories).toBe(2);
      expect(stats.totalSizeMB).toBe(3.5);
      expect(stats.averageQuality).toBeCloseTo(0.715, 1);
    });

    it("should identify archivable memories by score", async () => {
      const { MemoryMetricsRecorder } = await import(
        "../../dist/memory/metrics.js"
      );

      const recorder = new MemoryMetricsRecorder(bozlyHome);

      // Old, low-quality memory
      await recorder.recordMetric({
        timestamp: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        nodeId: "vault",
        filePath: "old-memory.md",
        fileSizeMB: 4.8,
        entryCount: 200,
        averageEntrySize: 24,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-01T00:00:00Z", // No updates
        usageFrequency: 0,
        qualityScore: 0.35,
      });

      // Recent, high-quality memory
      await recorder.recordMetric({
        timestamp: new Date().toISOString(),
        nodeId: "vault",
        filePath: "new-memory.md",
        fileSizeMB: 2.0,
        entryCount: 100,
        averageEntrySize: 20,
        oldestEntry: "2025-01-15T00:00:00Z",
        newestEntry: "2025-01-15T00:00:00Z",
        usageFrequency: 10,
        qualityScore: 0.95,
      });

      const archivable = await recorder.getArchivableCandidates(
        0.6, // threshold
        "vault"
      );

      expect(archivable).toHaveLength(1);
      expect(archivable[0].filePath).toBe("old-memory.md");
      expect(archivable[0].archiveScore.reason).toContain("low");
    });
  });

  describe("Metrics Persistence", () => {
    it("should load existing metrics from disk", async () => {
      const { MemoryMetricsRecorder } = await import(
        "../../dist/memory/metrics.js"
      );

      // Write initial metrics file
      const initialMetrics = {
        entries: [
          {
            timestamp: new Date().toISOString(),
            nodeId: "vault",
            filePath: "memory.md",
            fileSizeMB: 2.0,
            entryCount: 100,
            averageEntrySize: 20,
            oldestEntry: "2025-01-01T00:00:00Z",
            newestEntry: "2025-01-15T00:00:00Z",
            usageFrequency: 3,
            qualityScore: 0.75,
          },
        ],
        lastCalculated: new Date().toISOString(),
      };

      await fs.writeFile(metricsPath, JSON.stringify(initialMetrics, null, 2));

      const recorder = new MemoryMetricsRecorder(bozlyHome);
      await recorder.initialize();

      const loaded = await recorder.getAllMetrics();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].nodeId).toBe("vault");
    });

    it("should persist metrics to disk after recording", async () => {
      const { MemoryMetricsRecorder } = await import(
        "../../dist/memory/metrics.js"
      );

      const recorder = new MemoryMetricsRecorder(bozlyHome);

      await recorder.recordMetric({
        timestamp: new Date().toISOString(),
        nodeId: "vault",
        filePath: "memory.md",
        fileSizeMB: 2.5,
        entryCount: 145,
        averageEntrySize: 18,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-15T10:30:00Z",
        usageFrequency: 5,
        qualityScore: 0.82,
      });

      // Verify file exists on disk
      const exists = await fs
        .access(metricsPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);

      // Verify content is valid JSON
      const content = await fs.readFile(metricsPath, "utf-8");
      const data = JSON.parse(content);

      expect(data.entries).toBeDefined();
      expect(data.lastCalculated).toBeDefined();
    });
  });

  describe("Size Threshold Recommendations", () => {
    it("should flag memory files exceeding 5MB", async () => {
      const { MemoryMetricsRecorder } = await import(
        "../../dist/memory/metrics.js"
      );

      const recorder = new MemoryMetricsRecorder(bozlyHome);

      await recorder.recordMetric({
        timestamp: new Date().toISOString(),
        nodeId: "vault",
        filePath: "oversized-memory.md",
        fileSizeMB: 5.2, // Over 5MB threshold
        entryCount: 300,
        averageEntrySize: 17,
        oldestEntry: "2025-01-01T00:00:00Z",
        newestEntry: "2025-01-15T10:30:00Z",
        usageFrequency: 2,
        qualityScore: 0.6,
      });

      const recommendations = await recorder.getSizeRecommendations();

      expect(recommendations.oversizedFiles).toHaveLength(1);
      expect(recommendations.oversizedFiles[0].filePath).toBe(
        "oversized-memory.md"
      );
      expect(recommendations.recommendation).toBe(
        "Consider using local database for oversized files"
      );
    });
  });
});
