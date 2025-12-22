/**
 * Session Management Tests
 *
 * Tests for multi-file session recording, loading, querying, and diffing.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs/promises";
import {
  recordSession,
  loadSession,
  loadSessionFiles,
  querySessions,
  diffSessions,
  getSessionPath,
  createSessionDirectory,
  saveSessionFiles,
  getLatestSession,
  getExecutedCommands,
  getSessionStats,
  formatSessionForLogs,
  getNodeSessions,
} from "../../dist/core/sessions.js";
import { Session, ExecutionLogEntry, FileChange } from "../../dist/core/types.js";
import {
  createTempDir,
  getTempDir,
  cleanupTempDir,
  createMockVault,
  fileExists,
  dirExists,
  readJSON,
} from "../conftest.js";

describe("Sessions Module", () => {
  let nodePath: string;

  beforeEach(async () => {
    const tempDir = await createTempDir();
    nodePath = await createMockVault(tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  describe("getSessionPath", () => {
    it("should build correct session path from components", () => {
      const basePath = "/home/user/.bozly";
      const nodeId = "music-vault";
      const timestamp = "2025-12-20T14:32:00Z" as any;
      const sessionId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

      const result = getSessionPath(basePath, nodeId, timestamp, sessionId);

      expect(result).toContain("sessions");
      expect(result).toContain("music-vault");
      expect(result).toContain("2025/12/20");
      expect(result).toContain(sessionId);
    });

    it("should handle different dates correctly", () => {
      const basePath = "/home/user/.bozly";
      const nodeId = "vault";
      const sessionId = "uuid";

      const path1 = getSessionPath(basePath, nodeId, "2025-01-15T10:00:00Z" as any, sessionId);
      const path2 = getSessionPath(basePath, nodeId, "2025-12-31T23:59:59Z" as any, sessionId);

      expect(path1).toContain("2025/01/15");
      expect(path2).toContain("2025/12/31");
    });
  });

  describe("createSessionDirectory", () => {
    it("should create directory with parent paths", async () => {
      const sessionPath = path.join(nodePath, ".bozly", "sessions", "music-vault", "2025", "12", "20", "uuid");

      const result = await createSessionDirectory(sessionPath);

      expect(result).toBe(true);
      expect(await dirExists(sessionPath)).toBe(true);
    });

    it("should handle existing directory gracefully", async () => {
      const sessionPath = path.join(nodePath, ".bozly", "sessions", "music-vault", "2025", "12", "20", "uuid");

      // Create once
      await createSessionDirectory(sessionPath);
      // Create again
      const result = await createSessionDirectory(sessionPath);

      expect(result).toBe(true);
    });
  });

  describe("recordSession", () => {
    it("should create all 6 session files", async () => {
      const now = new Date().toISOString() as any;

      const session = await recordSession(
        nodePath,
        "music-vault",
        "Music Vault",
        "rate-album",
        "claude",
        {
          contextText: "# Music Rating Context\n\nRate albums using triple-score model",
          commandText: "Rate the top 5 albums from 2025",
          modelsUsed: ["triple-score.yaml"],
        },
        {
          text: "Successfully rated 5 albums",
          duration: 3000,
        }
      );

      const sessionDir = path.join(nodePath, ".bozly", "sessions", "music-vault", now.split("T")[0].replace(/-/g, "/"), session.id);

      // Check all files exist
      expect(await fileExists(path.join(sessionDir, "session.json"))).toBe(true);
      expect(await fileExists(path.join(sessionDir, "context.md"))).toBe(true);
      expect(await fileExists(path.join(sessionDir, "prompt.txt"))).toBe(true);
      expect(await fileExists(path.join(sessionDir, "execution.json"))).toBe(true);
      expect(await fileExists(path.join(sessionDir, "results.md"))).toBe(true);
      expect(await fileExists(path.join(sessionDir, "changes.json"))).toBe(true);
    });

    it("should record session with correct metadata", async () => {
      const session = await recordSession(
        nodePath,
        "music-vault",
        "Music Vault",
        "daily",
        "claude",
        {
          contextText: "# Context",
          commandText: "Run daily analysis",
        },
        {
          text: "Daily analysis complete",
          duration: 2500,
        }
      );

      expect(session.id).toBeDefined();
      expect(session.nodeId).toBe("music-vault");
      expect(session.command).toBe("daily");
      expect(session.provider).toBe("claude");
      expect(session.status).toBe("completed");
      expect(session.executionTimeMs).toBe(2500);
    });

    it("should mark failed sessions with error status", async () => {
      const session = await recordSession(
        nodePath,
        "music-vault",
        "Music Vault",
        "rate-album",
        "claude",
        {
          contextText: "# Context",
          commandText: "Rate album",
        },
        {
          text: "",
          error: "API rate limit exceeded",
          duration: 1000,
        }
      );

      expect(session.status).toBe("failed");
      expect(session.error).toBeDefined();
      expect(session.error?.message).toBe("API rate limit exceeded");
    });

    it("should include execution log in session", async () => {
      const executionLog: ExecutionLogEntry[] = [
        { timestamp: new Date().toISOString() as any, type: "start", message: "Started" },
        { timestamp: new Date().toISOString() as any, type: "ai_call", message: "Called Claude" },
        { timestamp: new Date().toISOString() as any, type: "complete", message: "Completed" },
      ];

      const session = await recordSession(
        nodePath,
        "music-vault",
        "Music Vault",
        "test",
        "claude",
        { contextText: "", commandText: "test" },
        { text: "output", duration: 100 },
        executionLog
      );

      expect(session).toBeDefined();
    });

    it("should track file changes in session", async () => {
      const filesChanged: FileChange[] = [
        {
          path: "ratings.json",
          action: "modified",
          beforeSize: 1000,
          afterSize: 1100,
        },
      ];

      const session = await recordSession(
        nodePath,
        "music-vault",
        "Music Vault",
        "test",
        "claude",
        { contextText: "", commandText: "test" },
        { text: "output", duration: 100 },
        [],
        filesChanged
      );

      expect(session).toBeDefined();
    });
  });

  describe("loadSessionFiles", () => {
    it("should load all session files correctly", async () => {
      const recordedSession = await recordSession(
        nodePath,
        "music-vault",
        "Music Vault",
        "daily",
        "claude",
        {
          contextText: "# Test Context",
          commandText: "Test command",
          modelsUsed: ["model.yaml"],
        },
        {
          text: "Test output",
          duration: 1000,
        }
      );

      const dateStr = recordedSession.timestamp.split("T")[0].replace(/-/g, "/");
      const sessionDir = path.join(nodePath, ".bozly", "sessions", "music-vault", dateStr, recordedSession.id);

      const files = await loadSessionFiles(sessionDir);

      expect(files).toBeDefined();
      expect(files?.sessionJson).toBeDefined();
      expect(files?.contextMd).toBeDefined();
      expect(files?.promptTxt).toBeDefined();
      expect(files?.executionJson).toBeDefined();
      expect(files?.resultsMd).toBeDefined();
      expect(files?.changesJson).toBeDefined();
    });

    it("should return null for non-existent session", async () => {
      const nonExistentPath = path.join(nodePath, ".bozly", "sessions", "nonexistent");
      const files = await loadSessionFiles(nonExistentPath);

      expect(files).toBeNull();
    });
  });

  describe("querySessions", () => {
    it("should return empty array for vault with no sessions", async () => {
      const sessions = await querySessions(nodePath);

      expect(sessions).toEqual([]);
    });

    it("should return all sessions", async () => {
      await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      await recordSession(nodePath, "music-vault", "Music Vault", "weekly", "gpt", {
        commandText: "test",
      }, { text: "result", duration: 200 });

      const sessions = await querySessions(nodePath);

      expect(sessions.length).toBe(2);
    });

    it("should filter by command", async () => {
      await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      await recordSession(nodePath, "music-vault", "Music Vault", "weekly", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      const sessions = await querySessions(nodePath, { command: "daily" });

      expect(sessions.length).toBe(1);
      expect(sessions[0].command).toBe("daily");
    });

    it("should filter by provider", async () => {
      await recordSession(nodePath, "music-vault", "Music Vault", "test", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      await recordSession(nodePath, "music-vault", "Music Vault", "test", "gpt", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      const sessions = await querySessions(nodePath, { provider: "claude" });

      expect(sessions.length).toBe(1);
      expect(sessions[0].provider).toBe("claude");
    });

    it("should filter by status", async () => {
      await recordSession(nodePath, "music-vault", "Music Vault", "test1", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      await recordSession(nodePath, "music-vault", "Music Vault", "test2", "claude", {
        commandText: "test",
      }, { text: "", error: "Failed", duration: 100 });

      const sessions = await querySessions(nodePath, { status: "completed" });

      expect(sessions.length).toBe(1);
      expect(sessions[0].status).toBe("completed");
    });

    it("should filter by vault", async () => {
      await recordSession(nodePath, "music-vault", "Music Vault", "test", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      const sessions = await querySessions(nodePath, { node: "music-vault" });

      expect(sessions.length).toBe(1);
      expect(sessions[0].nodeId).toBe("music-vault");
    });

    it("should apply limit", async () => {
      for (let i = 0; i < 5; i++) {
        await recordSession(nodePath, "music-vault", "Music Vault", `test${i}`, "claude", {
          commandText: "test",
        }, { text: "result", duration: 100 });
      }

      const sessions = await querySessions(nodePath, { limit: 2 });

      expect(sessions.length).toBe(2);
    });

    it("should apply offset", async () => {
      for (let i = 0; i < 5; i++) {
        await recordSession(nodePath, "music-vault", "Music Vault", `test${i}`, "claude", {
          commandText: "test",
        }, { text: "result", duration: 100 });
      }

      const sessions = await querySessions(nodePath, { offset: 2, limit: 2 });

      expect(sessions.length).toBe(2);
    });

    it("should sort by timestamp newest first", async () => {
      const session1 = await recordSession(nodePath, "music-vault", "Music Vault", "test1", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      // Add small delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      const session2 = await recordSession(nodePath, "music-vault", "Music Vault", "test2", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      const sessions = await querySessions(nodePath);

      expect(sessions[0].id).toBe(session2.id);
      expect(sessions[1].id).toBe(session1.id);
    });
  });

  describe("getLatestSession", () => {
    it("should return latest session for command", async () => {
      const session1 = await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        commandText: "test",
      }, { text: "result1", duration: 100 });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const session2 = await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        commandText: "test",
      }, { text: "result2", duration: 100 });

      const latest = await getLatestSession(nodePath, "daily");

      expect(latest?.id).toBe(session2.id);
    });

    it("should return null if command has no sessions", async () => {
      const latest = await getLatestSession(nodePath, "nonexistent");

      expect(latest).toBeNull();
    });
  });

  describe("getExecutedCommands", () => {
    it("should return all unique commands", async () => {
      await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      await recordSession(nodePath, "music-vault", "Music Vault", "weekly", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      const commands = await getExecutedCommands(nodePath);

      expect(commands).toContain("daily");
      expect(commands).toContain("weekly");
      expect(commands.length).toBe(2);
    });

    it("should return sorted array", async () => {
      await recordSession(nodePath, "music-vault", "Music Vault", "zebra", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      await recordSession(nodePath, "music-vault", "Music Vault", "alpha", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      const commands = await getExecutedCommands(nodePath);

      expect(commands[0]).toBe("alpha");
      expect(commands[1]).toBe("zebra");
    });
  });

  describe("diffSessions", () => {
    it("should diff two sessions", async () => {
      const session1 = await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        contextText: "# Short context",
        commandText: "Test command",
      }, { text: "Output 1", duration: 1000 });

      const session2 = await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        contextText: "# Much longer context with more details",
        commandText: "Test command with more instructions",
      }, { text: "Output 2", duration: 2000 });

      const diff = diffSessions(session1, session2);

      expect(diff.left.id).toBe(session1.id);
      expect(diff.right.id).toBe(session2.id);
      expect(diff.differences).toBeDefined();
    });
  });

  describe("getSessionStats", () => {
    it("should calculate statistics for all sessions", async () => {
      await recordSession(nodePath, "music-vault", "Music Vault", "test1", "claude", {
        contextText: "# Context",
        commandText: "test",
      }, { text: "result", duration: 1000 });

      await recordSession(nodePath, "music-vault", "Music Vault", "test2", "claude", {
        contextText: "# Context",
        commandText: "test",
      }, { text: "result", duration: 2000 });

      const stats = await getSessionStats(nodePath);

      expect(stats.totalSessions).toBe(2);
      expect(stats.totalSuccessful).toBe(2);
      expect(stats.totalFailed).toBe(0);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    it("should filter stats by command", async () => {
      await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        contextText: "# Context",
        commandText: "test",
      }, { text: "result", duration: 1000 });

      await recordSession(nodePath, "music-vault", "Music Vault", "weekly", "claude", {
        contextText: "# Context",
        commandText: "test",
      }, { text: "result", duration: 2000 });

      const stats = await getSessionStats(nodePath, "daily");

      expect(stats.totalSessions).toBe(1);
    });
  });

  describe("formatSessionForLogs", () => {
    it("should format session for display", async () => {
      const session = await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        contextText: "# Context",
        commandText: "test",
      }, { text: "result", duration: 1000 });

      const formatted = formatSessionForLogs(session, false);

      expect(formatted).toContain("✅");
      expect(formatted).toContain("daily");
      expect(formatted).toContain("claude");
      expect(formatted).toContain("1000");
    });

    it("should include details in verbose mode", async () => {
      const session = await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        contextText: "# Context with some text",
        commandText: "test command",
      }, { text: "result", duration: 1000 });

      const formatted = formatSessionForLogs(session, true);

      expect(formatted).toContain("Context:");
      expect(formatted).toContain("Total:");
    });
  });

  describe("getNodeSessions", () => {
    it("should get sessions for specific vault", async () => {
      await recordSession(nodePath, "music-vault", "Music Vault", "test", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      const sessions = await getNodeSessions(nodePath, "music-vault");

      expect(sessions.length).toBe(1);
      expect(sessions[0].nodeId).toBe("music-vault");
    });
  });

  describe("Integration Tests", () => {
    it("should record, query, and retrieve sessions end-to-end", async () => {
      // Record multiple sessions
      const session1 = await recordSession(nodePath, "music-vault", "Music Vault", "daily", "claude", {
        contextText: "# Daily context",
        commandText: "Daily analysis",
      }, { text: "Daily complete", duration: 1500 });

      const session2 = await recordSession(nodePath, "music-vault", "Music Vault", "weekly", "gpt", {
        contextText: "# Weekly context",
        commandText: "Weekly report",
      }, { text: "Weekly complete", duration: 2500 });

      // Query all sessions
      const allSessions = await querySessions(nodePath);
      expect(allSessions.length).toBe(2);

      // Query specific command
      const dailyOnly = await querySessions(nodePath, { command: "daily" });
      expect(dailyOnly.length).toBe(1);
      expect(dailyOnly[0].id).toBe(session1.id);

      // Get latest session
      const latest = await getLatestSession(nodePath, "weekly");
      expect(latest?.id).toBe(session2.id);

      // Get stats
      const stats = await getSessionStats(nodePath);
      expect(stats.totalSessions).toBe(2);
      expect(stats.providersUsed).toContain("claude");
      expect(stats.providersUsed).toContain("gpt");

      // Compare sessions
      const diff = diffSessions(session1, session2);
      expect(diff.left.id).toBe(session1.id);
      expect(diff.right.id).toBe(session2.id);
    });

    it("should handle multiple vaults correctly", async () => {
      await recordSession(nodePath, "music-vault", "Music Vault", "test", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      await recordSession(nodePath, "journal-vault", "Journal Vault", "test", "claude", {
        commandText: "test",
      }, { text: "result", duration: 100 });

      const musicSessions = await querySessions(nodePath, { node: "music-vault" });
      const journalSessions = await querySessions(nodePath, { node: "journal-vault" });

      expect(musicSessions.length).toBe(1);
      expect(journalSessions.length).toBe(1);
      expect(musicSessions[0].nodeId).toBe("music-vault");
      expect(journalSessions[0].nodeId).toBe("journal-vault");
    });
  });

  describe("Global session operations (Pattern 2 - Transparency)", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir();
    });

    it("should query sessions globally across all vaults", async () => {
      const globalSessionsPath = path.join(tempDir, ".bozly", "sessions");
      // Create sessions in multiple vaults within global sessions directory
      const sessionsDir1 = path.join(globalSessionsPath, "music-vault", "2025", "12", "20", "uuid-1");
      const sessionsDir2 = path.join(globalSessionsPath, "journal-vault", "2025", "12", "20", "uuid-2");

      await fs.mkdir(sessionsDir1, { recursive: true });
      await fs.mkdir(sessionsDir2, { recursive: true });

      const session1 = {
        schema_version: "1.0",
        id: "uuid-1",
        nodeId: "music-vault",
        timestamp: new Date().toISOString(),
        command: "rate-album",
        provider: "claude",
        status: "completed",
        executionTimeMs: 1000,
      };

      const session2 = {
        schema_version: "1.0",
        id: "uuid-2",
        nodeId: "journal-vault",
        timestamp: new Date().toISOString(),
        command: "daily-entry",
        provider: "gpt",
        status: "completed",
        executionTimeMs: 1500,
      };

      await fs.writeFile(
        path.join(sessionsDir1, "session.json"),
        JSON.stringify(session1, null, 2)
      );
      await fs.writeFile(
        path.join(sessionsDir2, "session.json"),
        JSON.stringify(session2, null, 2)
      );

      // Import the global query function
      const { querySessionsGlobal } = await import("../../src/core/sessions.js");

      // Query all sessions globally
      const allSessions = await querySessionsGlobal(globalSessionsPath);
      expect(allSessions.length).toBe(2);

      // Query by vault
      const musicSessions = await querySessionsGlobal(globalSessionsPath, {
        node: "music-vault",
      });
      expect(musicSessions.length).toBe(1);
      expect(musicSessions[0].nodeId).toBe("music-vault");

      // Query by command
      const ratingSessions = await querySessionsGlobal(globalSessionsPath, {
        command: "rate-album",
      });
      expect(ratingSessions.length).toBe(1);

      // Query by provider
      const claudeSessions = await querySessionsGlobal(globalSessionsPath, {
        provider: "claude",
      });
      expect(claudeSessions.length).toBe(1);
    });

    it("should get list of vaults with sessions", async () => {
      const globalSessionsPath = path.join(tempDir, ".bozly", "sessions");
      // Create sessions for multiple vaults
      const vault1Dir = path.join(globalSessionsPath, "vault1", "2025", "12", "20", "s1");
      const vault2Dir = path.join(globalSessionsPath, "vault2", "2025", "12", "20", "s2");

      await fs.mkdir(vault1Dir, { recursive: true });
      await fs.mkdir(vault2Dir, { recursive: true });

      const session1 = {
        schema_version: "1.0",
        id: "s1",
        nodeId: "vault1",
        timestamp: new Date().toISOString(),
        command: "test",
        provider: "claude",
        status: "completed",
      };

      const session2 = {
        schema_version: "1.0",
        id: "s2",
        nodeId: "vault2",
        timestamp: new Date().toISOString(),
        command: "test",
        provider: "claude",
        status: "completed",
      };

      await fs.writeFile(
        path.join(vault1Dir, "session.json"),
        JSON.stringify(session1, null, 2)
      );
      await fs.writeFile(
        path.join(vault2Dir, "session.json"),
        JSON.stringify(session2, null, 2)
      );

      const { getNodesWithSessions } = await import("../../src/core/sessions.js");
      const vaults = await getNodesWithSessions(globalSessionsPath);

      expect(vaults.length).toBe(2);
      expect(vaults).toContain("vault1");
      expect(vaults).toContain("vault2");
    });

    it("should get global session statistics", async () => {
      const globalSessionsPath = path.join(tempDir, ".bozly", "sessions");
      // Create multiple sessions with different statuses
      const sessionsToCreate = [
        {
          id: "gs1",
          vault: "music",
          command: "rate",
          provider: "claude",
          status: "completed",
          duration: 1000,
        },
        {
          id: "gs2",
          vault: "music",
          command: "list",
          provider: "gpt",
          status: "completed",
          duration: 1500,
        },
        {
          id: "gs3",
          vault: "journal",
          command: "entry",
          provider: "claude",
          status: "failed",
          duration: 500,
        },
      ];

      for (const sess of sessionsToCreate) {
        const sessDir = path.join(
          globalSessionsPath,
          sess.vault,
          "2025",
          "12",
          "20",
          sess.id
        );
        await fs.mkdir(sessDir, { recursive: true });

        const sessionData = {
          schema_version: "1.0",
          id: sess.id,
          nodeId: sess.vault,
          timestamp: new Date().toISOString(),
          command: sess.command,
          provider: sess.provider,
          status: sess.status,
          executionTimeMs: sess.duration,
        };

        await fs.writeFile(
          path.join(sessDir, "session.json"),
          JSON.stringify(sessionData, null, 2)
        );
      }

      const { getSessionStatsGlobal } = await import("../../src/core/sessions.js");
      const stats = await getSessionStatsGlobal(globalSessionsPath);

      expect(stats.totalSessions).toBe(3);
      expect(stats.totalSuccessful).toBe(2);
      expect(stats.totalFailed).toBe(1);
      expect(stats.nodesWithSessions).toContain("music");
      expect(stats.nodesWithSessions).toContain("journal");
      expect(stats.providersUsed).toContain("claude");
      expect(stats.providersUsed).toContain("gpt");
      expect(stats.commandsExecuted).toContain("rate");
      expect(stats.commandsExecuted).toContain("list");
      expect(stats.commandsExecuted).toContain("entry");
      expect(stats.sessionsByNode["music"]).toBe(2);
      expect(stats.sessionsByNode["journal"]).toBe(1);
      expect(stats.sessionsByProvider["claude"]).toBe(2);
      expect(stats.sessionsByProvider["gpt"]).toBe(1);
    });

    it("should archive sessions by date", async () => {
      const globalSessionsPath = path.join(tempDir, ".bozly", "sessions");
      const { archiveSessionsByDate } = await import("../../src/core/sessions.js");

      // Create old and new sessions
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // 40 days ago

      const newDate = new Date();

      const oldSessDir = path.join(
        globalSessionsPath,
        "vault",
        "2025",
        "10",
        "10",
        "old-session"
      );
      const newSessDir = path.join(
        globalSessionsPath,
        "vault",
        "2025",
        "12",
        "20",
        "new-session"
      );

      await fs.mkdir(oldSessDir, { recursive: true });
      await fs.mkdir(newSessDir, { recursive: true });

      const oldSession = {
        schema_version: "1.0",
        id: "old-session",
        nodeId: "vault",
        timestamp: oldDate.toISOString(),
        command: "test",
        provider: "claude",
        status: "completed",
      };

      const newSession = {
        schema_version: "1.0",
        id: "new-session",
        nodeId: "vault",
        timestamp: newDate.toISOString(),
        command: "test",
        provider: "claude",
        status: "completed",
      };

      await fs.writeFile(
        path.join(oldSessDir, "session.json"),
        JSON.stringify(oldSession, null, 2)
      );
      await fs.writeFile(
        path.join(newSessDir, "session.json"),
        JSON.stringify(newSession, null, 2)
      );

      // Archive sessions before today
      const archived = await archiveSessionsByDate(globalSessionsPath, newDate);
      expect(archived).toBe(1);

      // Check that old session was moved to archive
      const archivePath = path.join(
        globalSessionsPath,
        "archive",
        "vault",
        "2025",
        "10",
        "10",
        "old-session",
        "session.json"
      );
      const exists = await fs
        .access(archivePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it("should archive sessions by vault", async () => {
      const globalSessionsPath = path.join(tempDir, ".bozly", "sessions");
      const { archiveSessionsByNode } = await import("../../src/core/sessions.js");

      // Create sessions in multiple vaults
      const vault1Sess = path.join(
        globalSessionsPath,
        "vault1",
        "2025",
        "12",
        "20",
        "sess1"
      );
      const vault2Sess = path.join(
        globalSessionsPath,
        "vault2",
        "2025",
        "12",
        "20",
        "sess2"
      );

      await fs.mkdir(vault1Sess, { recursive: true });
      await fs.mkdir(vault2Sess, { recursive: true });

      const sess1 = {
        schema_version: "1.0",
        id: "sess1",
        nodeId: "vault1",
        timestamp: new Date().toISOString(),
        command: "test",
        provider: "claude",
        status: "completed",
      };

      const sess2 = {
        schema_version: "1.0",
        id: "sess2",
        nodeId: "vault2",
        timestamp: new Date().toISOString(),
        command: "test",
        provider: "claude",
        status: "completed",
      };

      await fs.writeFile(
        path.join(vault1Sess, "session.json"),
        JSON.stringify(sess1, null, 2)
      );
      await fs.writeFile(
        path.join(vault2Sess, "session.json"),
        JSON.stringify(sess2, null, 2)
      );

      // Archive all sessions from vault1
      const archived = await archiveSessionsByNode(globalSessionsPath, "vault1");
      expect(archived).toBe(1);

      // Check that vault1 session was archived
      const vault2Exists = await fs
        .access(vault2Sess)
        .then(() => true)
        .catch(() => false);
      expect(vault2Exists).toBe(true); // vault2 still exists

      // Check that vault1 session is in archive
      const archivePath = path.join(
        globalSessionsPath,
        "archive",
        "vault1",
        "2025",
        "12",
        "20",
        "sess1",
        "session.json"
      );
      const archiveExists = await fs
        .access(archivePath)
        .then(() => true)
        .catch(() => false);
      expect(archiveExists).toBe(true);
    });

  });
});
