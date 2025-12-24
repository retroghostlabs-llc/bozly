/**
 * Session Memory Loader
 *
 * Loads past session memories and injects them into new session context.
 * Enables context continuity across sessions by:
 * 1. Discovering related memories from past sessions
 * 2. Loading memory files from disk
 * 3. Filtering and ranking by relevance
 * 4. Injecting into prompt context
 *
 * @module memory/loader
 */

import fs from "fs/promises";
import path from "path";
import { ISODateTime } from "../core/types.js";
import { logger } from "../core/logger.js";

/**
 * Options for loading memories
 */
export interface LoadMemoriesOptions {
  limit?: number; // Max memories to load (default: 3)
  maxAge?: number; // Only load memories from last N days (default: 30)
  tags?: string[]; // Filter by tags
  sortBy?: "recent" | "relevance"; // Sort order (default: recent)
}

/**
 * Memory file with metadata
 */
interface MemoryFile {
  path: string;
  filename: string;
  timestamp: ISODateTime;
  sessionId: string;
}

/**
 * Memory discovery result with ranking
 */
interface RankedMemory {
  path: string;
  timestamp: ISODateTime;
  relevanceScore: number; // 0-100
}

/**
 * Memory Loader - Loads and injects past memories
 */
export class MemoryLoader {
  /**
   * Discover memory files for a vault
   * Scans ~/.bozly/sessions/{nodeId}/ for memory.md files
   */
  static async discoverMemories(sessionsBasePath: string, nodeId: string): Promise<MemoryFile[]> {
    try {
      const nodePath = path.join(sessionsBasePath, nodeId);

      // Check if sessions directory exists
      try {
        await fs.access(nodePath);
      } catch {
        logger.debug(`Sessions directory not found: ${nodePath}`);
        return [];
      }

      const memories: MemoryFile[] = [];

      // Recursively find all memory.md files
      const scanDir = async (dir: string): Promise<void> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
              await scanDir(fullPath);
            } else if (entry.name === "memory.md") {
              try {
                const stats = await fs.stat(fullPath);
                // Extract sessionId from path: .../sessions/{nodeId}/{YYYY}/{MM}/{DD}/{sessionId}/memory.md
                const parts = fullPath.split(path.sep);
                const sessionId = parts[parts.length - 2];

                memories.push({
                  path: fullPath,
                  filename: entry.name,
                  timestamp: new Date(stats.mtime).toISOString(),
                  sessionId,
                });
              } catch (err) {
                logger.warn(`Failed to stat memory file: ${fullPath}`);
              }
            }
          }
        } catch (err) {
          logger.debug(`Failed to scan directory: ${dir}`);
        }
      };

      await scanDir(nodePath);
      return memories.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (err) {
      logger.error(`Failed to discover memories: ${String(err)}`);
      return [];
    }
  }

  /**
   * Load a single memory file from disk
   */
  static async loadMemoryFile(memoryPath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(memoryPath, "utf-8");
      return content;
    } catch (err) {
      logger.warn(`Failed to load memory file: ${memoryPath} - ${String(err)}`);
      return null;
    }
  }

  /**
   * Filter and rank memories by recency and tags
   */
  static rankMemories(memories: MemoryFile[], options: LoadMemoriesOptions = {}): RankedMemory[] {
    const { limit = 3, maxAge = 30, sortBy = "recent" } = options;

    const now = new Date();
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000; // Convert days to ms

    const ranked = memories
      .filter((mem) => {
        const memAge = now.getTime() - new Date(mem.timestamp).getTime();
        return memAge <= maxAgeMs;
      })
      .slice(0, limit)
      .map((mem) => ({
        path: mem.path,
        timestamp: mem.timestamp,
        relevanceScore:
          100 - ((now.getTime() - new Date(mem.timestamp).getTime()) / maxAgeMs) * 100,
      }));

    if (sortBy === "recent") {
      return ranked.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    return ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Load relevant memories for a vault
   */
  static async loadRelevantMemories(
    sessionsBasePath: string,
    nodeId: string,
    options: LoadMemoriesOptions = {}
  ): Promise<string[]> {
    try {
      // Discover all memories
      const memories = await this.discoverMemories(sessionsBasePath, nodeId);

      if (memories.length === 0) {
        logger.debug(`No memories found for vault: ${nodeId}`);
        return [];
      }

      // Rank and filter
      const ranked = this.rankMemories(memories, options);

      // Load memory files
      const loadedMemories: string[] = [];

      for (const ranked_mem of ranked) {
        const content = await this.loadMemoryFile(ranked_mem.path);
        if (content) {
          loadedMemories.push(content);
        }
      }

      logger.debug(`Loaded ${loadedMemories.length} memories for vault ${nodeId}`);
      return loadedMemories;
    } catch (err) {
      logger.error(`Failed to load relevant memories: ${String(err)}`);
      return [];
    }
  }

  /**
   * Inject memories into prompt context
   * Prepends a "Context from previous sessions" section
   */
  static injectMemoriesIntoContext(baseContext: string, memories: string[]): string {
    if (memories.length === 0) {
      return baseContext;
    }

    const memorySection = `=== CONTEXT FROM PREVIOUS SESSIONS ===

${memories.map((mem, i) => `[Session ${i + 1}]\n${mem}`).join("\n---\n")}

==========================================

`;

    return memorySection + baseContext;
  }

  /**
   * Inject memories into a full prompt (context + command)
   */
  static injectMemoriesIntoPrompt(
    contextText: string,
    commandText: string,
    memories: string[]
  ): { contextText: string; commandText: string } {
    if (memories.length === 0) {
      return { contextText, commandText };
    }

    const enhancedContext = this.injectMemoriesIntoContext(contextText || "", memories);

    return {
      contextText: enhancedContext,
      commandText,
    };
  }

  /**
   * Get memory injection summary for logging
   */
  static getMemorySummary(memories: string[]): string {
    return `Loaded ${memories.length} past session memory/memories for context`;
  }
}
