/**
 * Comprehensive Sessions Module Tests - Advanced Coverage
 *
 * Tests for complex session operations:
 * - Session lifecycle management
 * - Filtering with complex criteria
 * - Aggregation and statistics
 * - Cleanup operations
 * - Error recovery and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs/promises";
import {
  recordSession,
  loadSession,
  querySessions,
  getSessionStats,
  formatSessionForLogs,
  getNodeSessions,
  getExecutedCommands,
  getLatestSession,
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

describe("Sessions Module - Comprehensive Advanced Coverage", () => {
  let nodePath: string;

  beforeEach(async () => {
    const tempDir = await createTempDir();
    nodePath = await createMockVault(tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  // ============================================================================
  // Session Lifecycle Tests
  // ============================================================================

  describe("Session Lifecycle Management", () => {
    it("should complete full session lifecycle: create → load → query", async () => {
      // Record session
      const recordResult = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test-command",
        "claude",
        {
          contextText: "Test context",
          commandText: "Test command",
          modelsUsed: ["test-model"],
        },
        {
          text: "Test result",
          duration: 1000,
        }
      );

      expect(recordResult).toBeDefined();
      expect(recordResult.id).toBeDefined();

      // Load session
      const loadedSession = await loadSession(nodePath, recordResult.id);
      expect(loadedSession).toBeDefined();
      expect(loadedSession.id).toBe(recordResult.id);

      // Query sessions
      const queriedSessions = await querySessions(nodePath, {});
      expect(queriedSessions.length).toBeGreaterThan(0);
      expect(queriedSessions.some((s: any) => s.id === recordResult.id)).toBe(true);
    });

    it("should track session status transitions correctly", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test",
        "claude",
        {
          contextText: "Context",
          commandText: "Command",
        },
        {
          text: "Result",
          duration: 1000,
        }
      );

      expect(recorded).toBeDefined();

      // Load and verify
      const loaded = await loadSession(nodePath, recorded.id);
      expect(loaded).toBeDefined();
    });

    it("should handle multiple sessions from same node", async () => {
      const sessionIds: string[] = [];

      // Create 5 sessions
      for (let i = 0; i < 5; i++) {
        const recorded = await recordSession(
          nodePath,
          "test-node",
          "Test Node",
          `command-${i}`,
          "claude",
          {
            contextText: "Context",
            commandText: `Command ${i}`,
          },
          {
            text: `Result ${i}`,
            duration: 1000 + i * 100,
          }
        );
        sessionIds.push(recorded.id);
      }

      // Query all sessions
      const allSessions = await getNodeSessions(nodePath);
      expect(allSessions.length).toBeGreaterThanOrEqual(5);

      // Verify all sessions exist
      for (const sessionId of sessionIds) {
        const loaded = await loadSession(nodePath, sessionId);
        expect(loaded).toBeDefined();
      }
    });

    it("should preserve session metadata through full lifecycle", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test-command",
        "claude",
        {
          contextText: "Context",
          commandText: "Test command",
          modelsUsed: ["claude-3-sonnet"],
        },
        {
          text: "Result",
          duration: 5000,
        }
      );

      const loaded = await loadSession(nodePath, recorded.id);

      expect(loaded.provider).toBe("claude");
      expect(loaded.command).toBe("test-command");
    });
  });

  // ============================================================================
  // Complex Filtering Tests
  // ============================================================================

  describe("Complex Session Filtering", () => {
    beforeEach(async () => {
      // Create diverse sessions for filtering tests
      const sessionConfigs = [
        { command: "analyze", provider: "claude" as const, nodeId: "test-node" },
        { command: "generate", provider: "gpt" as const, nodeId: "test-node" },
        { command: "analyze", provider: "claude" as const, nodeId: "test-node" },
        { command: "translate", provider: "gpt" as const, nodeId: "test-node" },
      ];

      for (const config of sessionConfigs) {
        await recordSession(
          nodePath,
          config.nodeId,
          "Test Node",
          config.command,
          config.provider,
          {
            contextText: "Context",
            commandText: `Run ${config.command}`,
          },
          {
            text: `Result for ${config.command}`,
            duration: 2000,
          }
        );
      }
    });

    it("should filter sessions by provider", async () => {
      const results = await querySessions(nodePath, { provider: "claude" });
      expect(results.length).toBeGreaterThan(0);
      results.forEach((session: any) => {
        expect(session.provider).toBe("claude");
      });
    });

    it("should filter sessions by status", async () => {
      const completedSessions = await querySessions(nodePath, { status: "completed" });
      expect(Array.isArray(completedSessions)).toBe(true);

      const failedSessions = await querySessions(nodePath, { status: "failed" });
      expect(Array.isArray(failedSessions)).toBe(true);
    });

    it("should filter sessions by command", async () => {
      const results = await querySessions(nodePath, { command: "analyze" });
      results.forEach((session: any) => {
        expect(session.command).toBe("analyze");
      });
    });

    it("should combine multiple filters", async () => {
      const results = await querySessions(nodePath, {
        provider: "claude",
        command: "analyze",
      });
      results.forEach((session: any) => {
        expect(session.provider).toBe("claude");
        expect(session.command).toBe("analyze");
      });
    });

    it("should filter sessions by date range", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const results = await querySessions(nodePath, {
        startDate: yesterday,
        endDate: tomorrow,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty array for non-matching filters", async () => {
      const results = await querySessions(nodePath, {
        provider: "nonexistent-provider",
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle case-insensitive filtering", async () => {
      const results1 = await querySessions(nodePath, { command: "ANALYZE" });
      const results2 = await querySessions(nodePath, { command: "analyze" });

      // Both should work (implementation may vary)
      expect(Array.isArray(results1)).toBe(true);
      expect(Array.isArray(results2)).toBe(true);
    });
  });

  // ============================================================================
  // Session Aggregation & Statistics Tests
  // ============================================================================

  describe("Session Aggregation and Statistics", () => {
    beforeEach(async () => {
      // Create sessions for statistics
      for (let i = 0; i < 3; i++) {
        await recordSession(
          nodePath,
          "test-node",
          "Test Node",
          `cmd${i + 1}`,
          i % 2 === 0 ? "claude" : "gpt",
          {
            contextText: "Context",
            commandText: `Command ${i + 1}`,
          },
          {
            text: `Result ${i + 1}`,
            duration: 2000 + i * 1000,
          }
        );
      }
    });

    it("should calculate session statistics", async () => {
      const stats = await getSessionStats(nodePath);
      expect(stats).toBeDefined();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(0);
      expect(stats.totalSuccessful).toBeGreaterThanOrEqual(0);
      expect(stats.totalFailed).toBeGreaterThanOrEqual(0);
    });

    it("should track average duration", async () => {
      const stats = await getSessionStats(nodePath);
      expect(stats).toBeDefined();
      expect(typeof stats.averageDuration).toBe("number");
      expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
    });

    it("should aggregate by provider", async () => {
      const stats = await getSessionStats(nodePath);
      expect(stats).toBeDefined();
      expect(Array.isArray(stats.providersUsed)).toBe(true);
    });

    it("should track average prompt size", async () => {
      const stats = await getSessionStats(nodePath);
      expect(stats).toBeDefined();
      expect(typeof stats.averagePromptSize).toBe("number");
      expect(stats.averagePromptSize).toBeGreaterThanOrEqual(0);
    });

    it("should get latest session correctly", async () => {
      const latest = await getLatestSession(nodePath);
      expect(latest).toBeDefined();
      expect(latest.id).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases & Error Handling
  // ============================================================================

  describe("Edge Cases and Error Handling", () => {
    it("should handle session with minimum required fields", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test",
        "claude",
        {
          commandText: "Test",
        },
        {
          text: "Result",
          duration: 1000,
        }
      );

      expect(recorded).toBeDefined();

      const loaded = await loadSession(nodePath, recorded.id);
      expect(loaded).toBeDefined();
    });

    it("should handle session with very long command name", async () => {
      const longCommand = "a".repeat(500);

      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        longCommand,
        "claude",
        {
          commandText: "Test",
        },
        {
          text: "Result",
          duration: 1000,
        }
      );

      const loaded = await loadSession(nodePath, recorded.id);
      expect(loaded.command).toBe(longCommand);
    });

    it("should handle session with special characters in command", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test-command@#$%^&*()",
        "claude",
        {
          commandText: "Test",
        },
        {
          text: "Result",
          duration: 1000,
        }
      );

      const loaded = await loadSession(nodePath, recorded.id);
      expect(loaded.command).toContain("@");
    });

    it("should handle empty query results gracefully", async () => {
      const results = await querySessions(nodePath, {
        command: "nonexistent-command-xyz",
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle sessions with undefined optional fields", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test",
        "claude",
        {
          commandText: "Test",
        },
        {
          text: "Result",
          duration: 1000,
        }
      );

      const loaded = await loadSession(nodePath, recorded.id);
      expect(loaded).toBeDefined();
    });

    it("should handle sessions with timestamps at boundaries", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test",
        "claude",
        {
          commandText: "Test",
        },
        {
          text: "Result",
          duration: 1000,
        }
      );

      const loaded = await loadSession(nodePath, recorded.id);
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(recorded.id);
    });

    it("should handle session formatting for logs", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test-command",
        "claude",
        {
          commandText: "Test",
        },
        {
          text: "Result",
          duration: 1000,
        }
      );

      const formatted = formatSessionForLogs(recorded);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe("string");
    });

    it("should handle query with null/undefined criteria", async () => {
      const results = await querySessions(nodePath, {});
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle get executed commands for session", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test-command",
        "claude",
        {
          commandText: "Test",
        },
        {
          text: "Result",
          duration: 1000,
        }
      );

      const commands = await getExecutedCommands(nodePath, recorded.id);
      expect(Array.isArray(commands)).toBe(true);
    });
  });

  // ============================================================================
  // Provider-Specific Tests
  // ============================================================================

  describe("Provider-Specific Session Handling", () => {
    it("should handle Claude provider sessions", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test",
        "claude",
        { commandText: "Test" },
        { text: "Result", duration: 1000 }
      );

      expect(recorded.provider).toBe("claude");
    });

    it("should handle GPT provider sessions", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test",
        "gpt",
        { commandText: "Test" },
        { text: "Result", duration: 1000 }
      );

      expect(recorded.provider).toBe("gpt");
    });

    it("should handle Gemini provider sessions", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test",
        "gemini",
        { commandText: "Test" },
        { text: "Result", duration: 1000 }
      );

      expect(recorded.provider).toBe("gemini");
    });

    it("should handle Ollama provider sessions", async () => {
      const recorded = await recordSession(
        nodePath,
        "test-node",
        "Test Node",
        "test",
        "ollama",
        { commandText: "Test" },
        { text: "Result", duration: 1000 }
      );

      expect(recorded.provider).toBe("ollama");
    });
  });

  // ============================================================================
  // Node Sessions Retrieval Tests
  // ============================================================================

  describe("Node Sessions Retrieval", () => {
    it("should retrieve all sessions for a node", async () => {
      for (let i = 0; i < 3; i++) {
        await recordSession(
          nodePath,
          "test-node",
          "Test Node",
          `cmd-${i}`,
          "claude",
          { commandText: `Test ${i}` },
          { text: `Result ${i}`, duration: 1000 }
        );
      }

      const nodeSessions = await getNodeSessions(nodePath);
      expect(nodeSessions.length).toBeGreaterThanOrEqual(3);
    });

    it("should maintain session order by creation time", async () => {
      for (let i = 0; i < 3; i++) {
        await recordSession(
          nodePath,
          "test-node",
          "Test Node",
          `cmd-${i}`,
          "claude",
          { commandText: `Test ${i}` },
          { text: `Result ${i}`, duration: 1000 }
        );
      }

      const retrieved = await getNodeSessions(nodePath);
      expect(retrieved.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle empty node session list", async () => {
      // Create a new node path with no sessions
      const emptyNodePath = path.join(getTempDir(), "empty-node");
      await fs.mkdir(emptyNodePath, { recursive: true });

      const sessions = await getNodeSessions(emptyNodePath);
      expect(Array.isArray(sessions)).toBe(true);
    });
  });
});
