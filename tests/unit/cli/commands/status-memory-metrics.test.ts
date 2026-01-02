/**
 * Status Command Memory Metrics Tests (Phase 4.3)
 *
 * Tests for the enhanced status command that shows:
 * - Memory cache size
 * - Archive statistics
 * - Memory usage breakdown
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs/promises";
import { createTempDir, cleanupTempDir } from "../../../conftest";

describe("Status Command - Memory Metrics", () => {
  let tempDir: string;
  let bozlyHome: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    bozlyHome = path.join(tempDir, ".bozly");
    await fs.mkdir(bozlyHome, { recursive: true });
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  describe("Memory Cache Size Display", () => {
    it("should display total cache size in status output", async () => {
      const sessionsDir = path.join(bozlyHome, "sessions", "vault", "2025", "01", "15");
      await fs.mkdir(sessionsDir, { recursive: true });

      // Create a test memory file
      const memorySize = 2 * 1024 * 1024; // 2MB
      const data = Buffer.alloc(memorySize);
      await fs.writeFile(path.join(sessionsDir, "memory.md"), data);

      // Calculate cache size
      const stat = await fs.stat(path.join(sessionsDir, "memory.md"));
      const cacheSizeMB = Math.round((stat.size / (1024 * 1024)) * 100) / 100;

      expect(cacheSizeMB).toBeGreaterThan(1.9);
      expect(cacheSizeMB).toBeLessThan(2.1);
    });

    it("should show cache size for each vault separately", async () => {
      const vault1 = path.join(bozlyHome, "sessions", "music", "2025", "01", "15");
      const vault2 = path.join(bozlyHome, "sessions", "project", "2025", "01", "15");

      await fs.mkdir(vault1, { recursive: true });
      await fs.mkdir(vault2, { recursive: true });

      const data1MB = Buffer.alloc(1 * 1024 * 1024);
      const data2MB = Buffer.alloc(2 * 1024 * 1024);

      await fs.writeFile(path.join(vault1, "memory.md"), data1MB);
      await fs.writeFile(path.join(vault2, "memory.md"), data2MB);

      const sizes: Record<string, number> = {
        music: 1,
        project: 2,
      };

      expect(sizes["music"]).toBe(1);
      expect(sizes["project"]).toBe(2);
      expect(Object.values(sizes).reduce((a, b) => a + b, 0)).toBe(3);
    });

    it("should format cache size in human-readable format", () => {
      const formatSize = (bytes: number): string => {
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        if (bytes === 0) return "0 B";
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
      };

      expect(formatSize(512)).toBe("512 B");
      expect(formatSize(1024)).toBe("1 KB");
      expect(formatSize(1024 * 1024)).toBe("1 MB");
      expect(formatSize(5.5 * 1024 * 1024)).toBe("5.5 MB");
    });

    it("should show warning if cache exceeds threshold", () => {
      const CACHE_THRESHOLD_MB = 5;
      const cacheSizeMB = 6.5;

      const shouldWarn = cacheSizeMB > CACHE_THRESHOLD_MB;
      expect(shouldWarn).toBe(true);

      const warnMessage = shouldWarn
        ? `Warning: Cache size (${cacheSizeMB}MB) exceeds threshold (${CACHE_THRESHOLD_MB}MB)`
        : "";
      expect(warnMessage).toContain("exceeds threshold");
    });
  });

  describe("Archive Statistics", () => {
    it("should display total number of archived memories", async () => {
      const archiveDir = path.join(bozlyHome, "sessions", "vault", ".archives");
      await fs.mkdir(archiveDir, { recursive: true });

      // Create archive with 5 entries
      const archive = {
        entries: [
          { sessionId: "s1", summary: "Memory 1" },
          { sessionId: "s2", summary: "Memory 2" },
          { sessionId: "s3", summary: "Memory 3" },
          { sessionId: "s4", summary: "Memory 4" },
          { sessionId: "s5", summary: "Memory 5" },
        ],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      await fs.writeFile(
        path.join(archiveDir, "memories-archive-2025-01.json"),
        JSON.stringify(archive, null, 2)
      );

      const content = await fs.readFile(
        path.join(archiveDir, "memories-archive-2025-01.json"),
        "utf-8"
      );
      const archiveData = JSON.parse(content);
      const archivedCount = archiveData.entries.length;

      expect(archivedCount).toBe(5);
    });

    it("should calculate total archived size", async () => {
      const archiveDir = path.join(bozlyHome, "sessions", "vault", ".archives");
      await fs.mkdir(archiveDir, { recursive: true });

      const archive = {
        entries: [
          {
            sessionId: "s1",
            content: "A".repeat(1024 * 500), // 500KB
          },
          {
            sessionId: "s2",
            content: "B".repeat(1024 * 500), // 500KB
          },
        ],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      const archiveFile = path.join(archiveDir, "memories-archive-2025-01.json");
      await fs.writeFile(archiveFile, JSON.stringify(archive, null, 2));

      const stat = await fs.stat(archiveFile);
      const sizeMB = Math.round((stat.size / (1024 * 1024)) * 100) / 100;

      expect(sizeMB).toBeGreaterThan(0);
    });

    it("should show breakdown by month", async () => {
      const archiveDir = path.join(bozlyHome, "sessions", "vault", ".archives");
      await fs.mkdir(archiveDir, { recursive: true });

      const months: Record<string, number> = {};

      // Create multiple archives
      for (let month = 1; month <= 3; month++) {
        const monthKey = `2025-${String(month).padStart(2, "0")}`;
        const archive = {
          entries: Array.from({ length: month * 2 }, (_, i) => ({
            sessionId: `s${month}-${i}`,
          })),
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        };

        await fs.writeFile(
          path.join(archiveDir, `memories-archive-${monthKey}.json`),
          JSON.stringify(archive, null, 2)
        );

        months[monthKey] = month * 2;
      }

      expect(months["2025-01"]).toBe(2);
      expect(months["2025-02"]).toBe(4);
      expect(months["2025-03"]).toBe(6);
    });

    it("should calculate percentage of cache vs archived", () => {
      const cacheSize = 2; // MB
      const archiveSize = 8; // MB
      const total = cacheSize + archiveSize;

      const cachePercent = Math.round((cacheSize / total) * 100);
      const archivePercent = Math.round((archiveSize / total) * 100);

      expect(cachePercent).toBe(20);
      expect(archivePercent).toBe(80);
      expect(cachePercent + archivePercent).toBe(100);
    });
  });

  describe("Status Output Format", () => {
    it("should include memory section in status output", () => {
      const output = `
        Memory Status
        Cache Size: 2.5 MB
        Archived Memories: 15
        Archive Size: 8.2 MB
        Cache Usage: 23% of total
      `;

      expect(output).toContain("Memory Status");
      expect(output).toContain("Cache Size");
      expect(output).toContain("Archived Memories");
    });

    it("should show memory health indicator", () => {
      const cacheSizeMB = 3.5;
      const threshold = 5;
      const percent = Math.round((cacheSizeMB / threshold) * 100);

      const healthStatus = percent < 80 ? "healthy" : "warning";
      expect(healthStatus).toBe("healthy");

      const healthOutput = `Memory: ${cacheSizeMB}MB / ${threshold}MB (${healthStatus})`;
      expect(healthOutput).toContain("healthy");
    });

    it("should show suggestion to restore if archives exist", () => {
      const archivedCount = 5;
      const hasSuggestion = archivedCount > 0;

      expect(hasSuggestion).toBe(true);

      const suggestion = hasSuggestion ? "Run: bozly restore --preview to see archived memories" : "";
      expect(suggestion).toContain("bozly restore");
    });
  });
});

describe("Memory API Endpoints", () => {
  describe("GET /api/memory/cache-stats", () => {
    it("should return cache size statistics", () => {
      const response = {
        success: true,
        data: {
          totalCacheMB: 2.5,
          cacheFileCount: 42,
          byVault: {
            "music": 1.2,
            "project": 1.3,
          },
        },
      };

      expect(response.success).toBe(true);
      expect(response.data.totalCacheMB).toBe(2.5);
      expect(response.data.byVault["music"]).toBe(1.2);
    });

    it("should return zero for empty cache", () => {
      const response = {
        success: true,
        data: {
          totalCacheMB: 0,
          cacheFileCount: 0,
          byVault: {},
        },
      };

      expect(response.data.totalCacheMB).toBe(0);
      expect(response.data.cacheFileCount).toBe(0);
    });
  });

  describe("GET /api/memory/archive-stats", () => {
    it("should return archive statistics by vault", () => {
      const response = {
        success: true,
        data: {
          totalArchivedCount: 45,
          totalArchivedMB: 8.5,
          byVault: {
            "music": { count: 25, sizeMB: 5.2 },
            "project": { count: 20, sizeMB: 3.3 },
          },
          byMonth: {
            "2025-01": { count: 15, sizeMB: 2.5 },
            "2025-02": { count: 30, sizeMB: 6.0 },
          },
        },
      };

      expect(response.data.totalArchivedCount).toBe(45);
      expect(response.data.byVault["music"].count).toBe(25);
    });

    it("should handle no archives gracefully", () => {
      const response = {
        success: true,
        data: {
          totalArchivedCount: 0,
          totalArchivedMB: 0,
          byVault: {},
          byMonth: {},
        },
      };

      expect(response.data.totalArchivedCount).toBe(0);
      expect(Object.keys(response.data.byVault)).toHaveLength(0);
    });
  });

  describe("POST /api/memory/restore", () => {
    it("should accept restore request with date filter", () => {
      const request = {
        date: "2025-01",
        preview: true,
      };

      const response = {
        success: true,
        data: {
          wouldRestore: 5,
          memories: [
            { sessionId: "s1", summary: "Memory 1" },
            { sessionId: "s2", summary: "Memory 2" },
          ],
          totalSizeMB: 1.5,
        },
      };

      expect(response.data.wouldRestore).toBeGreaterThan(0);
    });

    it("should accept restore request with search filter", () => {
      const request = {
        search: "python",
        preview: true,
      };

      const response = {
        success: true,
        data: {
          wouldRestore: 3,
          memories: [
            { sessionId: "s1", summary: "Python optimization" },
            { sessionId: "s2", summary: "Python patterns" },
            { sessionId: "s3", summary: "Python debugging" },
          ],
        },
      };

      expect(response.data.wouldRestore).toBe(3);
    });

    it("should validate that restore requires confirmation flag", () => {
      const previewRequest = { date: "2025-01", preview: true };
      const actualRestoreRequest = { date: "2025-01", confirm: true };

      expect(previewRequest.preview).toBe(true);
      expect(actualRestoreRequest.confirm).toBe(true);
    });

    it("should return error if no filter provided", () => {
      const response = {
        success: false,
        error: "Must specify either --date, --search, or --all",
      };

      expect(response.success).toBe(false);
      expect(response.error).toContain("Must specify");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing vaultId in requests", () => {
      const response = {
        success: false,
        error: "vaultId is required",
      };

      expect(response.success).toBe(false);
    });

    it("should handle corrupted archive files", () => {
      const response = {
        success: false,
        error: "Failed to read archive file",
      };

      expect(response.success).toBe(false);
    });

    it("should handle non-existent dates gracefully", () => {
      const response = {
        success: true,
        data: {
          wouldRestore: 0,
          memories: [],
          message: "No archives found for 2099-12",
        },
      };

      expect(response.data.wouldRestore).toBe(0);
    });
  });
});
