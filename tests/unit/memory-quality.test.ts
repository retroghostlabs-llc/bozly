/**
 * Memory Quality Scoring Tests
 *
 * Session 169: Comprehensive test coverage for memory quality and ranking
 * Test categories:
 * 1. Recency score calculation
 * 2. Usage weight calculation
 * 3. Ranking score algorithm
 * 4. Auto-quality scoring
 * 5. Usage tracking updates
 * 6. Memory ranking
 * 7. Quality filtering
 * 8. Top memory loading
 * 9. Configuration handling
 * 10. Integration tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateRecencyScore,
  calculateUsageWeight,
  calculateMemoryRankingScore,
  autoCalculateQualityScore,
  updateUsageTracking,
  rankMemories,
  filterByQuality,
  loadTopMemories,
  DEFAULT_QUALITY_CONFIG,
} from "../../src/core/memory-quality.js";
import { MemoryIndexEntry, MemoryQualityScore } from "../../src/core/types.js";

/**
 * Helper to create test memory entries
 */
function createTestMemory(overrides: Partial<MemoryIndexEntry> = {}): MemoryIndexEntry {
  return {
    sessionId: "session-123",
    nodeId: "music",
    nodeName: "Music Vault",
    timestamp: new Date().toISOString(),
    command: "album-review",
    summary: "Test memory",
    tags: ["music", "review"],
    filePath: "/test/memory.md",
    quality: {
      overall: 0.75,
      relevanceToCommand: 0.8,
      completeness: 0.7,
      accuracy: 0.75,
    },
    usage: {
      timesUsed: 2,
      accessTrend: "stable",
    },
    ...overrides,
  };
}

