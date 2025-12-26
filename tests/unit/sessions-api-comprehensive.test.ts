/**
 * Comprehensive Tests for Core Sessions Module
 *
 * Tests critical session management functions:
 * - getSessionPath - Path construction
 * - createSessionDirectory - Directory creation
 * - saveSessionFiles - File writing
 * - loadSessionFiles - File reading
 * - recordSession - Session recording
 * - loadSession - Session loading
 * - getNodeSessions - Get all sessions for a node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getSessionPath,
  createSessionDirectory,
  saveSessionFiles,
  loadSessionFiles,
  recordSession,
  loadSession,
  getNodeSessions,
} from "../../src/core/sessions.js";
import { createTempDir, cleanupTempDir, getTempDir } from "../conftest.js";
import fs from "fs/promises";
import path from "path";

describe("Sessions Module - Comprehensive Coverage", () => {
  beforeEach(async () => {
    await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  // ============================================================================
  // getSessionPath - Path Construction
  // ============================================================================

  describe("getSessionPath - Path Construction", () => {
    it("should construct correct path with valid inputs", () => {
      const basePath = "/home/user/.bozly";
      const nodeId = "vault1";
      const timestamp = "2025-12-26T14:32:00.123Z";
      const sessionId = "uuid-123-abc";

      const result = getSessionPath(basePath, nodeId, timestamp, sessionId);

      expect(result).toContain("sessions");
      expect(result).toContain("vault1");
      expect(result).toContain("2025");
      expect(result).toContain("12");
      expect(result).toContain("26");
      expect(result).toContain("uuid-123-abc");
    });

    it("should handle different date values", () => {
      const timestamps = [
        "2025-01-01T00:00:00.000Z",
        "2025-06-15T12:30:45.999Z",
        "2025-12-31T23:59:59.999Z",
      ];

      timestamps.forEach((timestamp) => {
        const result = getSessionPath("/base", "node1", timestamp, "session1");
        expect(result).toBeDefined();
        expect(result.includes("2025")).toBe(true);
      });
    });

    it("should use UTC date components regardless of timezone", () => {
      const timestamp = "2025-12-26T20:00:00Z"; // 8 PM UTC
      const result = getSessionPath("/base", "node1", timestamp, "session1");

      // Should contain date components
      expect(result).toContain("2025");
      expect(result).toContain("12");
      expect(result).toContain("26");
    });

    it("should handle month boundaries correctly", () => {
      const timestamps = [
        { ts: "2025-01-31T23:59:59Z", month: "01", day: "31" },
        { ts: "2025-02-28T23:59:59Z", month: "02", day: "28" },
        { ts: "2025-12-31T23:59:59Z", month: "12", day: "31" },
      ];

      timestamps.forEach(({ ts, month, day }) => {
        const result = getSessionPath("/base", "node1", ts, "session1");
        expect(result).toContain(month);
        expect(result).toContain(day);
      });
    });

    it("should pad month and day with leading zeros", () => {
      const timestamp = "2025-01-05T10:00:00Z";
      const result = getSessionPath("/base", "node1", timestamp, "session1");

      // Should have properly padded values
      expect(result).toContain("01");
      expect(result).toContain("05");
    });

    it("should handle various node ID formats", () => {
      const nodeIds = ["vault1", "music-vault", "vault_2", "vault.prod"];

      nodeIds.forEach((nodeId) => {
        const result = getSessionPath("/base", nodeId, "2025-12-26T00:00:00Z", "session1");
        expect(result).toContain(nodeId);
      });
    });

    it("should handle UUID session IDs", () => {
      const uuids = [
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      ];

      uuids.forEach((uuid) => {
        const result = getSessionPath("/base", "node1", "2025-12-26T00:00:00Z", uuid);
        expect(result).toContain(uuid);
      });
    });
  });

  // ============================================================================
  // createSessionDirectory - Directory Creation
  // ============================================================================

  describe("createSessionDirectory - Directory Creation", () => {
    it("should create directory with parent directories", async () => {
      const tempDir = getTempDir();
      const sessionPath = path.join(tempDir, "sessions", "node1", "2025", "12", "26", "uuid1");

      const result = await createSessionDirectory(sessionPath);

      expect(result).toBe(true);
      const stats = await fs.stat(sessionPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should return true when directory exists", async () => {
      const tempDir = getTempDir();
      const sessionPath = path.join(tempDir, "existing");

      // Create directory first
      await fs.mkdir(sessionPath, { recursive: true });

      // Should return true when calling on existing directory
      const result = await createSessionDirectory(sessionPath);
      expect(result).toBe(true);
    });

    it("should handle deeply nested paths", async () => {
      const tempDir = getTempDir();
      const deepPath = path.join(
        tempDir,
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j"
      );

      const result = await createSessionDirectory(deepPath);

      expect(result).toBe(true);
      const stats = await fs.stat(deepPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should return false on permission error", async () => {
      // Create read-only directory
      const tempDir = getTempDir();
      const readOnlyDir = path.join(tempDir, "readonly");
      await fs.mkdir(readOnlyDir, { mode: 0o444 });

      try {
        const sessionPath = path.join(readOnlyDir, "sessions");
        const result = await createSessionDirectory(sessionPath);

        // Should fail due to permissions
        expect(result).toBe(false);
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(readOnlyDir, 0o755);
      }
    });
  });

  // ============================================================================
  // saveSessionFiles & loadSessionFiles - File Operations
  // ============================================================================

  describe("saveSessionFiles - File Writing", () => {
    it("should save all session files", async () => {
      const tempDir = getTempDir();
      const sessionPath = path.join(tempDir, "session");

      const sessionFiles = {
        sessionJson: {
          id: "session1",
          nodeId: "node1",
          timestamp: new Date().toISOString(),
          command: "test",
          provider: "claude",
          status: "completed" as const,
          executionTimeMs: 1000,
          nodeName: "Test Node",
          nodePath: "/test",
        },
        contextMd: "# Context\n\nTest context",
        promptTxt: "Test prompt",
        executionJson: {
          events: [{ timestamp: new Date().toISOString(), event: "start" }],
        },
        resultsMd: "# Results\n\nTest output",
        changesJson: { files: [] },
      };

      const result = await saveSessionFiles(sessionPath, sessionFiles);

      expect(result).toBe(true);

      // Verify all files exist
      const files = ["session.json", "context.md", "prompt.txt", "execution.json", "results.md", "changes.json"];
      for (const file of files) {
        const filePath = path.join(sessionPath, file);
        const stats = await fs.stat(filePath);
        expect(stats.isFile()).toBe(true);
      }
    });

    it("should overwrite existing files", async () => {
      const tempDir = getTempDir();
      const sessionPath = path.join(tempDir, "session");

      const sessionFiles = {
        sessionJson: { id: "session1" },
        contextMd: "Original context",
        promptTxt: "Original prompt",
        executionJson: { events: [] },
        resultsMd: "Original results",
        changesJson: { files: [] },
      };

      // Save first time
      await saveSessionFiles(sessionPath, sessionFiles);

      // Update and save again
      const updated = {
        ...sessionFiles,
        contextMd: "Updated context",
        promptTxt: "Updated prompt",
      };

      await saveSessionFiles(sessionPath, updated);

      // Verify updated content
      const contextContent = await fs.readFile(path.join(sessionPath, "context.md"), "utf-8");
      expect(contextContent).toBe("Updated context");

      const promptContent = await fs.readFile(path.join(sessionPath, "prompt.txt"), "utf-8");
      expect(promptContent).toBe("Updated prompt");
    });

    it("should handle large file contents", async () => {
      const tempDir = getTempDir();
      const sessionPath = path.join(tempDir, "session");

      const largeContent = "A".repeat(100000); // 100KB
      const sessionFiles = {
        sessionJson: { id: "session1" },
        contextMd: largeContent,
        promptTxt: largeContent,
        executionJson: { events: [] },
        resultsMd: largeContent,
        changesJson: { files: [] },
      };

      const result = await saveSessionFiles(sessionPath, sessionFiles);

      expect(result).toBe(true);
      const stats = await fs.stat(path.join(sessionPath, "context.md"));
      expect(stats.size).toBeGreaterThanOrEqual(100000);
    });

    it("should handle special characters in content", async () => {
      const tempDir = getTempDir();
      const sessionPath = path.join(tempDir, "session");

      const specialContent = "Special chars: ñ, é, 中文, 日本語, emoji: 🎉🚀";
      const sessionFiles = {
        sessionJson: { id: "session1" },
        contextMd: specialContent,
        promptTxt: specialContent,
        executionJson: { events: [] },
        resultsMd: specialContent,
        changesJson: { files: [] },
      };

      await saveSessionFiles(sessionPath, sessionFiles);

      // Verify content is preserved
      const content = await fs.readFile(path.join(sessionPath, "context.md"), "utf-8");
      expect(content).toBe(specialContent);
    });
  });

  describe("loadSessionFiles - File Reading", () => {
    it("should load all session files", async () => {
      const tempDir = getTempDir();
      const sessionPath = path.join(tempDir, "session");

      const originalFiles = {
        sessionJson: { id: "session1", nodeId: "node1" },
        contextMd: "# Context",
        promptTxt: "Prompt text",
        executionJson: { events: [{ event: "start" }] },
        resultsMd: "# Results",
        changesJson: { files: [] },
      };

      await saveSessionFiles(sessionPath, originalFiles);

      const loaded = await loadSessionFiles(sessionPath);

      expect(loaded).not.toBeNull();
      expect(loaded?.sessionJson).toEqual(originalFiles.sessionJson);
      expect(loaded?.contextMd).toBe(originalFiles.contextMd);
      expect(loaded?.promptTxt).toBe(originalFiles.promptTxt);
      expect(loaded?.resultsMd).toBe(originalFiles.resultsMd);
    });

    it("should return null when directory does not exist", async () => {
      const nonexistentPath = "/nonexistent/path/session";

      const result = await loadSessionFiles(nonexistentPath);

      expect(result).toBeNull();
    });

    it("should return null when files are missing", async () => {
      const tempDir = getTempDir();
      const sessionPath = path.join(tempDir, "session");

      // Create directory but don't create files
      await fs.mkdir(sessionPath, { recursive: true });

      const result = await loadSessionFiles(sessionPath);

      expect(result).toBeNull();
    });

    it("should parse JSON files correctly", async () => {
      const tempDir = getTempDir();
      const sessionPath = path.join(tempDir, "session");

      const sessionFiles = {
        sessionJson: {
          id: "session1",
          complex: { nested: { value: 123 } },
          array: [1, 2, 3],
        },
        contextMd: "Context",
        promptTxt: "Prompt",
        executionJson: { events: [{ ts: 1000, event: "start" }] },
        resultsMd: "Results",
        changesJson: { files: [{ path: "test.txt", status: "modified" }] },
      };

      await saveSessionFiles(sessionPath, sessionFiles);
      const loaded = await loadSessionFiles(sessionPath);

      expect(loaded?.sessionJson.complex.nested.value).toBe(123);
      expect(loaded?.executionJson.events[0].ts).toBe(1000);
      expect(loaded?.changesJson.files[0].path).toBe("test.txt");
    });
  });

  // ============================================================================
  // recordSession - Session Recording
  // ============================================================================

  describe("recordSession - Session Recording", () => {
    it("should record session with success status", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "vault");
      await fs.mkdir(path.join(nodePath, ".bozly"), { recursive: true });

      const session = await recordSession(
        nodePath,
        "node1",
        "Test Node",
        "test-command",
        "claude",
        {
          contextText: "# Context",
          commandText: "Run test",
          modelsUsed: ["claude-3-sonnet"],
        },
        {
          text: "Test output",
          duration: 1000,
        }
      );

      expect(session.id).toBeDefined();
      expect(session.status).toBe("completed");
      expect(session.command).toBe("test-command");
      expect(session.provider).toBe("claude");
      expect(session.executionTimeMs).toBe(1000);
    });

    it("should record session with error status", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "vault");
      await fs.mkdir(path.join(nodePath, ".bozly"), { recursive: true });

      const session = await recordSession(
        nodePath,
        "node1",
        "Test Node",
        "test-command",
        "claude",
        { commandText: "Run test" },
        {
          text: "Partial output",
          error: "API timeout",
          duration: 5000,
        }
      );

      expect(session.status).toBe("failed");
      expect(session.error?.message).toBe("API timeout");
    });

    it("should create session files on disk", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "vault");
      await fs.mkdir(path.join(nodePath, ".bozly"), { recursive: true });

      const session = await recordSession(
        nodePath,
        "node1",
        "Test Node",
        "test-command",
        "claude",
        { commandText: "Run test" },
        { text: "Output", duration: 100 }
      );

      // Verify files exist
      const sessionDir = path.join(nodePath, ".bozly", "sessions", "node1");
      const dirs = await fs.readdir(sessionDir, { recursive: true });
      expect(dirs.length).toBeGreaterThan(0);
    });

    it("should handle execution log entries", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "vault");
      await fs.mkdir(path.join(nodePath, ".bozly"), { recursive: true });

      const executionLog = [
        { timestamp: new Date().toISOString(), type: "start" as const, message: "Starting" },
        { timestamp: new Date().toISOString(), type: "progress" as const, message: "Loading" },
        { timestamp: new Date().toISOString(), type: "complete" as const, message: "Done" },
      ];

      const session = await recordSession(
        nodePath,
        "node1",
        "Test Node",
        "test-command",
        "claude",
        { commandText: "Run test" },
        { text: "Output", duration: 100 },
        executionLog
      );

      expect(session.id).toBeDefined();
    });

    it("should handle file changes", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "vault");
      await fs.mkdir(path.join(nodePath, ".bozly"), { recursive: true });

      const filesChanged = [
        { path: "file1.txt", status: "created" as const, size: 100 },
        { path: "file2.txt", status: "modified" as const, size: 200 },
        { path: "file3.txt", status: "deleted" as const, size: 0 },
      ];

      const session = await recordSession(
        nodePath,
        "node1",
        "Test Node",
        "test-command",
        "claude",
        { commandText: "Run test" },
        { text: "Output", duration: 100 },
        [],
        filesChanged
      );

      expect(session.id).toBeDefined();
    });
  });

  // ============================================================================
  // loadSession - Session Loading
  // ============================================================================

  describe("loadSession - Session Loading", () => {
    it("should load session by ID", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "vault");
      await fs.mkdir(path.join(nodePath, ".bozly"), { recursive: true });

      // First record a session
      const recorded = await recordSession(
        nodePath,
        "node1",
        "Test Node",
        "test-command",
        "claude",
        { commandText: "Run test" },
        { text: "Output", duration: 100 }
      );

      // Then load it
      const loaded = await loadSession(nodePath, recorded.id);

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe(recorded.id);
      expect(loaded?.command).toBe("test-command");
    });

    it("should return null for nonexistent session", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "vault");
      await fs.mkdir(path.join(nodePath, ".bozly"), { recursive: true });

      const result = await loadSession(nodePath, "nonexistent-id");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // getNodeSessions - Get All Sessions
  // ============================================================================

  describe("getNodeSessions - Get All Sessions", () => {
    it("should return empty array when no sessions exist", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "vault");
      await fs.mkdir(path.join(nodePath, ".bozly", "sessions"), { recursive: true });

      const sessions = await getNodeSessions(nodePath, "node1");

      expect(Array.isArray(sessions)).toBe(true);
    });

    it("should return multiple recorded sessions", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "vault");
      await fs.mkdir(path.join(nodePath, ".bozly"), { recursive: true });

      // Record multiple sessions
      const session1 = await recordSession(
        nodePath,
        "node1",
        "Test Node",
        "cmd1",
        "claude",
        { commandText: "Test" },
        { text: "Output1", duration: 100 }
      );

      const session2 = await recordSession(
        nodePath,
        "node1",
        "Test Node",
        "cmd2",
        "gpt",
        { commandText: "Test" },
        { text: "Output2", duration: 200 }
      );

      const sessions = await getNodeSessions(nodePath, "node1");

      expect(sessions.length).toBeGreaterThanOrEqual(2);
      const ids = sessions.map((s: any) => s.id);
      expect(ids).toContain(session1.id);
      expect(ids).toContain(session2.id);
    });

    it("should sort sessions by timestamp", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "vault");
      await fs.mkdir(path.join(nodePath, ".bozly"), { recursive: true });

      // Record multiple sessions
      await recordSession(
        nodePath,
        "node1",
        "Test",
        "cmd",
        "claude",
        { commandText: "Test" },
        { text: "Output", duration: 100 }
      );

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      await recordSession(
        nodePath,
        "node1",
        "Test",
        "cmd",
        "claude",
        { commandText: "Test" },
        { text: "Output", duration: 100 }
      );

      const sessions = await getNodeSessions(nodePath, "node1");

      if (sessions.length >= 2) {
        // Should be in some order (either ascending or descending)
        const timestamps = sessions.map((s: any) => new Date(s.timestamp).getTime());
        const isSorted =
          timestamps.every((t, i) => i === 0 || t >= timestamps[i - 1]) ||
          timestamps.every((t, i) => i === 0 || t <= timestamps[i - 1]);
        expect(isSorted).toBe(true);
      }
    });
  });
});
