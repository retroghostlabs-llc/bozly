/**
 * bozly cleanup - Session and backup cleanup with retention policies
 */

import { Command } from "commander";
import chalk from "chalk";
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
        console.error(chalk.red(`Invalid duration: ${msg}`));
        process.exit(1);
      }

      if (options.all) {
        // Cleanup all vaults
        await cleanupAllVaults(cleanupConfig, olderThanNum, isDryRun, options.force);
      } else {
        // Cleanup current vault
        const node = await getCurrentNode();
        if (!node) {
          console.log(chalk.yellow("Not in a node directory. Use --all to clean all nodes."));
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
      console.error(chalk.red(`Cleanup failed: ${errorMsg}`));
      process.exit(1);
    }
  });

/**
 * Clean up a single node
 */
async function cleanupSingleNode(
  nodePath: string,
  nodeName: string,
  config: any,
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
  console.log(chalk.cyan.bold("Cleanup Analysis"));
  console.log(chalk.gray("═".repeat(50)));

  displayStorageInfo(storageInfo);

  // Show what would be cleaned
  console.log();
  console.log(
    chalk.bold(`Sessions older than ${chalk.yellow(formatDuration(`${olderThanDays}d`))}:`)
  );
  console.log(`  Sessions: ${storageInfo.canClean.oldSessions}`);

  // Show backups
  console.log();
  console.log(chalk.bold("Backups:"));
  console.log(`  Max to keep: 10`);

  // Require --force flag for actual cleanup
  if (!isDryRun && !force) {
    console.log();
    console.log(chalk.yellow("Add --force flag to proceed with cleanup (cleanup is destructive)"));
    return;
  }

  // Perform cleanup
  const mode = isDryRun ? chalk.gray("[PREVIEW]") : chalk.green("[CLEANUP]");
  console.log();
  console.log(chalk.cyan(mode + " Running cleanup..."));

  const result = await cleanupNode(nodePath, {
    olderThan: olderThanDays,
    dryRun: isDryRun,
    keepMinSessions: config.sessions.keepMinSessions,
  });

  // Show results
  console.log();
  console.log(chalk.cyan.bold("Cleanup Results"));
  console.log(chalk.gray("═".repeat(50)));
  console.log(`  Sessions deleted: ${result.sessionsDeleted}`);
  console.log(`  Backups deleted: ${result.backupsDeleted}`);
  console.log(`  Space freed: ${result.spaceFreedMB} MB`);
  console.log(`  Duration: ${result.duration}ms`);

  if (isDryRun) {
    console.log();
    console.log(chalk.yellow("This is a preview. Run without --preview to perform cleanup."));
  }

  console.log();
}

/**
 * Clean up all vaults
 */
async function cleanupAllVaults(
  config: any,
  olderThanDays: number,
  isDryRun: boolean,
  force: boolean
) {
  const registry = await getRegistry();

  if (registry.nodes.length === 0) {
    console.log(chalk.yellow("No nodes registered."));
    return;
  }

  console.log();
  console.log(chalk.cyan.bold(`Analyzing ${registry.nodes.length} node(s)...`));
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
  console.log(chalk.cyan.bold("Cleanup Summary"));
  console.log(chalk.gray("═".repeat(50)));
  for (const { node, storage } of analyses) {
    const backupSize = storage.usage.backupsSizeMB;
    console.log(
      `${node.name.padEnd(20)} - ${storage.canClean.oldSessions} old sessions, ${backupSize} MB backups`
    );
  }

  console.log(chalk.gray("═".repeat(50)));
  console.log(`Total sessions to clean: ${totalSessions}`);

  // Require --force flag for actual cleanup
  if (!isDryRun && !force) {
    console.log();
    console.log(
      chalk.yellow("Add --force flag to proceed with cleanup on all nodes (cleanup is destructive)")
    );
    return;
  }

  // Perform cleanup on all nodes
  console.log();
  console.log(chalk.cyan("Running cleanup on all nodes..."));
  console.log();

  let totalDeleted = 0;
  let totalBackupsDeleted = 0;
  let totalSpaceFreed = 0;

  for (const { node } of analyses) {
    const result = await cleanupNode(node.path, {
      olderThan: olderThanDays,
      dryRun: isDryRun,
      keepMinSessions: config.sessions.keepMinSessions,
    });

    console.log(
      `${node.name.padEnd(20)} - ${result.sessionsDeleted} sessions, ${result.backupsDeleted} backups, ${result.spaceFreedMB} MB`
    );

    totalDeleted += result.sessionsDeleted;
    totalBackupsDeleted += result.backupsDeleted;
    totalSpaceFreed += result.spaceFreedMB;
  }

  // Show totals
  console.log();
  console.log(chalk.cyan.bold("Total Results"));
  console.log(chalk.gray("═".repeat(50)));
  console.log(`  Sessions deleted: ${totalDeleted}`);
  console.log(`  Backups deleted: ${totalBackupsDeleted}`);
  console.log(`  Space freed: ${totalSpaceFreed} MB`);

  if (isDryRun) {
    console.log();
    console.log(chalk.yellow("This is a preview. Run without --preview to perform cleanup."));
  }

  console.log();
}

/**
 * Display storage info in a formatted way
 */
function displayStorageInfo(storageInfo: any): void {
  const { usage } = storageInfo;

  console.log(`  Node: ${storageInfo.nodeName}`);
  console.log(
    `  Total size: ${usage.totalSizeMB} MB / ${usage.maxStorageMB} MB (${usage.percentUsed}%)`
  );
  console.log(`  Active sessions: ${usage.activeSessions.count}`);
  console.log(`  Archived: ${usage.archivedSessions.count}`);
  console.log(`  Backups: ${usage.backupsSizeMB} MB`);

  if (usage.percentUsed > 95) {
    console.log();
    console.log(chalk.red("⚠️  CRITICAL: Storage usage is critically high!"));
  } else if (usage.percentUsed > 80) {
    console.log();
    console.log(chalk.yellow("⚠️  WARNING: Storage usage is high"));
  }
}
