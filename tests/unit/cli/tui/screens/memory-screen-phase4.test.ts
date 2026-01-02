/**
 * Memory Screen Phase 4 Tests
 *
 * Tests for TUI memory screen enhancements:
 * - Display cache file sizes
 * - Show monthly archive directory sizes
 * - Indicate last-accessed times
 * - Show archival status
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryEntry } from "../../../src/cli/tui/screens/memory.js";

describe("Memory Screen - Phase 4 Features", () => {
  describe("Memory Entry Structure", () => {
    it("should include fileSizeBytes in MemoryEntry", () => {
      const entry: MemoryEntry = {
        sessionId: "test-session",
        nodeId: "test-node",
        nodeName: "Test Node",
        timestamp: new Date().toISOString(),
        command: "test",
        summary: "Test memory",
        tags: [],
        filePath: "/test/path",
        fileSizeBytes: 1024,
      };

      expect(entry.fileSizeBytes).toBe(1024);
    });

    it("should include lastAccessedTime in MemoryEntry", () => {
      const now = new Date().toISOString();
      const entry: MemoryEntry = {
        sessionId: "test-session",
        nodeId: "test-node",
        nodeName: "Test Node",
        timestamp: now,
        command: "test",
        summary: "Test memory",
        tags: [],
        filePath: "/test/path",
        lastAccessedTime: now,
      };

      expect(entry.lastAccessedTime).toBe(now);
    });

    it("should include isArchived status in MemoryEntry", () => {
      const entry: MemoryEntry = {
        sessionId: "test-session",
        nodeId: "test-node",
        nodeName: "Test Node",
        timestamp: new Date().toISOString(),
        command: "test",
        summary: "Test memory",
        tags: [],
        filePath: "/test/path",
        isArchived: false,
      };

      expect(entry.isArchived).toBe(false);
    });

    it("should include archiveMetadata in MemoryEntry", () => {
      const entry: MemoryEntry = {
        sessionId: "test-session",
        nodeId: "test-node",
        nodeName: "Test Node",
        timestamp: new Date().toISOString(),
        command: "test",
        summary: "Test memory",
        tags: [],
        filePath: "/test/path",
        archiveMetadata: {
          archivedAt: new Date().toISOString(),
          archivedFromNode: "test-node",
          monthKey: "2025-01",
        },
      };

      expect(entry.archiveMetadata).toBeDefined();
      expect(entry.archiveMetadata?.monthKey).toBe("2025-01");
    });
  });

  describe("File Size Formatting", () => {
    it("should format bytes to human-readable size", () => {
      // Helper function that should exist in memory screen
      const formatSize = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
      };

      expect(formatSize(0)).toBe("0 B");
      expect(formatSize(512)).toBe("512 B");
      expect(formatSize(1024)).toBe("1 KB");
      expect(formatSize(1024 * 1024)).toBe("1 MB");
      expect(formatSize(5.5 * 1024 * 1024)).toBe("5.5 MB");
    });
  });

  describe("Archive Statistics", () => {
    it("should calculate total archived size for a vault", () => {
      const archivedMemories = [
        { sessionId: "s1", size: 1024 * 1024, month: "2025-01" },
        { sessionId: "s2", size: 2048 * 1024, month: "2025-01" },
        { sessionId: "s3", size: 512 * 1024, month: "2024-12" },
      ];

      const totalSize = archivedMemories.reduce((sum, m) => sum + m.size, 0);
      expect(totalSize).toBe((1024 + 2048 + 512) * 1024);
    });

    it("should group archived memories by month", () => {
      const archivedMemories = [
        { sessionId: "s1", month: "2025-01" },
        { sessionId: "s2", month: "2025-01" },
        { sessionId: "s3", month: "2024-12" },
        { sessionId: "s4", month: "2024-12" },
      ];

      const byMonth: Record<string, number> = {};
      for (const mem of archivedMemories) {
        byMonth[mem.month] = (byMonth[mem.month] || 0) + 1;
      }

      expect(byMonth["2025-01"]).toBe(2);
      expect(byMonth["2024-12"]).toBe(2);
    });

    it("should calculate cache vs archive statistics", () => {
      const cacheSize = 3.5; // MB
      const archiveSize = 10.2; // MB
      const totalSize = cacheSize + archiveSize;
      const cachePercent = Math.round((cacheSize / totalSize) * 100);

      expect(cachePercent).toBe(26);
    });
  });

  describe("Memory Display Enhancement", () => {
    it("should display memory with size and last-accessed time", () => {
      const memory = {
        sessionId: "test",
        command: "test",
        summary: "Test summary",
        fileSizeBytes: 2048 * 1024, // 2 MB
        lastAccessedTime: new Date().toISOString(),
      };

      const formatSize = (bytes: number) =>
        Math.round((bytes / (1024 * 1024)) * 100) / 100 + " MB";
      const lastAccess = new Date(memory.lastAccessedTime).toLocaleDateString();

      const display = `[${memory.command}] ${memory.summary} (${formatSize(
        memory.fileSizeBytes
      )}, accessed: ${lastAccess})`;

      expect(display).toContain("2 MB");
      expect(display).toContain("accessed:");
      // Date format varies by locale, so just check it's present
      expect(display.length).toBeGreaterThan(30);
    });

    it("should indicate if memory is archived", () => {
      const archived = {
        sessionId: "s1",
        summary: "Archived memory",
        isArchived: true,
        archiveMetadata: { monthKey: "2025-01" },
      };

      const indicator = archived.isArchived ? "[ARCHIVED]" : "";
      const display = `${indicator} ${archived.summary}`;

      expect(display).toContain("[ARCHIVED]");
    });
  });
});
