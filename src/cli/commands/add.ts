/**
 * bozly add - Register an existing vault
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../core/logger.js";
import { addVault } from "../../core/registry.js";

export const addCommand = new Command("add")
  .description("Register an existing vault")
  .argument("<path>", "Path to vault directory")
  .option("-n, --name <name>", "Vault name (defaults to directory name)")
  .action(async (path, options) => {
    const spinner = ora("Registering vault...").start();

    try {
      await logger.debug("bozly add command started", {
        path,
        name: options.name,
      });

      const vault = await addVault({
        path,
        name: options.name,
      });

      await logger.info("Vault registered successfully", {
        name: vault.name,
        path: vault.path,
        type: vault.type,
      });

      spinner.succeed(chalk.green("Vault registered successfully!"));
      console.log();
      console.log(chalk.gray("Name:"), vault.name);
      console.log(chalk.gray("Path:"), vault.path);
      console.log(chalk.gray("Type:"), vault.type);
      console.log();
      console.log("Run 'bozly list' to see all registered vaults.");
    } catch (error) {
      spinner.fail(chalk.red("Failed to register vault"));

      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to register vault", {
        path,
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
