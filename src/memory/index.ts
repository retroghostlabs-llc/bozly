/**
 * Session Memory Index
 *
 * Maintains searchable index of all memories for quick discovery.
 * Stores in ~/.bozly/memory-index.json for cross-vault queries.
 *
 * Supports:
 * - Query by tags
 * - Query by vault/node
 * - Full-text search (basic)
 * - Time-based filtering
 * - Statistics generation
 *
 * @module memory/index
 */

import fs from "fs/promises";
import path from "path";
import { MemoryIndexEntry, MemoryMetadata, MemoryStats } from "../core/types.js";
import { logger } from "../core/logger.js";

/**
 * In-memory index for fast queries
 */
interface IndexData {
  version: string;
  created: string;
  lastUpdated: string;
  entries: MemoryIndexEntry[];
}

/**
 * Query results with metadata
 */
export interface QueryResult {
  entries: MemoryIndexEntry[];
  total: number;
  query: string;
}

/**
 * Memory Index - Maintains searchable index of memories
 */
export class MemoryIndex {
  private indexPath: string;
  private index: IndexData | null = null;

  constructor(indexPath: string) {
    this.indexPath = indexPath;
  }

  /**
   * Load index from disk
   */
  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.indexPath, "utf-8");
      this.index = JSON.parse(content);
      logger.debug(`Loaded memory index from ${this.indexPath}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        // Index doesn't exist yet, create empty one
        this.index = {
          version: "1.0",
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          entries: [],
        };
        logger.debug("Created new memory index");
      } else {
        logger.warn(`Failed to load memory index: ${String(err)}`);
        this.index = {
          version: "1.0",
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          entries: [],
        };
      }
    }
  }

  /**
   * Save index to disk
   */
  async save(): Promise<void> {
    if (!this.index) {
      logger.warn("Cannot save index: index not loaded");
      return;
    }

    try {
      this.index.lastUpdated = new Date().toISOString();
      const dir = path.dirname(this.indexPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2), "utf-8");
      logger.debug(`Saved memory index to ${this.indexPath}`);
    } catch (err) {
      logger.error(`Failed to save memory index: ${String(err)}`);
    }
  }

  /**
   * Add a memory entry to the index
   */
  async addEntry(metadata: MemoryMetadata, filePath: string): Promise<void> {
    if (!this.index) {
      await this.load();
    }

    const entry: MemoryIndexEntry = {
      sessionId: metadata.sessionId,
      nodeId: metadata.nodeId,
      nodeName: metadata.nodeName,
      timestamp: metadata.timestamp,
      command: metadata.command,
      summary: metadata.summary,
      tags: metadata.tags,
      filePath,
    };

    // Remove duplicate if exists
    this.index!.entries = this.index!.entries.filter((e) => e.sessionId !== entry.sessionId);

    // Add new entry
    this.index!.entries.push(entry);

    // Sort by timestamp (newest first)
    this.index!.entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    await this.save();
    logger.debug(`Added memory index entry: ${metadata.sessionId}`);
  }

  /**
   * Query index by node/vault
   */
  async queryByNode(nodeId: string, limit = 10): Promise<MemoryIndexEntry[]> {
    if (!this.index) {
      await this.load();
    }

    return this.index!.entries.filter((e) => e.nodeId === nodeId).slice(0, limit);
  }

  /**
   * Query index by tags
   */
  async queryByTags(tags: string[], limit = 10): Promise<MemoryIndexEntry[]> {
    if (!this.index) {
      await this.load();
    }

    const matching = this.index!.entries.filter((e) => tags.some((tag) => e.tags.includes(tag)));

    return matching.slice(0, limit);
  }

  /**
   * Query index by command
   */
  async queryByCommand(command: string, limit = 10): Promise<MemoryIndexEntry[]> {
    if (!this.index) {
      await this.load();
    }

    const normalized = command.toLowerCase();
    return this.index!.entries.filter(
      (e) =>
        e.command.toLowerCase().includes(normalized) || e.summary.toLowerCase().includes(normalized)
    ).slice(0, limit);
  }

  /**
   * Query index by time range
   */
  async queryByTimeRange(startDate: Date, endDate: Date, limit = 10): Promise<MemoryIndexEntry[]> {
    if (!this.index) {
      await this.load();
    }

    const start = startDate.getTime();
    const end = endDate.getTime();

    const matching = this.index!.entries.filter((e) => {
      const timestamp = new Date(e.timestamp).getTime();
      return timestamp >= start && timestamp <= end;
    });

    return matching.slice(0, limit);
  }

  /**
   * Full-text search across all memories
   */
  async search(query: string, limit = 10): Promise<QueryResult> {
    if (!this.index) {
      await this.load();
    }

    const normalized = query.toLowerCase();
    const matching = this.index!.entries.filter(
      (e) =>
        e.nodeName.toLowerCase().includes(normalized) ||
        e.command.toLowerCase().includes(normalized) ||
        e.summary.toLowerCase().includes(normalized) ||
        e.tags.some((t) => t.includes(normalized))
    ).slice(0, limit);

    return {
      entries: matching,
      total: matching.length,
      query,
    };
  }

  /**
   * Get statistics about memories
   */
  async getStats(nodeId?: string): Promise<MemoryStats> {
    if (!this.index) {
      await this.load();
    }

    let entries = this.index!.entries;

    if (nodeId) {
      entries = entries.filter((e) => e.nodeId === nodeId);
    }

    const tagCounts: Record<string, number> = {};
    entries.forEach((e) => {
      e.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return {
      totalSessions: this.index!.entries.length,
      totalMemories: entries.length,
      oldestMemory: entries.length > 0 ? entries[entries.length - 1].timestamp : undefined,
      newestMemory: entries.length > 0 ? entries[0].timestamp : undefined,
      averageDurationMinutes: 0, // Would need to parse memory files to calculate
      tagCounts,
    };
  }

  /**
   * Remove an entry from index
   */
  async removeEntry(sessionId: string): Promise<void> {
    if (!this.index) {
      await this.load();
    }

    const beforeCount = this.index!.entries.length;
    this.index!.entries = this.index!.entries.filter((e) => e.sessionId !== sessionId);

    if (this.index!.entries.length < beforeCount) {
      await this.save();
      logger.debug(`Removed memory index entry: ${sessionId}`);
    }
  }

  /**
   * Clear all entries (use with caution!)
   */
  async clear(): Promise<void> {
    if (!this.index) {
      await this.load();
    }

    this.index!.entries = [];
    await this.save();
    logger.warn("Cleared all memory index entries");
  }

  /**
   * Get index size statistics
   */
  getIndexStats(): {
    totalEntries: number;
    fileSize: number;
    newestEntry?: string;
  } {
    return {
      totalEntries: this.index?.entries.length || 0,
      fileSize: JSON.stringify(this.index).length,
      newestEntry:
        this.index && this.index.entries.length > 0 ? this.index.entries[0].sessionId : undefined,
    };
  }
}
