/**
 * bozly remove - Remove and optionally backup a vault
 */

import { Command } from "commander";
import ora from "ora";
import { errorBox, warningBox, successBox, theme } from "../../cli/ui/index.js";
import path from "path";
import fs from "fs/promises";
import { execSync } from "child_process";
import { logger } from "../../core/logger.js";
import { removeNode, getRegistry } from "../../core/registry.js";
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

      // Find the node
      const registry = await getRegistry();
      const node = registry.nodes.find(
        (v) => v.name === nameOrPath || v.path === nameOrPath || v.id === nameOrPath
      );

      if (!node) {
        spinner.fail("Vault not found");
        await logger.error("Vault not found in registry", { nameOrPath });
        console.error(
          errorBox(`No vault found matching: ${nameOrPath}`, {
            hint: "Run 'bozly list' to see available vaults",
          })
        );
        process.exit(1);
      }

      // Show vault info
      spinner.stop();
      console.log();
      console.log(
        warningBox("Vault to remove", {
          Name: node.name,
          Path: node.path,
          Type: node.type || "unknown",
        })
      );
      console.log();

      // Confirmation
      if (!options.force) {
        const answer = await ask(
          `${errorBox("This will remove the vault from BOZLY registry")} Continue? (yes/no): `
        );
        if (answer.toLowerCase() !== "yes") {
          console.log(theme.muted("Cancelled"));
          process.exit(0);
        }
      }

      spinner.start("Removing vault...");

      // Backup if requested
      let backupPath = null;
      if (options.backup && !options.keepFiles) {
        spinner.text = "Creating backup...";
        backupPath = await backupVault(node.path, node.name);
        await logger.info("Vault backed up", {
          vaultPath: node.path,
          backupPath,
        });
      }

      // Delete files if not keeping them
      if (!options.keepFiles) {
        try {
          await fs.rm(node.path, { recursive: true, force: true });
          await logger.info("Vault files deleted", {
            vaultPath: node.path,
          });
        } catch (error) {
          await logger.warn("Failed to delete vault files", {
            vaultPath: node.path,
            error: error instanceof Error ? error.message : String(error),
          });
          // Don't fail if file deletion fails, still remove from registry
        }
      }

      // Remove from registry
      spinner.text = "Removing from registry...";
      await removeNode(node.id || node.path);

      spinner.succeed("Vault removed successfully");
      console.log();

      if (backupPath) {
        console.log(
          successBox("Backup created", {
            path: backupPath,
          })
        );
        console.log();
      }

      if (options.keepFiles) {
        console.log(
          successBox("Vault files preserved at", {
            path: node.path,
          })
        );
        console.log();
      }

      await logger.info("Vault removed successfully", {
        vaultName: node.name,
        vaultPath: node.path,
        backup: backupPath,
      });
    } catch (error) {
      spinner.fail("Failed to remove vault");

      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Vault removal failed", {
        nameOrPath,
        error: errorMsg,
      });

      console.error(
        errorBox("Vault removal failed", {
          error: errorMsg,
        })
      );
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
