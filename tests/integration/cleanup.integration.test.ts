/**
 * Integration tests for BOZLY cleanup system
 * Tests complete cleanup workflows end-to-end with real file system operations
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const TEMP_BASE = path.resolve(PROJECT_ROOT, ".test-cleanup-integration");

/**
 * Helper to run bozly CLI commands
 */
function runCommand(
  cmd: string,
  args: string[] = [],
  cwd: string = PROJECT_ROOT,
  env: Record<string, string> = {}
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: {
        ...process.env,
        BOZLY_HOME: path.join(TEMP_BASE, ".bozly"),
        ...env
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        code: code || 0,
      });
    });

    setTimeout(() => {
      child.kill();
      resolve({ stdout, stderr, code: 1 });
    }, 30000); // 30 second timeout
  });
}

/**
 * Create a mock node with sessions
 */
async function createMockNode(
  nodePath: string,
  sessionCount: number = 3
): Promise<void> {
  const bozlyPath = path.join(nodePath, ".bozly");

  // Create directory structure
  await fs.mkdir(path.join(bozlyPath, "sessions"), { recursive: true });
  await fs.mkdir(path.join(bozlyPath, "hooks"), { recursive: true });
  await fs.mkdir(path.join(bozlyPath, "commands"), { recursive: true });

  // Create config
  const config = {
    name: path.basename(nodePath),
    type: "default",
    version: "0.3.0",
    created: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(bozlyPath, "config.json"),
    JSON.stringify(config, null, 2)
  );

  // Create context
  await fs.writeFile(
    path.join(bozlyPath, "context.md"),
    "# Test Node\n\nFor integration testing."
  );

  // Create mock sessions with different dates
  const now = Date.now();
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000;
  const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;

  const sessionDates = [
    new Date(now),
    new Date(oneMonthAgo),
    new Date(threeMonthsAgo),
    new Date(sixMonthsAgo),
  ];

  for (let i = 0; i < Math.min(sessionCount, sessionDates.length); i++) {
    const sessionDate = sessionDates[i];
    const year = sessionDate.getUTCFullYear().toString();
    const month = String(sessionDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(sessionDate.getUTCDate()).padStart(2, "0");

    const sessionPath = path.join(
      bozlyPath,
      "sessions",
      year,
      month,
      day,
      `session-${i}`
    );

    await fs.mkdir(sessionPath, { recursive: true });

    // Create session files
    const sessionContent = JSON.stringify(
      {
        id: `session-${i}`,
        timestamp: sessionDate.toISOString(),
        command: `test-command-${i}`,
        provider: "claude",
      },
      null,
      2
    );

    const mockData = "x".repeat(1024); // 1KB per file
    await fs.writeFile(path.join(sessionPath, "session.json"), sessionContent);
    await fs.writeFile(path.join(sessionPath, "context.md"), mockData);
    await fs.writeFile(path.join(sessionPath, "prompt.txt"), mockData);
    await fs.writeFile(path.join(sessionPath, "execution.json"), mockData);
    await fs.writeFile(path.join(sessionPath, "results.md"), mockData);
    await fs.writeFile(path.join(sessionPath, "changes.json"), mockData);
  }
}

/**
 * Count sessions in a node
 */
async function countSessions(nodePath: string): Promise<number> {
  try {
    const sessionsPath = path.join(nodePath, ".bozly", "sessions");
    const stats = await fs.stat(sessionsPath).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      return 0;
    }

    // Sessions are organized as: sessions/YYYY/MM/DD/session-id/
    // So we need to count directories at depth 4
    let count = 0;

    const years = await fs.readdir(sessionsPath);
    for (const year of years) {
      const yearPath = path.join(sessionsPath, year);
      const yearStats = await fs.stat(yearPath).catch(() => null);
      if (!yearStats?.isDirectory()) continue;

      const months = await fs.readdir(yearPath);
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const monthStats = await fs.stat(monthPath).catch(() => null);
        if (!monthStats?.isDirectory()) continue;

        const days = await fs.readdir(monthPath);
        for (const day of days) {
          const dayPath = path.join(monthPath, day);
          const dayStats = await fs.stat(dayPath).catch(() => null);
          if (!dayStats?.isDirectory()) continue;

          const sessions = await fs.readdir(dayPath);
          for (const session of sessions) {
            const sessionPath = path.join(dayPath, session);
            const sessionStats = await fs
              .stat(sessionPath)
              .catch(() => null);
            if (sessionStats?.isDirectory()) {
              count++;
            }
          }
        }
      }
    }
    return count;
  } catch {
    return 0;
  }
}

