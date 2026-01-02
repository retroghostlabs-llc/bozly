/**
 * Memory Archiver Unit Tests
 *
 * Comprehensive tests for automatic memory archival covering:
 * - Detecting memory cache size (global + vault-specific)
 * - Identifying unused memories (>90 days without access)
 * - Archiving memories in chunks to monthly files
 * - Maintaining searchability of archived memories
 * - Size-triggered archival (>5MB cache)
 * - Both global and per-vault memory directories
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs/promises";
import { createTempDir, getTempDir, cleanupTempDir } from "../conftest.js";

describe("Memory Archiver", () => {
  let tempDir: string;
  let bozlyHome: string;
  let globalMemoryPath: string;
  let sessionPath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    bozlyHome = path.join(tempDir, ".bozly");
    globalMemoryPath = path.join(bozlyHome, "sessions");
    sessionPath = path.join(bozlyHome, "sessions", "vault", "2025", "01", "15");

    // Create directory structure
    await fs.mkdir(sessionPath, { recursive: true });
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  describe("Cache Size Detection", () => {
    it("should detect total cache size for global memory directory", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      // Create test memory files
      const session1 = path.join(globalMemoryPath, "vault", "2025", "01", "15", "session1");
      const session2 = path.join(globalMemoryPath, "vault", "2025", "01", "16", "session2");

      await fs.mkdir(session1, { recursive: true });
      await fs.mkdir(session2, { recursive: true });

      // Create 3MB of test data
      const data3MB = Buffer.alloc(3 * 1024 * 1024);
      await fs.writeFile(path.join(session1, "memory.md"), data3MB);

      const data2MB = Buffer.alloc(2 * 1024 * 1024);
      await fs.writeFile(path.join(session2, "memory.md"), data2MB);

      const archiver = new MemoryArchiver(bozlyHome);
      const size = await archiver.detectCacheSize();

      expect(size.totalSizeMB).toBeGreaterThanOrEqual(4.9);
      expect(size.totalSizeMB).toBeLessThanOrEqual(5.1);
      expect(size.fileCount).toBe(2);
    });

    it("should detect cache size for per-vault directories", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      // Create multiple vault directories
      const vault1Session = path.join(globalMemoryPath, "music", "2025", "01", "15", "session1");
      const vault2Session = path.join(globalMemoryPath, "project", "2025", "01", "15", "session2");

      await fs.mkdir(vault1Session, { recursive: true });
      await fs.mkdir(vault2Session, { recursive: true });

      const data2MB = Buffer.alloc(2 * 1024 * 1024);
      await fs.writeFile(path.join(vault1Session, "memory.md"), data2MB);
      await fs.writeFile(path.join(vault2Session, "memory.md"), data2MB);

      const archiver = new MemoryArchiver(bozlyHome);
      const size = await archiver.detectCacheSize();

      expect(size.totalSizeMB).toBeGreaterThanOrEqual(3.9);
      expect(size.byVault["music"]).toBeDefined();
      expect(size.byVault["project"]).toBeDefined();
    });

    it("should return zero size for empty cache", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      const archiver = new MemoryArchiver(bozlyHome);
      const size = await archiver.detectCacheSize();

      expect(size.totalSizeMB).toBe(0);
      expect(size.fileCount).toBe(0);
    });
  });

  describe("Identifying Unused Memories", () => {
    it("should identify memories unused for 90+ days", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      // Create memory file from 95 days ago
      const oldDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000);
      const oldSession = path.join(
        globalMemoryPath,
        "vault",
        oldDate.getFullYear().toString(),
        String(oldDate.getMonth() + 1).padStart(2, "0"),
        String(oldDate.getDate()).padStart(2, "0"),
        "old-session"
      );

      await fs.mkdir(oldSession, { recursive: true });

      const metadata = {
        sessionId: "old-session",
        nodeId: "vault",
        usage: { lastUsed: oldDate.toISOString(), timesUsed: 0 },
      };

      await fs.writeFile(path.join(oldSession, "memory.md"), "Old memory content");
      await fs.writeFile(path.join(oldSession, "metadata.json"), JSON.stringify(metadata));

      // Make file old too
      await fs.utimes(path.join(oldSession, "metadata.json"), oldDate, oldDate);

      const archiver = new MemoryArchiver(bozlyHome);
      const candidates = await archiver.findArchivableCandidates(90);

      expect(candidates).toHaveLength(1);
      expect(candidates[0].sessionId).toBe("old-session");
      expect(candidates[0].daysOld).toBeGreaterThanOrEqual(90);
    });

    it("should NOT identify recent memories as archivable", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      // Create memory file from 5 days ago
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const recentSession = path.join(
        globalMemoryPath,
        "vault",
        recentDate.getFullYear().toString(),
        String(recentDate.getMonth() + 1).padStart(2, "0"),
        String(recentDate.getDate()).padStart(2, "0"),
        "recent-session"
      );

      await fs.mkdir(recentSession, { recursive: true });

      const metadata = {
        sessionId: "recent-session",
        nodeId: "vault",
        usage: { lastUsed: recentDate.toISOString(), timesUsed: 3 },
      };

      await fs.writeFile(path.join(recentSession, "memory.md"), "Recent memory content");
      await fs.writeFile(path.join(recentSession, "metadata.json"), JSON.stringify(metadata));
      await fs.utimes(path.join(recentSession, "metadata.json"), recentDate, recentDate);

      const archiver = new MemoryArchiver(bozlyHome);
      const candidates = await archiver.findArchivableCandidates(90);

      expect(candidates).toHaveLength(0);
    });

    it("should prioritize archival by last access time, not creation time", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      // Memory created 100 days ago but accessed 5 days ago
      const creationDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const lastAccessDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      const session = path.join(
        globalMemoryPath,
        "vault",
        creationDate.getFullYear().toString(),
        String(creationDate.getMonth() + 1).padStart(2, "0"),
        String(creationDate.getDate()).padStart(2, "0"),
        "mixed-session"
      );

      await fs.mkdir(session, { recursive: true });

      const metadata = {
        sessionId: "mixed-session",
        nodeId: "vault",
        usage: { lastUsed: lastAccessDate.toISOString(), timesUsed: 5 },
      };

      await fs.writeFile(path.join(session, "memory.md"), "Memory accessed recently");
      await fs.writeFile(path.join(session, "metadata.json"), JSON.stringify(metadata));

      const archiver = new MemoryArchiver(bozlyHome);
      const candidates = await archiver.findArchivableCandidates(90);

      // Should NOT be archivable because lastUsed is within 90 days
      expect(candidates).toHaveLength(0);
    });
  });

  describe("Archiving Memories in Chunks", () => {
    it("should archive memories to monthly archive files", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      // Create archivable memory from 100 days ago (September 2024)
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const year = oldDate.getFullYear();
      const month = String(oldDate.getMonth() + 1).padStart(2, "0");

      const session = path.join(
        globalMemoryPath,
        "vault",
        year.toString(),
        month,
        String(oldDate.getDate()).padStart(2, "0"),
        "old-session"
      );

      await fs.mkdir(session, { recursive: true });

      const metadata = {
        sessionId: "old-session",
        nodeId: "vault",
        usage: { lastUsed: oldDate.toISOString(), timesUsed: 0 },
      };

      await fs.writeFile(path.join(session, "memory.md"), "Old content");
      await fs.writeFile(path.join(session, "metadata.json"), JSON.stringify(metadata));

      const archiver = new MemoryArchiver(bozlyHome);
      const result = await archiver.archiveOldMemories(90);

      expect(result.archived).toBe(1);
      expect(result.totalArchivedMB).toBeGreaterThan(0);

      // Verify archive file exists
      const archiveFile = path.join(
        globalMemoryPath,
        "vault",
        `.archives/memories-archive-${year}-${month}.json`
      );
      const archiveExists = await fs
        .access(archiveFile)
        .then(() => true)
        .catch(() => false);

      expect(archiveExists).toBe(true);
    });

    it("should archive in chunks until cache is below 5MB", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      // Create 3 archivable memories of 2MB each
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const year = oldDate.getFullYear();
      const month = String(oldDate.getMonth() + 1).padStart(2, "0");

      for (let i = 0; i < 3; i++) {
        const session = path.join(
          globalMemoryPath,
          "vault",
          year.toString(),
          month,
          String(oldDate.getDate()).padStart(2, "0"),
          `session-${i}`
        );

        await fs.mkdir(session, { recursive: true });

        // Create ~2MB file
        const data = Buffer.alloc(2 * 1024 * 1024);
        await fs.writeFile(path.join(session, "memory.md"), data);

        const metadata = {
          sessionId: `session-${i}`,
          nodeId: "vault",
          usage: { lastUsed: oldDate.toISOString(), timesUsed: 0 },
        };

        await fs.writeFile(path.join(session, "metadata.json"), JSON.stringify(metadata));
      }

      const archiver = new MemoryArchiver(bozlyHome);
      const result = await archiver.archiveUntilBelowThreshold(5); // 5MB threshold

      expect(result.archived).toBeGreaterThan(0);
      expect(result.finalCacheSizeMB).toBeLessThan(5);
    });

    it("should remove archived memories from active cache", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const year = oldDate.getFullYear();
      const month = String(oldDate.getMonth() + 1).padStart(2, "0");

      const session = path.join(
        globalMemoryPath,
        "vault",
        year.toString(),
        month,
        String(oldDate.getDate()).padStart(2, "0"),
        "old-session"
      );

      await fs.mkdir(session, { recursive: true });
      // Create 1MB of test data so cache size is measurable
      const data = Buffer.alloc(1024 * 1024);
      await fs.writeFile(path.join(session, "memory.md"), data);
      await fs.writeFile(
        path.join(session, "metadata.json"),
        JSON.stringify({
          sessionId: "old-session",
          nodeId: "vault",
          usage: { lastUsed: oldDate.toISOString() },
        })
      );

      const archiver = new MemoryArchiver(bozlyHome);
      const sizeBefore = await archiver.detectCacheSize();

      await archiver.archiveOldMemories(90);

      const sizeAfter = await archiver.detectCacheSize();

      // Cache should be smaller after archival
      expect(sizeBefore.totalSizeMB).toBeGreaterThan(0);
      expect(sizeAfter.totalSizeMB).toBeLessThan(sizeBefore.totalSizeMB);
    });
  });

  describe("Archive File Organization", () => {
    it("should create monthly archive files (memories-archive-YYYY-MM.json)", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      // Create memories from different months, both old enough to archive
      const sept = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000); // September (120 days)
      const oct = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000); // October (95 days)

      for (const date of [sept, oct]) {
        const session = path.join(
          globalMemoryPath,
          "vault",
          date.getFullYear().toString(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
          `session-${date.getMonth()}`
        );

        await fs.mkdir(session, { recursive: true });
        await fs.writeFile(path.join(session, "memory.md"), "Content");
        await fs.writeFile(
          path.join(session, "metadata.json"),
          JSON.stringify({
            sessionId: `session-${date.getMonth()}`,
            nodeId: "vault",
            usage: { lastUsed: date.toISOString() },
          })
        );
      }

      const archiver = new MemoryArchiver(bozlyHome);
      await archiver.archiveOldMemories(90);

      // Verify monthly archives exist (at least one)
      const archivesDir = path.join(globalMemoryPath, "vault", ".archives");
      const files = await fs.readdir(archivesDir);

      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.some((f) => /memories-archive-\d{4}-\d{2}\.json/.test(f))).toBe(true);
    });

    it("should maintain archive file with proper JSON structure", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const year = oldDate.getFullYear();
      const month = String(oldDate.getMonth() + 1).padStart(2, "0");

      const session = path.join(
        globalMemoryPath,
        "vault",
        year.toString(),
        month,
        String(oldDate.getDate()).padStart(2, "0"),
        "old-session"
      );

      await fs.mkdir(session, { recursive: true });
      await fs.writeFile(path.join(session, "memory.md"), "Archived content");
      await fs.writeFile(
        path.join(session, "metadata.json"),
        JSON.stringify({
          sessionId: "old-session",
          nodeId: "vault",
          title: "Test Memory",
          summary: "Test summary",
          usage: { lastUsed: oldDate.toISOString() },
        })
      );

      const archiver = new MemoryArchiver(bozlyHome);
      await archiver.archiveOldMemories(90);

      const archiveFile = path.join(
        globalMemoryPath,
        "vault",
        `.archives/memories-archive-${year}-${month}.json`
      );

      const archiveContent = await fs.readFile(archiveFile, "utf-8");
      const archiveData = JSON.parse(archiveContent);

      expect(archiveData.entries).toBeDefined();
      expect(Array.isArray(archiveData.entries)).toBe(true);
      expect(archiveData.entries).toHaveLength(1);
      expect(archiveData.entries[0].sessionId).toBe("old-session");
    });
  });

  describe("Searchable Archives (On-Demand Loading)", () => {
    it("should allow searching archived memories", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const year = oldDate.getFullYear();
      const month = String(oldDate.getMonth() + 1).padStart(2, "0");

      const session = path.join(
        globalMemoryPath,
        "vault",
        year.toString(),
        month,
        String(oldDate.getDate()).padStart(2, "0"),
        "old-session"
      );

      await fs.mkdir(session, { recursive: true });
      await fs.writeFile(path.join(session, "memory.md"), "Archived memory about music production");
      await fs.writeFile(
        path.join(session, "metadata.json"),
        JSON.stringify({
          sessionId: "old-session",
          nodeId: "vault",
          tags: ["music", "production"],
          summary: "Music production techniques",
          usage: { lastUsed: oldDate.toISOString() },
        })
      );

      const archiver = new MemoryArchiver(bozlyHome);
      await archiver.archiveOldMemories(90);

      // Search should find archived memory
      const results = await archiver.searchArchives("music", "vault");

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe("old-session");
    });

    it("should load individual archived memory on-demand", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const year = oldDate.getFullYear();
      const month = String(oldDate.getMonth() + 1).padStart(2, "0");

      const session = path.join(
        globalMemoryPath,
        "vault",
        year.toString(),
        month,
        String(oldDate.getDate()).padStart(2, "0"),
        "old-session"
      );

      await fs.mkdir(session, { recursive: true });
      const memoryContent = "This is archived memory content";
      await fs.writeFile(path.join(session, "memory.md"), memoryContent);
      await fs.writeFile(
        path.join(session, "metadata.json"),
        JSON.stringify({
          sessionId: "old-session",
          nodeId: "vault",
          usage: { lastUsed: oldDate.toISOString() },
        })
      );

      const archiver = new MemoryArchiver(bozlyHome);
      await archiver.archiveOldMemories(90);

      const loaded = await archiver.loadArchivedMemory("vault", "old-session");

      expect(loaded).toBe(memoryContent);
    });
  });

  describe("Integration: Dual Scope (Global + Vault)", () => {
    it("should handle both global and per-vault memory directories", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const year = oldDate.getFullYear();
      const month = String(oldDate.getMonth() + 1).padStart(2, "0");

      // Create memories in two vaults
      for (const vaultId of ["music", "project"]) {
        const session = path.join(
          globalMemoryPath,
          vaultId,
          year.toString(),
          month,
          String(oldDate.getDate()).padStart(2, "0"),
          `${vaultId}-session`
        );

        await fs.mkdir(session, { recursive: true });
        await fs.writeFile(path.join(session, "memory.md"), `${vaultId} content`);
        await fs.writeFile(
          path.join(session, "metadata.json"),
          JSON.stringify({
            sessionId: `${vaultId}-session`,
            nodeId: vaultId,
            usage: { lastUsed: oldDate.toISOString() },
          })
        );
      }

      const archiver = new MemoryArchiver(bozlyHome);
      const result = await archiver.archiveOldMemories(90);

      expect(result.archived).toBe(2);
      expect(Object.keys(result.byVault)).toContain("music");
      expect(Object.keys(result.byVault)).toContain("project");
    });

    it("should track cache size per vault", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);

      // Create 2MB in music vault, 3MB in project vault
      for (const [vaultId, sizeMB] of [
        ["music", 2],
        ["project", 3],
      ]) {
        const session = path.join(
          globalMemoryPath,
          vaultId,
          oldDate.getFullYear().toString(),
          String(oldDate.getMonth() + 1).padStart(2, "0"),
          String(oldDate.getDate()).padStart(2, "0"),
          "session"
        );

        await fs.mkdir(session, { recursive: true });
        const data = Buffer.alloc(sizeMB * 1024 * 1024);
        await fs.writeFile(path.join(session, "memory.md"), data);
        await fs.writeFile(
          path.join(session, "metadata.json"),
          JSON.stringify({
            sessionId: "session",
            nodeId: vaultId,
            usage: { lastUsed: oldDate.toISOString() },
          })
        );
      }

      const archiver = new MemoryArchiver(bozlyHome);
      const size = await archiver.detectCacheSize();

      expect(size.byVault["music"]).toBeCloseTo(2, 0.1);
      expect(size.byVault["project"]).toBeCloseTo(3, 0.1);
      expect(size.totalSizeMB).toBeCloseTo(5, 0.1);
    });
  });

  describe("Automatic Archival Triggers", () => {
    it("should auto-archive when cache exceeds 5MB", async () => {
      const { MemoryArchiver } = await import("../../dist/memory/archiver.js");

      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      // Create 3MB old + 2MB recent = 5MB cache
      const year = oldDate.getFullYear();
      const month = String(oldDate.getMonth() + 1).padStart(2, "0");

      const oldSession = path.join(
        globalMemoryPath,
        "vault",
        year.toString(),
        month,
        String(oldDate.getDate()).padStart(2, "0"),
        "old"
      );

      const recentSession = path.join(
        globalMemoryPath,
        "vault",
        recentDate.getFullYear().toString(),
        String(recentDate.getMonth() + 1).padStart(2, "0"),
        String(recentDate.getDate()).padStart(2, "0"),
        "recent"
      );

      await fs.mkdir(oldSession, { recursive: true });
      await fs.mkdir(recentSession, { recursive: true });

      // Create 3.5MB + 2.5MB = 6MB total (exceeds 5MB threshold)
      await fs.writeFile(path.join(oldSession, "memory.md"), Buffer.alloc(3.5 * 1024 * 1024));
      await fs.writeFile(
        path.join(oldSession, "metadata.json"),
        JSON.stringify({
          sessionId: "old",
          nodeId: "vault",
          usage: { lastUsed: oldDate.toISOString() },
        })
      );

      await fs.writeFile(path.join(recentSession, "memory.md"), Buffer.alloc(2.5 * 1024 * 1024));
      await fs.writeFile(
        path.join(recentSession, "metadata.json"),
        JSON.stringify({
          sessionId: "recent",
          nodeId: "vault",
          usage: { lastUsed: recentDate.toISOString() },
        })
      );

      const archiver = new MemoryArchiver(bozlyHome);
      const result = await archiver.checkAndArchiveIfNeeded(5); // 5MB threshold

      expect(result.triggered).toBe(true);
      expect(result.archived).toBeGreaterThan(0);
    });
  });
});
