/**
 * Memory Quality Scoring System
 *
 * Session 169: Optimization task 1
 * Session 185: Heuristic quality scoring implementation
 * Implements intelligent memory ranking based on quality and recency
 *
 * Algorithm:
 * - Recency Weight: How recent the memory is (0-1)
 * - Quality Weight: Overall quality score (0-1)
 * - Final Score = (Recency * 0.4) + (Quality * 0.6)
 *
 * This allows older high-quality memories to rank above recent low-quality ones
 */

import {
  MemoryIndexEntry,
  MemoryQualityScore,
  MemoryUsageTracking,
  SessionMemory,
} from "./types.js";

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
 * Vault-type-specific quality weight configuration
 * Allows different vault types to prioritize different quality dimensions
 */
export interface VaultTypeQualityWeights {
  completenessWeight: number; // Weight for section completeness (default: 0.4)
  accuracyWeight: number; // Weight for accuracy/error tracking (default: 0.3)
  relevanceWeight: number; // Weight for relevance/tags (default: 0.3)
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
 * Default vault type quality weights (generic/standard)
 */
const DEFAULT_VAULT_TYPE_WEIGHTS: VaultTypeQualityWeights = {
  completenessWeight: 0.4,
  accuracyWeight: 0.3,
  relevanceWeight: 0.3,
};

/**
 * Vault-type specific quality weights
 * Different vault types can prioritize different dimensions
 */
const VAULT_TYPE_WEIGHTS: Record<string, VaultTypeQualityWeights> = {
  generic: DEFAULT_VAULT_TYPE_WEIGHTS,
  music: {
    completenessWeight: 0.3, // Music vaults care less about section completeness
    accuracyWeight: 0.2,
    relevanceWeight: 0.5, // Music vaults care more about tags/relevance
  },
  project: {
    completenessWeight: 0.5, // Project vaults care more about completeness
    accuracyWeight: 0.4,
    relevanceWeight: 0.1,
  },
  journal: {
    completenessWeight: 0.4,
    accuracyWeight: 0.35,
    relevanceWeight: 0.25,
  },
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
 * Get vault-type-specific quality weights
 *
 * Returns configured weights for the vault type, or defaults for unknown types
 *
 * @param vaultType - Type of vault (music, project, journal, generic, etc.)
 * @returns Quality weight configuration for the vault type
 */
export function getVaultTypeQualityWeights(vaultType?: string): VaultTypeQualityWeights {
  if (!vaultType) {
    return DEFAULT_VAULT_TYPE_WEIGHTS;
  }
  return VAULT_TYPE_WEIGHTS[vaultType] || DEFAULT_VAULT_TYPE_WEIGHTS;
}

/**
 * Calculate completeness score (0-1) based on filled sections
 *
 * Checks which memory sections are filled (not empty/undefined)
 * Required sections: title, currentState, taskSpec, workflow, errors, learnings, keyResults
 *
 * @param memory - Session memory to score
 * @returns Completeness score (0-1)
 */
export function calculateCompletenessScore(memory: Partial<SessionMemory>): number {
  const sections = [
    memory.title,
    memory.currentState,
    memory.taskSpec,
    memory.workflow,
    memory.errors,
    memory.learnings,
    memory.keyResults,
  ];

  const filledSections = sections.filter((section) => section && section.trim().length > 0).length;
  const totalSections = sections.length;

  return filledSections / totalSections;
}

/**
 * Calculate accuracy score (0-1) based on error tracking and execution status
 *
 * Higher score when:
 * - errors section is present (shows honest error reporting)
 * - learnings section indicates successful completion
 *
 * @param memory - Session memory to score
 * @returns Accuracy score (0-1)
 */
export function calculateAccuracyScore(memory: Partial<SessionMemory>): number {
  let score = 0.5; // Start with neutral

  // Boost if errors section exists (honest error reporting)
  if (memory.errors && memory.errors.trim().length > 0) {
    score += 0.25;
  }

  // Boost if learnings indicate successful completion
  if (memory.learnings && memory.learnings.toLowerCase().includes("success")) {
    score += 0.15;
  }

  // Boost if keyResults exists (shows clear deliverables)
  if (memory.keyResults && memory.keyResults.trim().length > 0) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

/**
 * Calculate relevance score (0-1) based on tags, summary, and command specificity
 *
 * Higher score when:
 * - More tags (up to 5, then caps out)
 * - Longer, more detailed summary
 * - More specific command name
 *
 * @param memory - Session memory to score
 * @returns Relevance score (0-1)
 */
export function calculateRelevanceScore(memory: Partial<SessionMemory>): number {
  let score = 0;

  // Tag-based scoring (up to 5 tags = 1.0)
  const tagCount = memory.tags ? Math.min(memory.tags.length / 5, 1.0) : 0;
  score += tagCount * 0.4;

  // Summary quality (length and detail)
  const summaryLength = memory.summary ? memory.summary.length : 0;
  const summaryScore = Math.min(summaryLength / 100, 1.0); // Max at 100 chars
  score += summaryScore * 0.35;

  // Command specificity (longer, more specific commands score higher)
  const commandLength = memory.command ? memory.command.length : 0;
  const commandScore = Math.min(commandLength / 20, 1.0); // Max at 20 chars
  score += commandScore * 0.25;

  return Math.min(score, 1.0);
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
 * Auto-calculate quality score for a new memory based on content
 *
 * Heuristic approach using:
 * - Completeness: How many sections are filled (0-1)
 * - Accuracy: Based on presence of errors section and success indicators (0-1)
 * - Relevance: Based on tag count, summary, and command specificity (0-1)
 * - Overall: Weighted average of above three (40/30/30 by default)
 *
 * Supports vault-type-specific weighting for customized quality assessment
 *
 * @param entry - Memory to score (can be partial SessionMemory or MemoryIndexEntry)
 * @param vaultType - Optional vault type for type-specific weights
 * @returns Quality score object with all dimensions scored
 */
export function autoCalculateQualityScore(
  entry: Partial<SessionMemory> | Partial<MemoryIndexEntry>,
  vaultType?: string
): MemoryQualityScore {
  // Cast to SessionMemory for access to section fields
  const memory = entry as Partial<SessionMemory>;

  // If no memory content, return minimal score
  if (!memory) {
    return {
      overall: 0.3,
      relevanceToCommand: 0.3,
      completeness: 0.3,
      accuracy: 0.3,
    };
  }

  // Calculate individual dimensions
  const completenessScore = calculateCompletenessScore(memory);
  const accuracyScore = calculateAccuracyScore(memory);
  const relevanceScore = calculateRelevanceScore(memory);

  // Get vault-type-specific weights
  const weights = getVaultTypeQualityWeights(vaultType);

  // Calculate weighted overall score
  const overallScore =
    completenessScore * weights.completenessWeight +
    accuracyScore * weights.accuracyWeight +
    relevanceScore * weights.relevanceWeight;

  return {
    overall: Math.min(Math.max(overallScore, 0), 1.0), // Clamp to 0-1
    relevanceToCommand: relevanceScore,
    completeness: completenessScore,
    accuracy: accuracyScore,
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
