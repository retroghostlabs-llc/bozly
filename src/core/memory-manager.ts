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
import { logger } from "./logger.js";

/**
 * Memory Manager - Central hub for memory operations
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private memoryIndex: MemoryIndex;
  private indexPath: string;
  private memoryBasePath: string;
  private initialized = false;

  private constructor() {
    const bozlyHome = path.join(os.homedir(), ".bozly");
    this.indexPath = path.join(bozlyHome, "memory-index.json");
    this.memoryBasePath = path.join(bozlyHome, "sessions");
    this.memoryIndex = new MemoryIndex(this.indexPath);
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
      // We need to find the memory file - it's stored in:
      // ~/.bozly/sessions/{nodeId}/{YYYY}/{MM}/{DD}/{sessionId}/memory.md
      // But we don't know the date, so we search for it

      const memoryPath = await this.findMemoryFile(sessionId, nodeId);
      if (!memoryPath) {
        return null;
      }

      const content = await fs.readFile(memoryPath, "utf-8");
      const metadata = await this.loadMemoryMetadata(sessionId, nodeId);

      if (!metadata) {
        return null;
      }

      // Parse the markdown content to extract sections
      const memory: SessionMemory = {
        sessionId,
        nodeId: metadata.nodeId,
        nodeName: metadata.nodeName,
        timestamp: metadata.timestamp,
        durationMinutes: metadata.durationMinutes,
        tokenCount: metadata.tokenCount,
        aiProvider: metadata.aiProvider,
        command: metadata.command,
        title: metadata.summary,
        summary: metadata.summary,
        tags: metadata.tags,
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
   * Private helper: Load memory metadata
   */
  private async loadMemoryMetadata(
    sessionId: string,
    nodeId: string
  ): Promise<{
    sessionId: string;
    nodeId: string;
    nodeName: string;
    timestamp: string;
    durationMinutes: number;
    tokenCount?: number;
    aiProvider: string;
    command: string;
    tags: string[];
    summary: string;
  } | null> {
    try {
      const memoryPath = await this.findMemoryFile(sessionId, nodeId);
      if (!memoryPath) {
        return null;
      }

      // Look for a corresponding metadata.json file
      const metadataPath = memoryPath.replace(/memory\.md$/, "memory-metadata.json");

      try {
        const metadataContent = await fs.readFile(metadataPath, "utf-8");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return JSON.parse(metadataContent) as {
          sessionId: string;
          nodeId: string;
          nodeName: string;
          timestamp: string;
          durationMinutes: number;
          tokenCount?: number;
          aiProvider: string;
          command: string;
          tags: string[];
          summary: string;
        };
      } catch {
        // If no metadata file, try to extract from the session
        // Look for session.json in the same directory
        const sessionDir = path.dirname(memoryPath);
        const sessionJsonPath = path.join(sessionDir, "session.json");

        try {
          const sessionContent = await fs.readFile(sessionJsonPath, "utf-8");
          const sessionData = JSON.parse(sessionContent);

          return {
            sessionId,
            nodeId,
            nodeName: "Unknown",
            timestamp: sessionData.timestamp || new Date().toISOString(),
            durationMinutes: sessionData.durationMinutes || 0,
            tokenCount: sessionData.tokenCount,
            aiProvider: sessionData.provider || "unknown",
            command: sessionData.command || "unknown",
            tags: sessionData.tags || [],
            summary: sessionData.summary || "Session memory",
          };
        } catch {
          // Fallback: minimal metadata
          return {
            sessionId,
            nodeId,
            nodeName: "Unknown",
            timestamp: new Date().toISOString(),
            durationMinutes: 0,
            aiProvider: "unknown",
            command: "unknown",
            tags: [],
            summary: "Session memory",
          };
        }
      }
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
   * Ensure memory manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
