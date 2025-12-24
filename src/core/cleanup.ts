/**
 * BOZLY cleanup system - Session retention, archival, and disk management
 */

import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "./logger.js";
import { CleanupConfig, CleanupResult, StorageUsage, NodeStorageInfo } from "./types.js";

const execAsync = promisify(exec);

/**
 * Default cleanup configuration
 */
export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  sessions: {
    enabled: true,
    retentionDays: 90,
    archiveAfterDays: 30,
    maxStorageMB: 500,
    keepMinSessions: 100,
  },
  backups: {
    maxCount: 10,
    maxAgeDays: 30,
  },
  autoCleanup: true,
  warnAtPercent: 80,
};

/**
 * Get cleanup configuration from global config
 */
export async function getCleanupConfig(globalConfigPath: string): Promise<CleanupConfig> {
  try {
    const configPath = path.join(globalConfigPath, "bozly-config.json");
    const configContent = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configContent);

    // Merge with defaults
    return {
      sessions: {
        ...DEFAULT_CLEANUP_CONFIG.sessions,
        ...config.cleanup?.sessions,
      },
      backups: {
        ...DEFAULT_CLEANUP_CONFIG.backups,
        ...config.cleanup?.backups,
      },
      autoCleanup: config.cleanup?.autoCleanup ?? DEFAULT_CLEANUP_CONFIG.autoCleanup,
      warnAtPercent: config.cleanup?.warnAtPercent ?? DEFAULT_CLEANUP_CONFIG.warnAtPercent,
    };
  } catch {
    return DEFAULT_CLEANUP_CONFIG;
  }
}

/**
 * Calculate size of a directory in bytes
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`du -sb "${dirPath}" 2>/dev/null`);
    const size = parseInt(stdout.split("\t")[0], 10);
    return isNaN(size) ? 0 : size;
  } catch {
    return 0;
  }
}

/**
 * Convert bytes to MB
 */
function bytesToMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

/**
 * Parse duration string (e.g., "90d", "6m", "1y")
 */
