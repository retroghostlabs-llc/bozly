/**
 * bozly list - List all registered nodes
 */

import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { getRegistry } from "../../core/registry.js";

export const listCommand = new Command("list")
  .alias("ls")
  .description("List all registered nodes")
  .option("-a, --all", "Show all details")
  .action(async (options) => {
    try {
      await logger.debug("bozly list command started", {
        all: options.all,
      });

      const registry = await getRegistry();

      await logger.info("Registry loaded", {
        nodeCount: registry.nodes.length,
      });

      if (registry.nodes.length === 0) {
        console.log(chalk.yellow("No nodes registered."));
        console.log();
        console.log("To register a node:");
        console.log("  bozly init          Initialize new node in current directory");
        console.log("  bozly add <path>    Register existing node");
        return;
      }

      console.log(chalk.cyan("Registered Nodes:\n"));

      for (const node of registry.nodes) {
        const status = node.active ? chalk.green("●") : chalk.gray("○");
        console.log(`${status} ${chalk.bold(node.name)}`);
        console.log(chalk.gray(`  Path: ${node.path}`));
        console.log(chalk.gray(`  Type: ${node.type}`));

        if (options.all) {
          console.log(chalk.gray(`  ID: ${node.id}`));
          console.log(chalk.gray(`  Created: ${node.created}`));
          console.log(chalk.gray(`  Last accessed: ${node.lastAccessed ?? "never"}`));
        }
        console.log();
      }

      console.log(chalk.gray(`Total: ${registry.nodes.length} node(s)`));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to list nodes", {
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
