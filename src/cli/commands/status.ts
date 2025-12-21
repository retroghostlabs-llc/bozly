/**
 * bozly status - Show current vault status
 */

import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { getCurrentVault } from "../../core/vault.js";
import { getVaultCommands } from "../../core/commands.js";

export const statusCommand = new Command("status")
  .description("Show current vault status")
  .option("-v, --verbose", "Show detailed information")
  .action(async (options) => {
    try {
      await logger.debug("bozly status command started", {
        verbose: options.verbose,
      });

      const vault = await getCurrentVault();

      if (!vault) {
        await logger.warn("Not in a vault directory");
        console.log(chalk.yellow("Not in a vault directory."));
        console.log();
        console.log("To initialize a vault here:");
        console.log("  bozly init");
        return;
      }

      await logger.info("Vault found", {
        name: vault.name,
        path: vault.path,
        type: vault.type,
      });

      console.log(chalk.cyan("Vault Status:\n"));
      console.log(chalk.bold("Name:"), vault.name);
      console.log(chalk.bold("Path:"), vault.path);
      console.log(chalk.bold("Type:"), vault.type);
      console.log();

      // Show commands
      const commands = await getVaultCommands(vault.path);
      if (commands.length > 0) {
        await logger.debug("Found vault commands", {
          commandCount: commands.length,
          commands: commands.map((c) => c.name),
        });

        console.log(chalk.bold("Commands:"));
        for (const cmd of commands) {
          console.log(chalk.gray(`  /${cmd.name}`) + ` — ${cmd.description ?? "No description"}`);
        }
        console.log();
      }

      // Show recent sessions if verbose
      if (options.verbose) {
        console.log(chalk.bold("Configuration:"));
        console.log(chalk.gray(`  Config: .bozly/config.json`));
        console.log(chalk.gray(`  Context: .bozly/context.md`));
        console.log(chalk.gray(`  Sessions: .bozly/sessions/`));
        console.log(chalk.gray(`  Commands: .bozly/commands/`));
        console.log();
      }

      console.log(chalk.green("✓ Vault is ready"));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to get vault status", {
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
