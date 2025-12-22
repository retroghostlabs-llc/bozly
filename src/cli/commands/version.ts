/**
 * bozly version - View and manage version information
 *
 * Usage:
 *   bozly version                        # Show framework version
 *   bozly version --node                # Show version info for current vault
 *   bozly version --model <name>         # Show specific model version
 *   bozly version --model <name> --history  # Show model version history
 *   bozly version --all                  # Show all version information
 */

import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import {
  getVersionInfo,
  getFrameworkVersion,
  formatVersionInfo,
  getModelVersionHistory,
} from "../../core/versions.js";
import { getCurrentNode } from "../../core/node.js";
import { loadModel } from "../../core/models.js";
import os from "os";
import path from "path";

export const versionCommand = new Command("version")
  .description("View and manage version information")
  .option("-v, --vault", "Show version information for current vault")
  .option("-m, --model <name>", "Show specific model version")
  .option("-H, --history", "Show full version/changelog history")
  .option("-a, --all", "Show all version information (framework, vault, models)")
  .action(async (options) => {
    try {
      await logger.debug("bozly version command started", {
        vault: options.vault,
        model: options.model,
        history: options.history,
        all: options.all,
      });

      // No options: show framework version
      if (!options.node && !options.model && !options.all && !options.history) {
        await showFrameworkVersion();
        return;
      }

      // --all: show everything
      if (options.all) {
        await showFrameworkVersion();
        console.log(""); // blank line

        try {
          const node = await getCurrentNode();
          if (node) {
            await showVaultVersion(node.path);
          }
        } catch {
          // Not in a node directory - that's ok for --all
        }
        return;
      }

      // --vault: show node version
      if (options.vault) {
        const node = await getCurrentNode();
        if (node) {
          await showVaultVersion(node.path);
        }
        return;
      }

      // --model: show specific model version
      if (options.model) {
        const node = await getCurrentNode();
        if (node) {
          await showModelVersion(node.path, options.model, options.history);
        }
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

/**
 * Show framework version information
 */
async function showFrameworkVersion(): Promise<void> {
  const framework = getFrameworkVersion();

  console.log(chalk.cyan("BOZLY Framework Version\n"));
  console.log(`  Version: ${chalk.green(`v${framework.bozlyVersion}`)}`);
  console.log(`  Node.js: ${framework.nodeVersion}`);
  console.log(`  Platform: ${framework.platform}`);
  console.log(`  Home: ${os.homedir()}`);

  await logger.info("Framework version displayed", {
    version: framework.bozlyVersion,
  });
}

/**
 * Show node version information
 */
async function showVaultVersion(vaultPath: string): Promise<void> {
  const vaultName = path.basename(vaultPath);
  const history = await getVersionInfo(vaultPath);

  if (!history) {
    console.log(chalk.yellow(`No version history found for vault: ${vaultName}`));
    console.log(
      chalk.gray("Version tracking will start when you next run a command in this node.")
    );
    return;
  }

  console.log(chalk.cyan(`Node Version Information: ${vaultName}\n`));
  console.log(formatVersionInfo(history));

  await logger.info("Node version displayed", {
    vaultPath,
    vaultVersion: history.vaultVersion,
  });
}

/**
 * Show model version information
 */
async function showModelVersion(
  vaultPath: string,
  modelName: string,
  showHistory: boolean = false
): Promise<void> {
  try {
    // Load the model to get current version
    const model = await loadModel(vaultPath, modelName);

    console.log(chalk.cyan(`Model Version Information: ${modelName}\n`));
    console.log(`  Current Version: ${chalk.green(`v${model.version}`)}`);

    if (model.hash) {
      console.log(`  Hash: ${model.hash.substring(0, 16)}...`);
    }

    if (model.updated) {
      console.log(`  Last Updated: ${model.updated}`);
    }

    if (model.description) {
      console.log(`  Description: ${model.description}`);
    }

    // Show changelog if available
    if (model.changelog && model.changelog.length > 0) {
      console.log("\n  Changelog:");
      const entriesToShow = showHistory ? model.changelog : model.changelog.slice(-3); // Show last 3 by default

      for (const entry of entriesToShow) {
        console.log(`\n    Version ${chalk.blue(entry.version)} - ${entry.date}`);
        for (const change of entry.changes) {
          console.log(`      • ${change}`);
        }
      }

      if (!showHistory && model.changelog.length > 3) {
        console.log(
          chalk.gray(
            `\n    ... and ${model.changelog.length - 3} more versions (use --history to see all)`
          )
        );
      }
    }

    // Show version history from .versions.json if available
    const versionInfo = await getModelVersionHistory(vaultPath, modelName);
    if (versionInfo?.compatibilityNotes) {
      console.log(`\n  Compatibility Notes: ${versionInfo.compatibilityNotes}`);
    }

    await logger.info("Model version displayed", {
      modelName,
      version: model.version,
      hasChangelog: Boolean(model.changelog),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Model not found: ${modelName}`));
    console.error(chalk.gray(`Error: ${message}`));
    process.exit(1);
  }
}
