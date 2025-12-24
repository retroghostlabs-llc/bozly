/**
 * Hook System Module
 *
 * Provides hook execution for node lifecycle events.
 * Hooks are shell scripts or programs that run at specific moments:
 * - session-start: Before command loading
 * - pre-execution: Before AI call (prompt ready)
 * - post-execution: After AI succeeds
 * - session-end: After session recording
 * - on-error: When execution fails
 * - on-cancel: When user interrupts (Ctrl+C)
 *
 * @module core/hooks
 */

import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { logger } from "./logger.js";
import { HookType, HookMetadata, HookContext, HookResult } from "./types.js";

/**
 * Discover all hooks in a directory
 * Hooks follow naming pattern: {hookType}.{name}.{ext}
 *
 * Examples:
 * - session-start.show-tasks.sh
 * - pre-execution.validate-prompt.js
 * - on-error.alert-slack.sh
 */
export async function discoverHooks(hooksPath: string): Promise<HookMetadata[]> {
  const hooks: HookMetadata[] = [];

  try {
    const files = await fs.readdir(hooksPath);

    for (const file of files) {
      // Skip hidden files and directories
      if (file.startsWith(".")) {
        continue;
      }

      const parsed = parseHookFilename(file);
      if (!parsed) {
        continue;
      }

      const fullPath = path.join(hooksPath, file);
      const fileStat = await fs.stat(fullPath);

      if (!fileStat.isFile()) {
        continue;
      }

      hooks.push({
        name: parsed.name,
        type: parsed.type,
        file: fullPath,
        enabled: true, // TODO: Support enabling/disabling via comments in hook file
        timeout: 30000, // Default 30 second timeout
      });

      await logger.debug("Discovered hook", {
        type: parsed.type,
        name: parsed.name,
        file,
      });
    }

    return hooks;
  } catch (error) {
    // No hooks directory or read failure
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT" ||
      (error as NodeJS.ErrnoException).code === "ENOTDIR"
    ) {
      await logger.debug("No hooks directory found", { hooksPath });
      return [];
    }

    await logger.warn("Failed to discover hooks", {
      hooksPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Execute all hooks of a specific type for a node
 * Runs hooks sequentially with error isolation (failures don't break command)
 */
export async function executeHooks(
  nodePath: string,
  hookType: HookType,
  context: HookContext
): Promise<HookResult[]> {
  const hooksPath = path.join(nodePath, ".bozly", "hooks");
  const hooks = await discoverHooks(hooksPath);
  const matchingHooks = hooks.filter((h) => h.type === hookType && h.enabled);

  if (matchingHooks.length === 0) {
    await logger.debug(`No ${hookType} hooks to execute`, {
      nodePath,
    });
    return [];
  }

  await logger.info(`Executing ${hookType} hooks`, {
    count: matchingHooks.length,
    nodePath,
  });

  const results: HookResult[] = [];

  for (const hook of matchingHooks) {
    try {
      const result = await executeHook(hook, context);
      results.push(result);
    } catch (error) {
      // Log but don't fail (hook isolation principle)
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.warn(`Hook execution failed`, {
        hookName: hook.name,
        hookType,
        error: errorMsg,
      });

      results.push({
        hookName: hook.name,
        success: false,
        duration: 0,
        error: errorMsg,
      });
    }
  }

  return results;
}

/**
 * Execute a single hook file
 * Spawns hook as child process with context via environment variables
 */
async function executeHook(hook: HookMetadata, context: HookContext): Promise<HookResult> {
  const startTime = Date.now();

  await logger.debug(`Executing hook: ${hook.name}`, {
    type: hook.type,
    file: hook.file,
  });

  // Build environment variables from context
  const env = buildHookEnvironment(context);

  // Pass full context as JSON via stdin for hooks that need detailed data
  const contextJson = JSON.stringify(context, null, 2);

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let completed = false;
    let timedOut = false;

    // Set timeout to kill process if it runs too long
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
      logger
        .warn(`Hook timeout after ${hook.timeout}ms`, {
          hookName: hook.name,
        })
        .catch(() => {});
    }, hook.timeout ?? 30000);

    // Spawn hook process
    const proc = spawn("bash", [hook.file], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Send context via stdin
    if (proc.stdin) {
      proc.stdin.write(contextJson);
      proc.stdin.end();
    }

    // Capture stdout
    if (proc.stdout) {
      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
    }

    // Capture stderr
    if (proc.stderr) {
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    proc.on("error", (error) => {
      if (completed) {
        return;
      }
      completed = true;
      clearTimeout(timeout);

      reject(
        new Error(`Failed to spawn hook: ${error instanceof Error ? error.message : String(error)}`)
      );
    });

    proc.on("close", (code) => {
      if (completed) {
        return;
      }
      completed = true;
      clearTimeout(timeout);

      const duration = Date.now() - startTime;
      const success = code === 0 && !timedOut;

      if (success) {
        logger
          .info(`Hook completed: ${hook.name}`, {
            duration: `${duration}ms`,
          })
          .catch(() => {});

        resolve({
          hookName: hook.name,
          success: true,
          duration,
          stdout,
          stderr,
        });
      } else {
        const errorMsg = timedOut
          ? `Hook timeout after ${hook.timeout}ms`
          : `Hook exited with code ${code}`;

        logger
          .warn(`Hook failed: ${hook.name}`, {
            code,
            duration: `${duration}ms`,
            error: errorMsg,
          })
          .catch(() => {});

        resolve({
          hookName: hook.name,
          success: false,
          duration,
          error: errorMsg,
          stdout,
          stderr,
        });
      }
    });
  });
}

/**
 * Parse hook filename to extract type and name
 * Expected format: {hookType}.{name}.{ext}
 *
 * Examples:
 * - session-start.show-tasks.sh → { type: "session-start", name: "show-tasks", extension: "sh" }
 * - pre-execution.validate-prompt.js → { type: "pre-execution", name: "validate-prompt", extension: "js" }
 * - on-error.alert-slack.sh → { type: "on-error", name: "alert-slack", extension: "sh" }
 */
function parseHookFilename(filename: string): {
  type: HookType;
  name: string;
  extension: string;
} | null {
  // Match: {hookType}.{name}.{ext}
  const match = filename.match(
    /^(session-start|pre-execution|post-execution|session-end|on-error|on-cancel)\.(.+)\.([a-z0-9]+)$/i
  );

  if (!match) {
    return null;
  }

  const [, type, name, ext] = match;

  return {
    type: type as HookType,
    name,
    extension: ext,
  };
}

/**
 * Build environment variables from hook context
 * All hooks receive basic context, specific hooks receive additional variables
 */
function buildHookEnvironment(context: HookContext): Record<string, string> {
  const env: Record<string, string> = {
    // Standard metadata
    BOZLY_HOOK_TYPE: context.provider,
    BOZLY_NODE_ID: context.nodeId,
    BOZLY_NODE_NAME: context.nodeName,
    BOZLY_NODE_PATH: context.nodePath,
    BOZLY_COMMAND: context.command,
    BOZLY_PROVIDER: context.provider,
    BOZLY_TIMESTAMP: context.timestamp,
  };

  // Prompt data (for pre-execution, post-execution, session-end)
  if (context.prompt !== undefined) {
    env.BOZLY_PROMPT_SIZE = String(context.promptSize ?? 0);
  }

  // Session data (for post-execution, session-end, on-error)
  if (context.session) {
    env.BOZLY_SESSION_ID = context.session.id;
    env.BOZLY_SESSION_PATH = context.session.sessionPath;
    env.BOZLY_STATUS = context.session.status;
    env.BOZLY_DURATION_MS = String(context.session.duration);

    if (context.session.output) {
      env.BOZLY_OUTPUT_SIZE = String(context.session.output.length);
    }
  }

  // Error data (for on-error)
  if (context.error) {
    env.BOZLY_ERROR_MESSAGE = context.error.message;
    env.BOZLY_ERROR_CODE = context.error.code;
  }

  // Cancellation data (for on-cancel)
  if (context.cancellationReason) {
    env.BOZLY_CANCEL_REASON = context.cancellationReason;
  }

  return env;
}

/**
 * Export barrel
 */
export type { HookType, HookMetadata, HookContext, HookResult };
