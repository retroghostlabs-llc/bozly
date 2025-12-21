/**
 * bozly list - List all registered vaults
 */

import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { getRegistry } from "../../core/registry.js";

export const listCommand = new Command("list")
  .alias("ls")
  .description("List all registered vaults")
  .option("-a, --all", "Show all details")
  .action(async (options) => {
    try {
      await logger.debug("bozly list command started", {
        all: options.all,
      });

      const registry = await getRegistry();

      await logger.info("Registry loaded", {
        vaultCount: registry.vaults.length,
      });

      if (registry.vaults.length === 0) {
        console.log(chalk.yellow("No vaults registered."));
        console.log();
        console.log("To register a vault:");
        console.log("  bozly init          Initialize new vault in current directory");
        console.log("  bozly add <path>    Register existing vault");
        return;
      }

      console.log(chalk.cyan("Registered Vaults:\n"));

      for (const vault of registry.vaults) {
        const status = vault.active ? chalk.green("●") : chalk.gray("○");
        console.log(`${status} ${chalk.bold(vault.name)}`);
        console.log(chalk.gray(`  Path: ${vault.path}`));
        console.log(chalk.gray(`  Type: ${vault.type}`));

        if (options.all) {
          console.log(chalk.gray(`  ID: ${vault.id}`));
          console.log(chalk.gray(`  Created: ${vault.created}`));
          console.log(chalk.gray(`  Last accessed: ${vault.lastAccessed ?? "never"}`));
        }
        console.log();
      }

      console.log(chalk.gray(`Total: ${registry.vaults.length} vault(s)`));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to list vaults", {
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
