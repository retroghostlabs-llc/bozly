/**
 * bozly remove - Remove and optionally backup a vault
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";
import { execSync } from "child_process";
import { logger } from "../../core/logger.js";
import { removeNode, getRegistry } from "../../core/registry.js";
import os from "os";

export const removeCommand = new Command("remove")
  .description("Remove a node from registry (optionally backup files)")
  .argument("<name-or-path>", "Node name or path to remove")
  .option(
    "-b, --backup",
    "Create a timestamped backup before removing (stored in ~/.bozly/backups/)"
  )
  .option("-f, --force", "Skip confirmation prompt")
  .option("-k, --keep-files", "Keep node files on disk, only remove from registry")
  .action(async (nameOrPath, options) => {
    const spinner = ora("Removing node...").start();

    try {
      await logger.debug("bozly remove command started", {
        nameOrPath,
        backup: options.backup,
        force: options.force,
        keepFiles: options.keepFiles,
      });

      // Find the node
      const registry = await getRegistry();
      const node = registry.nodes.find(
        (v) => v.name === nameOrPath || v.path === nameOrPath || v.id === nameOrPath
      );

      if (!node) {
        spinner.fail(chalk.red("Node not found"));
        await logger.error("Node not found in registry", { nameOrPath });
        console.error(chalk.red(`\nNo node found matching: ${nameOrPath}`));
        console.error("Run 'bozly list' to see available nodes.\n");
        process.exit(1);
      }

      // Show node info
      spinner.stop();
      console.log();
      console.log(chalk.yellow("Node to remove:"));
      console.log(chalk.gray("  Name:"), node.name);
      console.log(chalk.gray("  Path:"), node.path);
      console.log(chalk.gray("  Type:"), node.type || "unknown");
      console.log();

      // Confirmation
      if (!options.force) {
        const answer = await ask(
          `${chalk.red("This will remove the node from BOZLY registry.")} Continue? (yes/no): `
        );
        if (answer.toLowerCase() !== "yes") {
          console.log(chalk.gray("Cancelled."));
          process.exit(0);
        }
      }

      spinner.start("Removing node...");

      // Backup if requested
      let backupPath = null;
      if (options.backup && !options.keepFiles) {
        spinner.text = "Creating backup...";
        backupPath = await backupVault(node.path, node.name);
        await logger.info("Node backed up", {
          nodePath: node.path,
          backupPath,
        });
      }

      // Delete files if not keeping them
      if (!options.keepFiles) {
        try {
          await fs.rm(node.path, { recursive: true, force: true });
          await logger.info("Node files deleted", {
            nodePath: node.path,
          });
        } catch (error) {
          await logger.warn("Failed to delete node files", {
            nodePath: node.path,
            error: error instanceof Error ? error.message : String(error),
          });
          // Don't fail if file deletion fails, still remove from registry
        }
      }

      // Remove from registry
      spinner.text = "Removing from registry...";
      await removeNode(node.id || node.path);

      spinner.succeed(chalk.green("Node removed successfully!"));
      console.log();

      if (backupPath) {
        console.log(chalk.cyan("Backup created:"));
        console.log(chalk.gray(`  ${backupPath}`));
        console.log();
      }

      if (options.keepFiles) {
        console.log(chalk.cyan("Node files preserved at:"));
        console.log(chalk.gray(`  ${node.path}`));
        console.log();
      }

      await logger.info("Node removed successfully", {
        nodeName: node.name,
        nodePath: node.path,
        backup: backupPath,
      });
    } catch (error) {
      spinner.fail(chalk.red("Failed to remove node"));

      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Node removal failed", {
        nameOrPath,
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

/**
 * Create a backup of node directory
 */
async function backupVault(vaultPath: string, vaultName: string): Promise<string> {
  const backupDir = path.join(os.homedir(), ".bozly", "backups");

  // Create backups directory
  await fs.mkdir(backupDir, { recursive: true });

  // Generate backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupName = `${vaultName}-${timestamp}.tar.gz`;
  const backupPath = path.join(backupDir, backupName);

  try {
    // Use tar to create backup
    execSync(
      `tar -czf "${backupPath}" -C "${path.dirname(vaultPath)}" "${path.basename(vaultPath)}"`
    );
    return backupPath;
  } catch (error) {
    throw new Error(
      `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Simple interactive prompt
 */
function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });
}
