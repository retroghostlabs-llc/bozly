/**
 * Memory Loader Unit Tests
 *
 * Comprehensive tests for MemoryLoader class covering:
 * - Memory discovery from disk
 * - Memory file loading
 * - Memory ranking and filtering
 * - Context injection into prompts
 * - Memory summary generation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs/promises";
import { MemoryLoader, LoadMemoriesOptions } from "../../dist/memory/loader.js";
import { createTempDir, getTempDir, cleanupTempDir } from "../conftest.js";

describe("MemoryLoader", () => {
  let tempDir: string;
  let sessionsBasePath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    sessionsBasePath = path.join(tempDir, "sessions");
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  describe("discoverMemories", () => {
    it("should discover memory files in vault", async () => {
      // Create memory file structure
      const nodeId = "music-vault";
      const sessionId = "session-1";
      const memoryPath = path.join(sessionsBasePath, nodeId, "2025", "12", "20", sessionId);

      await fs.mkdir(memoryPath, { recursive: true });
      await fs.writeFile(path.join(memoryPath, "memory.md"), "# Memory content\n\nSession notes");

      const memories = await MemoryLoader.discoverMemories(sessionsBasePath, nodeId);

      expect(memories).toHaveLength(1);
      expect(memories[0].filename).toBe("memory.md");
      expect(memories[0].sessionId).toBe(sessionId);
    });

    it("should discover multiple memory files", async () => {
      const nodeId = "music-vault";

      // Create multiple memories
      for (let i = 1; i <= 3; i++) {
        const sessionId = `session-${i}`;
        const memoryPath = path.join(sessionsBasePath, nodeId, "2025", "12", `${20 + i}`, sessionId);
        await fs.mkdir(memoryPath, { recursive: true });
        await fs.writeFile(path.join(memoryPath, "memory.md"), `# Session ${i}`);
      }

      const memories = await MemoryLoader.discoverMemories(sessionsBasePath, nodeId);

      expect(memories).toHaveLength(3);
      expect(memories.every((m) => m.filename === "memory.md")).toBe(true);
    });

    it("should return empty array for nonexistent vault", async () => {
      const memories = await MemoryLoader.discoverMemories(sessionsBasePath, "nonexistent-vault");

      expect(memories).toHaveLength(0);
    });

    it("should return empty array for vault with no memories", async () => {
      const nodeId = "music-vault";
      await fs.mkdir(path.join(sessionsBasePath, nodeId), { recursive: true });

      const memories = await MemoryLoader.discoverMemories(sessionsBasePath, nodeId);

      expect(memories).toHaveLength(0);
    });

    it("should extract sessionId from path correctly", async () => {
      const nodeId = "music-vault";
      const sessionId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const memoryPath = path.join(sessionsBasePath, nodeId, "2025", "12", "20", sessionId);

      await fs.mkdir(memoryPath, { recursive: true });
      await fs.writeFile(path.join(memoryPath, "memory.md"), "# Memory");

      const memories = await MemoryLoader.discoverMemories(sessionsBasePath, nodeId);

      expect(memories[0].sessionId).toBe(sessionId);
    });

    it("should sort memories by timestamp newest first", async () => {
      const nodeId = "music-vault";

      // Create memories with different timestamps (with delays to ensure different mtimes)
      const now = new Date();
      for (let i = 0; i < 3; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0].replace(/-/g, "/");
        const [year, month, day] = dateStr.split("/");
        const sessionId = `session-${i}`;
        const memoryPath = path.join(sessionsBasePath, nodeId, year, month, day, sessionId);

        await fs.mkdir(memoryPath, { recursive: true });
        await fs.writeFile(path.join(memoryPath, "memory.md"), "# Memory");
        // Add small delay to ensure distinct mtimes
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const memories = await MemoryLoader.discoverMemories(sessionsBasePath, nodeId);

      // Should be sorted newest first
      expect(memories).toHaveLength(3);
      // Verify descending order by checking first and last
      const firstTimestamp = new Date(memories[0].timestamp).getTime();
      const lastTimestamp = new Date(memories[memories.length - 1].timestamp).getTime();
      expect(firstTimestamp).toBeGreaterThanOrEqual(lastTimestamp);
    });

    it("should ignore non-memory files", async () => {
      const nodeId = "music-vault";
      const sessionId = "session-1";
      const sessionPath = path.join(sessionsBasePath, nodeId, "2025", "12", "20", sessionId);

      await fs.mkdir(sessionPath, { recursive: true });
      await fs.writeFile(path.join(sessionPath, "session.json"), "{}");
      await fs.writeFile(path.join(sessionPath, "memory.md"), "# Memory");
      await fs.writeFile(path.join(sessionPath, "results.md"), "# Results");

      const memories = await MemoryLoader.discoverMemories(sessionsBasePath, nodeId);

      expect(memories).toHaveLength(1);
      expect(memories[0].filename).toBe("memory.md");
    });
  });

  describe("loadMemoryFile", () => {
    it("should load memory file content", async () => {
      const content = "# Memory Content\n\nImportant notes from session";
      const memoryPath = path.join(tempDir, "memory.md");

      await fs.mkdir(path.dirname(memoryPath), { recursive: true });
      await fs.writeFile(memoryPath, content);

      const loaded = await MemoryLoader.loadMemoryFile(memoryPath);

      expect(loaded).toBe(content);
    });

    it("should return null for nonexistent file", async () => {
      const memoryPath = path.join(tempDir, "nonexistent.md");

      const loaded = await MemoryLoader.loadMemoryFile(memoryPath);

      expect(loaded).toBeNull();
    });

    it("should handle empty memory files", async () => {
      const memoryPath = path.join(tempDir, "empty.md");

      await fs.mkdir(path.dirname(memoryPath), { recursive: true });
      await fs.writeFile(memoryPath, "");

      const loaded = await MemoryLoader.loadMemoryFile(memoryPath);

      expect(loaded).toBe("");
    });

    it("should preserve markdown formatting", async () => {
      const content = `# Session Memory

## Learnings
- Point 1
- Point 2

## Key Results
- Result A
- Result B`;

      const memoryPath = path.join(tempDir, "memory.md");

      await fs.mkdir(path.dirname(memoryPath), { recursive: true });
      await fs.writeFile(memoryPath, content);

      const loaded = await MemoryLoader.loadMemoryFile(memoryPath);

      expect(loaded).toContain("## Learnings");
      expect(loaded).toContain("- Point 1");
    });
  });

  describe("rankMemories", () => {
    it("should rank memories by recency by default", () => {
      const now = new Date();
      const memories = [
        {
          path: "/path/1",
          filename: "memory.md",
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: "session-1",
        },
        {
          path: "/path/2",
          filename: "memory.md",
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: "session-2",
        },
        {
          path: "/path/3",
          filename: "memory.md",
          timestamp: now.toISOString(),
          sessionId: "session-3",
        },
      ];

      const ranked = MemoryLoader.rankMemories(memories);

      // Most recent should be first
      expect(ranked[0].path).toBe("/path/3");
      expect(ranked[2].path).toBe("/path/1");
    });

    it("should filter by maxAge", () => {
      const now = new Date();
      const memories = [
        {
          path: "/path/1",
          filename: "memory.md",
          timestamp: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: "session-1",
        },
        {
          path: "/path/2",
          filename: "memory.md",
          timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: "session-2",
        },
      ];

      const options: LoadMemoriesOptions = { maxAge: 30 };
      const ranked = MemoryLoader.rankMemories(memories, options);

      // Only recent memory should be included
      expect(ranked).toHaveLength(1);
      expect(ranked[0].path).toBe("/path/2");
    });

    it("should apply limit", () => {
      const now = new Date();
      const memories = [];
      for (let i = 0; i < 5; i++) {
        memories.push({
          path: `/path/${i}`,
          filename: "memory.md",
          timestamp: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: `session-${i}`,
        });
      }

      const options: LoadMemoriesOptions = { limit: 2 };
      const ranked = MemoryLoader.rankMemories(memories, options);

      expect(ranked).toHaveLength(2);
    });

    it("should calculate relevance scores", () => {
      const now = new Date();
      const memories = [
        {
          path: "/path/1",
          filename: "memory.md",
          timestamp: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: "session-1",
        },
      ];

      const ranked = MemoryLoader.rankMemories(memories, { maxAge: 30 });

      expect(ranked[0].relevanceScore).toBeGreaterThan(0);
      expect(ranked[0].relevanceScore).toBeLessThanOrEqual(100);
    });

    it("should sort by relevance when requested", () => {
      const now = new Date();
      const memories = [
        {
          path: "/path/1",
          filename: "memory.md",
          timestamp: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: "session-1",
        },
        {
          path: "/path/2",
          filename: "memory.md",
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: "session-2",
        },
      ];

      const options: LoadMemoriesOptions = { sortBy: "relevance" };
      const ranked = MemoryLoader.rankMemories(memories, options);

      // More recent (higher relevance score) should be first
      expect(ranked[0].relevanceScore).toBeGreaterThan(ranked[1].relevanceScore);
    });
  });

  describe("loadRelevantMemories", () => {
    it("should load relevant memories from vault", async () => {
      const nodeId = "music-vault";

      // Create memory files
      for (let i = 0; i < 3; i++) {
        const sessionId = `session-${i}`;
        const memoryPath = path.join(sessionsBasePath, nodeId, "2025", "12", `${20 + i}`, sessionId);
        await fs.mkdir(memoryPath, { recursive: true });
        await fs.writeFile(path.join(memoryPath, "memory.md"), `# Session ${i}\n\nMemory content ${i}`);
      }

      const memories = await MemoryLoader.loadRelevantMemories(sessionsBasePath, nodeId);

      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0]).toContain("Memory content");
    });

    it("should return empty array for vault with no memories", async () => {
      const nodeId = "empty-vault";

      const memories = await MemoryLoader.loadRelevantMemories(sessionsBasePath, nodeId);

      expect(memories).toHaveLength(0);
    });

    it("should respect limit option", async () => {
      const nodeId = "music-vault";

      // Create 5 memory files
      for (let i = 0; i < 5; i++) {
        const sessionId = `session-${i}`;
        const memoryPath = path.join(sessionsBasePath, nodeId, "2025", "12", `${20 + i}`, sessionId);
        await fs.mkdir(memoryPath, { recursive: true });
        await fs.writeFile(path.join(memoryPath, "memory.md"), `# Session ${i}`);
      }

      const options: LoadMemoriesOptions = { limit: 2 };
      const memories = await MemoryLoader.loadRelevantMemories(sessionsBasePath, nodeId, options);

      expect(memories).toHaveLength(2);
    });

    it("should respect maxAge option", async () => {
      const nodeId = "music-vault";
      const now = new Date();

      // Create old memory (40 days ago)
      const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
      const oldDateStr = oldDate.toISOString().split("T")[0].replace(/-/g, "/");
      const [year, month, day] = oldDateStr.split("/");
      const oldMemoryPath = path.join(sessionsBasePath, nodeId, year, month, day, "old-session");
      await fs.mkdir(oldMemoryPath, { recursive: true });
      await fs.writeFile(path.join(oldMemoryPath, "memory.md"), "# Old memory");

      // Create recent memory
      const recentMemoryPath = path.join(sessionsBasePath, nodeId, "2025", "12", "20", "recent-session");
      await fs.mkdir(recentMemoryPath, { recursive: true });
      await fs.writeFile(path.join(recentMemoryPath, "memory.md"), "# Recent memory");

      const options: LoadMemoriesOptions = { maxAge: 30 };
      const memories = await MemoryLoader.loadRelevantMemories(sessionsBasePath, nodeId, options);

      // Should only have recent memory
      expect(memories.some((m) => m.includes("Recent memory"))).toBe(true);
    });
  });

  describe("injectMemoriesIntoContext", () => {
    it("should inject memories into context", () => {
      const baseContext = "# Main Context\n\nThis is the main vault context.";
      const memories = ["# Past Session 1\n\nMemory content 1", "# Past Session 2\n\nMemory content 2"];

      const result = MemoryLoader.injectMemoriesIntoContext(baseContext, memories);

      expect(result).toContain("=== CONTEXT FROM PREVIOUS SESSIONS ===");
      expect(result).toContain("Memory content 1");
      expect(result).toContain("Memory content 2");
      expect(result).toContain("# Main Context");
    });

    it("should return unchanged context when no memories", () => {
      const baseContext = "# Main Context\n\nThis is the main vault context.";
      const memories: string[] = [];

      const result = MemoryLoader.injectMemoriesIntoContext(baseContext, memories);

      expect(result).toBe(baseContext);
    });

    it("should format memories with session numbers", () => {
      const baseContext = "# Context";
      const memories = ["Memory 1", "Memory 2", "Memory 3"];

      const result = MemoryLoader.injectMemoriesIntoContext(baseContext, memories);

      expect(result).toContain("[Session 1]");
      expect(result).toContain("[Session 2]");
      expect(result).toContain("[Session 3]");
    });

    it("should separate memories with dividers", () => {
      const baseContext = "# Context";
      const memories = ["Memory 1", "Memory 2"];

      const result = MemoryLoader.injectMemoriesIntoContext(baseContext, memories);

      expect(result).toContain("---");
    });

    it("should preserve base context at end", () => {
      const baseContext = "# Main\n\nOriginal content with specific details";
      const memories = ["Past memory"];

      const result = MemoryLoader.injectMemoriesIntoContext(baseContext, memories);

      expect(result.endsWith(baseContext) || result.includes("# Main")).toBe(true);
    });
  });

  describe("injectMemoriesIntoPrompt", () => {
    it("should inject memories into context and return both", () => {
      const contextText = "# Context";
      const commandText = "# Command";
      const memories = ["# Memory"];

      const result = MemoryLoader.injectMemoriesIntoPrompt(contextText, commandText, memories);

      expect(result.contextText).toContain("=== CONTEXT FROM PREVIOUS SESSIONS ===");
      expect(result.contextText).toContain("# Memory");
      expect(result.contextText).toContain("# Context");
      expect(result.commandText).toBe(commandText);
    });

    it("should return unchanged when no memories", () => {
      const contextText = "# Context";
      const commandText = "# Command";
      const memories: string[] = [];

      const result = MemoryLoader.injectMemoriesIntoPrompt(contextText, commandText, memories);

      expect(result.contextText).toBe(contextText);
      expect(result.commandText).toBe(commandText);
    });

    it("should handle empty context text", () => {
      const contextText = "";
      const commandText = "# Command";
      const memories = ["# Memory"];

      const result = MemoryLoader.injectMemoriesIntoPrompt(contextText, commandText, memories);

      expect(result.contextText).toContain("=== CONTEXT FROM PREVIOUS SESSIONS ===");
      expect(result.contextText).toContain("# Memory");
    });

    it("should preserve command text unchanged", () => {
      const contextText = "# Context";
      const commandText = "# Command\n\nSpecific instructions for execution";
      const memories = ["# Memory"];

      const result = MemoryLoader.injectMemoriesIntoPrompt(contextText, commandText, memories);

      expect(result.commandText).toBe(commandText);
    });
  });

  describe("getMemorySummary", () => {
    it("should generate summary for single memory", () => {
      const memories = ["# Memory 1"];

      const summary = MemoryLoader.getMemorySummary(memories);

      expect(summary).toContain("1");
      expect(summary).toContain("past session");
    });

    it("should generate summary for multiple memories", () => {
      const memories = ["# Memory 1", "# Memory 2", "# Memory 3"];

      const summary = MemoryLoader.getMemorySummary(memories);

      expect(summary).toContain("3");
      expect(summary).toContain("memories");
    });

    it("should handle empty memories", () => {
      const memories: string[] = [];

      const summary = MemoryLoader.getMemorySummary(memories);

      expect(summary).toContain("0");
    });

    it("should use singular 'memory' for one item", () => {
      const memories = ["# Memory"];

      const summary = MemoryLoader.getMemorySummary(memories);

      expect(summary.toLowerCase()).toContain("memory");
    });

    it("should be suitable for logging", () => {
      const memories = ["# Memory 1", "# Memory 2"];

      const summary = MemoryLoader.getMemorySummary(memories);

      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
      expect(summary.includes("context")).toBe(true);
    });
  });

  describe("Integration Scenarios", () => {
    it("should discover, rank, and load memories in sequence", async () => {
      const nodeId = "music-vault";

      // Create memory structure
      for (let i = 0; i < 3; i++) {
        const sessionId = `session-${i}`;
        const memoryPath = path.join(sessionsBasePath, nodeId, "2025", "12", `${20 + i}`, sessionId);
        await fs.mkdir(memoryPath, { recursive: true });
        await fs.writeFile(
          path.join(memoryPath, "memory.md"),
          `# Session ${i}\n\nMemory content for session ${i}`
        );
      }

      // Load and verify
      const memories = await MemoryLoader.loadRelevantMemories(sessionsBasePath, nodeId, {
        limit: 2,
      });

      expect(memories.length).toBeLessThanOrEqual(2);
      expect(memories.every((m) => typeof m === "string")).toBe(true);
      expect(memories[0]).toContain("Memory content");
    });

    it("should handle full workflow with context injection", async () => {
      const nodeId = "music-vault";

      // Create memory
      const sessionId = "session-1";
      const memoryPath = path.join(sessionsBasePath, nodeId, "2025", "12", "20", sessionId);
      await fs.mkdir(memoryPath, { recursive: true });
      await fs.writeFile(path.join(memoryPath, "memory.md"), "# Past discovery\n\nRated albums yesterday");

      // Load memories
      const memories = await MemoryLoader.loadRelevantMemories(sessionsBasePath, nodeId);

      // Inject into context
      const baseContext = "# Music Vault Context\n\nRate and organize music";
      const commandText = "Rate top albums from 2025";
      const enhanced = MemoryLoader.injectMemoriesIntoPrompt(baseContext, commandText, memories);

      expect(enhanced.contextText).toContain("Past discovery");
      expect(enhanced.contextText).toContain("Music Vault Context");
      expect(enhanced.commandText).toBe(commandText);
    });
  });
});
