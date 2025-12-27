import { execSync } from "child_process";
import axios from "axios";

/**
 * Find BOZLY server process by checking health endpoint
 */
export async function findServerPID(port: number = 3847): Promise<number | null> {
  try {
    // Try to connect to the health endpoint
    await axios.get(`http://localhost:${port}/api/health`, { timeout: 1000 });

    // If we can connect, try to find the PID using lsof
    try {
      const output = execSync(`lsof -i :${port} -t`, { encoding: "utf-8" });
      const pid = parseInt(output.trim().split("\n")[0], 10);
      return isNaN(pid) ? null : pid;
    } catch {
      return null; // lsof might not be available
    }
  } catch {
    // Server not running
    return null;
  }
}

/**
 * Kill BOZLY server by PID
 */
export function killServerByPID(pid: number): boolean {
  try {
    process.kill(pid, "SIGTERM");
    // Give it a moment to shut down gracefully
    return true;
  } catch {
    return false;
  }
}

/**
 * Kill BOZLY server on specific port
 */
export async function killServerOnPort(port: number = 3847): Promise<boolean> {
  try {
    const pid = await findServerPID(port);
    if (!pid) {
      return false;
    }

    try {
      process.kill(pid, "SIGTERM");
      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return true;
    } catch {
      // If SIGTERM doesn't work, try SIGKILL
      try {
        process.kill(pid, "SIGKILL");
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

/**
 * Check if server is running and healthy
 */
export async function isServerHealthy(port: number = 3847): Promise<boolean> {
  try {
    await axios.get(`http://localhost:${port}/api/health`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
