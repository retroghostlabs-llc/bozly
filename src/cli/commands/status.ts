/**
 * bozly status - Show current node status
 */

import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";
import { getNodeCommands } from "../../core/commands.js";
import { getCleanupConfig, calculateNodeStorage } from "../../core/cleanup.js";
import { homedir } from "os";
import path from "path";

export const statusCommand = new Command("status")
  .description("Show current node status")
  .option("-v, --verbose", "Show detailed information")
  .option("--storage", "Show storage usage information")
  .action(async (options) => {
    try {
      await logger.debug("bozly status command started", {
        verbose: options.verbose,
        storage: options.storage,
      });

      const node = await getCurrentNode();

      if (!node) {
        await logger.warn("Not in a node directory");
        console.log(chalk.yellow("Not in a node directory."));
        console.log();
        console.log("To initialize a node here:");
        console.log("  bozly init");
        return;
      }

      await logger.info("Node found", {
        name: node.name,
        path: node.path,
        type: node.type,
      });

      console.log(chalk.cyan("Node Status:\n"));
      console.log(chalk.bold("Name:"), node.name);
      console.log(chalk.bold("Path:"), node.path);
      console.log(chalk.bold("Type:"), node.type);
      console.log();

      // Show commands
      const commands = await getNodeCommands(node.path);
      if (commands.length > 0) {
        await logger.debug("Found node commands", {
          commandCount: commands.length,
          commands: commands.map((c) => c.name),
        });

        console.log(chalk.bold("Commands:"));
        for (const cmd of commands) {
          console.log(chalk.gray(`  /${cmd.name}`) + ` — ${cmd.description ?? "No description"}`);
        }
        console.log();
      }

      // Show storage information if requested or verbose
      if (options.storage || options.verbose) {
        const globalConfigPath = path.join(homedir(), ".bozly");
        const cleanupConfig = await getCleanupConfig(globalConfigPath);
        const storage = await calculateNodeStorage(node.path, cleanupConfig.sessions.maxStorageMB);

        console.log(chalk.bold("Storage Usage:"));
        console.log(
          `  Total: ${storage.totalSizeMB} MB / ${storage.maxStorageMB} MB (${storage.percentUsed}%)`
        );
        console.log(`  Sessions: ${storage.sessionsSizeMB} MB`);
        console.log(`    - Active: ${storage.activeSessions.count} sessions`);
        console.log(`    - Archived: ${storage.archivedSessions.count} sessions`);
        console.log(`  Backups: ${storage.backupsSizeMB} MB`);
        console.log();

        if (storage.percentUsed > 80) {
          const color = storage.percentUsed > 95 ? chalk.red : chalk.yellow;
          console.log(
            color(`⚠️  Storage usage is ${storage.percentUsed > 95 ? "critical" : "high"}`)
          );
          console.log(color(`  Run 'bozly cleanup --preview' to see cleanup options`));
          console.log();
        }
      }

      // Show configuration if verbose
      if (options.verbose) {
        console.log(chalk.bold("Configuration:"));
        console.log(chalk.gray(`  Config: .bozly/config.json`));
        console.log(chalk.gray(`  Context: .bozly/context.md`));
        console.log(chalk.gray(`  Sessions: .bozly/sessions/`));
        console.log(chalk.gray(`  Commands: .bozly/commands/`));
        console.log();
      }

      console.log(chalk.green("✓ Node is ready"));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to get node status", {
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
