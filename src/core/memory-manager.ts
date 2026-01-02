/**
 * Memory Manager
 *
 * Central hub for all memory operations:
 * - Load memories from disk
 * - Save memories to disk
 * - Query memory index
 * - Delete memories
 *
 * Integrates with MemoryIndex, MemoryLoader, and MemoryExtractor
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import { MemoryIndexEntry, SessionMemory } from "./types.js";
import { MemoryIndex } from "../memory/index.js";
import { MemoryArchiver } from "../memory/archiver.js";
import { logger } from "./logger.js";
import {
  rankMemories,
  loadTopMemories,
  filterByQuality,
  updateUsageTracking,
  DEFAULT_QUALITY_CONFIG,
} from "./memory-quality.js";

/**
 * Memory Manager - Central hub for memory operations
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private memoryIndex: MemoryIndex;
  private memoryArchiver: MemoryArchiver;
  private indexPath: string;
  private memoryBasePath: string;
  private bozlyHome: string;
  private initialized = false;
  private cacheThresholdMB = 5;

  private constructor() {
    this.bozlyHome = path.join(os.homedir(), ".bozly");
    this.indexPath = path.join(this.bozlyHome, "memory-index.json");
    this.memoryBasePath = path.join(this.bozlyHome, "sessions");
    this.memoryIndex = new MemoryIndex(this.indexPath);
    this.memoryArchiver = new MemoryArchiver(this.bozlyHome);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Initialize the memory manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.memoryIndex.load();
      const stats = this.memoryIndex.getIndexStats();
      this.initialized = true;
      logger.debug(`Memory manager initialized with ${stats.totalEntries} entries`);
    } catch (error) {
      logger.error(`Failed to initialize memory manager: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Load a single memory from disk
   */
  async loadMemory(sessionId: string, nodeId: string): Promise<SessionMemory | null> {
    try {
      await this.ensureInitialized();

      // Get the memory entry from the index to find the file path
      const indexEntry = await this.memoryIndex.getEntry(sessionId, nodeId);
      logger.debug(
        `getEntry result for ${sessionId}/${nodeId}: ${indexEntry ? "found" : "not found"}`
      );
      if (!indexEntry) {
        logger.debug(`Memory entry not found in index: ${sessionId} / ${nodeId}`);
        return null;
      }

      // Try to read the memory file from the path stored in the index
      let content: string;
      try {
        content = await fs.readFile(indexEntry.filePath, "utf-8");
      } catch {
        logger.debug(`Memory file not found at: ${indexEntry.filePath}`);
        return null;
      }

      // Parse the markdown content to extract sections
      const memory: SessionMemory = {
        sessionId: indexEntry.sessionId,
        nodeId: indexEntry.nodeId,
        nodeName: indexEntry.nodeName,
        timestamp: indexEntry.timestamp,
        durationMinutes: 0, // This isn't stored in the index entry
        aiProvider: "unknown", // This isn't stored in the index entry
        command: indexEntry.command,
        title: indexEntry.summary,
        summary: indexEntry.summary,
        tags: indexEntry.tags,
      };

      // Extract sections from markdown content
      const sections = this.parseMemoryContent(content);
      Object.assign(memory, sections);

      return memory;
    } catch (error) {
      logger.debug(`Failed to load memory for session ${sessionId}: ${String(error)}`);
      return null;
    }
  }

  /**
   * List all memories, optionally filtered by node
   */
  async listMemories(nodeId?: string, limit = 50): Promise<MemoryIndexEntry[]> {
    await this.ensureInitialized();

    try {
      let entries: MemoryIndexEntry[];

      if (nodeId) {
        entries = await this.memoryIndex.queryByNode(nodeId, limit);
      } else {
        // Get all entries from index, sorted by timestamp
        entries = await this.memoryIndex.getAllEntries(limit);
      }

      return entries;
    } catch (error) {
      logger.error(`Failed to list memories: ${String(error)}`);
      return [];
    }
  }

  /**
   * Search memories by query
   */
  async searchMemories(query: string, limit = 20): Promise<MemoryIndexEntry[]> {
    await this.ensureInitialized();

    try {
      const result = await this.memoryIndex.search(query, limit);
      return result.entries;
    } catch (error) {
      logger.error(`Failed to search memories: ${String(error)}`);
      return [];
    }
  }

  /**
   * Get memories by tags
   */
  async getMemoriesByTags(tags: string[], limit = 20): Promise<MemoryIndexEntry[]> {
    await this.ensureInitialized();

    try {
      return await this.memoryIndex.queryByTags(tags, limit);
    } catch (error) {
      logger.error(`Failed to get memories by tags: ${String(error)}`);
      return [];
    }
  }

  /**
   * Delete a memory
   */
  async deleteMemory(sessionId: string, nodeId: string): Promise<boolean> {
    try {
      await this.ensureInitialized();

      // Find and delete the memory file
      const memoryPath = await this.findMemoryFile(sessionId, nodeId);
      if (memoryPath) {
        try {
          await fs.unlink(memoryPath);
          logger.debug(`Deleted memory file: ${memoryPath}`);
        } catch (error) {
          logger.warn(`Failed to delete memory file: ${String(error)}`);
        }
      }

      // Delete from index
      await this.memoryIndex.removeEntry(sessionId);

      return true;
    } catch (error) {
      logger.error(`Failed to delete memory: ${String(error)}`);
      return false;
    }
  }

  /**
   * Get statistics about memories
   */
  async getMemoryStats(nodeId?: string): Promise<{
    totalMemories: number;
    newestMemory?: string;
    oldestMemory?: string;
    tagCounts: Record<string, number>;
  }> {
    try {
      await this.ensureInitialized();
      const stats = await this.memoryIndex.getStats(nodeId);
      return {
        totalMemories: stats.totalMemories,
        newestMemory: stats.newestMemory,
        oldestMemory: stats.oldestMemory,
        tagCounts: stats.tagCounts,
      };
    } catch (error) {
      logger.error(`Failed to get memory stats: ${String(error)}`);
      return {
        totalMemories: 0,
        tagCounts: {},
      };
    }
  }

  /**
   * Private helper: Find memory file by session ID and node ID
   */
  private async findMemoryFile(sessionId: string, nodeId: string): Promise<string | null> {
    try {
      const nodePath = path.join(this.memoryBasePath, nodeId);

      const findFile = async (dir: string): Promise<string | null> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
              const result = await findFile(fullPath);
              if (result) {
                return result;
              }
            } else if (entry.name === "memory.md") {
              // Check if this is the right session
              const pathParts = fullPath.split(path.sep);
              const sessionIdFromPath = pathParts[pathParts.length - 2];
              if (sessionIdFromPath === sessionId) {
                return fullPath;
              }
            }
          }
        } catch (error) {
          // Directory doesn't exist or can't be read
        }

        return null;
      };

      return await findFile(nodePath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Private helper: Parse memory content sections
   */
  private parseMemoryContent(content: string): Partial<SessionMemory> {
    const sections: Partial<SessionMemory> = {};

    // Simple markdown section parsing
    const lines = content.split("\n");
    let currentSection = "";
    let currentContent = "";

    for (const line of lines) {
      if (line.startsWith("## ")) {
        // Save previous section
        if (currentSection) {
          const sectionKey = this.sectionNameToKey(currentSection);
          if (sectionKey) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sections as any)[sectionKey] = currentContent.trim();
          }
        }

        currentSection = line.replace(/^## /, "").trim();
        currentContent = "";
      } else if (currentSection) {
        currentContent += line + "\n";
      }
    }

    // Save last section
    if (currentSection) {
      const sectionKey = this.sectionNameToKey(currentSection);
      if (sectionKey) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sections as any)[sectionKey] = currentContent.trim();
      }
    }

    return sections;
  }

  /**
   * Private helper: Map section names to memory keys
   */
  private sectionNameToKey(sectionName: string): string | null {
    const mapping: Record<string, string> = {
      "Current State": "currentState",
      "Task Specification": "taskSpec",
      Workflow: "workflow",
      Errors: "errors",
      Learnings: "learnings",
      "Key Results": "keyResults",
    };

    return mapping[sectionName] || null;
  }

  /**
   * Load memories ranked by quality and recency (Session 169)
   *
   * NEW: Uses quality-weighted algorithm to prefer high-quality memories
   * Algorithm: Score = (recency * 0.4) + (quality * 0.6)
   * This allows older high-quality memories to rank above recent low-quality ones
   *
   * @param nodeId - Node ID to load memories for
   * @param limit - Maximum number of memories to return (default: 3)
   * @param config - Quality scoring configuration
   * @returns Top ranked memories
   */
  async loadTopMemoriesByQuality(
    nodeId: string,
    limit = 3,
    config = DEFAULT_QUALITY_CONFIG
  ): Promise<MemoryIndexEntry[]> {
    try {
      await this.ensureInitialized();

      // Get all memories for this node
      const allMemories = await this.memoryIndex.queryByNode(nodeId, 1000); // Get many for ranking

      // Rank by quality and return top N
      const topMemories = loadTopMemories(allMemories, limit, config);

      logger.debug(`Loaded top ${topMemories.length} memories by quality for node ${nodeId}`);

      return topMemories;
    } catch (error) {
      logger.error(`Failed to load top memories: ${String(error)}`);
      return [];
    }
  }

  /**
   * Load memories ranked by quality, with usage tracking (Session 169)
   *
   * Same as loadTopMemoriesByQuality but updates usage tracking for each loaded memory
   *
   * @param nodeId - Node ID to load memories for
   * @param limit - Maximum number of memories to return
   * @param config - Quality scoring configuration
   * @returns Top ranked memories with updated usage tracking
   */
  async loadTopMemoriesByQualityWithTracking(
    nodeId: string,
    limit = 3,
    config = DEFAULT_QUALITY_CONFIG
  ): Promise<MemoryIndexEntry[]> {
    const memories = await this.loadTopMemoriesByQuality(nodeId, limit, config);

    // Update usage tracking for each loaded memory
    for (const memory of memories) {
      if (memory.usage) {
        memory.usage = updateUsageTracking(memory.usage);
      } else {
        memory.usage = updateUsageTracking(undefined);
      }
    }

    return memories;
  }

  /**
   * Rank all memories for a node by quality (Session 169)
   *
   * @param nodeId - Node ID to rank memories for
   * @param config - Quality scoring configuration
   * @returns All memories sorted by quality/recency score
   */
  async getRankedMemories(
    nodeId: string,
    config = DEFAULT_QUALITY_CONFIG
  ): Promise<MemoryIndexEntry[]> {
    try {
      await this.ensureInitialized();

      const allMemories = await this.memoryIndex.queryByNode(nodeId, 1000);
      const ranked = rankMemories(allMemories, config);

      return ranked;
    } catch (error) {
      logger.error(`Failed to get ranked memories: ${String(error)}`);
      return [];
    }
  }

  /**
   * Filter memories by minimum quality threshold (Session 169)
   *
   * @param nodeId - Node ID to filter memories for
   * @param minQuality - Minimum quality score (0-1)
   * @returns Memories above quality threshold
   */
  async getHighQualityMemories(nodeId: string, minQuality = 0.5): Promise<MemoryIndexEntry[]> {
    try {
      await this.ensureInitialized();

      const allMemories = await this.memoryIndex.queryByNode(nodeId, 1000);
      const filtered = filterByQuality(allMemories, minQuality);

      return filtered;
    } catch (error) {
      logger.error(`Failed to filter memories: ${String(error)}`);
      return [];
    }
  }

  /**
   * Check and perform automatic archival if cache exceeds threshold
   * Called during session initialization to maintain cache size
   */
  async checkAndArchiveIfNeeded(): Promise<void> {
    try {
      await this.ensureInitialized();
      const result = await this.memoryArchiver.checkAndArchiveIfNeeded(this.cacheThresholdMB);

      if (result.triggered) {
        logger.info(
          `Memory archival triggered: archived ${result.archived} memories, cache reduced to ${result.finalCacheSizeMB}MB`
        );
      }
    } catch (error) {
      logger.warn(`Memory archival check failed: ${String(error)}`);
      // Don't throw - archival failure shouldn't block operations
    }
  }

  /**
   * Archive old unused memories
   * @param unusedDays - Archive memories unused for this many days (default: 90)
   */
  async archiveOldMemories(unusedDays = 90): Promise<{
    archived: number;
    totalArchivedMB: number;
  }> {
    try {
      await this.ensureInitialized();
      const result = await this.memoryArchiver.archiveOldMemories(unusedDays);
      logger.info(
        `Archived ${result.archived} memories (${result.totalArchivedMB}MB) from ${unusedDays}-day threshold`
      );
      return { archived: result.archived, totalArchivedMB: result.totalArchivedMB };
    } catch (error) {
      logger.error(`Failed to archive old memories: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get current memory cache size
   */
  async getCacheSize(): Promise<{ totalSizeMB: number; byVault: Record<string, number> }> {
    try {
      const size = await this.memoryArchiver.detectCacheSize();
      return { totalSizeMB: size.totalSizeMB, byVault: size.byVault };
    } catch (error) {
      logger.error(`Failed to get cache size: ${String(error)}`);
      return { totalSizeMB: 0, byVault: {} };
    }
  }

  /**
   * Search archived memories by query
   */
  async searchArchivedMemories(
    query: string,
    vaultId?: string
  ): Promise<Array<{ sessionId: string; summary?: string; tags?: string[] }>> {
    try {
      const results = await this.memoryArchiver.searchArchives(query, vaultId);
      return results.map((entry) => ({
        sessionId: entry.sessionId,
        summary: entry.summary,
        tags: entry.tags,
      }));
    } catch (error) {
      logger.warn(`Failed to search archives: ${String(error)}`);
      return [];
    }
  }

  /**
   * Load an archived memory by session ID
   */
  async loadArchivedMemory(vaultId: string, sessionId: string): Promise<string | null> {
    try {
      return await this.memoryArchiver.loadArchivedMemory(vaultId, sessionId);
    } catch (error) {
      logger.warn(`Failed to load archived memory: ${String(error)}`);
      return null;
    }
  }

  /**
   * Ensure memory manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
