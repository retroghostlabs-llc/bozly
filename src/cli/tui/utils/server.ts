import { spawn } from "child_process";
import axios from "axios";
import { logger } from "../../../core/logger.js";

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
 * Default: 120 attempts × 500ms = 60 seconds timeout
 */
export async function waitForAPIServer(
  apiUrl: string,
  maxAttempts: number = 120,
  delayMs: number = 500
): Promise<boolean> {
  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < maxAttempts) {
    try {
      await axios.get(`${apiUrl}/health`, { timeout: 2000 });
      return true;
    } catch (error) {
      lastError = error as Error;
      // Continue waiting
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // Log the last error for debugging
  if (lastError) {
    await logger.debug(`Server health check failed: ${lastError.message}`, {
      error: lastError.message,
      attempts,
      maxAttempts,
    });
  }

  return false;
}
