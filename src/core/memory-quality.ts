/**
 * Memory Quality Scoring System
 *
 * Session 169: Optimization task 1
 * Implements intelligent memory ranking based on quality and recency
 *
 * Algorithm:
 * - Recency Weight: How recent the memory is (0-1)
 * - Quality Weight: Overall quality score (0-1)
 * - Final Score = (Recency * 0.4) + (Quality * 0.6)
 *
 * This allows older high-quality memories to rank above recent low-quality ones
 */

import { MemoryIndexEntry, MemoryQualityScore, MemoryUsageTracking } from "./types.js";

/**
 * Configuration for quality scoring algorithm
 */
export interface QualityScoringConfig {
  recencyWeight: number; // Default: 0.4 (40% of score)
  qualityWeight: number; // Default: 0.6 (60% of score)
  maxAgeDays: number; // Default: 365 (memories older than this get lower scores)
  minQualityScore: number; // Default: 0.3 (don't load memories below this)
}

/**
 * Default scoring configuration
 */
export const DEFAULT_QUALITY_CONFIG: QualityScoringConfig = {
  recencyWeight: 0.4,
  qualityWeight: 0.6,
  maxAgeDays: 365,
  minQualityScore: 0.3,
};

/**
 * Calculate recency score (0-1) based on how recent the memory is
 *
 * @param timestamp - ISO datetime of the memory
 * @param maxAgeDays - Maximum age in days before score reaches minimum
 * @returns Recency score (0-1)
 */
export function calculateRecencyScore(timestamp: string, maxAgeDays = 365): number {
  const memoryDate = new Date(timestamp);
  const now = new Date();
  const ageMs = now.getTime() - memoryDate.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Memories within 1 day: 1.0 (perfect)
  if (ageDays <= 1) {
    return 1.0;
  }

  // Memories at max age: 0.1 (minimum, not 0 to keep old memories viable)
  if (ageDays >= maxAgeDays) {
    return 0.1;
  }

  // Linear decay between 1 day and max age
  return 1.0 - ((ageDays - 1) / (maxAgeDays - 1)) * 0.9;
}

/**
 * Calculate usage-based weight (0-1) for memories
 *
 * Frequently used memories get higher weight
 * @param timesUsed - How many times the memory has been accessed
 * @returns Usage weight (0-1)
 */
export function calculateUsageWeight(timesUsed: number): number {
  // After 10+ uses, max out at 1.0
  if (timesUsed >= 10) {
    return 1.0;
  }

  // Linear increase: 0 uses = 0.0, 10 uses = 1.0
  return Math.min(timesUsed / 10, 1.0);
}

/**
 * Calculate final ranking score for a memory
 *
 * Combines recency, quality, and usage into single comparable score
 *
 * @param memory - Memory entry with quality and usage metadata
 * @param config - Scoring configuration
 * @returns Numeric score for ranking (higher = better)
 */
export function calculateMemoryRankingScore(
  memory: MemoryIndexEntry,
  config = DEFAULT_QUALITY_CONFIG
): number {
  if (!memory.quality) {
    // Fallback for memories without quality scores
    // Use only recency if no quality data
    return calculateRecencyScore(memory.timestamp, config.maxAgeDays);
  }

  const recencyScore = calculateRecencyScore(memory.timestamp, config.maxAgeDays);
  const qualityScore = memory.quality.overall;
  const usageWeight = memory.usage ? calculateUsageWeight(memory.usage.timesUsed) : 0;

  // Boost quality score based on usage frequency
  const boostedQuality = Math.min(qualityScore + usageWeight * 0.1, 1.0);

  // Final score: 40% recency + 60% quality
  return recencyScore * config.recencyWeight + boostedQuality * config.qualityWeight;
}

/**
 * Auto-calculate quality score for a new memory based on metadata
 *
 * Heuristic approach:
 * - Completeness: How many sections are filled (0-1)
 * - Accuracy: Based on presence of errors section (0-1)
 * - Relevance: Based on tag count (0-1)
 * - Overall: Average of above three
 *
 * @param _entry - Memory to score
 * @returns Quality score object
 */
export function autoCalculateQualityScore(_entry: Partial<MemoryIndexEntry>): MemoryQualityScore {
  // Default to moderate quality if no data
  // TODO(Session 169): Implement heuristic scoring based on memory content
  return {
    overall: 0.65,
    relevanceToCommand: 0.7,
    completeness: 0.65,
    accuracy: 0.65,
  };
}

/**
 * Update usage tracking when a memory is loaded
 *
 * @param tracking - Current usage tracking
 * @returns Updated tracking with incremented access count
 */
export function updateUsageTracking(
  tracking: MemoryUsageTracking | undefined
): MemoryUsageTracking {
  const now = new Date().toISOString();
  const previousAccessCount = tracking?.timesUsed ?? 0;
  const newCount = previousAccessCount + 1;

  // Determine trend
  let trend: "increasing" | "stable" | "decreasing" = "stable";
  if (newCount > Math.max(previousAccessCount + 1, 2)) {
    trend = "increasing";
  } else if (newCount < previousAccessCount) {
    trend = "decreasing";
  }

  return {
    lastUsed: now,
    timesUsed: newCount,
    accessTrend: trend,
  };
}

/**
 * Sort memory entries by ranking score (highest first)
 *
 * @param memories - Array of memory entries
 * @param config - Scoring configuration
 * @returns Sorted array with highest-ranked memories first
 */
export function rankMemories(
  memories: MemoryIndexEntry[],
  config = DEFAULT_QUALITY_CONFIG
): MemoryIndexEntry[] {
  return memories
    .map((memory) => ({
      memory,
      score: calculateMemoryRankingScore(memory, config),
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.memory);
}

/**
 * Filter memories by minimum quality threshold
 *
 * @param memories - Array of memory entries
 * @param minQuality - Minimum quality score (0-1)
 * @returns Filtered array containing only memories above threshold
 */
export function filterByQuality(
  memories: MemoryIndexEntry[],
  minQuality = DEFAULT_QUALITY_CONFIG.minQualityScore
): MemoryIndexEntry[] {
  return memories.filter((memory) => {
    if (!memory.quality) {
      return true;
    } // Keep memories without scores
    return memory.quality.overall >= minQuality;
  });
}

/**
 * Load top N memories by ranking score
 *
 * Combines ranking and filtering in one operation
 *
 * @param memories - Array of all memories
 * @param limit - Maximum number of memories to return
 * @param config - Scoring configuration
 * @returns Top N memories ranked by score
 */
export function loadTopMemories(
  memories: MemoryIndexEntry[],
  limit = 3,
  config = DEFAULT_QUALITY_CONFIG
): MemoryIndexEntry[] {
  const filtered = filterByQuality(memories, config.minQualityScore);
  const ranked = rankMemories(filtered, config);
  return ranked.slice(0, limit);
}
