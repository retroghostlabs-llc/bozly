/**
 * Memory System Integration Tests
 *
 * Comprehensive integration tests for the complete memory workflow:
 * - Session memory extraction and storage
 * - Memory indexing for cross-vault queries
 * - Memory loading and context injection
 * - Multi-vault memory operations
 * - End-to-end session-to-context flow
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs/promises";
import {
  recordSession,
  extractAndSaveMemory,
  indexSessionMemory,
  loadPastMemories,
} from "../../dist/core/sessions.js";
import { MemoryIndex } from "../../dist/memory/index.js";
import { MemoryLoader } from "../../dist/memory/loader.js";
import { MemoryExtractor } from "../../dist/memory/extractor.js";
import { createTempDir, getTempDir, cleanupTempDir, createMockVault } from "../conftest.js";

describe("Memory System Integration", () => {
  let tempDir: string;
  let nodePath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    nodePath = await createMockVault(tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  describe("Memory Extraction and Storage", () => {
    it("should extract memory from completed session", async () => {
      // Record a session
      const session = await recordSession(
        nodePath,
        "music-vault",
        "Music Vault",
        "rate-album",
        "claude",
        {
          contextText: "# Music Rating Context\n\nRate albums on personal and objective scales",
          commandText: "Rate the top 5 albums from 2025",
        },
        {
          text: "✅ Successfully rated 5 albums with consistent scoring",
          duration: 5000,
        }
      );

      // Extract memory from session
      const memory = MemoryExtractor.extract(
        {
          session,
          vaultContext: "# Music Rating Context\n\nRate albums on personal and objective scales",
          executionTimeMs: 5000,
          executionOutput: "✅ Successfully rated 5 albums with consistent scoring",
        },
        "sessionEnd"
      );

      expect(memory.sessionId).toBe(session.id);
      expect(memory.nodeId).toBe("music-vault");
      expect(memory.command).toBe("rate-album");
      expect(memory.tags).toContain("music");
    });

    it("should save extracted memory alongside session files", async () => {
      // Record session
      const session = await recordSession(
        nodePath,
        "music-vault",
        "Music Vault",
        "rate-album",
        "claude",
        {
          contextText: "# Context",
          commandText: "Rate albums",
        },
        {
          text: "Completed",
          duration: 3000,
        }
      );

      // Extract and save memory
      const memory = MemoryExtractor.extract(
        {
          session,
          executionTimeMs: 3000,
        },
        "sessionEnd"
      );

      const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", "music");
      const markdown = MemoryExtractor.toMarkdown(memory, metadata);

      // Save memory file
      const dateStr = session.timestamp.split("T")[0].replace(/-/g, "/");
      const memoryPath = path.join(nodePath, ".bozly", "sessions", "music-vault", dateStr, session.id, "memory.md");
      await fs.mkdir(path.dirname(memoryPath), { recursive: true });
      await fs.writeFile(memoryPath, markdown);

      // Verify memory file was created
      const saved = await fs.readFile(memoryPath, "utf-8");
      expect(saved).toContain("Session:");
      expect(saved).toContain("Music Vault");
      expect(saved).toContain(session.id);
    });
  });

  describe("Memory Indexing", () => {
    it("should index multiple session memories", async () => {
      const indexPath = path.join(tempDir, "memory-index.json");
      const memoryIndex = new MemoryIndex(indexPath);
      await memoryIndex.load();

      // Create and index multiple memories
      for (let i = 1; i <= 3; i++) {
        const metadata = {
          sessionId: `session-${i}`,
          nodeId: "music-vault",
          nodeName: "Music Vault",
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 10,
          tokenCount: 5000,
          aiProvider: "claude",
          command: `command-${i}`,
          memoryAutoExtracted: true,
          extractionTrigger: "sessionEnd",
          tags: ["music", `command-${i}`],
          relevantPreviousSessions: [],
          summary: `Memory for command ${i}`,
          vaultType: "music",
        };

        await memoryIndex.addEntry(metadata, `/path/to/memory-${i}.md`);
      }

      // Query index
      const allMemories = await memoryIndex.queryByNode("music-vault");
      expect(allMemories).toHaveLength(3);

      // Get stats
      const stats = await memoryIndex.getStats("music-vault");
      expect(stats.totalMemories).toBe(3);
    });

    it("should enable cross-vault memory queries", async () => {
      const indexPath = path.join(tempDir, "memory-index.json");
      const memoryIndex = new MemoryIndex(indexPath);
      await memoryIndex.load();

      // Index memories from different vaults
      const vaults = [
        { id: "music-vault", name: "Music Vault", tag: "music" },
        { id: "project-vault", name: "Project Vault", tag: "project" },
        { id: "journal-vault", name: "Journal Vault", tag: "journal" },
      ];

      for (const vault of vaults) {
        const metadata = {
          sessionId: `session-${vault.id}`,
          nodeId: vault.id,
          nodeName: vault.name,
          timestamp: new Date().toISOString(),
          durationMinutes: 10,
          tokenCount: 5000,
          aiProvider: "claude",
          command: "test",
          memoryAutoExtracted: true,
          extractionTrigger: "sessionEnd",
          tags: [vault.tag],
          relevantPreviousSessions: [],
          summary: `Test for ${vault.id}`,
          vaultType: vault.tag,
        };

        await memoryIndex.addEntry(metadata, `/path/to/${vault.id}.md`);
      }

      // Search across all vaults
      const results = await memoryIndex.search("vault");
      expect(results.total).toBeGreaterThanOrEqual(3);

      // Query by specific tag
      const musicMemories = await memoryIndex.queryByTags(["music"]);
      expect(musicMemories.some((m) => m.nodeId === "music-vault")).toBe(true);
    });

    it("should maintain index consistency after multiple operations", async () => {
      const indexPath = path.join(tempDir, "memory-index.json");
      const memoryIndex = new MemoryIndex(indexPath);
      await memoryIndex.load();

      // Add entries
      for (let i = 0; i < 5; i++) {
        const metadata = {
          sessionId: `session-${i}`,
          nodeId: "music-vault",
          nodeName: "Music Vault",
          timestamp: new Date().toISOString(),
          durationMinutes: 10,
          tokenCount: 5000,
          aiProvider: "claude",
          command: "test",
          memoryAutoExtracted: true,
          extractionTrigger: "sessionEnd",
          tags: ["music"],
          relevantPreviousSessions: [],
          summary: "Test",
          vaultType: "music",
        };

        await memoryIndex.addEntry(metadata, `/path/to/memory-${i}.md`);
      }

      let stats = await memoryIndex.getStats();
      expect(stats.totalMemories).toBe(5);

      // Remove some entries
      await memoryIndex.removeEntry("session-1");
      await memoryIndex.removeEntry("session-2");

      stats = await memoryIndex.getStats();
      expect(stats.totalMemories).toBe(3);

      // Add more entries
      for (let i = 5; i < 8; i++) {
        const metadata = {
          sessionId: `session-${i}`,
          nodeId: "music-vault",
          nodeName: "Music Vault",
          timestamp: new Date().toISOString(),
          durationMinutes: 10,
          tokenCount: 5000,
          aiProvider: "claude",
          command: "test",
          memoryAutoExtracted: true,
          extractionTrigger: "sessionEnd",
          tags: ["music"],
          relevantPreviousSessions: [],
          summary: "Test",
          vaultType: "music",
        };

        await memoryIndex.addEntry(metadata, `/path/to/memory-${i}.md`);
      }

      stats = await memoryIndex.getStats();
      expect(stats.totalMemories).toBe(6);
    });
  });

  describe("Memory Loading and Context Injection", () => {
    it("should load past memories and inject into context", async () => {
      const nodeId = "music-vault";

      // Create memory structure with actual files
      for (let i = 1; i <= 3; i++) {
        const sessionId = `session-${i}`;
        const memoryPath = path.join(
          tempDir,
          "sessions",
          nodeId,
          "2025",
          "12",
          `${20 + i}`,
          sessionId
        );
        await fs.mkdir(memoryPath, { recursive: true });

        const memoryContent = `# Session ${i} Memory

## Key Discovery
- Found artist ${i}
- Rating: ${90 + i}

## Learnings
- Pattern in scoring consistency
- Recommendation ${i}`;

        await fs.writeFile(path.join(memoryPath, "memory.md"), memoryContent);
      }

      // Load memories
      const sessionsPath = path.join(tempDir, "sessions");
      const memories = await MemoryLoader.loadRelevantMemories(sessionsPath, nodeId, {
        limit: 2,
      });

      expect(memories.length).toBeGreaterThan(0);

      // Inject into context
      const baseContext = "# Music Vault\n\nRate and organize music collection";
      const enhanced = MemoryLoader.injectMemoriesIntoContext(baseContext, memories);

      expect(enhanced).toContain("=== CONTEXT FROM PREVIOUS SESSIONS ===");
      expect(enhanced).toContain("Music Vault");
      expect(enhanced.length).toBeGreaterThan(baseContext.length);
    });

    it("should respect memory age filtering", async () => {
      const nodeId = "music-vault";

      // Create multiple memories
      const recentMemoryPath = path.join(tempDir, "sessions", nodeId, "2025", "12", "20", "recent-session");
      await fs.mkdir(recentMemoryPath, { recursive: true });
      await fs.writeFile(path.join(recentMemoryPath, "memory.md"), "# Recent Memory\n\nRecent content");

      const anotherMemoryPath = path.join(tempDir, "sessions", nodeId, "2025", "12", "19", "another-session");
      await fs.mkdir(anotherMemoryPath, { recursive: true });
      await fs.writeFile(path.join(anotherMemoryPath, "memory.md"), "# Another Memory\n\nAnother content");

      // Load with limit (should respect max memories)
      const sessionsPath = path.join(tempDir, "sessions");
      const allMemories = await MemoryLoader.loadRelevantMemories(sessionsPath, nodeId);
      expect(allMemories.length).toBeGreaterThan(0);

      // Load with restrictive limit
      const limitedMemories = await MemoryLoader.loadRelevantMemories(sessionsPath, nodeId, {
        limit: 1,
      });
      expect(limitedMemories).toHaveLength(1);
    });

    it("should handle empty memory scenarios", async () => {
      const nodeId = "empty-vault";
      const sessionsPath = path.join(tempDir, "sessions");

      const memories = await MemoryLoader.loadRelevantMemories(sessionsPath, nodeId);
      expect(memories).toHaveLength(0);

      // Should handle gracefully in context injection
      const baseContext = "# Context";
      const enhanced = MemoryLoader.injectMemoriesIntoContext(baseContext, memories);

      expect(enhanced).toBe(baseContext);
    });
  });

  describe("End-to-End Workflow", () => {
    it("should complete full memory workflow: extract → index → load → inject", async () => {
      const nodeId = "music-vault";
      const indexPath = path.join(tempDir, "memory-index.json");
      const memoryIndex = new MemoryIndex(indexPath);

      // Step 1: Record and extract session memory
      const session = await recordSession(
        nodePath,
        nodeId,
        "Music Vault",
        "rate-album",
        "claude",
        {
          contextText: "# Music Vault\n\nRate albums on multiple dimensions",
          commandText: "Rate top 5 albums from 2025",
        },
        {
          text: "Successfully rated 5 albums with consistent scoring",
          duration: 5000,
        }
      );

      const memory = MemoryExtractor.extract(
        {
          session,
          vaultContext: "# Music Vault\n\nRate albums on multiple dimensions",
          executionTimeMs: 5000,
          executionOutput: "Successfully rated 5 albums",
        },
        "sessionEnd"
      );

      // Save memory file
      const dateStr = session.timestamp.split("T")[0].replace(/-/g, "/");
      const memoryFilePath = path.join(
        nodePath,
        ".bozly",
        "sessions",
        nodeId,
        dateStr,
        session.id,
        "memory.md"
      );
      await fs.mkdir(path.dirname(memoryFilePath), { recursive: true });
      const markdown = MemoryExtractor.toMarkdown(
        memory,
        MemoryExtractor.generateMetadata(memory, "sessionEnd", "music")
      );
      await fs.writeFile(memoryFilePath, markdown);

      // Step 2: Index the memory
      await memoryIndex.load();
      const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", "music");
      await memoryIndex.addEntry(metadata, memoryFilePath);

      const indexStats = memoryIndex.getIndexStats();
      expect(indexStats.totalEntries).toBe(1);

      // Step 3: Load memory for new session
      const sessionsPath = path.join(nodePath, ".bozly", "sessions");
      const loadedMemories = await MemoryLoader.loadRelevantMemories(sessionsPath, nodeId);

      expect(loadedMemories.length).toBeGreaterThan(0);

      // Step 4: Inject into new context
      const newContext = "# Music Vault\n\nNew session starting";
      const enhancedContext = MemoryLoader.injectMemoriesIntoContext(newContext, loadedMemories);

      expect(enhancedContext).toContain("=== CONTEXT FROM PREVIOUS SESSIONS ===");
      expect(enhancedContext).toContain("rate-album");
      expect(enhancedContext).toContain("# Music Vault\n\nNew session starting");

      // Verify memory is accessible for future queries
      const queriedMemories = await memoryIndex.queryByCommand("rate-album");
      expect(queriedMemories).toHaveLength(1);
      expect(queriedMemories[0].command).toBe("rate-album");
    });

    it("should handle multiple sessions across different vaults", async () => {
      const indexPath = path.join(tempDir, "memory-index.json");
      const memoryIndex = new MemoryIndex(indexPath);
      await memoryIndex.load();

      const vaults = [
        {
          id: "music-vault",
          name: "Music Vault",
          command: "rate-album",
          type: "music",
        },
        {
          id: "project-vault",
          name: "Project Vault",
          command: "plan-sprint",
          type: "project",
        },
        {
          id: "journal-vault",
          name: "Journal Vault",
          command: "daily-entry",
          type: "journal",
        },
      ];

      // Create sessions for each vault
      for (const vault of vaults) {
        const session = await recordSession(
          nodePath,
          vault.id,
          vault.name,
          vault.command,
          "claude",
          {
            contextText: `# ${vault.name}`,
            commandText: `Execute ${vault.command}`,
          },
          {
            text: "✅ Completed",
            duration: 3000,
          }
        );

        // Extract memory
        const memory = MemoryExtractor.extract(
          {
            session,
            vaultContext: `# ${vault.name}`,
            executionTimeMs: 3000,
          },
          "sessionEnd"
        );

        // Index memory
        const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", vault.type);
        await memoryIndex.addEntry(metadata, `/path/to/${vault.id}-memory.md`);
      }

      // Verify global queries work
      const allMemories = await memoryIndex.getStats();
      expect(allMemories.totalMemories).toBe(3);

      // Query by specific vault
      const musicMemories = await memoryIndex.queryByNode("music-vault");
      expect(musicMemories).toHaveLength(1);
      expect(musicMemories[0].nodeId).toBe("music-vault");

      // Query by tag
      const projectMemories = await memoryIndex.queryByTags(["project"]);
      expect(projectMemories.some((m) => m.nodeId === "project-vault")).toBe(true);

      // Search globally
      const searchResults = await memoryIndex.search("sprint");
      expect(searchResults.total).toBeGreaterThan(0);
    });
  });

  describe("Memory System Resilience", () => {
    it("should recover from missing memory files", async () => {
      const indexPath = path.join(tempDir, "memory-index.json");
      const memoryIndex = new MemoryIndex(indexPath);
      await memoryIndex.load();

      // Add entry to index for non-existent file
      const metadata = {
        sessionId: "session-1",
        nodeId: "music-vault",
        nodeName: "Music Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "test",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["music"],
        relevantPreviousSessions: [],
        summary: "Test",
        vaultType: "music",
      };

      await memoryIndex.addEntry(metadata, "/nonexistent/path/memory.md");

      // Try to load - should not crash
      const nodeId = "music-vault";
      const sessionsPath = path.join(tempDir, "sessions");
      const memories = await MemoryLoader.loadRelevantMemories(sessionsPath, nodeId);

      // Should handle gracefully
      expect(Array.isArray(memories)).toBe(true);
    });

    it("should handle corrupted memory files", async () => {
      const nodeId = "music-vault";
      const sessionId = "session-1";
      const memoryPath = path.join(tempDir, "sessions", nodeId, "2025", "12", "20", sessionId);
      await fs.mkdir(memoryPath, { recursive: true });

      // Write corrupted memory file
      await fs.writeFile(path.join(memoryPath, "memory.md"), "<<<<<< CORRUPTED FILE");

      // Should load the file content even if corrupted
      const content = await MemoryLoader.loadMemoryFile(path.join(memoryPath, "memory.md"));

      expect(content).toContain("CORRUPTED");
    });

    it("should maintain data consistency after clearing index", async () => {
      const indexPath = path.join(tempDir, "memory-index.json");
      const memoryIndex = new MemoryIndex(indexPath);
      await memoryIndex.load();

      // Add entries
      for (let i = 0; i < 3; i++) {
        const metadata = {
          sessionId: `session-${i}`,
          nodeId: "music-vault",
          nodeName: "Music Vault",
          timestamp: new Date().toISOString(),
          durationMinutes: 10,
          tokenCount: 5000,
          aiProvider: "claude",
          command: "test",
          memoryAutoExtracted: true,
          extractionTrigger: "sessionEnd",
          tags: ["music"],
          relevantPreviousSessions: [],
          summary: "Test",
          vaultType: "music",
        };

        await memoryIndex.addEntry(metadata, `/path/to/memory-${i}.md`);
      }

      let stats = memoryIndex.getIndexStats();
      expect(stats.totalEntries).toBe(3);

      // Clear and verify
      await memoryIndex.clear();
      stats = memoryIndex.getIndexStats();
      expect(stats.totalEntries).toBe(0);

      // Re-populate
      const metadata = {
        sessionId: "session-new",
        nodeId: "music-vault",
        nodeName: "Music Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 10,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "test",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["music"],
        relevantPreviousSessions: [],
        summary: "Test",
        vaultType: "music",
      };

      await memoryIndex.addEntry(metadata, "/path/to/memory-new.md");
      stats = memoryIndex.getIndexStats();
      expect(stats.totalEntries).toBe(1);
    });
  });

  describe("Memory Summary for Logging", () => {
    it("should generate appropriate summary for single memory", () => {
      const memories = ["# Past Session\n\nMemory content"];
      const summary = MemoryLoader.getMemorySummary(memories);

      expect(summary).toContain("1");
      expect(summary).toContain("context");
    });

    it("should generate appropriate summary for multiple memories", () => {
      const memories = [
        "# Session 1",
        "# Session 2",
        "# Session 3",
        "# Session 4",
        "# Session 5",
      ];
      const summary = MemoryLoader.getMemorySummary(memories);

      expect(summary).toContain("5");
      expect(summary).toContain("context");
    });
  });
});
