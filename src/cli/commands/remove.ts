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
import { removeVault, getRegistry } from "../../core/registry.js";
import os from "os";

export const removeCommand = new Command("remove")
  .description("Remove a vault from registry (optionally backup files)")
  .argument("<name-or-path>", "Vault name or path to remove")
  .option(
    "-b, --backup",
    "Create a timestamped backup before removing (stored in ~/.bozly/backups/)"
  )
  .option("-f, --force", "Skip confirmation prompt")
  .option("-k, --keep-files", "Keep vault files on disk, only remove from registry")
  .action(async (nameOrPath, options) => {
    const spinner = ora("Removing vault...").start();

    try {
      await logger.debug("bozly remove command started", {
        nameOrPath,
        backup: options.backup,
        force: options.force,
        keepFiles: options.keepFiles,
      });

      // Find the vault
      const registry = await getRegistry();
      const vault = registry.vaults.find(
        (v) => v.name === nameOrPath || v.path === nameOrPath || v.id === nameOrPath
      );

      if (!vault) {
        spinner.fail(chalk.red("Vault not found"));
        await logger.error("Vault not found in registry", { nameOrPath });
        console.error(chalk.red(`\nNo vault found matching: ${nameOrPath}`));
        console.error("Run 'bozly list' to see available vaults.\n");
        process.exit(1);
      }

      // Show vault info
      spinner.stop();
      console.log();
      console.log(chalk.yellow("Vault to remove:"));
      console.log(chalk.gray("  Name:"), vault.name);
      console.log(chalk.gray("  Path:"), vault.path);
      console.log(chalk.gray("  Type:"), vault.type || "unknown");
      console.log();

      // Confirmation
      if (!options.force) {
        const answer = await ask(
          `${chalk.red("This will remove the vault from BOZLY registry.")} Continue? (yes/no): `
        );
        if (answer.toLowerCase() !== "yes") {
          console.log(chalk.gray("Cancelled."));
          process.exit(0);
        }
      }

      spinner.start("Removing vault...");

      // Backup if requested
      let backupPath = null;
      if (options.backup && !options.keepFiles) {
        spinner.text = "Creating backup...";
        backupPath = await backupVault(vault.path, vault.name);
        await logger.info("Vault backed up", {
          vaultPath: vault.path,
          backupPath,
        });
      }

      // Delete files if not keeping them
      if (!options.keepFiles) {
        try {
          await fs.rm(vault.path, { recursive: true, force: true });
          await logger.info("Vault files deleted", {
            vaultPath: vault.path,
          });
        } catch (error) {
          await logger.warn("Failed to delete vault files", {
            vaultPath: vault.path,
            error: error instanceof Error ? error.message : String(error),
          });
          // Don't fail if file deletion fails, still remove from registry
        }
      }

      // Remove from registry
      spinner.text = "Removing from registry...";
      await removeVault(vault.id || vault.path);

      spinner.succeed(chalk.green("Vault removed successfully!"));
      console.log();

      if (backupPath) {
        console.log(chalk.cyan("Backup created:"));
        console.log(chalk.gray(`  ${backupPath}`));
        console.log();
      }

      if (options.keepFiles) {
        console.log(chalk.cyan("Vault files preserved at:"));
        console.log(chalk.gray(`  ${vault.path}`));
        console.log();
      }

      await logger.info("Vault removed successfully", {
        vaultName: vault.name,
        vaultPath: vault.path,
        backup: backupPath,
      });
    } catch (error) {
      spinner.fail(chalk.red("Failed to remove vault"));

      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Vault removal failed", {
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
 * Create a backup of vault directory
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
