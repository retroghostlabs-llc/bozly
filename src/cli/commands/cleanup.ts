/**
 * bozly cleanup - Session and backup cleanup with retention policies
 */

import { Command } from "commander";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";
import { getRegistry } from "../../core/registry.js";
import {
  cleanupNode,
  getCleanupConfig,
  parseDuration,
  formatDuration,
  getNodeStorageInfo,
} from "../../core/cleanup.js";
import { CleanupConfig, NodeStorageInfo } from "../../core/types.js";
import {
  infoBox,
  warningBox,
  errorBox,
  successBox,
  formatStatsTable,
  theme,
} from "../../cli/ui/index.js";
import { homedir } from "os";
import path from "path";

export const cleanupCommand = new Command("cleanup")
  .description("Clean up old sessions and backups")
  .option("--preview", "Show what would be cleaned (dry-run)")
  .option("--dry", "Alias for --preview")
  .option("--older-than <days>", "Clean sessions older than N days (e.g., 90d, 6m, 1y)")
  .option("--archive", "Archive instead of delete (future feature)")
  .option("--vault <name>", "Clean specific vault")
  .option("--all", "Clean all registered vaults")
  .option("--force", "Skip confirmation prompt")
  .option("--to-limit", "Clean to storage limit")
  .action(async (options) => {
    try {
      await logger.debug("bozly cleanup command started", options);

      const globalConfigPath = path.join(homedir(), ".bozly");
      const cleanupConfig = await getCleanupConfig(globalConfigPath);

      // Determine dry-run mode
      const isDryRun = options.preview || options.dry;
      const olderThanDays = options.olderThan || `${cleanupConfig.sessions.retentionDays}d`;

      // Parse days
      let olderThanNum: number;
      try {
        olderThanNum = parseDuration(olderThanDays);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(errorBox("Invalid duration", { error: msg }));
        process.exit(1);
      }

      if (options.all) {
        // Cleanup all vaults
        await cleanupAllVaults(cleanupConfig, olderThanNum, isDryRun, options.force);
      } else {
        // Cleanup current vault
        const node = await getCurrentNode();
        if (!node) {
          console.log(
            warningBox("Not in a node directory", {
              hint: "Use --all to clean all nodes",
            })
          );
          process.exit(1);
        }

        await cleanupSingleNode(
          node.path,
          node.name,
          cleanupConfig,
          olderThanNum,
          isDryRun,
          options.force
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Cleanup failed", { error: errorMsg });
      console.error(errorBox("Cleanup failed", { error: errorMsg }));
      process.exit(1);
    }
  });

/**
 * Clean up a single node
 */
async function cleanupSingleNode(
  nodePath: string,
  nodeName: string,
  config: CleanupConfig,
  olderThanDays: number,
  isDryRun: boolean,
  force: boolean
) {
  const storageInfo = await getNodeStorageInfo(
    "current",
    nodeName,
    nodePath,
    config.sessions.maxStorageMB,
    config.sessions.retentionDays
  );

  console.log();
  console.log(infoBox("Cleanup Analysis"));

  displayStorageInfo(storageInfo);

  // Show what would be cleaned
  console.log();
  console.log(theme.bold(`Sessions older than ${formatDuration(`${olderThanDays}d`)}:`));
  console.log(`  Sessions: ${storageInfo.canClean.oldSessions}`);

  // Show backups
  console.log();
  console.log(theme.bold("Backups:"));
  console.log(`  Max to keep: 10`);

  // Require --force flag for actual cleanup
  if (!isDryRun && !force) {
    console.log();
    console.log(
      warningBox("Cleanup is destructive", {
        hint: "Add --force flag to proceed",
      })
    );
    return;
  }

  // Perform cleanup
  const mode = isDryRun ? theme.muted("[PREVIEW]") : theme.success("[CLEANUP]");
  console.log();
  console.log(`${mode} Running cleanup...`);

  const result = await cleanupNode(nodePath, {
    olderThan: olderThanDays,
    dryRun: isDryRun,
    keepMinSessions: config.sessions.keepMinSessions,
  });

  // Show results
  console.log();
  console.log(
    successBox("Cleanup Results", {
      "Sessions deleted": result.sessionsDeleted,
      "Backups deleted": result.backupsDeleted,
      "Space freed": `${result.spaceFreedMB} MB`,
      Duration: `${result.duration}ms`,
    })
  );

  if (isDryRun) {
    console.log();
    console.log(
      warningBox("This is a preview", {
        hint: "Run without --preview to perform cleanup",
      })
    );
  }

  console.log();
}

/**
 * Clean up all vaults
 */
async function cleanupAllVaults(
  config: CleanupConfig,
  olderThanDays: number,
  isDryRun: boolean,
  force: boolean
) {
  const registry = await getRegistry();

  if (registry.nodes.length === 0) {
    console.log(warningBox("No nodes registered"));
    return;
  }

  console.log();
  console.log(infoBox(`Analyzing ${registry.nodes.length} node(s)...`));
  console.log();

  let totalSessions = 0;

  // Analyze all nodes
  const analyses = [];
  for (const node of registry.nodes) {
    const storage = await getNodeStorageInfo(
      node.id,
      node.name,
      node.path,
      config.sessions.maxStorageMB,
      config.sessions.retentionDays
    );

    analyses.push({ node, storage });
    totalSessions += storage.canClean.oldSessions;
  }

  // Show summary
  console.log(infoBox("Cleanup Summary"));
  const summaryData = Object.fromEntries(
    analyses.map(({ node, storage }) => [
      node.name,
      `${storage.canClean.oldSessions} old, ${storage.usage.backupsSizeMB} MB backups`,
    ])
  );
  console.log(formatStatsTable(summaryData));
  console.log();
  console.log(theme.muted(`Total sessions to clean: ${totalSessions}`));

  // Require --force flag for actual cleanup
  if (!isDryRun && !force) {
    console.log();
    console.log(
      warningBox("Cleanup is destructive", {
        hint: "Add --force flag to proceed with cleanup on all nodes",
      })
    );
    return;
  }

  // Perform cleanup on all nodes
  console.log();
  console.log(theme.info("Running cleanup on all nodes..."));
  console.log();

  let totalDeleted = 0;
  let totalBackupsDeleted = 0;
  let totalSpaceFreed = 0;

  const resultsData = [];
  for (const { node } of analyses) {
    const result = await cleanupNode(node.path, {
      olderThan: olderThanDays,
      dryRun: isDryRun,
      keepMinSessions: config.sessions.keepMinSessions,
    });

    resultsData.push({
      Node: node.name,
      Sessions: result.sessionsDeleted,
      Backups: result.backupsDeleted,
      "Space (MB)": result.spaceFreedMB,
    });

    totalDeleted += result.sessionsDeleted;
    totalBackupsDeleted += result.backupsDeleted;
    totalSpaceFreed += result.spaceFreedMB;
  }

  // Show totals
  console.log();
  console.log(
    successBox("Total Results", {
      "Sessions deleted": totalDeleted,
      "Backups deleted": totalBackupsDeleted,
      "Space freed": `${totalSpaceFreed} MB`,
    })
  );

  if (isDryRun) {
    console.log();
    console.log(
      warningBox("This is a preview", {
        hint: "Run without --preview to perform cleanup",
      })
    );
  }

  console.log();
}

/**
 * Display storage info in a formatted way
 */
function displayStorageInfo(storageInfo: NodeStorageInfo): void {
  const usage = storageInfo.usage;
  const nodeName = storageInfo.nodeName;

  const storageData = {
    Node: nodeName,
    "Total size": `${usage.totalSizeMB} MB / ${usage.maxStorageMB} MB (${usage.percentUsed}%)`,
    "Active sessions": usage.activeSessions.count,
    Archived: usage.archivedSessions.count,
    Backups: `${usage.backupsSizeMB} MB`,
  };

  console.log(formatStatsTable(storageData));

  if (usage.percentUsed > 95) {
    console.log();
    console.log(
      errorBox("CRITICAL: Storage usage is critically high!", {
        hint: "Cleanup urgently to prevent data loss",
      })
    );
  } else if (usage.percentUsed > 80) {
    console.log();
    console.log(
      warningBox("Storage usage is high", {
        hint: "Consider running cleanup soon",
      })
    );
  }
}
