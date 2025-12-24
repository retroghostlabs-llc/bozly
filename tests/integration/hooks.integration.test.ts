/**
 * Integration tests for Hook system
 * Tests hooks within the actual CLI execution flow
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { executeHooks, HookContext } from "../../src/core/hooks.js";

describe("Hooks Integration Tests", () => {
  let testDir: string;
  let nodeDir: string;
  let globalHooksDir: string;
  let nodeHooksDir: string;

  beforeEach(async () => {
    // Create temporary test directories
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "bozly-hooks-int-"));
    nodeDir = path.join(testDir, "test-node");
    globalHooksDir = path.join(testDir, ".bozly", "hooks");
    nodeHooksDir = path.join(nodeDir, ".bozly", "hooks");

    // Create necessary directories
    await fs.mkdir(globalHooksDir, { recursive: true });
    await fs.mkdir(nodeHooksDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe("Complete Hook Lifecycle", () => {
    it("executes all hooks in sequence: session-start -> pre-execution -> post-execution -> session-end", async () => {
      // Create hooks for full lifecycle
      const hooks = {
        "session-start.init.sh": '#!/bin/bash\necho "1-start" && exit 0',
        "pre-execution.validate.sh": '#!/bin/bash\necho "2-pre" && exit 0',
        "post-execution.process.sh": '#!/bin/bash\necho "3-post" && exit 0',
        "session-end.finalize.sh": '#!/bin/bash\necho "4-end" && exit 0',
      };

      // Create all hooks
      for (const [name, content] of Object.entries(hooks)) {
        const hookPath = path.join(nodeHooksDir, name);
        await fs.writeFile(hookPath, content, { mode: 0o755 });
      }

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: nodeDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      // Execute each hook type in sequence
      const startResults = await executeHooks(nodeDir, "session-start", context);
      expect(startResults).toHaveLength(1);
      expect(startResults[0].success).toBe(true);
      expect(startResults[0].stdout).toContain("1-start");

      const preResults = await executeHooks(nodeDir, "pre-execution", context);
      expect(preResults).toHaveLength(1);
      expect(preResults[0].success).toBe(true);
      expect(preResults[0].stdout).toContain("2-pre");

      const postResults = await executeHooks(nodeDir, "post-execution", context);
      expect(postResults).toHaveLength(1);
      expect(postResults[0].success).toBe(true);
      expect(postResults[0].stdout).toContain("3-post");

      const endResults = await executeHooks(nodeDir, "session-end", context);
      expect(endResults).toHaveLength(1);
      expect(endResults[0].success).toBe(true);
      expect(endResults[0].stdout).toContain("4-end");
    });

    it("handles errors gracefully when on-error hooks are triggered", async () => {
      // Create on-error hook
      const onErrorHook = path.join(
        nodeHooksDir,
        "on-error.handle-error.sh"
      );
      await fs.writeFile(
        onErrorHook,
        `#!/bin/bash
if [ ! -z "$BOZLY_ERROR_MESSAGE" ]; then
  echo "error-handled"
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: nodeDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        error: {
          message: "AI provider timeout",
          code: "TIMEOUT",
        },
      };

      const results = await executeHooks(nodeDir, "on-error", context);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].stdout).toContain("error-handled");
    });

    it("handles on-cancel hooks when user interrupts", async () => {
      // Create on-cancel hook
      const onCancelHook = path.join(nodeHooksDir, "on-cancel.cleanup.sh");
      await fs.writeFile(
        onCancelHook,
        `#!/bin/bash
if [ "$BOZLY_CANCEL_REASON" = "user-interrupt" ]; then
  echo "cleanup-done"
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: nodeDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        cancellationReason: "user-interrupt",
      };

      const results = await executeHooks(nodeDir, "on-cancel", context);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].stdout).toContain("cleanup-done");
    });
  });

  describe("Multi-Hook Orchestration", () => {
    it("executes multiple hooks of the same type in order", async () => {
      // Create 3 session-start hooks
      const hooks = {
        "session-start.first.sh": '#!/bin/bash\necho "first" && exit 0',
        "session-start.second.sh": '#!/bin/bash\necho "second" && exit 0',
        "session-start.third.sh": '#!/bin/bash\necho "third" && exit 0',
      };

      for (const [name, content] of Object.entries(hooks)) {
        const hookPath = path.join(nodeHooksDir, name);
        await fs.writeFile(hookPath, content, { mode: 0o755 });
      }

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: nodeDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(nodeDir, "session-start", context);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);

      // Verify all hooks ran
      const outputs = results.map((r) => r.stdout);
      expect(outputs.some((o) => o.includes("first"))).toBe(true);
      expect(outputs.some((o) => o.includes("second"))).toBe(true);
      expect(outputs.some((o) => o.includes("third"))).toBe(true);
    });

    it("continues executing hooks even if one fails", async () => {
      // Create mixed success/failure hooks
      const hooks = {
        "session-start.good1.sh": '#!/bin/bash\necho "success1" && exit 0',
        "session-start.bad.sh": '#!/bin/bash\necho "failure" && exit 1',
        "session-start.good2.sh": '#!/bin/bash\necho "success2" && exit 0',
      };

      for (const [name, content] of Object.entries(hooks)) {
        const hookPath = path.join(nodeHooksDir, name);
        await fs.writeFile(hookPath, content, { mode: 0o755 });
      }

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: nodeDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(nodeDir, "session-start", context);

      expect(results).toHaveLength(3);
      // Verify that 2 succeeded and 1 failed (order may vary)
      const successes = results.filter((r) => r.success).length;
      const failures = results.filter((r) => !r.success).length;
      expect(successes).toBe(2);
      expect(failures).toBe(1);

      // Verify the specific hooks were executed
      const names = results.map((r) => r.hookName).sort();
      expect(names).toEqual(["bad", "good1", "good2"]);

      // Verify the failed one is the "bad" hook
      const badResult = results.find((r) => r.hookName === "bad");
      expect(badResult?.success).toBe(false);
    });
  });

  describe("Hook Context Passing", () => {
    it("passes detailed context to hooks via environment variables", async () => {
      // Create hook that validates multiple context variables
      const hookPath = path.join(nodeHooksDir, "session-start.context-test.sh");
      await fs.writeFile(
        hookPath,
        `#!/bin/bash
# Verify all standard context variables are present
if [ "$BOZLY_NODE_ID" = "music-node" ] && \\
   [ "$BOZLY_COMMAND" = "daily-brief" ] && \\
   [ "$BOZLY_PROVIDER" = "claude" ] && \\
   [ ! -z "$BOZLY_TIMESTAMP" ]; then
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "music-node",
        nodeName: "Music Vault",
        nodePath: nodeDir,
        command: "daily-brief",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(nodeDir, "session-start", context);

      expect(results[0].success).toBe(true);
    });

    it("provides prompt context to pre-execution hooks", async () => {
      const hookPath = path.join(nodeHooksDir, "pre-execution.prompt-check.sh");
      await fs.writeFile(
        hookPath,
        `#!/bin/bash
if [ ! -z "$BOZLY_PROMPT_SIZE" ]; then
  echo "Prompt size: $BOZLY_PROMPT_SIZE"
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: nodeDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        prompt: "This is a test prompt for validation",
        promptSize: 36,
      };

      const results = await executeHooks(nodeDir, "pre-execution", context);

      expect(results[0].success).toBe(true);
      expect(results[0].stdout).toContain("Prompt size: 36");
    });

    it("provides session context to post-execution hooks", async () => {
      const hookPath = path.join(
        nodeHooksDir,
        "post-execution.session-check.sh"
      );
      await fs.writeFile(
        hookPath,
        `#!/bin/bash
if [ ! -z "$BOZLY_SESSION_ID" ] && [ ! -z "$BOZLY_STATUS" ]; then
  echo "Session $BOZLY_SESSION_ID with status $BOZLY_STATUS"
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: nodeDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        session: {
          id: "sess-abc123",
          status: "success",
          sessionPath: "/path/to/session",
          duration: 2500,
        },
      };

      const results = await executeHooks(nodeDir, "post-execution", context);

      expect(results[0].success).toBe(true);
      expect(results[0].stdout).toContain("sess-abc123");
      expect(results[0].stdout).toContain("success");
    });
  });

  describe("Hook Failure Handling", () => {
    it("reports hook failures without breaking execution", async () => {
      // Create hooks with failures
      const hookPath = path.join(nodeHooksDir, "session-start.fail.sh");
      await fs.writeFile(hookPath, '#!/bin/bash\nexit 42', { mode: 0o755 });

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: nodeDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(nodeDir, "session-start", context);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("exited with code 42");
    });

    it("captures both stdout and stderr from failed hooks", async () => {
      const hookPath = path.join(
        nodeHooksDir,
        "session-start.verbose-fail.sh"
      );
      await fs.writeFile(
        hookPath,
        `#!/bin/bash
echo "Standard output message"
echo "Standard error message" >&2
exit 1`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: nodeDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(nodeDir, "session-start", context);

      expect(results[0].success).toBe(false);
      expect(results[0].stdout).toContain("Standard output message");
      expect(results[0].stderr).toContain("Standard error message");
    });
  });

  describe("Hook Performance", () => {
    it("measures hook execution duration accurately", async () => {
      // Create hook that takes ~200ms
      const hookPath = path.join(nodeHooksDir, "session-start.slow.sh");
      await fs.writeFile(
        hookPath,
        '#!/bin/bash\nsleep 0.2\nexit 0',
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: nodeDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(nodeDir, "session-start", context);

      expect(results[0].success).toBe(true);
      // Duration should be ~200ms (with some tolerance)
      expect(results[0].duration).toBeGreaterThanOrEqual(150);
      expect(results[0].duration).toBeLessThan(500);
    });

    it("executes multiple hooks efficiently", async () => {
      // Create 5 fast hooks
      for (let i = 0; i < 5; i++) {
        const hookPath = path.join(nodeHooksDir, `session-start.hook${i}.sh`);
        await fs.writeFile(
          hookPath,
          `#!/bin/bash\necho "hook${i}"\nexit 0`,
          { mode: 0o755 }
        );
      }

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: nodeDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const startTime = Date.now();
      const results = await executeHooks(nodeDir, "session-start", context);
      const totalDuration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.success)).toBe(true);
      // All 5 hooks should execute in less than 5 seconds
      expect(totalDuration).toBeLessThan(5000);
    });
  });
});
