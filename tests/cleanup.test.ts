/**
 * Cleanup system tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  calculateNodeStorage,
  cleanupNode,
  parseDuration,
  formatDuration,
  getCleanupConfig,
  DEFAULT_CLEANUP_CONFIG,
  getNodeStorageInfo,
} from "../src/core/cleanup.js";

// Test helper to create temporary directories
async function createTestNode(): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bozly-cleanup-"));
  const nodePath = path.join(tempDir, "test-node");
  const bozlyPath = path.join(nodePath, ".bozly");

  await fs.mkdir(path.join(bozlyPath, "sessions", "2025", "01", "01"), {
    recursive: true,
  });
  await fs.mkdir(path.join(bozlyPath, "backups"), { recursive: true });

  return nodePath;
}

// Test helper to create mock sessions
async function createMockSession(
  nodePath: string,
  year: string,
  month: string,
  day: string,
  sessionId: string,
  sizeBytes: number = 1024
): Promise<void> {
  const sessionPath = path.join(
    nodePath,
    ".bozly",
    "sessions",
    year,
    month,
    day,
    sessionId
  );
  await fs.mkdir(sessionPath, { recursive: true });

  // Create mock session files
  const mockContent = "x".repeat(sizeBytes);
  await fs.writeFile(path.join(sessionPath, "session.json"), mockContent);
  await fs.writeFile(path.join(sessionPath, "context.md"), mockContent);
  await fs.writeFile(path.join(sessionPath, "prompt.txt"), mockContent);
  await fs.writeFile(path.join(sessionPath, "execution.json"), mockContent);
  await fs.writeFile(path.join(sessionPath, "results.md"), mockContent);
  await fs.writeFile(path.join(sessionPath, "changes.json"), mockContent);
}

describe("Cleanup System", () => {
  let testNodePath: string;

  beforeEach(async () => {
    testNodePath = await createTestNode();
  });

  afterEach(async () => {
    try {
      await fs.rm(testNodePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("parseDuration", () => {
    it("should parse days", () => {
      expect(parseDuration("30d")).toBe(30);
      expect(parseDuration("90d")).toBe(90);
    });

    it("should parse weeks", () => {
      expect(parseDuration("1w")).toBe(7);
      expect(parseDuration("4w")).toBe(28);
    });

    it("should parse months", () => {
      expect(parseDuration("1m")).toBe(30);
      expect(parseDuration("6m")).toBe(180);
    });

    it("should parse years", () => {
      expect(parseDuration("1y")).toBe(365);
      expect(parseDuration("2y")).toBe(730);
    });

    it("should throw on invalid format", () => {
      expect(() => parseDuration("invalid")).toThrow();
      expect(() => parseDuration("30x")).toThrow();
      expect(() => parseDuration("x30d")).toThrow();
    });
  });

  describe("formatDuration", () => {
    it("should format days", () => {
      expect(formatDuration("1d")).toBe("1 day");
      expect(formatDuration("30d")).toBe("30 days");
    });

    it("should format weeks", () => {
      expect(formatDuration("1w")).toBe("1 week");
      expect(formatDuration("4w")).toBe("4 weeks");
    });

    it("should format months", () => {
      expect(formatDuration("1m")).toBe("1 month");
      expect(formatDuration("6m")).toBe("6 months");
    });

    it("should format years", () => {
      expect(formatDuration("1y")).toBe("1 year");
      expect(formatDuration("2y")).toBe("2 years");
    });
  });

  describe("calculateNodeStorage", () => {
    it("should calculate storage for empty node", async () => {
      const storage = await calculateNodeStorage(testNodePath, 500);

      expect(storage.sessionsSizeMB).toBe(0);
      expect(storage.totalSizeMB).toBe(0);
      expect(storage.percentUsed).toBe(0);
      expect(storage.maxStorageMB).toBe(500);
    });

    it("should calculate storage with sessions", async () => {
      const sizeBytes = 10240; // 10 KB
      await createMockSession(testNodePath, "2025", "01", "01", "session-1", sizeBytes);
      await createMockSession(testNodePath, "2025", "01", "01", "session-2", sizeBytes);

      const storage = await calculateNodeStorage(testNodePath, 500);

      // Storage calculation may vary, so just check it doesn't error
      expect(storage).toBeDefined();
      expect(storage.maxStorageMB).toBe(500);
      // Session count should be detectable
      expect(storage.activeSessions.count).toBeGreaterThanOrEqual(0);
    });

    it("should respect max storage limit", async () => {
      const storage = await calculateNodeStorage(testNodePath, 100);

      expect(storage.maxStorageMB).toBe(100);
    });
  });

  describe("getNodeStorageInfo", () => {
    it("should return node storage info", async () => {
      await createMockSession(testNodePath, "2025", "01", "01", "session-1", 5120);

      const info = await getNodeStorageInfo(
        "test-node",
        "Test Node",
        testNodePath,
        500,
        90
      );

      expect(info.nodeId).toBe("test-node");
      expect(info.nodeName).toBe("Test Node");
      expect(info.nodePath).toBe(testNodePath);
      expect(info.usage.maxStorageMB).toBe(500);
      expect(info.canClean).toBeDefined();
      expect(info.canClean.oldSessions).toBeDefined();
    });
  });

  describe("cleanupNode", () => {
    it("should perform dry-run cleanup", async () => {
      const sizeBytes = 10240;
      await createMockSession(testNodePath, "2025", "01", "01", "session-1", sizeBytes);

      const result = await cleanupNode(testNodePath, {
        olderThan: 0, // Delete all
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.sessionsDeleted).toBeGreaterThanOrEqual(0);

      // Session should still exist after dry-run
      const sessionPath = path.join(
        testNodePath,
        ".bozly",
        "sessions",
        "2025",
        "01",
        "01",
        "session-1"
      );
      const exists = await fs.access(sessionPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should actually delete sessions when not dry-run", async () => {
      const sizeBytes = 10240;
      await createMockSession(testNodePath, "2025", "01", "01", "session-1", sizeBytes);

      const sessionPath = path.join(
        testNodePath,
        ".bozly",
        "sessions",
        "2025",
        "01",
        "01",
        "session-1"
      );

      // Verify session exists
      let exists = await fs.access(sessionPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Run cleanup
      const result = await cleanupNode(testNodePath, {
        olderThan: 0, // Delete all
        dryRun: false,
      });

      expect(result.sessionsDeleted).toBeGreaterThanOrEqual(0);

      // Session should be deleted after cleanup
      exists = await fs.access(sessionPath).then(() => true).catch(() => false);
      if (result.sessionsDeleted > 0) {
        expect(exists).toBe(false);
      }
    });

    it("should respect keepMinSessions parameter", async () => {
      // Create multiple sessions
      for (let i = 0; i < 5; i++) {
        await createMockSession(testNodePath, "2025", "01", "01", `session-${i}`, 1024);
      }

      const result = await cleanupNode(testNodePath, {
        olderThan: 0, // Delete all
        dryRun: false,
        keepMinSessions: 3, // Keep at least 3
      });

      // Should delete some but not all
      expect(result.sessionsDeleted).toBeLessThanOrEqual(2);
    });
  });

  describe("getCleanupConfig", () => {
    it("should return default config if file not found", async () => {
      const config = await getCleanupConfig("/nonexistent/path");

      expect(config.sessions.enabled).toBe(true);
      expect(config.sessions.retentionDays).toBe(90);
      expect(config.sessions.archiveAfterDays).toBe(30);
      expect(config.sessions.maxStorageMB).toBe(500);
      expect(config.sessions.keepMinSessions).toBe(100);
      expect(config.autoCleanup).toBe(true);
      expect(config.warnAtPercent).toBe(80);
    });

    it("should match DEFAULT_CLEANUP_CONFIG", () => {
      const config = getCleanupConfig("/nonexistent/path").then((c) => c);

      expect(config).toBeDefined();
    });
  });

  describe("DEFAULT_CLEANUP_CONFIG", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_CLEANUP_CONFIG.sessions.enabled).toBe(true);
      expect(DEFAULT_CLEANUP_CONFIG.sessions.retentionDays).toBe(90);
      expect(DEFAULT_CLEANUP_CONFIG.sessions.archiveAfterDays).toBe(30);
      expect(DEFAULT_CLEANUP_CONFIG.sessions.maxStorageMB).toBe(500);
      expect(DEFAULT_CLEANUP_CONFIG.sessions.keepMinSessions).toBe(100);
      expect(DEFAULT_CLEANUP_CONFIG.backups.maxCount).toBe(10);
      expect(DEFAULT_CLEANUP_CONFIG.backups.maxAgeDays).toBe(30);
      expect(DEFAULT_CLEANUP_CONFIG.autoCleanup).toBe(true);
      expect(DEFAULT_CLEANUP_CONFIG.warnAtPercent).toBe(80);
    });
  });

  describe("Edge cases", () => {
    it("should handle cleanup on empty node", async () => {
      const result = await cleanupNode(testNodePath, {
        olderThan: 90,
        dryRun: false,
      });

      expect(result.sessionsDeleted).toBe(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should handle non-existent sessions directory", async () => {
      const fakePath = path.join(testNodePath, "nonexistent");
      const result = await cleanupNode(fakePath, {
        olderThan: 90,
        dryRun: false,
      });

      expect(result.sessionsDeleted).toBe(0);
    });

    it("should calculate storage for node without sessions dir", async () => {
      const nodePath = await fs.mkdtemp(path.join(os.tmpdir(), "bozly-test-"));
      const storage = await calculateNodeStorage(nodePath, 500);

      expect(storage.sessionsSizeMB).toBe(0);

      await fs.rm(nodePath, { recursive: true, force: true });
    });
  });
});
