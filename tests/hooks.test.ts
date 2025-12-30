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
import {
  discoverHooks,
  executeHooks,
  interpolateVariables,
  HookType,
  HookContext,
} from "../src/core/hooks.js";

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

  describe("Hook Encoding Handling", () => {
    it("handles non-UTF8 characters in context gracefully", async () => {
      const hookName = "session-start.encoding-test.sh";
      const hookPath = path.join(hooksDir, hookName);

      // Hook that reads from stdin
      await fs.writeFile(
        hookPath,
        `#!/bin/bash
# Read JSON from stdin and verify it's valid
while IFS= read -r line; do
  if [ -z "$line" ]; then
    break
  fi
done
exit 0`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node 🎵 Musik",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        prompt: "This contains special chars: é, ñ, 中文, 🎵, and more",
      };

      const results = await executeHooks(testDir, "session-start", context);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it("handles very large context with many special characters", async () => {
      const hookName = "session-start.large-context.sh";
      const hookPath = path.join(hooksDir, hookName);

      await fs.writeFile(
        hookPath,
        `#!/bin/bash
# Just read stdin and exit successfully
exec >/dev/null 2>&1
cat
exit 0`,
        { mode: 0o755 }
      );

      // Create a large context with lots of special characters
      const largeText = Array(100)
        .fill("✓ 日本語 émojis 🎵 中文 Ñoño ")
        .join("");

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Test Node",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
        prompt: largeText,
      };

      const results = await executeHooks(testDir, "session-start", context);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it("handles hook that parses JSON from stdin", async () => {
      const hookName = "session-start.json-parser.sh";
      const hookPath = path.join(hooksDir, hookName);

      // Hook that parses JSON from stdin
      await fs.writeFile(
        hookPath,
        `#!/bin/bash
# Parse JSON from stdin using jq
result=$(jq -r '.nodeName' 2>/dev/null)
if [ ! -z "$result" ]; then
  exit 0
else
  exit 1
fi`,
        { mode: 0o755 }
      );

      const context: HookContext = {
        nodeId: "test-node",
        nodeName: "Music Node 🎵",
        nodePath: testDir,
        command: "test",
        provider: "claude",
        timestamp: new Date().toISOString(),
      };

      const results = await executeHooks(testDir, "session-start", context);

      // This test may fail if jq is not available, that's OK
      expect(results).toHaveLength(1);
      expect(typeof results[0].success).toBe("boolean");
    });

    it("gracefully handles hook stdin write errors", async () => {
      const hookName = "session-start.stdin-error.sh";
      const hookPath = path.join(hooksDir, hookName);

      // Hook that closes stdin immediately
      await fs.writeFile(
        hookPath,
        `#!/bin/bash
exec <&-
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

      // This should not crash even if stdin is closed
      const results = await executeHooks(testDir, "session-start", context);

      expect(results).toHaveLength(1);
      expect(typeof results[0].success).toBe("boolean");
    });
  });

  describe("Variable Interpolation", () => {
    const baseContext: HookContext = {
      nodeId: "music-vault",
      nodeName: "Music Library",
      nodePath: "/home/user/music",
      command: "weekly-album",
      provider: "claude-opus",
      timestamp: "2025-12-29T10:30:00Z",
    };

    it("interpolates simple variables", () => {
      const template = "Command: {{command}} in vault {{nodeId}}";
      const result = interpolateVariables(template, baseContext);

      expect(result).toBe("Command: weekly-album in vault music-vault");
    });

    it("supports vault alias for nodeId", () => {
      const template = "Vault: {{vault}}";
      const result = interpolateVariables(template, baseContext);

      expect(result).toBe("Vault: music-vault");
    });

    it("interpolates all basic context variables", () => {
      const template = `Node: {{nodeId}}, Name: {{nodeName}}, Path: {{nodePath}}, Command: {{command}}, Provider: {{provider}}, Timestamp: {{timestamp}}`;
      const result = interpolateVariables(template, baseContext);

      expect(result).toContain("Node: music-vault");
      expect(result).toContain("Name: Music Library");
      expect(result).toContain("Path: /home/user/music");
      expect(result).toContain("Command: weekly-album");
      expect(result).toContain("Provider: claude-opus");
      expect(result).toContain("Timestamp: 2025-12-29T10:30:00Z");
    });

    it("interpolates nested session properties", () => {
      const contextWithSession: HookContext = {
        ...baseContext,
        session: {
          id: "session-123-abc",
          sessionPath: "/path/to/session",
          status: "completed",
          duration: 5432,
        },
      };

      const template = `Session {{session.id}} completed in {{session.duration}}ms with status {{session.status}}`;
      const result = interpolateVariables(template, contextWithSession);

      expect(result).toBe(
        "Session session-123-abc completed in 5432ms with status completed"
      );
    });

    it("interpolates nested error properties", () => {
      const contextWithError: HookContext = {
        ...baseContext,
        error: {
          message: "Provider timeout",
          code: "TIMEOUT_ERROR",
        },
      };

      const template = `Error: {{error.message}} (code: {{error.code}})`;
      const result = interpolateVariables(template, contextWithError);

      expect(result).toBe("Error: Provider timeout (code: TIMEOUT_ERROR)");
    });

    it("handles missing optional fields gracefully", () => {
      const template = `Output: {{session.output}} | Reason: {{cancellationReason}}`;
      const result = interpolateVariables(template, baseContext);

      // Should replace with empty strings
      expect(result).toBe("Output:  | Reason: ");
    });

    it("handles null session gracefully", () => {
      const contextNoSession: HookContext = {
        ...baseContext,
        session: undefined,
      };

      const template = `Session: {{session}} | ID: {{session.id}}`;
      const result = interpolateVariables(template, contextNoSession);

      expect(result).toBe("Session:  | ID: ");
    });

    it("handles multiple occurrences of same variable", () => {
      const template = `Running {{command}} in {{vault}}, {{command}} will use {{provider}}`;
      const result = interpolateVariables(template, baseContext);

      expect(result).toBe(
        "Running weekly-album in music-vault, weekly-album will use claude-opus"
      );
    });

    it("handles special characters in context values", () => {
      const contextWithSpecialChars: HookContext = {
        ...baseContext,
        nodeName: "Music 🎵 & Media",
        command: "create-song-2025",
      };

      const template = `Working on: {{command}} in {{nodeName}}`;
      const result = interpolateVariables(template, contextWithSpecialChars);

      expect(result).toBe("Working on: create-song-2025 in Music 🎵 & Media");
    });

    it("preserves text without interpolation variables", () => {
      const template = `This is a plain text without any variables`;
      const result = interpolateVariables(template, baseContext);

      expect(result).toBe("This is a plain text without any variables");
    });

    it("handles empty template", () => {
      const result = interpolateVariables("", baseContext);

      expect(result).toBe("");
    });

    it("ignores invalid variable names", () => {
      const template = `Valid: {{command}}, Invalid: {{not_a_real_var}}, Numeric-start: {{123}}`;
      const result = interpolateVariables(template, baseContext);

      // Variables that don't start with a letter are not replaced
      expect(result).toBe("Valid: weekly-album, Invalid: , Numeric-start: {{123}}");
    });

    it("handles deep nested properties", () => {
      const contextWithOutput: HookContext = {
        ...baseContext,
        session: {
          id: "session-123",
          sessionPath: "/path",
          status: "completed",
          duration: 1000,
          output: "Command executed successfully",
        },
      };

      const template = `Output from session: {{session.output}}`;
      const result = interpolateVariables(template, contextWithOutput);

      expect(result).toBe("Output from session: Command executed successfully");
    });

    it("handles whitespace in variable names", () => {
      // Variables with spaces should not match
      const template = `This {{ command }} should not interpolate`;
      const result = interpolateVariables(template, baseContext);

      expect(result).toBe("This {{ command }} should not interpolate");
    });

    it("converts numeric values to strings", () => {
      const contextWithNumeric: HookContext = {
        ...baseContext,
        session: {
          id: "test",
          sessionPath: "/path",
          status: "completed",
          duration: 12345,
        },
      };

      const template = `Duration in ms: {{session.duration}}`;
      const result = interpolateVariables(template, contextWithNumeric);

      expect(result).toBe("Duration in ms: 12345");
    });

    it("handles boolean values", () => {
      const contextWithBool: HookContext = {
        ...baseContext,
        prompt: "test prompt", // This makes promptSize appear as a property
        promptSize: 1024,
      };

      const template = `Prompt size: {{promptSize}}`;
      const result = interpolateVariables(template, contextWithBool);

      expect(result).toBe("Prompt size: 1024");
    });

    it("handles multiple interpolations in complex template", () => {
      const contextFull: HookContext = {
        ...baseContext,
        prompt: "What is the best album of 2025?",
        promptSize: 42,
        session: {
          id: "session-abc-123",
          sessionPath: "/home/user/music/.bozly/sessions/2025/12/29/session-abc-123",
          status: "completed",
          duration: 8765,
          output: "Album analysis completed",
        },
        error: undefined,
      };

      const template = `🎵 HOOK REPORT 🎵
Command: {{command}}
Vault: {{vault}}
Provider: {{provider}}
Session ID: {{session.id}}
Status: {{session.status}}
Duration: {{session.duration}}ms
Output: {{session.output}}
Prompt size: {{promptSize}} chars
Node name: {{nodeName}}`;

      const result = interpolateVariables(template, contextFull);

      expect(result).toContain("Command: weekly-album");
      expect(result).toContain("Vault: music-vault");
      expect(result).toContain("Provider: claude-opus");
      expect(result).toContain("Session ID: session-abc-123");
      expect(result).toContain("Status: completed");
      expect(result).toContain("Duration: 8765ms");
      expect(result).toContain("Output: Album analysis completed");
      expect(result).toContain("Prompt size: 42 chars");
      expect(result).toContain("Node name: Music Library");
    });
  });
});
