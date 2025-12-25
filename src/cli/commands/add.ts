/**
 * bozly add - Register an existing vault
 */

import { Command } from "commander";
import ora from "ora";
import { logger } from "../../core/logger.js";
import { addNode } from "../../core/registry.js";
import { successBox, errorBox } from "../../cli/ui/index.js";

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

      spinner.succeed("Node registered successfully!");
      console.log();
      console.log(
        successBox("Node registered successfully!", {
          Name: node.name,
          Path: node.path,
          Type: node.type,
        })
      );
      console.log();
      console.log("Run 'bozly list' to see all registered nodes.");
    } catch (error) {
      spinner.fail("Failed to register node");

      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to register node", {
        path,
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.log();
        console.log(errorBox("Failed to register node", { error: errorMsg }));
      }
      process.exit(1);
    }
  });
