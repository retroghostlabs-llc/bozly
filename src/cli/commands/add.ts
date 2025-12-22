/**
 * bozly add - Register an existing vault
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../core/logger.js";
import { addNode } from "../../core/registry.js";

export const addCommand = new Command("add")
  .description("Register an existing vault")
  .argument("<path>", "Path to node directory")
  .option("-n, --name <name>", "Node name (defaults to directory name)")
  .action(async (path, options) => {
    const spinner = ora("Registering node...").start();

    try {
      await logger.debug("bozly add command started", {
        path,
        name: options.name,
      });

      const node = await addNode({
        path,
        name: options.name,
      });

      await logger.info("Node registered successfully", {
        name: node.name,
        path: node.path,
        type: node.type,
      });

      spinner.succeed(chalk.green("Node registered successfully!"));
      console.log();
      console.log(chalk.gray("Name:"), node.name);
      console.log(chalk.gray("Path:"), node.path);
      console.log(chalk.gray("Type:"), node.type);
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
