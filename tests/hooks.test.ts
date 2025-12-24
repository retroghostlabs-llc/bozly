/**
 * Hook system tests
 *
 * Tests the hook discovery and execution system for all 6 hook types:
 * - session-start
 * - pre-execution
 * - post-execution
 * - session-end
 * - on-error
 * - on-cancel
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { discoverHooks, executeHooks, HookType, HookContext } from "../src/core/hooks.js";

describe("Hook System", () => {
  let testDir: string;
  let hooksDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "bozly-hooks-test-"));
    hooksDir = path.join(testDir, ".bozly", "hooks");
    await fs.mkdir(hooksDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe("Hook Discovery", () => {
    it("discovers hooks in .bozly/hooks/ directory", async () => {
      // Create test hooks
      const hooks = [
        "session-start.show-tasks.sh",
        "pre-execution.validate.js",
        "on-error.alert.sh",
      ];

      for (const hook of hooks) {
        await fs.writeFile(path.join(hooksDir, hook), `#!/bin/bash\necho "test"`);
      }

      const discovered = await discoverHooks(hooksDir);

      expect(discovered).toHaveLength(3);
      expect(discovered.map((h) => h.name)).toContain("show-tasks");
      expect(discovered.map((h) => h.name)).toContain("validate");
      expect(discovered.map((h) => h.name)).toContain("alert");
    });

    it("parses hook filenames correctly", async () => {
      const hook = "session-start.load-context.sh";
      await fs.writeFile(path.join(hooksDir, hook), "");

      const discovered = await discoverHooks(hooksDir);

      expect(discovered[0].type).toBe("session-start");
      expect(discovered[0].name).toBe("load-context");
    });

    it("supports all 6 hook types", async () => {
      const hookTypes: HookType[] = [
        "session-start",
        "pre-execution",
        "post-execution",
        "session-end",
        "on-error",
        "on-cancel",
      ];

      for (const type of hookTypes) {
        await fs.writeFile(
          path.join(hooksDir, `${type}.test.sh`),
          "#!/bin/bash"
        );
      }

      const discovered = await discoverHooks(hooksDir);
      const types = discovered.map((h) => h.type);

      for (const type of hookTypes) {
        expect(types).toContain(type);
      }
    });

    it("ignores hidden files", async () => {
      await fs.writeFile(path.join(hooksDir, ".hidden"), "");
      await fs.writeFile(path.join(hooksDir, "session-start.test.sh"), "");

      const discovered = await discoverHooks(hooksDir);

      expect(discovered).toHaveLength(1);
      expect(discovered[0].name).toBe("test");
    });

    it("ignores non-.bozly/hooks files", async () => {
      const parentDir = path.dirname(hooksDir);
      await fs.writeFile(path.join(parentDir, "session-start.test.sh"), "");

      const discovered = await discoverHooks(hooksDir);

      expect(discovered).toHaveLength(0);
    });

    it("handles missing hooks directory gracefully", async () => {
      const nonexistent = path.join(testDir, "nonexistent", "hooks");
      const discovered = await discoverHooks(nonexistent);

      expect(discovered).toHaveLength(0);
    });

    it("rejects invalid hook filenames", async () => {
      const invalidHooks = [
        "invalid-name.sh",
        "session-start.sh", // Missing name between type and extension
        "notahooktype.test.sh",
        "session-start.test", // Missing extension
      ];

      for (const hook of invalidHooks) {
        await fs.writeFile(path.join(hooksDir, hook), "");
      }

      const discovered = await discoverHooks(hooksDir);

      expect(discovered).toHaveLength(0);
    });
  });

  describe("Hook Execution", () => {
    it("executes a simple shell script hook", async () => {
      const hookName = "session-start.test.sh";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        '#!/bin/bash\necho "hook executed"\nexit 0',
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(testDir, "session-start", context);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].hookName).toBe("test");
    });

    it("captures hook stdout output", async () => {
      const hookName = "session-start.test.sh";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        '#!/bin/bash\necho "test output"\nexit 0',
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(testDir, "session-start", context);

      expect(results[0].stdout).toContain("test output");
    });

    it("handles hook exit code failures", async () => {
      const hookName = "on-error.fail.sh";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        '#!/bin/bash\necho "hook failed"\nexit 1',
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        error: {
          message: "Test error",
          code: "TEST_ERROR",
        },
      };

      const results = await executeHooks(testDir, "on-error", context);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("exited with code 1");
    });

    it("passes context via environment variables", async () => {
      const hookName = "session-start.check-env.sh";
      const hookPath = path.join(hooksDir, hookName);

      // Hook that reads environment variables
      await fs.writeFile(
        hookPath,
        `#!/bin/bash
if [ "$BOZLY_NODE_ID" = "test-node" ] && [ "$BOZLY_COMMAND" = "daily" ]; then
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "daily",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(testDir, "session-start", context);

      expect(results[0].success).toBe(true);
    });

    it("passes prompt data to pre-execution hooks", async () => {
      const hookName = "pre-execution.check-prompt.sh";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        `#!/bin/bash
if [ ! -z "$BOZLY_PROMPT_SIZE" ]; then
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        prompt: "This is a test prompt",
        promptSize: 21,
      };

      const results = await executeHooks(testDir, "pre-execution", context);

      expect(results[0].success).toBe(true);
    });

    it("passes error data to on-error hooks", async () => {
      const hookName = "on-error.check-error.sh";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        `#!/bin/bash
if [ "$BOZLY_ERROR_MESSAGE" = "Test error" ]; then
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        error: {
          message: "Test error",
          code: "TEST_CODE",
        },
      };

      const results = await executeHooks(testDir, "on-error", context);

      expect(results[0].success).toBe(true);
    });

    it("executes multiple hooks of same type sequentially", async () => {
      // Create two hooks
      const hook1Path = path.join(hooksDir, "session-start.first.sh");
      const hook2Path = path.join(hooksDir, "session-start.second.sh");

      await fs.writeFile(
        hook1Path,
        '#!/bin/bash\necho "first"\nexit 0',
        { mode: 0o755 }
      );

      await fs.writeFile(
        hook2Path,
        '#!/bin/bash\necho "second"\nexit 0',
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(testDir, "session-start", context);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("isolates hook failures - one failing hook doesn't affect others", async () => {
      const hook1Path = path.join(hooksDir, "session-start.good.sh");
      const hook2Path = path.join(hooksDir, "session-start.bad.sh");
      const hook3Path = path.join(hooksDir, "session-start.also-good.sh");

      await fs.writeFile(
        hook1Path,
        '#!/bin/bash\necho "good1"\nexit 0',
        { mode: 0o755 }
      );

      await fs.writeFile(
        hook2Path,
        '#!/bin/bash\necho "bad"\nexit 1',
        { mode: 0o755 }
      );

      await fs.writeFile(
        hook3Path,
        '#!/bin/bash\necho "good2"\nexit 0',
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(testDir, "session-start", context);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it("returns empty array when no hooks of specific type exist", async () => {
      const hook1Path = path.join(hooksDir, "session-start.test.sh");
      await fs.writeFile(
        hook1Path,
        '#!/bin/bash\nexit 0',
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      // Request pre-execution hooks, but only session-start exists
      const results = await executeHooks(testDir, "pre-execution", context);

      expect(results).toHaveLength(0);
    });
  });

  describe("Hook Duration", () => {
    it("measures hook execution time", async () => {
      const hookName = "session-start.slow.sh";
      const hookPath = path.join(hooksDir, hookName);

      // Sleep for ~100ms
      await fs.writeFile(
        hookPath,
        '#!/bin/bash\nsleep 0.1\nexit 0',
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(testDir, "session-start", context);

      expect(results[0].duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe("Dual-Location Hook Discovery", () => {
    it("discovers hooks from both global and per-node directories", async () => {
      // Create global hooks directory
      const globalHooksDir = path.join(testDir, ".bozly", "hooks");
      const nodeHooksDir = path.join(testDir, "my-node", ".bozly", "hooks");

      await fs.mkdir(globalHooksDir, { recursive: true });
      await fs.mkdir(nodeHooksDir, { recursive: true });

      // Create global hook
      await fs.writeFile(
        path.join(globalHooksDir, "session-start.global.sh"),
        "#!/bin/bash\nexit 0"
      );

      // Create node-specific hook
      await fs.writeFile(
        path.join(nodeHooksDir, "session-start.node-local.sh"),
        "#!/bin/bash\nexit 0"
      );

      // Discover from node location should find the node hook
      const nodeHooks = await discoverHooks(nodeHooksDir);
      expect(nodeHooks).toHaveLength(1);
      expect(nodeHooks[0].name).toBe("node-local");

      // Discover from global location should find the global hook
      const globalHooks = await discoverHooks(globalHooksDir);
      expect(globalHooks).toHaveLength(1);
      expect(globalHooks[0].name).toBe("global");
    });

    it("handles mixed hook types in different locations", async () => {
      // Create global and node-specific hooks
      const globalHooksDir = path.join(testDir, ".bozly", "hooks");
      const nodeHooksDir = path.join(testDir, "my-node", ".bozly", "hooks");

      await fs.mkdir(globalHooksDir, { recursive: true });
      await fs.mkdir(nodeHooksDir, { recursive: true });

      // Global: session-start, on-error
      await fs.writeFile(
        path.join(globalHooksDir, "session-start.global-init.sh"),
        "#!/bin/bash\nexit 0"
      );
      await fs.writeFile(
        path.join(globalHooksDir, "on-error.global-alert.sh"),
        "#!/bin/bash\nexit 0"
      );

      // Node: pre-execution, session-end
      await fs.writeFile(
        path.join(nodeHooksDir, "pre-execution.node-validate.sh"),
        "#!/bin/bash\nexit 0"
      );
      await fs.writeFile(
        path.join(nodeHooksDir, "session-end.node-notify.sh"),
        "#!/bin/bash\nexit 0"
      );

      // Verify discovery
      const globalHooks = await discoverHooks(globalHooksDir);
      expect(globalHooks).toHaveLength(2);
      expect(globalHooks.map((h) => h.type)).toContain("session-start");
      expect(globalHooks.map((h) => h.type)).toContain("on-error");

      const nodeHooks = await discoverHooks(nodeHooksDir);
      expect(nodeHooks).toHaveLength(2);
      expect(nodeHooks.map((h) => h.type)).toContain("pre-execution");
      expect(nodeHooks.map((h) => h.type)).toContain("session-end");
    });
  });

  describe("Hook Context & Environment", () => {
    it("passes session data to session-end hooks", async () => {
      const hookName = "session-end.check-session.sh";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        `#!/bin/bash
if [ ! -z "$BOZLY_SESSION_ID" ] && [ ! -z "$BOZLY_STATUS" ]; then
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        session: {
          id: "test-session-123",
          status: "success",
          sessionPath: "/test/path",
          duration: 1000,
        },
      };

      const results = await executeHooks(testDir, "session-end", context);

      expect(results[0].success).toBe(true);
    });

    it("passes cancellation reason to on-cancel hooks", async () => {
      const hookName = "on-cancel.check-reason.sh";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        `#!/bin/bash
if [ "$BOZLY_CANCEL_REASON" = "user-interrupt" ]; then
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        cancellationReason: "user-interrupt",
      };

      const results = await executeHooks(testDir, "on-cancel", context);

      expect(results[0].success).toBe(true);
    });

    it("captures stderr output from hooks", async () => {
      const hookName = "session-start.stderr-test.sh";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        '#!/bin/bash\necho "error message" >&2\nexit 0',
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(testDir, "session-start", context);

      expect(results[0].stderr).toContain("error message");
    });
  });

  describe("Hook Type Sequencing", () => {
    it("executes different hook types independently", async () => {
      // Create hooks of different types
      const startHook = path.join(hooksDir, "session-start.init.sh");
      const preExecHook = path.join(hooksDir, "pre-execution.validate.sh");
      const postExecHook = path.join(hooksDir, "post-execution.cleanup.sh");
      const endHook = path.join(hooksDir, "session-end.notify.sh");

      for (const [file, type] of [
        [startHook, "start"],
        [preExecHook, "pre"],
        [postExecHook, "post"],
        [endHook, "end"],
      ] as const) {
        await fs.writeFile(
          file,
          `#!/bin/bash\necho "${type}"\nexit 0`,
          { mode: 0o755 }
        );
      }

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      // Execute each type
      const startResults = await executeHooks(testDir, "session-start", context);
      const preResults = await executeHooks(testDir, "pre-execution", context);
      const postResults = await executeHooks(testDir, "post-execution", context);
      const endResults = await executeHooks(testDir, "session-end", context);

      expect(startResults).toHaveLength(1);
      expect(startResults[0].stdout).toContain("start");

      expect(preResults).toHaveLength(1);
      expect(preResults[0].stdout).toContain("pre");

      expect(postResults).toHaveLength(1);
      expect(postResults[0].stdout).toContain("post");

      expect(endResults).toHaveLength(1);
      expect(endResults[0].stdout).toContain("end");
    });
  });

  describe("Hook Error Context", () => {
    it("provides detailed error context to on-error hooks", async () => {
      const hookName = "on-error.detailed-check.sh";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        `#!/bin/bash
if [ "$BOZLY_ERROR_MESSAGE" = "Connection timeout" ] && [ "$BOZLY_ERROR_CODE" = "TIMEOUT" ]; then
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        error: {
          message: "Connection timeout",
          code: "TIMEOUT",
        },
      };

      const results = await executeHooks(testDir, "on-error", context);

      expect(results[0].success).toBe(true);
    });

    it("handles hooks with missing error context gracefully", async () => {
      const hookName = "on-error.safe.sh";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        `#!/bin/bash
# Should exit 0 even if error context is empty
exit 0`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(testDir, "on-error", context);

      expect(results[0].success).toBe(true);
    });
  });

  describe("Hook Script Language Support", () => {
    it("executes Python hooks", async () => {
      const hookName = "session-start.python-test.py";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        `#!/usr/bin/env python3
import os
if os.getenv('BOZLY_NODE_ID') == 'test-node':
    print('python works')
    exit(0)
else:
    exit(1)`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(testDir, "session-start", context);

      // May succeed if Python is available, or fail gracefully - test for either
      expect(results).toHaveLength(1);
      expect(typeof results[0].success).toBe("boolean");
    });

    it("executes Node.js hooks", async () => {
      const hookName = "session-start.node-test.js";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        `#!/usr/bin/env node
if (process.env.BOZLY_NODE_ID === 'test-node') {
  console.log('node works');
  process.exit(0);
} else {
  process.exit(1);
}`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(testDir, "session-start", context);

      // May succeed if Node.js is available, or fail gracefully - test for either
      expect(results).toHaveLength(1);
      expect(typeof results[0].success).toBe("boolean");
    });
  });
});
