import { spawn } from "child_process";
import axios from "axios";
import { logger } from "../../../core/logger.js";
import { ConfigManager } from "../../../core/config-manager.js";

/**
 * Spawn the BOZLY API server in background
 */
export function spawnAPIServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const server = spawn("bozly", ["serve", "--no-open"], {
        detached: true,
        stdio: "ignore",
      });

      // Unref allows the parent process to exit even if child is still running
      server.unref();

      // Give server a moment to start
      setTimeout(resolve, 500);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Wait for API server to be healthy
 * Uses configured health check timeout and interval from ConfigManager
 */
export async function waitForAPIServer(
  apiUrl: string,
  maxAttempts?: number,
  delayMs?: number
): Promise<boolean> {
  const config = ConfigManager.getInstance().getServer();
  const actualMaxAttempts = maxAttempts ?? 120;
  const actualDelayMs = delayMs ?? config.healthCheckIntervalMs;
  const healthCheckTimeout = config.healthCheckTimeout;

  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < actualMaxAttempts) {
    try {
      await axios.get(`${apiUrl}/health`, { timeout: healthCheckTimeout });
      return true;
    } catch (error) {
      lastError = error as Error;
      // Continue waiting
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, actualDelayMs));
  }

  // Log the last error for debugging
  if (lastError) {
    await logger.debug(`Server health check failed: ${lastError.message}`, {
      error: lastError.message,
      attempts,
      maxAttempts: actualMaxAttempts,
    });
  }

  return false;
}