describe("Memory Quality Scoring", () => {
  describe("calculateRecencyScore", () => {
    it("should return 1.0 for memories created today", () => {
      const now = new Date().toISOString();
      const score = calculateRecencyScore(now);
      expect(score).toBeGreaterThan(0.99); // Allow tiny float variance
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it("should return 1.0 for memories less than 1 day old", () => {
      const yesterday = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const score = calculateRecencyScore(yesterday);
      expect(score).toBeGreaterThanOrEqual(0.99);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it("should return lower score for older memories", () => {
      const today = new Date().toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const scoreToday = calculateRecencyScore(today);
      const score30 = calculateRecencyScore(thirtyDaysAgo);
      const score90 = calculateRecencyScore(ninetyDaysAgo);

      expect(scoreToday).toBeGreaterThan(score30);
      expect(score30).toBeGreaterThan(score90);
    });

    it("should return 0.1 for memories older than maxAgeDays", () => {
      const veryOld = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
      const score = calculateRecencyScore(veryOld, 365);
      expect(score).toBe(0.1); // Minimum score for old memories
    });

    it("should respect custom maxAgeDays parameter", () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const score30 = calculateRecencyScore(ninetyDaysAgo, 30);
      const score365 = calculateRecencyScore(ninetyDaysAgo, 365);

      expect(score30).toBeLessThan(score365);
    });

    it("should decay linearly between 1 day and maxAgeDays", () => {
      const midpoint = new Date(Date.now() - 182.5 * 24 * 60 * 60 * 1000).toISOString();
      const score = calculateRecencyScore(midpoint, 365);

      // At midpoint (182.5 days out of 364), score should be around 0.55
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(0.6);
    });
  });

  describe("calculateUsageWeight", () => {
    it("should return 0.0 for zero usage", () => {
      const weight = calculateUsageWeight(0);
      expect(weight).toBe(0.0);
    });

    it("should return 0.5 for 5 uses", () => {
      const weight = calculateUsageWeight(5);
      expect(weight).toBe(0.5);
    });

    it("should return 1.0 for 10 or more uses", () => {
      const weight10 = calculateUsageWeight(10);
      const weight20 = calculateUsageWeight(20);
      const weight100 = calculateUsageWeight(100);

      expect(weight10).toBe(1.0);
      expect(weight20).toBe(1.0);
      expect(weight100).toBe(1.0);
    });

    it("should increase linearly from 0 to 10 uses", () => {
      const weight1 = calculateUsageWeight(1);
      const weight5 = calculateUsageWeight(5);
      const weight9 = calculateUsageWeight(9);

      expect(weight1).toBeLessThan(weight5);
      expect(weight5).toBeLessThan(weight9);
      expect(weight9).toBeLessThan(1.0);
    });
  });

  describe("calculateMemoryRankingScore", () => {
    it("should return valid score (0-1) for well-formed memory", () => {
      const memory = createTestMemory();
      const score = calculateMemoryRankingScore(memory);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should favor high-quality memories over recent low-quality ones", () => {
      const now = new Date().toISOString();
      const highQualityOld = createTestMemory({
        timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days old
        quality: {
          overall: 0.9,
          relevanceToCommand: 0.95,
          completeness: 0.9,
          accuracy: 0.85,
        },
      });

      const lowQualityNew = createTestMemory({
        timestamp: now,
        quality: {
          overall: 0.3,
          relevanceToCommand: 0.2,
          completeness: 0.3,
          accuracy: 0.4,
        },
      });

      const scoreHQ = calculateMemoryRankingScore(highQualityOld);
      const scoreLQ = calculateMemoryRankingScore(lowQualityNew);

      expect(scoreHQ).toBeGreaterThan(scoreLQ);
    });

    it("should boost score for frequently used memories", () => {
      const base = createTestMemory({
        usage: { timesUsed: 1, accessTrend: "stable" },
      });

      const frequent = createTestMemory({
        timestamp: base.timestamp,
        quality: base.quality,
        usage: { timesUsed: 15, accessTrend: "increasing" },
      });

      const scoreBase = calculateMemoryRankingScore(base);
      const scoreFrequent = calculateMemoryRankingScore(frequent);

      expect(scoreFrequent).toBeGreaterThan(scoreBase);
    });

    it("should handle memories without quality data", () => {
      const noQuality = createTestMemory({
        quality: undefined,
      });

      const score = calculateMemoryRankingScore(noQuality);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should respect custom quality config weights", () => {
      const memory = createTestMemory();

      const recencyHeavy = calculateMemoryRankingScore(memory, {
        ...DEFAULT_QUALITY_CONFIG,
        recencyWeight: 0.8,
        qualityWeight: 0.2,
      });

      const qualityHeavy = calculateMemoryRankingScore(memory, {
        ...DEFAULT_QUALITY_CONFIG,
        recencyWeight: 0.2,
        qualityWeight: 0.8,
      });

      // Both should be valid
      expect(recencyHeavy).toBeGreaterThanOrEqual(0);
      expect(qualityHeavy).toBeGreaterThanOrEqual(0);
    });
  });

  describe("autoCalculateQualityScore", () => {
    it("should return valid MemoryQualityScore", () => {
      const memory = createTestMemory();
      const quality = autoCalculateQualityScore(memory);

      expect(quality.overall).toBeGreaterThanOrEqual(0);
      expect(quality.overall).toBeLessThanOrEqual(1);
      expect(quality.relevanceToCommand).toBeGreaterThanOrEqual(0);
      expect(quality.relevanceToCommand).toBeLessThanOrEqual(1);
      expect(quality.completeness).toBeGreaterThanOrEqual(0);
      expect(quality.completeness).toBeLessThanOrEqual(1);
      expect(quality.accuracy).toBeGreaterThanOrEqual(0);
      expect(quality.accuracy).toBeLessThanOrEqual(1);
    });

    it("should produce consistent scores for same input", () => {
      const memory = createTestMemory();
      const score1 = autoCalculateQualityScore(memory);
      const score2 = autoCalculateQualityScore(memory);

      expect(score1).toEqual(score2);
    });
  });

  describe("updateUsageTracking", () => {
    it("should increment timesUsed from undefined", () => {
      const updated = updateUsageTracking(undefined);

      expect(updated.timesUsed).toBe(1);
      expect(updated.lastUsed).toBeDefined();
      expect(updated.accessTrend).toBe("stable");
    });

    it("should increment timesUsed from existing tracking", () => {
      const initial = {
        timesUsed: 5,
        accessTrend: "stable" as const,
        lastUsed: new Date(Date.now() - 1000).toISOString(),
      };

      const updated = updateUsageTracking(initial);

      expect(updated.timesUsed).toBe(6);
      expect(updated.lastUsed).toBeDefined();
    });

    it("should update lastUsed to current time", () => {
      const before = new Date().toISOString();
      const updated = updateUsageTracking(undefined);
      const after = new Date().toISOString();

      expect(updated.lastUsed).toBeDefined();
      expect(updated.lastUsed! >= before).toBe(true);
      expect(updated.lastUsed! <= after).toBe(true);
    });

    it("should preserve or update accessTrend", () => {
      const tracking = {
        timesUsed: 2,
        accessTrend: "stable" as const,
      };

      const updated1 = updateUsageTracking(tracking);
      expect(updated1.accessTrend).toBeDefined();
      expect(["stable", "increasing", "decreasing"]).toContain(updated1.accessTrend);
    });
  });

  describe("rankMemories", () => {
    it("should return memories in order of ranking score", () => {
      const low = createTestMemory({
        sessionId: "low",
        quality: {
          overall: 0.4,
          relevanceToCommand: 0.4,
          completeness: 0.4,
          accuracy: 0.4,
        },
      });

      const high = createTestMemory({
        sessionId: "high",
        quality: {
          overall: 0.9,
          relevanceToCommand: 0.9,
          completeness: 0.9,
          accuracy: 0.9,
        },
      });

      const mid = createTestMemory({
        sessionId: "mid",
        quality: {
          overall: 0.65,
          relevanceToCommand: 0.65,
          completeness: 0.65,
          accuracy: 0.65,
        },
      });

      const ranked = rankMemories([low, mid, high]);

      expect(ranked[0].sessionId).toBe("high");
      expect(ranked[1].sessionId).toBe("mid");
      expect(ranked[2].sessionId).toBe("low");
    });

    it("should handle empty array", () => {
      const ranked = rankMemories([]);
      expect(ranked).toEqual([]);
    });

    it("should handle single memory", () => {
      const memory = createTestMemory();
      const ranked = rankMemories([memory]);

      expect(ranked.length).toBe(1);
      expect(ranked[0].sessionId).toBe(memory.sessionId);
    });

    it("should rank older high-quality above recent low-quality", () => {
      const recent_low = createTestMemory({
        sessionId: "recent-low",
        timestamp: new Date().toISOString(),
        quality: {
          overall: 0.35,
          relevanceToCommand: 0.35,
          completeness: 0.35,
          accuracy: 0.35,
        },
      });

      const old_high = createTestMemory({
        sessionId: "old-high",
        timestamp: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        quality: {
          overall: 0.85,
          relevanceToCommand: 0.85,
          completeness: 0.85,
          accuracy: 0.85,
        },
      });

      const ranked = rankMemories([recent_low, old_high]);

      expect(ranked[0].sessionId).toBe("old-high");
      expect(ranked[1].sessionId).toBe("recent-low");
    });
  });

  describe("filterByQuality", () => {
    it("should filter memories below minimum quality", () => {
      const bad = createTestMemory({
        sessionId: "bad",
        quality: {
          overall: 0.2,
          relevanceToCommand: 0.2,
          completeness: 0.2,
          accuracy: 0.2,
        },
      });

      const good = createTestMemory({
        sessionId: "good",
        quality: {
          overall: 0.8,
          relevanceToCommand: 0.8,
          completeness: 0.8,
          accuracy: 0.8,
        },
      });

      const filtered = filterByQuality([bad, good], 0.5);

      expect(filtered.length).toBe(1);
      expect(filtered[0].sessionId).toBe("good");
    });

    it("should keep memories without quality data", () => {
      const unscored = createTestMemory({
        sessionId: "unscored",
        quality: undefined,
      });

      const filtered = filterByQuality([unscored], 0.5);

      expect(filtered.length).toBe(1);
      expect(filtered[0].sessionId).toBe("unscored");
    });

    it("should respect custom minimum threshold", () => {
      const mid = createTestMemory({
        sessionId: "mid",
        quality: {
          overall: 0.6,
          relevanceToCommand: 0.6,
          completeness: 0.6,
          accuracy: 0.6,
        },
      });

      const filteredStrict = filterByQuality([mid], 0.8);
      const filteredLoose = filterByQuality([mid], 0.4);

      expect(filteredStrict.length).toBe(0);
      expect(filteredLoose.length).toBe(1);
    });

    it("should handle empty array", () => {
      const filtered = filterByQuality([], 0.5);
      expect(filtered).toEqual([]);
    });
  });

  describe("loadTopMemories", () => {
    it("should return top N memories by ranking", () => {
      const memories = [
        createTestMemory({ sessionId: "1", quality: { overall: 0.5, relevanceToCommand: 0.5, completeness: 0.5, accuracy: 0.5 } }),
        createTestMemory({ sessionId: "2", quality: { overall: 0.9, relevanceToCommand: 0.9, completeness: 0.9, accuracy: 0.9 } }),
        createTestMemory({ sessionId: "3", quality: { overall: 0.7, relevanceToCommand: 0.7, completeness: 0.7, accuracy: 0.7 } }),
      ];

      const top2 = loadTopMemories(memories, 2);

      expect(top2.length).toBe(2);
      expect(top2[0].sessionId).toBe("2"); // Best quality
      expect(top2[1].sessionId).toBe("3"); // Second best
    });

    it("should return fewer than limit if not enough high-quality memories", () => {
      const memories = [
        createTestMemory({ sessionId: "1", quality: { overall: 0.2, relevanceToCommand: 0.2, completeness: 0.2, accuracy: 0.2 } }),
        createTestMemory({ sessionId: "2", quality: { overall: 0.25, relevanceToCommand: 0.25, completeness: 0.25, accuracy: 0.25 } }),
      ];

      const top5 = loadTopMemories(memories, 5, DEFAULT_QUALITY_CONFIG);

      expect(top5.length).toBeLessThanOrEqual(2);
    });

    it("should respect default limit of 3", () => {
      const memories = Array.from({ length: 10 }, (_, i) =>
        createTestMemory({
          sessionId: `mem-${i}`,
          quality: {
            overall: 0.5 + i * 0.05,
            relevanceToCommand: 0.5 + i * 0.05,
            completeness: 0.5 + i * 0.05,
            accuracy: 0.5 + i * 0.05,
          },
        })
      );

      const top = loadTopMemories(memories);

      expect(top.length).toBe(3);
    });

    it("should handle empty array", () => {
      const top = loadTopMemories([], 3);
      expect(top).toEqual([]);
    });
  });

  describe("integration: complete ranking workflow", () => {
    it("should correctly rank mixed set of memories", () => {
      const memories = [
        // Recent but low quality
        createTestMemory({
          sessionId: "recent-bad",
          timestamp: new Date().toISOString(),
          quality: { overall: 0.3, relevanceToCommand: 0.3, completeness: 0.3, accuracy: 0.3 },
          usage: { timesUsed: 1, accessTrend: "stable" },
        }),
        // Old but high quality
        createTestMemory({
          sessionId: "old-good",
          timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
          quality: { overall: 0.9, relevanceToCommand: 0.9, completeness: 0.9, accuracy: 0.9 },
          usage: { timesUsed: 10, accessTrend: "increasing" },
        }),
        // Recent and good quality
        createTestMemory({
          sessionId: "recent-good",
          timestamp: new Date().toISOString(),
          quality: { overall: 0.8, relevanceToCommand: 0.8, completeness: 0.8, accuracy: 0.8 },
          usage: { timesUsed: 3, accessTrend: "stable" },
        }),
        // Middle ground
        createTestMemory({
          sessionId: "mid",
          timestamp: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
          quality: { overall: 0.6, relevanceToCommand: 0.6, completeness: 0.6, accuracy: 0.6 },
          usage: { timesUsed: 2, accessTrend: "stable" },
        }),
      ];

      const ranked = rankMemories(memories);

      // Best ranking should be recent-good or old-good
      expect(["recent-good", "old-good"]).toContain(ranked[0].sessionId);

      // Worst should be recent-bad
      expect(ranked[ranked.length - 1].sessionId).toBe("recent-bad");
    });

    it("should load and rank memories in single call", () => {
      const memories = [
        createTestMemory({ sessionId: "1", quality: { overall: 0.4, relevanceToCommand: 0.4, completeness: 0.4, accuracy: 0.4 } }),
        createTestMemory({ sessionId: "2", quality: { overall: 0.8, relevanceToCommand: 0.8, completeness: 0.8, accuracy: 0.8 } }),
        createTestMemory({ sessionId: "3", quality: { overall: 0.9, relevanceToCommand: 0.9, completeness: 0.9, accuracy: 0.9 } }),
      ];

      const top2 = loadTopMemories(memories, 2);

      expect(top2.length).toBe(2);
      expect(top2[0].sessionId).toBe("3");
      expect(top2[1].sessionId).toBe("2");
    });

    it("should handle memories transitioning through quality tiers", () => {
      const memories = [
        createTestMemory({
          sessionId: "below-threshold",
          quality: { overall: 0.25, relevanceToCommand: 0.25, completeness: 0.25, accuracy: 0.25 },
        }),
        createTestMemory({
          sessionId: "at-threshold",
          quality: { overall: 0.3, relevanceToCommand: 0.3, completeness: 0.3, accuracy: 0.3 },
        }),
        createTestMemory({
          sessionId: "above-threshold",
          quality: { overall: 0.35, relevanceToCommand: 0.35, completeness: 0.35, accuracy: 0.35 },
        }),
      ];

      // With default threshold of 0.3
      const filtered = filterByQuality(memories);

      expect(filtered.map((m) => m.sessionId)).toContain("at-threshold");
      expect(filtered.map((m) => m.sessionId)).toContain("above-threshold");
      expect(filtered.map((m) => m.sessionId)).not.toContain("below-threshold");
    });
  });
});
