/**
 * bozly update - Check and install BOZLY updates
 *
 * Checks for available BOZLY updates from npm registry and provides
 * installation instructions. Also shows changelog for new versions.
 *
 * Usage:
 *   bozly update              # Check for updates
 *   bozly update --changelog  # Show changelog for latest version
 *   bozly update install      # Install latest version (guidance)
 */

import { Command } from "commander";
import chalk from "chalk";
import { checkLatestVersion, formatUpdateInfo } from "../../core/version-checker.js";
import { logger } from "../../core/logger.js";

export const updateCommand = new Command("update")
  .description("Check for and install BOZLY updates")
  .argument("[action]", "Action: 'check' (default) or 'install'")
  .option("--changelog", "Show changelog for latest version")
  .action(async (action, options: { changelog: boolean }) => {
    try {
      await logger.debug("bozly update command started", {
        action: action || "check",
        changelog: options.changelog,
      });

      console.log();

      // Check for updates
      console.log(chalk.blue("⏳ Checking for updates..."));
      const updateInfo = await checkLatestVersion();

      // Display update information
      const formatted = formatUpdateInfo(updateInfo);
      console.log(formatted);

      // Handle --changelog option
      if (options.changelog && updateInfo.latestVersion !== "unknown") {
        console.log(chalk.blue("📋 Changelog:"));
        console.log(chalk.gray(`→ ${updateInfo.changelogUrl}`));
        console.log();
      }

      // Handle specific actions
      if (action === "install") {
        if (updateInfo.isUpdateAvailable) {
          console.log(chalk.cyan("To install the latest version, run:"));
          console.log(chalk.yellow(`  ${updateInfo.installCommand}`));
          console.log();
        } else {
          console.log(chalk.green("✅ You already have the latest version!"));
          console.log();
        }
      }

      // Log summary
      await logger.info("Update check completed", {
        currentVersion: updateInfo.currentVersion,
        latestVersion: updateInfo.latestVersion,
        isUpdateAvailable: updateInfo.isUpdateAvailable,
        comparison: updateInfo.comparison,
      });

      process.exit(0);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Update check failed", {
        error: errorMsg,
      });

      console.error(chalk.red("❌ Update check error:"), errorMsg);
      process.exit(1);
    }
  });
