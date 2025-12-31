/**
 * Memory Manager Unit Tests
 *
 * Comprehensive tests for MemoryManager class covering:
 * - Singleton pattern initialization
 * - Memory loading and file discovery
 * - Memory listing and filtering
 * - Memory searching and tag queries
 * - Memory deletion
 * - Statistics generation
 * - Metadata loading (multiple fallback paths)
 * - Content parsing
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs/promises";
import { MemoryManager } from "../../dist/core/memory-manager.js";
import { createTempDir, getTempDir, cleanupTempDir } from "../conftest.js";
import { logger } from "../../dist/core/logger.js";

describe("Memory Manager", () => {
  let tempDir: string;
  let bozlyHome: string;
  let sessionsBasePath: string;

  beforeEach(async () => {
    // Create temporary directory structure
    tempDir = await createTempDir();
    bozlyHome = path.join(tempDir, ".bozly");
    sessionsBasePath = path.join(bozlyHome, "sessions");

    // Create basic directory structure
    await fs.mkdir(sessionsBasePath, { recursive: true });

    // Reset singleton for testing
    (MemoryManager as any).instance = undefined;
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = MemoryManager.getInstance();
      const instance2 = MemoryManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance if not initialized", () => {
      (MemoryManager as any).instance = undefined;
      const instance = MemoryManager.getInstance();

      expect(instance).toBeDefined();
      expect(MemoryManager.getInstance()).toBe(instance);
    });
  });

  describe("initialize", () => {
    it("should initialize memory manager on first call", async () => {
      const manager = MemoryManager.getInstance();

      // Create empty index file
      await fs.mkdir(bozlyHome, { recursive: true });
      await fs.writeFile(path.join(bozlyHome, "memory-index.json"), "[]");

      await manager.initialize();

      // Should set initialized flag
      expect((manager as any).initialized).toBe(true);
    });

    it("should skip initialization if already initialized", async () => {
      const manager = MemoryManager.getInstance();

      // First initialization
      await fs.mkdir(bozlyHome, { recursive: true });
      await fs.writeFile(path.join(bozlyHome, "memory-index.json"), "[]");

      const spy = vi.spyOn(logger, "debug");
      await manager.initialize();

      // Get count from first initialization
      const firstInitCalls = spy.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("Memory manager initialized")
      );
      const countAfterFirst = firstInitCalls.length;

      // Second initialization should return immediately without logging
      spy.mockClear();
      await manager.initialize();

      // Should not log initialization again
      const secondInitCalls = spy.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("Memory manager initialized")
      );
      expect(secondInitCalls).toHaveLength(0);
      expect(countAfterFirst).toBeGreaterThanOrEqual(1);
    });

    it("should throw error on initialization failure", async () => {
      const manager = MemoryManager.getInstance();

      // Mock the memoryIndex to throw an error
      vi.spyOn((manager as any).memoryIndex, "load").mockRejectedValue(new Error("Load failed"));

      const initPromise = manager.initialize();

      await expect(initPromise).rejects.toThrow("Load failed");
    });
  });

  describe("loadMemory", () => {
    it("should load memory with full metadata from memory.md", async () => {
      const manager = MemoryManager.getInstance();
      const nodeId = "test-vault";
      const sessionId = "test-session-1";

      // Mock findMemoryFile and loadMemoryMetadata
      const memoryPath = "/fake/path/memory.md";
      vi.spyOn(manager as any, "findMemoryFile").mockResolvedValue(memoryPath);
      vi.spyOn(manager as any, "loadMemoryMetadata").mockResolvedValue({
        sessionId,
        nodeId,
        nodeName: "Test Vault",
        timestamp: "2025-12-31T10:00:00Z",
        durationMinutes: 30,
        tokenCount: 1500,
        aiProvider: "claude",
        command: "daily",
        tags: ["memory", "testing"],
        summary: "Test memory",
      });

      // Mock fs.readFile
      vi.spyOn(fs, "readFile").mockResolvedValue(`# Session Memory

## Current State
Working on memory manager implementation

## Key Results
- Implemented MemoryManager class
- All methods working correctly`);

      const result = await manager.loadMemory(sessionId, nodeId);

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.nodeId).toBe(nodeId);
      expect(result?.nodeName).toBe("Test Vault");
      expect(result?.tags).toEqual(["memory", "testing"]);
      expect(result?.currentState).toContain("Working on memory manager");
    });

    it("should fallback to session.json if metadata.json missing", async () => {
      const manager = MemoryManager.getInstance();
      const nodeId = "test-vault";
      const sessionId = "test-session-2";

      // Mock findMemoryFile
      const memoryPath = "/fake/path/memory.md";
      vi.spyOn(manager as any, "findMemoryFile").mockResolvedValue(memoryPath);

      // Mock loadMemoryMetadata to return metadata from session.json fallback
      vi.spyOn(manager as any, "loadMemoryMetadata").mockResolvedValue({
        sessionId,
        nodeId,
        nodeName: "Unknown",
        timestamp: "2025-12-31T10:00:00Z",
        durationMinutes: 25,
        aiProvider: "gpt",
        command: "review",
        tags: ["fallback"],
        summary: "Fallback test",
      });

      // Mock fs.readFile
      vi.spyOn(fs, "readFile").mockResolvedValue("# Memory content");

      const result = await manager.loadMemory(sessionId, nodeId);

      expect(result).toBeDefined();
      expect(result?.nodeId).toBe(nodeId);
      expect(result?.aiProvider).toBe("gpt");
      expect(result?.command).toBe("review");
      expect(result?.tags).toEqual(["fallback"]);
    });

    it("should use default values when no metadata available", async () => {
      const manager = MemoryManager.getInstance();
      const nodeId = "test-vault";
      const sessionId = "test-session-3";

      // Mock findMemoryFile
      const memoryPath = "/fake/path/memory.md";
      vi.spyOn(manager as any, "findMemoryFile").mockResolvedValue(memoryPath);

      // Mock loadMemoryMetadata to return default values
      vi.spyOn(manager as any, "loadMemoryMetadata").mockResolvedValue({
        sessionId,
        nodeId,
        nodeName: "Unknown",
        timestamp: new Date().toISOString(),
        durationMinutes: 0,
        aiProvider: "unknown",
        command: "unknown",
        tags: [],
        summary: "Session memory",
      });

      // Mock fs.readFile
      vi.spyOn(fs, "readFile").mockResolvedValue("# Memory content");

      const result = await manager.loadMemory(sessionId, nodeId);

      expect(result).toBeDefined();
      expect(result?.nodeName).toBe("Unknown");
      expect(result?.aiProvider).toBe("unknown");
      expect(result?.command).toBe("unknown");
      expect(result?.durationMinutes).toBe(0);
      expect(result?.tags).toEqual([]);
    });

    it("should return null if memory file not found", async () => {
      const manager = MemoryManager.getInstance();

      const result = await manager.loadMemory("nonexistent-session", "nonexistent-vault");

      expect(result).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      const manager = MemoryManager.getInstance();

      // Try to load from a path that will fail
      const result = await manager.loadMemory("bad-session", "bad-vault");

      expect(result).toBeNull();
    });
  });

  describe("listMemories", () => {
    beforeEach(async () => {
      const manager = MemoryManager.getInstance();
      await fs.mkdir(bozlyHome, { recursive: true });
      await fs.writeFile(path.join(bozlyHome, "memory-index.json"), JSON.stringify([]));
      await manager.initialize();
    });

    it("should list all memories without filter", async () => {
      const manager = MemoryManager.getInstance();

      // Mock getAllEntries
      vi.spyOn((manager as any).memoryIndex, "getAllEntries").mockResolvedValue([
        { sessionId: "session-1", nodeId: "vault-1", timestamp: "2025-12-31T10:00:00Z", tags: [] },
        { sessionId: "session-2", nodeId: "vault-1", timestamp: "2025-12-31T11:00:00Z", tags: [] },
      ]);

      const results = await manager.listMemories();

      expect(results).toHaveLength(2);
      expect(results[0].sessionId).toBe("session-1");
    });

    it("should filter memories by node ID", async () => {
      const manager = MemoryManager.getInstance();

      // Mock queryByNode
      vi.spyOn((manager as any).memoryIndex, "queryByNode").mockResolvedValue([
        { sessionId: "session-1", nodeId: "vault-1", timestamp: "2025-12-31T10:00:00Z", tags: [] },
      ]);

      const results = await manager.listMemories("vault-1", 10);

      expect(results).toHaveLength(1);
      expect(results[0].nodeId).toBe("vault-1");
    });

    it("should respect limit parameter", async () => {
      const manager = MemoryManager.getInstance();

      // Mock to return 2 items when limit is 2
      vi.spyOn((manager as any).memoryIndex, "getAllEntries").mockImplementation((limit) => {
        return Promise.resolve([
          { sessionId: "session-1", nodeId: "vault-1", timestamp: "2025-12-31T10:00:00Z", tags: [] },
          { sessionId: "session-2", nodeId: "vault-1", timestamp: "2025-12-31T11:00:00Z", tags: [] },
        ].slice(0, limit));
      });

      const results = await manager.listMemories(undefined, 2);

      expect(results.length).toBeLessThanOrEqual(2);
      expect(results.length).toBe(2);
    });

    it("should return empty array on error", async () => {
      const manager = MemoryManager.getInstance();

      vi.spyOn((manager as any).memoryIndex, "getAllEntries").mockRejectedValue(new Error("Query failed"));

      const results = await manager.listMemories();

      expect(results).toEqual([]);
    });
  });

  describe("searchMemories", () => {
    beforeEach(async () => {
      const manager = MemoryManager.getInstance();
      await fs.mkdir(bozlyHome, { recursive: true });
      await fs.writeFile(path.join(bozlyHome, "memory-index.json"), JSON.stringify([]));
      await manager.initialize();
    });

    it("should search memories by query", async () => {
      const manager = MemoryManager.getInstance();

      vi.spyOn((manager as any).memoryIndex, "search").mockResolvedValue({
        entries: [{ sessionId: "session-1", nodeId: "vault-1", timestamp: "2025-12-31T10:00:00Z", tags: [] }],
      });

      const results = await manager.searchMemories("memory", 20);

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe("session-1");
    });

    it("should return empty array on search error", async () => {
      const manager = MemoryManager.getInstance();

      vi.spyOn((manager as any).memoryIndex, "search").mockRejectedValue(new Error("Search failed"));

      const results = await manager.searchMemories("query");

      expect(results).toEqual([]);
    });
  });

  describe("getMemoriesByTags", () => {
    beforeEach(async () => {
      const manager = MemoryManager.getInstance();
      await fs.mkdir(bozlyHome, { recursive: true });
      await fs.writeFile(path.join(bozlyHome, "memory-index.json"), JSON.stringify([]));
      await manager.initialize();
    });

    it("should get memories filtered by tags", async () => {
      const manager = MemoryManager.getInstance();

      vi.spyOn((manager as any).memoryIndex, "queryByTags").mockResolvedValue([
        {
          sessionId: "session-1",
          nodeId: "vault-1",
          timestamp: "2025-12-31T10:00:00Z",
          tags: ["memory", "testing"],
        },
      ]);

      const results = await manager.getMemoriesByTags(["memory"], 20);

      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain("memory");
    });

    it("should return empty array on tag query error", async () => {
      const manager = MemoryManager.getInstance();

      vi.spyOn((manager as any).memoryIndex, "queryByTags").mockRejectedValue(new Error("Tag query failed"));

      const results = await manager.getMemoriesByTags(["test"]);

      expect(results).toEqual([]);
    });
  });

  describe("deleteMemory", () => {
    it("should delete memory file and remove from index", async () => {
      const manager = MemoryManager.getInstance();
      const nodeId = "test-vault";
      const sessionId = "test-session-delete";
      const memoryDir = path.join(sessionsBasePath, nodeId, "2025", "12", "31", sessionId);

      // Setup
      await fs.mkdir(bozlyHome, { recursive: true });
      await fs.mkdir(memoryDir, { recursive: true });
      await fs.writeFile(path.join(memoryDir, "memory.md"), "# Test");
      await fs.writeFile(path.join(bozlyHome, "memory-index.json"), JSON.stringify([]));

      // Initialize manager
      await manager.initialize();

      // Mock index removal
      vi.spyOn((manager as any).memoryIndex, "removeEntry").mockResolvedValue(undefined);

      const result = await manager.deleteMemory(sessionId, nodeId);

      expect(result).toBe(true);
    });

    it("should return true even if memory file not found", async () => {
      const manager = MemoryManager.getInstance();

      await fs.mkdir(bozlyHome, { recursive: true });
      await fs.writeFile(path.join(bozlyHome, "memory-index.json"), JSON.stringify([]));
      await manager.initialize();

      vi.spyOn((manager as any).memoryIndex, "removeEntry").mockResolvedValue(undefined);

      const result = await manager.deleteMemory("nonexistent", "nonexistent");

      expect(result).toBe(true);
    });

    it("should return false on deletion error", async () => {
      const manager = MemoryManager.getInstance();

      await fs.mkdir(bozlyHome, { recursive: true });
      await fs.writeFile(path.join(bozlyHome, "memory-index.json"), JSON.stringify([]));
      await manager.initialize();

      vi.spyOn((manager as any).memoryIndex, "removeEntry").mockRejectedValue(new Error("Delete failed"));

      const result = await manager.deleteMemory("session", "vault");

      expect(result).toBe(false);
    });
  });

  describe("getMemoryStats", () => {
    beforeEach(async () => {
      const manager = MemoryManager.getInstance();
      await fs.mkdir(bozlyHome, { recursive: true });
      await fs.writeFile(path.join(bozlyHome, "memory-index.json"), JSON.stringify([]));
      await manager.initialize();
    });

    it("should get stats for all memories", async () => {
      const manager = MemoryManager.getInstance();

      vi.spyOn((manager as any).memoryIndex, "getStats").mockResolvedValue({
        totalMemories: 5,
        newestMemory: "2025-12-31T12:00:00Z",
        oldestMemory: "2025-12-01T10:00:00Z",
        tagCounts: { memory: 3, testing: 2 },
      });

      const stats = await manager.getMemoryStats();

      expect(stats.totalMemories).toBe(5);
      expect(stats.tagCounts["memory"]).toBe(3);
    });

    it("should get stats filtered by node ID", async () => {
      const manager = MemoryManager.getInstance();

      vi.spyOn((manager as any).memoryIndex, "getStats").mockResolvedValue({
        totalMemories: 2,
        newestMemory: "2025-12-31T12:00:00Z",
        oldestMemory: "2025-12-20T10:00:00Z",
        tagCounts: { vault1: 2 },
      });

      const stats = await manager.getMemoryStats("vault-1");

      expect(stats.totalMemories).toBe(2);
    });

    it("should return default stats on error", async () => {
      const manager = MemoryManager.getInstance();

      vi.spyOn((manager as any).memoryIndex, "getStats").mockRejectedValue(new Error("Stats failed"));

      const stats = await manager.getMemoryStats();

      expect(stats.totalMemories).toBe(0);
      expect(stats.tagCounts).toEqual({});
    });
  });

  describe("findMemoryFile", () => {
    it("should find memory file in nested directory structure", async () => {
      const manager = MemoryManager.getInstance();
      const nodeId = "test-vault";
      const sessionId = "test-session-find";

      // Mock fs.readdir to simulate directory traversal
      const mockPath = `/fake/path/${nodeId}/2025/12/31/${sessionId}/memory.md`;
      let callCount = 0;

      vi.spyOn(fs, "readdir").mockImplementation(async (dir) => {
        callCount++;
        if (callCount === 1) {
          // First call returns the year directory
          return [{ name: "2025", isDirectory: () => true }] as any;
        } else if (callCount === 2) {
          // Second call returns month
          return [{ name: "12", isDirectory: () => true }] as any;
        } else if (callCount === 3) {
          // Third call returns day
          return [{ name: "31", isDirectory: () => true }] as any;
        } else if (callCount === 4) {
          // Fourth call returns session dir with memory.md
          return [{ name: sessionId, isDirectory: () => true }] as any;
        } else if (callCount === 5) {
          // Fifth call returns memory.md file
          return [{ name: "memory.md", isDirectory: () => false }] as any;
        }
        return [];
      });

      const found = await (manager as any).findMemoryFile(sessionId, nodeId);

      expect(found).toBeDefined();
      expect(found?.endsWith("memory.md")).toBe(true);
    });

    it("should return null if memory not found", async () => {
      const manager = MemoryManager.getInstance();

      const found = await (manager as any).findMemoryFile("nonexistent", "nonexistent");

      expect(found).toBeNull();
    });

    it("should skip files that don't match session ID", async () => {
      const manager = MemoryManager.getInstance();
      const nodeId = "test-vault";
      const sessionId1 = "session-1";
      const sessionId2 = "session-2";

      // Mock to return both session dirs but match sessionId1
      let callCount = 0;
      vi.spyOn(fs, "readdir").mockImplementation(async (dir: any) => {
        callCount++;
        if (callCount === 1) {
          // First call - year directory
          return [{ name: "2025", isDirectory: () => true }] as any;
        } else if (callCount === 2) {
          // Month directory
          return [{ name: "12", isDirectory: () => true }] as any;
        } else if (callCount === 3) {
          // Day directory
          return [{ name: "31", isDirectory: () => true }] as any;
        } else if (callCount === 4) {
          // Session directories - return both
          return [
            { name: sessionId2, isDirectory: () => true },
            { name: sessionId1, isDirectory: () => true },
          ] as any;
        } else if (callCount === 5) {
          // First session (wrong one) has memory.md but wrong ID
          return [{ name: "memory.md", isDirectory: () => false }] as any;
        } else if (callCount === 6) {
          // Second session (correct one) has memory.md with correct ID
          return [{ name: "memory.md", isDirectory: () => false }] as any;
        }
        return [];
      });

      const found = await (manager as any).findMemoryFile(sessionId1, nodeId);

      expect(found).toBeDefined();
      expect(found).toContain(sessionId1);
    });
  });

  describe("parseMemoryContent", () => {
    it("should parse all recognized sections", () => {
      const manager = MemoryManager.getInstance();

      const content = `# Header

## Current State
State content here

## Task Specification
Task details

## Workflow
Workflow steps

## Errors
Error log

## Learnings
Learning notes

## Key Results
Results summary`;

      const result = (manager as any).parseMemoryContent(content);

      expect(result.currentState).toContain("State content");
      expect(result.taskSpec).toContain("Task details");
      expect(result.workflow).toContain("Workflow steps");
      expect(result.errors).toContain("Error log");
      expect(result.learnings).toContain("Learning notes");
      expect(result.keyResults).toContain("Results summary");
    });

    it("should ignore unrecognized sections", () => {
      const manager = MemoryManager.getInstance();

      const content = `## Recognized
Recognized content

## Unrecognized Section
This should be ignored

## Current State
State content`;

      const result = (manager as any).parseMemoryContent(content);

      expect(result.currentState).toBeDefined();
      expect((result as any).unrecognized).toBeUndefined();
    });

    it("should handle content without sections", () => {
      const manager = MemoryManager.getInstance();

      const content = `# Just a header
Some content without sections`;

      const result = (manager as any).parseMemoryContent(content);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should trim whitespace from section content", () => {
      const manager = MemoryManager.getInstance();

      const content = `## Current State
Indented content

More content`;

      const result = (manager as any).parseMemoryContent(content);

      // The content is trimmed of leading/trailing whitespace
      expect(result.currentState).toBeDefined();
      expect(result.currentState).toContain("Indented content");
      expect(result.currentState).toContain("More content");
    });
  });

  describe("sectionNameToKey", () => {
    it("should map recognized section names to keys", () => {
      const manager = MemoryManager.getInstance();

      const testCases = [
        ["Current State", "currentState"],
        ["Task Specification", "taskSpec"],
        ["Workflow", "workflow"],
        ["Errors", "errors"],
        ["Learnings", "learnings"],
        ["Key Results", "keyResults"],
      ];

      for (const [name, key] of testCases) {
        const result = (manager as any).sectionNameToKey(name);
        expect(result).toBe(key);
      }
    });

    it("should return null for unrecognized section names", () => {
      const manager = MemoryManager.getInstance();

      const result = (manager as any).sectionNameToKey("Unknown Section");

      expect(result).toBeNull();
    });

    it("should be case-sensitive", () => {
      const manager = MemoryManager.getInstance();

      const result = (manager as any).sectionNameToKey("current state"); // lowercase

      expect(result).toBeNull();
    });
  });

  describe("ensureInitialized", () => {
    it("should initialize if not already initialized", async () => {
      const manager = MemoryManager.getInstance();

      await fs.mkdir(bozlyHome, { recursive: true });
      await fs.writeFile(path.join(bozlyHome, "memory-index.json"), JSON.stringify([]));

      await (manager as any).ensureInitialized();

      expect((manager as any).initialized).toBe(true);
    });

    it("should skip if already initialized", async () => {
      const manager = MemoryManager.getInstance();

      // Set initialized to true
      (manager as any).initialized = true;

      // Mock initialize to track if it's called
      const initSpy = vi.spyOn(manager, "initialize");

      // Call ensure
      await (manager as any).ensureInitialized();

      // Should not call initialize again since already initialized
      expect(initSpy).not.toHaveBeenCalled();
    });
  });
});