export function parseDuration(durationStr: string): number {
  const match = durationStr.match(/^(\d+)([dmwy])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${durationStr}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value;
    case "m":
      return value * 30;
    case "w":
      return value * 7;
    case "y":
      return value * 365;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * Get session age in days
 */
function getSessionAge(sessionDate: string): number {
  const sessionTime = new Date(sessionDate).getTime();
  const now = Date.now();
  return Math.floor((now - sessionTime) / (1000 * 60 * 60 * 24));
}

/**
 * List all session directories in a node
 */
async function listSessions(
  nodePath: string
): Promise<Array<{ path: string; dateString: string; sessionId: string; age: number }>> {
  try {
    const sessionsDir = path.join(nodePath, ".bozly", "sessions");
    const entries: Array<{ path: string; dateString: string; sessionId: string; age: number }> = [];

    try {
      await fs.access(sessionsDir);
    } catch {
      return [];
    }

    // Iterate through year directories
    const years = await fs.readdir(sessionsDir);
    for (const year of years) {
      const yearPath = path.join(sessionsDir, year);
      if (!year.match(/^\d{4}$/)) {
        continue;
      }

      const months = await fs.readdir(yearPath).catch(() => []);
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        if (!month.match(/^\d{2}$/)) {
          continue;
        }

        const days = await fs.readdir(monthPath).catch(() => []);
        for (const day of days) {
          const dayPath = path.join(monthPath, day);
          if (!day.match(/^\d{2}$/)) {
            continue;
          }

          const sessions = await fs.readdir(dayPath).catch(() => []);
          for (const sessionId of sessions) {
            const sessionPath = path.join(dayPath, sessionId);
            const stat = await fs.stat(sessionPath).catch(() => null);

            if (stat && stat.isDirectory()) {
              const dateString = `${year}-${month}-${day}`;
              const age = getSessionAge(dateString);

              entries.push({
                path: sessionPath,
                dateString,
                sessionId,
                age,
              });
            }
          }
        }
      }
    }

    return entries.sort((a, b) => a.age - b.age); // Oldest first
  } catch (error) {
    await logger.debug("Error listing sessions", { error });
    return [];
  }
}

/**
 * Calculate storage usage for a node
 */
export async function calculateNodeStorage(
  nodePath: string,
  maxStorageMB: number
): Promise<StorageUsage> {
  try {
    const sessionsDir = path.join(nodePath, ".bozly", "sessions");
    const backupsDir = path.join(nodePath, ".bozly", "backups");

    // Get total sizes
    let sessionsSizeBytes = 0;
    let backupsSizeBytes = 0;

    try {
      sessionsSizeBytes = await getDirectorySize(sessionsDir);
    } catch {
      // Sessions dir may not exist yet
    }

    try {
      backupsSizeBytes = await getDirectorySize(backupsDir);
    } catch {
      // Backups dir may not exist yet
    }

    // Count active vs archived sessions
    const sessions = await listSessions(nodePath);
    const archiveAfterDays = 30; // Match default

    let activeSessions = 0;
    let activeSessionsBytes = 0;
    let archivedSessions = 0;
    let archivedSessionsBytes = 0;

    for (const session of sessions) {
      if (session.age > archiveAfterDays) {
        archivedSessions++;
        // Estimate archived size (compressed ~70%)
        archivedSessionsBytes += Math.round(sessionsSizeBytes * 0.3);
      } else {
        activeSessions++;
        activeSessionsBytes += Math.round(sessionsSizeBytes / sessions.length);
      }
    }

    const totalSizeBytes = sessionsSizeBytes + backupsSizeBytes;
    const totalSizeMB = bytesToMB(totalSizeBytes);
    const percentUsed = Math.round((totalSizeMB / maxStorageMB) * 100);

    return {
      sessionsSizeMB: bytesToMB(sessionsSizeBytes),
      activeSessions: {
        count: activeSessions,
        sizeMB: bytesToMB(activeSessionsBytes),
      },
      archivedSessions: {
        count: archivedSessions,
        sizeMB: bytesToMB(archivedSessionsBytes),
      },
      backupsSizeMB: bytesToMB(backupsSizeBytes),
      totalSizeMB,
      percentUsed,
      maxStorageMB,
    };
  } catch (error) {
    await logger.debug("Error calculating storage", { error });

    return {
      sessionsSizeMB: 0,
      activeSessions: { count: 0, sizeMB: 0 },
      archivedSessions: { count: 0, sizeMB: 0 },
      backupsSizeMB: 0,
      totalSizeMB: 0,
      percentUsed: 0,
      maxStorageMB,
    };
  }
}

/**
 * Get storage info for a single node
 */
export async function getNodeStorageInfo(
  nodeId: string,
  nodeName: string,
  nodePath: string,
  maxStorageMB: number,
  retentionDays: number
): Promise<NodeStorageInfo> {
  const usage = await calculateNodeStorage(nodePath, maxStorageMB);
  const sessions = await listSessions(nodePath);

  // Count sessions that can be cleaned
  const oldSessions = sessions.filter((s) => s.age > retentionDays).length;
  const archivedSessions = sessions.filter((s) => s.age > 30 && s.age <= retentionDays).length;

  return {
    nodeId,
    nodeName,
    nodePath,
    usage,
    canClean: {
      oldSessions,
      archivedSessions,
    },
  };
}

/**
 * Delete a session directory
 */
async function deleteSession(sessionPath: string): Promise<void> {
  try {
    await fs.rm(sessionPath, { recursive: true, force: true });
  } catch (error) {
    await logger.warn("Failed to delete session", {
      sessionPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Delete backup directory
 */
async function deleteBackup(backupPath: string): Promise<void> {
  try {
    await fs.rm(backupPath, { recursive: true, force: true });
  } catch (error) {
    await logger.warn("Failed to delete backup", {
      backupPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Perform cleanup on a node
 */
export async function cleanupNode(
  nodePath: string,
  options: {
    olderThan?: number; // Days
    archiveOnly?: boolean;
    force?: boolean;
    dryRun?: boolean;
    keepMinSessions?: number;
  } = {}
): Promise<CleanupResult> {
  const startTime = Date.now();

  try {
    const { olderThan = 90, archiveOnly = false, dryRun = false, keepMinSessions = 100 } = options;

    const sessions = await listSessions(nodePath);

    let sessionsDeleted = 0;
    let sessionsArchived = 0;
    let spaceFreedMB = 0;

    // Filter sessions to clean
    const sessionsToDelete = sessions
      .filter((s) => s.age > olderThan)
      .slice(0, Math.max(0, sessions.length - keepMinSessions));

    for (const session of sessionsToDelete) {
      if (archiveOnly) {
        // TODO: Implement archival in Phase 2
        sessionsArchived++;
      } else {
        const sessionSize = await getDirectorySize(session.path);
        spaceFreedMB += bytesToMB(sessionSize);

        if (!dryRun) {
          await deleteSession(session.path);
        }
        sessionsDeleted++;
      }
    }

    // Clean backups if not archiveOnly
    let backupsDeleted = 0;
    if (!archiveOnly) {
      const backupsDir = path.join(nodePath, ".bozly", "backups");
      try {
        const backups = (await fs.readdir(backupsDir)).sort();

        // Keep only last 10
        if (backups.length > 10) {
          const toDelete = backups.slice(0, backups.length - 10);
          for (const backup of toDelete) {
            const backupPath = path.join(backupsDir, backup);
            const backupSize = await getDirectorySize(backupPath);
            spaceFreedMB += bytesToMB(backupSize);

            if (!dryRun) {
              await deleteBackup(backupPath);
            }
            backupsDeleted++;
          }
        }
      } catch {
        // Backups dir may not exist
      }
    }

    const duration = Date.now() - startTime;

    return {
      sessionsDeleted,
      sessionsArchived,
      backupsDeleted,
      spaceFreedMB: Math.round(spaceFreedMB * 100) / 100,
      duration,
      dryRun,
    };
  } catch (error) {
    await logger.error("Cleanup failed", {
      nodePath,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      sessionsDeleted: 0,
      sessionsArchived: 0,
      backupsDeleted: 0,
      spaceFreedMB: 0,
      duration: Date.now() - startTime,
      dryRun: options.dryRun ?? false,
    };
  }
}

/**
 * Check if cleanup is needed based on storage usage
 */
export async function shouldAutoCleanup(nodePath: string, config: CleanupConfig): Promise<boolean> {
  if (!config.autoCleanup) {
    return false;
  }

  const usage = await calculateNodeStorage(nodePath, config.sessions.maxStorageMB);
  return usage.percentUsed > 95; // Critical threshold
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(durationStr: string): string {
  const match = durationStr.match(/^(\d+)([dmwy])$/);
  if (!match) {
    return durationStr;
  }

  const value = match[1];
  const unit = match[2];

  const units: Record<string, string> = {
    d: "day",
    w: "week",
    m: "month",
    y: "year",
  };

  const unitName = units[unit];
  const plural = parseInt(value, 10) > 1 ? "s" : "";

  return `${value} ${unitName}${plural}`;
}
