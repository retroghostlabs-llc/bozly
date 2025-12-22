/**
 * bozly init - Initialize a node in the current directory
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../core/logger.js";
import { initNode } from "../../core/node.js";

export const initCommand = new Command("init")
  .description("Initialize a new node in the current directory")
  .option("-t, --type <type>", "Node template type (default, music, journal, content)", "default")
  .option("-n, --name <name>", "Node name (defaults to directory name)")
  .option("--force", "Overwrite existing .bozly/ folder")
  .action(async (options) => {
    const spinner = ora("Initializing node...").start();

    try {
      await logger.debug("bozly init command started", {
        path: process.cwd(),
        type: options.type,
        name: options.name,
        force: options.force,
      });

      const result = await initNode({
        path: process.cwd(),
        type: options.type,
        name: options.name,
        force: options.force,
      });

      await logger.info("Node initialized successfully", {
        path: result.path,
        type: result.type,
      });

      spinner.succeed(chalk.green("Node initialized successfully!"));
      console.log();
      console.log(chalk.gray("Created:"), result.path);
      console.log(chalk.gray("Type:"), result.type);
      console.log(chalk.gray("Config:"), ".bozly/config.json");
      console.log(chalk.gray("Context:"), ".bozly/context.md");
      console.log();
      console.log(chalk.yellow("Next steps:"));
      console.log("  1. Edit .bozly/context.md to customize AI context");
      console.log("  2. Add commands in .bozly/commands/");
      console.log("  3. Run 'bozly status' to verify setup");
    } catch (error) {
      spinner.fail(chalk.red("Failed to initialize vault"));

      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Node initialization failed", {
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
