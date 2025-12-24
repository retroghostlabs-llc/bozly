/**
 * Memory Index Unit Tests
 *
 * Comprehensive tests for MemoryIndex class covering:
 * - Index lifecycle (load, save, clear)
 * - Entry management (add, remove)
 * - Query operations (by node, tags, command, time range, search)
 * - Statistics and index management
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs/promises";
import { MemoryIndex } from "../../dist/memory/index.js";
import { MemoryMetadata } from "../../dist/core/types.js";
import { createTempDir, getTempDir, cleanupTempDir } from "../conftest.js";

describe("MemoryIndex", () => {
  let indexPath: string;
  let tempDir: string;
  let memoryIndex: MemoryIndex;

  beforeEach(async () => {
    tempDir = await createTempDir();
    indexPath = path.join(tempDir, "memory-index.json");
    memoryIndex = new MemoryIndex(indexPath);
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  describe("Index Lifecycle", () => {
    it("should load an existing index from disk", async () => {
      // Create a test index file
      const testIndex = {
        version: "1.0",
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        entries: [
          {
            sessionId: "test-session-1",
            nodeId: "music-vault",
            nodeName: "Music Vault",
            timestamp: new Date().toISOString(),
            command: "rate-album",
            summary: "Rated 5 albums",
            tags: ["music", "rate-album"],
            filePath: "/path/to/memory.md",
          },
        ],
      };

      await fs.mkdir(path.dirname(indexPath), { recursive: true });
      await fs.writeFile(indexPath, JSON.stringify(testIndex, null, 2));

      await memoryIndex.load();
      const stats = memoryIndex.getIndexStats();

      expect(stats.totalEntries).toBe(1);
      expect(stats.newestEntry).toBe("test-session-1");
    });

    it("should create new index if file doesn't exist", async () => {
      await memoryIndex.load();
      const stats = memoryIndex.getIndexStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.fileSize).toBeGreaterThan(0);
    });

    it("should save index to disk", async () => {
      await memoryIndex.load();

      const metadata: MemoryMetadata = {
        sessionId: "session-1",
        nodeId: "music-vault",
        nodeName: "Music Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "rate-album",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["music", "rate-album"],
        relevantPreviousSessions: [],
        summary: "Rated albums",
        vaultType: "music",
      };

      await memoryIndex.addEntry(metadata, "/path/to/memory.md");

      // Verify file was written
      const content = await fs.readFile(indexPath, "utf-8");
      const savedIndex = JSON.parse(content);

      expect(savedIndex.entries).toHaveLength(1);
      expect(savedIndex.entries[0].sessionId).toBe("session-1");
    });

    it("should handle corrupted index file gracefully", async () => {
      // Create corrupted index file
      await fs.mkdir(path.dirname(indexPath), { recursive: true });
      await fs.writeFile(indexPath, "{ invalid json }");

      // Should not throw, should create empty index
      await memoryIndex.load();
      const stats = memoryIndex.getIndexStats();

      expect(stats.totalEntries).toBe(0);
    });

    it("should clear all entries", async () => {
      await memoryIndex.load();

      const metadata: MemoryMetadata = {
        sessionId: "session-1",
        nodeId: "music-vault",
        nodeName: "Music Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "rate-album",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["music"],
        relevantPreviousSessions: [],
        summary: "Test",
        vaultType: "music",
      };

      await memoryIndex.addEntry(metadata, "/path/to/memory.md");
      expect(memoryIndex.getIndexStats().totalEntries).toBe(1);

      await memoryIndex.clear();
      expect(memoryIndex.getIndexStats().totalEntries).toBe(0);
    });
  });

  describe("Entry Management", () => {
    beforeEach(async () => {
      await memoryIndex.load();
    });

    it("should add entry to index", async () => {
      const metadata: MemoryMetadata = {
        sessionId: "session-1",
        nodeId: "music-vault",
        nodeName: "Music Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "rate-album",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["music", "rate-album"],
        relevantPreviousSessions: [],
        summary: "Rated 5 albums",
        vaultType: "music",
      };

      await memoryIndex.addEntry(metadata, "/path/to/memory.md");

      expect(memoryIndex.getIndexStats().totalEntries).toBe(1);
    });

    it("should prevent duplicate entries", async () => {
      const metadata: MemoryMetadata = {
        sessionId: "session-1",
        nodeId: "music-vault",
        nodeName: "Music Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "rate-album",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["music"],
        relevantPreviousSessions: [],
        summary: "Test",
        vaultType: "music",
      };

      await memoryIndex.addEntry(metadata, "/path/to/memory1.md");
      await memoryIndex.addEntry(metadata, "/path/to/memory2.md");

      // Should only have one entry (duplicate replaced)
      expect(memoryIndex.getIndexStats().totalEntries).toBe(1);
    });

    it("should remove entry by session id", async () => {
      const metadata: MemoryMetadata = {
        sessionId: "session-1",
        nodeId: "music-vault",
        nodeName: "Music Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "rate-album",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["music"],
        relevantPreviousSessions: [],
        summary: "Test",
        vaultType: "music",
      };

      await memoryIndex.addEntry(metadata, "/path/to/memory.md");
      expect(memoryIndex.getIndexStats().totalEntries).toBe(1);

      await memoryIndex.removeEntry("session-1");
      expect(memoryIndex.getIndexStats().totalEntries).toBe(0);
    });

    it("should sort entries by timestamp newest first", async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const metadata1: MemoryMetadata = {
        sessionId: "session-1",
        nodeId: "music-vault",
        nodeName: "Music Vault",
        timestamp: oneHourAgo.toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "rate-album",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["music"],
        relevantPreviousSessions: [],
        summary: "Test",
        vaultType: "music",
      };

      const metadata2: MemoryMetadata = {
        sessionId: "session-2",
        nodeId: "music-vault",
        nodeName: "Music Vault",
        timestamp: now.toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "list-albums",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["music"],
        relevantPreviousSessions: [],
        summary: "Test",
        vaultType: "music",
      };

      await memoryIndex.addEntry(metadata1, "/path/to/memory1.md");
      await memoryIndex.addEntry(metadata2, "/path/to/memory2.md");

      const stats = memoryIndex.getIndexStats();
      // Newest entry should be session-2
      expect(stats.newestEntry).toBe("session-2");
    });
  });

  describe("Query Operations", () => {
    beforeEach(async () => {
      await memoryIndex.load();

      // Add test entries for different vaults and commands
      const entries = [
        {
          sessionId: "music-session-1",
          nodeId: "music-vault",
          nodeName: "Music Vault",
          command: "rate-album",
          tags: ["music", "rate-album", "quick"],
        },
        {
          sessionId: "music-session-2",
          nodeId: "music-vault",
          nodeName: "Music Vault",
          command: "list-songs",
          tags: ["music", "list-songs", "normal"],
        },
        {
          sessionId: "project-session-1",
          nodeId: "project-vault",
          nodeName: "Project Vault",
          command: "planning",
          tags: ["project", "planning", "long-running"],
        },
      ];

      for (const entry of entries) {
        const metadata: MemoryMetadata = {
          sessionId: entry.sessionId,
          nodeId: entry.nodeId,
          nodeName: entry.nodeName,
          timestamp: new Date().toISOString(),
          durationMinutes: 10,
          tokenCount: 5000,
          aiProvider: "claude",
          command: entry.command,
          memoryAutoExtracted: true,
          extractionTrigger: "sessionEnd",
          tags: entry.tags,
          relevantPreviousSessions: [],
          summary: `Test for ${entry.command}`,
          vaultType: "generic",
        };

        await memoryIndex.addEntry(metadata, "/path/to/memory.md");
      }
    });

    it("should query by node/vault", async () => {
      const results = await memoryIndex.queryByNode("music-vault");

      expect(results).toHaveLength(2);
      expect(results.every((e) => e.nodeId === "music-vault")).toBe(true);
    });

    it("should query by node with limit", async () => {
      const results = await memoryIndex.queryByNode("music-vault", 1);

      expect(results).toHaveLength(1);
    });

    it("should query by tags", async () => {
      const results = await memoryIndex.queryByTags(["music"]);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some((e) => e.nodeId === "music-vault")).toBe(true);
    });

    it("should query by multiple tags", async () => {
      const results = await memoryIndex.queryByTags(["music", "rate-album"]);

      expect(results.length).toBeGreaterThan(0);
    });

    it("should query by command", async () => {
      const results = await memoryIndex.queryByCommand("rate-album");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((e) => e.command === "rate-album")).toBe(true);
    });

    it("should query by command case-insensitively", async () => {
      const results = await memoryIndex.queryByCommand("RATE-ALBUM");

      expect(results.length).toBeGreaterThan(0);
    });

    it("should query by time range", async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayInFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const results = await memoryIndex.queryByTimeRange(oneHourAgo, oneDayInFuture);

      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty for time range with no matches", async () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const results = await memoryIndex.queryByTimeRange(twoWeeksAgo, oneWeekAgo);

      expect(results).toHaveLength(0);
    });

    it("should perform full-text search", async () => {
      const results = await memoryIndex.search("music");

      expect(results.total).toBeGreaterThan(0);
      expect(results.entries.length).toBeGreaterThan(0);
    });

    it("should search by command name", async () => {
      const results = await memoryIndex.search("planning");

      expect(results.total).toBeGreaterThan(0);
    });

    it("should search by tags", async () => {
      const results = await memoryIndex.search("quick");

      expect(results.total).toBeGreaterThan(0);
    });

    it("should apply limit to search results", async () => {
      const results = await memoryIndex.search("vault", 1);

      expect(results.total).toBeLessThanOrEqual(1);
    });

    it("should return query information in search results", async () => {
      const results = await memoryIndex.search("music");

      expect(results.query).toBe("music");
      expect(results.total).toEqual(results.entries.length);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await memoryIndex.load();
    });

    it("should generate stats for all entries", async () => {
      const entries = [
        { sessionId: "s1", nodeId: "vault1", tags: ["tag1", "tag2"] },
        { sessionId: "s2", nodeId: "vault1", tags: ["tag1", "tag3"] },
        { sessionId: "s3", nodeId: "vault2", tags: ["tag4"] },
      ];

      for (const entry of entries) {
        const metadata: MemoryMetadata = {
          sessionId: entry.sessionId,
          nodeId: entry.nodeId,
          nodeName: `Vault ${entry.nodeId}`,
          timestamp: new Date().toISOString(),
          durationMinutes: 10,
          tokenCount: 5000,
          aiProvider: "claude",
          command: "test",
          memoryAutoExtracted: true,
          extractionTrigger: "sessionEnd",
          tags: entry.tags,
          relevantPreviousSessions: [],
          summary: "Test",
          vaultType: "generic",
        };

        await memoryIndex.addEntry(metadata, "/path/to/memory.md");
      }

      const stats = await memoryIndex.getStats();

      expect(stats.totalSessions).toBe(3);
      expect(stats.totalMemories).toBe(3);
      expect(stats.oldestMemory).toBeDefined();
      expect(stats.newestMemory).toBeDefined();
      expect(stats.tagCounts["tag1"]).toBe(2);
      expect(stats.tagCounts["tag4"]).toBe(1);
    });

    it("should generate stats for specific node", async () => {
      const entries = [
        { sessionId: "s1", nodeId: "vault1" },
        { sessionId: "s2", nodeId: "vault1" },
        { sessionId: "s3", nodeId: "vault2" },
      ];

      for (const entry of entries) {
        const metadata: MemoryMetadata = {
          sessionId: entry.sessionId,
          nodeId: entry.nodeId,
          nodeName: `Vault ${entry.nodeId}`,
          timestamp: new Date().toISOString(),
          durationMinutes: 10,
          tokenCount: 5000,
          aiProvider: "claude",
          command: "test",
          memoryAutoExtracted: true,
          extractionTrigger: "sessionEnd",
          tags: ["test"],
          relevantPreviousSessions: [],
          summary: "Test",
          vaultType: "generic",
        };

        await memoryIndex.addEntry(metadata, "/path/to/memory.md");
      }

      const stats = await memoryIndex.getStats("vault1");

      expect(stats.totalMemories).toBe(2);
      expect(stats.totalSessions).toBe(3); // Still counts all sessions
    });

    it("should return empty stats for vault with no memories", async () => {
      const stats = await memoryIndex.getStats("nonexistent-vault");

      expect(stats.totalMemories).toBe(0);
      expect(stats.oldestMemory).toBeUndefined();
      expect(stats.newestMemory).toBeUndefined();
    });

    it("should calculate tag counts correctly", async () => {
      const metadata: MemoryMetadata = {
        sessionId: "session-1",
        nodeId: "vault",
        nodeName: "Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "test",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["tag1", "tag1", "tag2"], // Duplicate tag
        relevantPreviousSessions: [],
        summary: "Test",
        vaultType: "generic",
      };

      await memoryIndex.addEntry(metadata, "/path/to/memory.md");

      const stats = await memoryIndex.getStats();
      // Each tag instance should be counted
      expect(stats.tagCounts["tag1"]).toBeGreaterThan(0);
    });
  });

  describe("Index Statistics", () => {
    it("should return index size statistics", async () => {
      await memoryIndex.load();

      const stats = memoryIndex.getIndexStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.fileSize).toBeGreaterThan(0);
      expect(stats.newestEntry).toBeUndefined();
    });

    it("should update index stats after adding entries", async () => {
      await memoryIndex.load();

      const metadata: MemoryMetadata = {
        sessionId: "session-1",
        nodeId: "vault",
        nodeName: "Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "test",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["test"],
        relevantPreviousSessions: [],
        summary: "Test",
        vaultType: "generic",
      };

      await memoryIndex.addEntry(metadata, "/path/to/memory.md");

      const stats = memoryIndex.getIndexStats();

      expect(stats.totalEntries).toBe(1);
      expect(stats.newestEntry).toBe("session-1");
    });

    it("should report correct file size after save", async () => {
      await memoryIndex.load();

      const statsBefore = memoryIndex.getIndexStats();

      const metadata: MemoryMetadata = {
        sessionId: "session-1",
        nodeId: "vault",
        nodeName: "Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "test-command",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["test"],
        relevantPreviousSessions: [],
        summary: "Test summary",
        vaultType: "generic",
      };

      await memoryIndex.addEntry(metadata, "/path/to/memory.md");

      const statsAfter = memoryIndex.getIndexStats();

      expect(statsAfter.fileSize).toBeGreaterThan(statsBefore.fileSize);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing index gracefully", async () => {
      const missingPath = path.join(tempDir, "nonexistent-dir", "index.json");
      const index = new MemoryIndex(missingPath);

      // Should not throw
      await expect(index.load()).resolves.not.toThrow();
    });

    it("should handle invalid JSON in index file", async () => {
      await fs.mkdir(path.dirname(indexPath), { recursive: true });
      await fs.writeFile(indexPath, "invalid json content");

      const index = new MemoryIndex(indexPath);
      await expect(index.load()).resolves.not.toThrow();

      // Should create empty index
      const stats = index.getIndexStats();
      expect(stats.totalEntries).toBe(0);
    });

    it("should handle concurrent operations safely", async () => {
      await memoryIndex.load();

      const metadata: MemoryMetadata = {
        sessionId: "session-1",
        nodeId: "vault",
        nodeName: "Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "test",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["test"],
        relevantPreviousSessions: [],
        summary: "Test",
        vaultType: "generic",
      };

      // Perform multiple operations
      await Promise.all([
        memoryIndex.addEntry(metadata, "/path/1.md"),
        memoryIndex.addEntry({ ...metadata, sessionId: "session-2" }, "/path/2.md"),
      ]);

      expect(memoryIndex.getIndexStats().totalEntries).toBeGreaterThan(0);
    });
  });
});