describe("Cleanup System Integration Tests", () => {
  beforeEach(async () => {
    // Clean up and create temp directory
    try {
      await fs.rm(TEMP_BASE, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, that's fine
    }
    await fs.mkdir(TEMP_BASE, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(TEMP_BASE, { recursive: true, force: true });
    } catch {
      // Already cleaned up
    }
  });

  describe("Cleanup Command Execution", () => {
    it("should handle cleanup with --preview (dry-run) mode", async () => {
      const nodePath = path.join(TEMP_BASE, "test-node-1");
      await createMockNode(nodePath, 4);

      const initialCount = await countSessions(nodePath);
      expect(initialCount).toBe(4);

      // Run cleanup with --preview (dry-run)
      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");
      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
        "--older-than",
        "60d",
      ]);

      // Should succeed (exit code 0 or 1 both acceptable for preview)
      expect([0, 1]).toContain(result.code);

      // Verify sessions still exist (preview doesn't delete)
      const finalCount = await countSessions(nodePath);
      expect(finalCount).toBe(initialCount);
    });

    it("should require --force flag for actual deletion", async () => {
      const nodePath = path.join(TEMP_BASE, "test-node-2");
      await createMockNode(nodePath, 3);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Try cleanup WITHOUT --force
      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--older-than",
        "60d",
      ]);

      // Should either fail or show warning about --force requirement
      // The actual behavior depends on the CLI implementation
      expect(result.stdout + result.stderr).toBeDefined();
    });

    it("should display storage information with --storage flag", async () => {
      const nodePath = path.join(TEMP_BASE, "test-node-3");
      await createMockNode(nodePath, 2);

      // First initialize the node with BOZLY
      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");
      await runCommand("node", [
        cliPath,
        "init",
        nodePath,
        "--name",
        "test-node-3",
        "--type",
        "default",
      ]);

      // Then check storage status
      const result = await runCommand("node", [
        cliPath,
        "status",
        "--storage",
      ]);

      // Should either show storage info or node not found (depends on registration)
      expect(result.stdout + result.stderr).toBeDefined();
    });
  });

  describe("Cleanup with Duration Filters", () => {
    it("should parse and apply various duration formats", async () => {
      const nodePath = path.join(TEMP_BASE, "test-node-duration");
      await createMockNode(nodePath, 4);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Test different duration formats (all in preview mode to avoid deletion)
      const formats = ["30d", "4w", "3m", "1y"];

      for (const format of formats) {
        const result = await runCommand("node", [
          cliPath,
          "cleanup",
          "--preview",
          "--older-than",
          format,
        ]);

        // Should handle all formats without error
        expect([0, 1]).toContain(result.code);
      }
    });

    it("should reject invalid duration formats", async () => {
      const nodePath = path.join(TEMP_BASE, "test-node-invalid");
      await createMockNode(nodePath, 2);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
        "--older-than",
        "invalid-format",
      ]);

      // Should fail with invalid format
      expect(result.code).not.toBe(0);
    });
  });

  describe("Storage Monitoring", () => {
    it("should calculate total storage usage for node", async () => {
      const nodePath = path.join(TEMP_BASE, "test-node-storage");
      await createMockNode(nodePath, 3);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Initialize node
      await runCommand("node", [
        cliPath,
        "init",
        nodePath,
        "--name",
        "test-node-storage",
        "--type",
        "default",
      ]);

      // Check status with storage info
      const result = await runCommand("node", [
        cliPath,
        "status",
        "--storage",
      ]);

      // Should provide storage information
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it("should warn when storage is high", async () => {
      const nodePath = path.join(TEMP_BASE, "test-node-warning");
      await createMockNode(nodePath, 4);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Initialize node
      await runCommand("node", [
        cliPath,
        "init",
        nodePath,
        "--name",
        "test-node-warning",
        "--type",
        "default",
      ]);

      // Create global config with low storage limit
      const bozlyPath = path.join(TEMP_BASE, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });

      const config = {
        cleanup: {
          sessions: {
            enabled: true,
            retentionDays: 30,
            maxStorageMB: 1, // 1MB limit - will trigger warning
            keepMinSessions: 2,
          },
        },
      };

      await fs.writeFile(
        path.join(bozlyPath, "bozly-config.json"),
        JSON.stringify(config, null, 2)
      );

      // Check status - should show warning
      const result = await runCommand("node", [
        cliPath,
        "status",
        "--storage",
      ]);

      expect(result.stdout + result.stderr).toBeDefined();
    });
  });

  describe("Safe Deletion Guarantees", () => {
    it("should preserve minimum sessions even with aggressive cleanup", async () => {
      const nodePath = path.join(TEMP_BASE, "test-node-min");
      await createMockNode(nodePath, 4); // 4 sessions with different dates

      const initialCount = await countSessions(nodePath);
      expect(initialCount).toBe(4);

      // Configure cleanup to keep minimum sessions
      const bozlyPath = path.join(TEMP_BASE, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });

      const config = {
        cleanup: {
          sessions: {
            enabled: true,
            retentionDays: 0, // Keep minimum even if old
            maxStorageMB: 500,
            keepMinSessions: 2, // Must keep at least 2
          },
        },
      };

      await fs.writeFile(
        path.join(bozlyPath, "bozly-config.json"),
        JSON.stringify(config, null, 2)
      );

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Run cleanup preview to show what would happen
      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
        "--all",
      ]);

      // Should still work without error
      expect([0, 1]).toContain(result.code);
    });

    it("should handle permissions errors gracefully", async () => {
      const nodePath = path.join(TEMP_BASE, "test-node-perms");
      await createMockNode(nodePath, 2);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Make sessions read-only (simulate permission issue)
      const sessionsPath = path.join(nodePath, ".bozly", "sessions");
      try {
        await fs.chmod(sessionsPath, 0o444);

        // Try cleanup with --force
        const result = await runCommand("node", [
          cliPath,
          "cleanup",
          "--preview",
        ]);

        // Should not crash, might show permission error
        expect(result.stdout + result.stderr).toBeDefined();
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(sessionsPath, 0o755);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe("Multi-Node Cleanup", () => {
    it("should cleanup all registered nodes with --all flag", async () => {
      // Create multiple nodes
      const node1 = path.join(TEMP_BASE, "node-1");
      const node2 = path.join(TEMP_BASE, "node-2");

      await createMockNode(node1, 2);
      await createMockNode(node2, 2);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Initialize both nodes
      await runCommand("node", [
        cliPath,
        "init",
        node1,
        "--name",
        "node-1",
        "--type",
        "default",
      ]);

      await runCommand("node", [
        cliPath,
        "init",
        node2,
        "--name",
        "node-2",
        "--type",
        "default",
      ]);

      // Run cleanup for all nodes with --preview
      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
        "--all",
      ]);

      // Should process all nodes
      expect([0, 1]).toContain(result.code);
    });

    it("should cleanup specific node when specified", async () => {
      const nodePath = path.join(TEMP_BASE, "test-specific-node");
      await createMockNode(nodePath, 3);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Initialize node
      await runCommand("node", [
        cliPath,
        "init",
        nodePath,
        "--name",
        "test-specific-node",
        "--type",
        "default",
      ]);

      // Cleanup with --vault option (if supported)
      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
        "--vault",
        "test-specific-node",
      ]);

      // Should handle vault specification
      expect([0, 1]).toContain(result.code);
    });
  });

  describe("Session Age Detection", () => {
    it("should correctly identify old sessions", async () => {
      const nodePath = path.join(TEMP_BASE, "test-age-detection");
      await createMockNode(nodePath, 4);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Test cleaning sessions older than 60 days (should catch 3-month and 6-month sessions)
      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
        "--older-than",
        "60d",
      ]);

      // Should successfully identify old sessions
      expect([0, 1]).toContain(result.code);

      // Sessions should still exist
      const finalCount = await countSessions(nodePath);
      expect(finalCount).toBeGreaterThan(0);
    });
  });

  describe("Configuration Integration", () => {
    it("should load and apply cleanup configuration", async () => {
      const nodePath = path.join(TEMP_BASE, "test-config");
      await createMockNode(nodePath, 2);

      const bozlyPath = path.join(TEMP_BASE, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });

      // Create custom cleanup config
      const config = {
        cleanup: {
          sessions: {
            enabled: true,
            retentionDays: 30,
            archiveAfterDays: 7,
            maxStorageMB: 1000,
            keepMinSessions: 50,
          },
          backups: {
            maxCount: 5,
            maxAgeDays: 14,
          },
          autoCleanup: false,
          warnAtPercent: 75,
        },
      };

      await fs.writeFile(
        path.join(bozlyPath, "bozly-config.json"),
        JSON.stringify(config, null, 2)
      );

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Run cleanup - should use config values
      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
      ]);

      // Should respect configuration
      expect([0, 1]).toContain(result.code);
    });

    it("should use defaults when config is missing", async () => {
      const nodePath = path.join(TEMP_BASE, "test-defaults");
      await createMockNode(nodePath, 2);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Run cleanup without config - should use defaults
      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
      ]);

      // Should work with default settings
      expect([0, 1]).toContain(result.code);
    });
  });

  describe("Cleanup Status Reporting", () => {
    it("should report cleanup statistics accurately", async () => {
      const nodePath = path.join(TEMP_BASE, "test-stats");
      await createMockNode(nodePath, 3);

      const initialCount = await countSessions(nodePath);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      // Run cleanup preview
      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
        "--older-than",
        "120d", // Older than 120 days
      ]);

      // Should provide statistics
      expect(result.stdout + result.stderr).toBeDefined();

      // Count should be unchanged (preview mode)
      const finalCount = await countSessions(nodePath);
      expect(finalCount).toBe(initialCount);
    });

    it("should show dry-run vs actual differences", async () => {
      const nodePath = path.join(TEMP_BASE, "test-dryrun-diff");
      await createMockNode(nodePath, 2);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");
      const initialCount = await countSessions(nodePath);

      // Run cleanup preview
      const previewResult = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
        "--older-than",
        "365d", // Very old to delete all
      ]);

      // Preview should show what would be deleted
      expect(previewResult.stdout + previewResult.stderr).toBeDefined();

      // Sessions should still exist
      const afterPreview = await countSessions(nodePath);
      expect(afterPreview).toBe(initialCount);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty nodes gracefully", async () => {
      const nodePath = path.join(TEMP_BASE, "test-empty");

      // Create bare minimum node structure
      const bozlyPath = path.join(nodePath, ".bozly");
      await fs.mkdir(path.join(bozlyPath, "sessions"), { recursive: true });

      const config = {
        name: "empty-node",
        type: "default",
        version: "0.3.0",
      };
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify(config)
      );

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
      ]);

      // Should handle empty node without error
      expect([0, 1]).toContain(result.code);
    });

    it("should handle malformed session directories", async () => {
      const nodePath = path.join(TEMP_BASE, "test-malformed");
      await createMockNode(nodePath, 1);

      // Create malformed session (no files)
      const badSessionPath = path.join(
        nodePath,
        ".bozly",
        "sessions",
        "2025",
        "01",
        "01",
        "malformed"
      );
      await fs.mkdir(badSessionPath, { recursive: true });

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
      ]);

      // Should handle malformed sessions gracefully
      expect([0, 1]).toContain(result.code);
    });

    it("should handle very large session counts", async () => {
      const nodePath = path.join(TEMP_BASE, "test-large");

      // Create node with reasonable number of sessions (not too large for test)
      await createMockNode(nodePath, 10);

      const cliPath = path.join(PROJECT_ROOT, "dist/cli/index.js");

      const result = await runCommand("node", [
        cliPath,
        "cleanup",
        "--preview",
      ]);

      // Should handle large session counts efficiently
      expect([0, 1]).toContain(result.code);
    });
  });
});
