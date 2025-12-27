import { spawn } from "child_process";
import axios from "axios";

/**
 * Spawn the BOZLY API server in background
 */
export function spawnAPIServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const server = spawn("bozly", ["serve"], {
        detached: true,
        stdio: "ignore",
      });

      // Unref allows the parent process to exit even if child is still running
      server.unref();

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Wait for API server to be healthy
 */
export async function waitForAPIServer(
  apiUrl: string,
  maxAttempts: number = 30,
  delayMs: number = 200
): Promise<boolean> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      await axios.get(`${apiUrl}/health`, { timeout: 2000 });
      return true;
    } catch {
      // Continue waiting
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return false;
}
