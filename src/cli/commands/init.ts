/**
 * bozly init - Initialize a vault in the current directory
 */

import { Command } from "commander";
import ora from "ora";
import { logger } from "../../core/logger.js";
import { initNode } from "../../core/node.js";
import { successBox, errorBox } from "../../cli/ui/index.js";

export const initCommand = new Command("init")
  .description("Initialize a new vault in the current directory")
  .option("-t, --type <type>", "Vault template type (default, music, journal, content)", "default")
  .option("-n, --name <name>", "Vault name (defaults to directory name)")
  .option("--force", "Overwrite existing .bozly/ folder")
  .action(async (options) => {
    const spinner = ora("Initializing vault...").start();

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

      await logger.info("Vault initialized successfully", {
        path: result.path,
        type: result.type,
      });

      spinner.succeed("Vault initialized successfully!");
      console.log();
      console.log(
        successBox("Vault initialized successfully!", {
          Path: result.path,
          Type: result.type,
          Config: ".bozly/config.json",
          Context: ".bozly/context.md",
        })
      );
      console.log();
      console.log("Next steps:");
      console.log("  1. Edit .bozly/context.md to customize AI context");
      console.log("  2. Add commands in .bozly/commands/");
      console.log("  3. Run 'bozly status' to verify setup");
    } catch (error) {
      spinner.fail("Failed to initialize vault");

      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Vault initialization failed", {
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.log();
        console.log(errorBox("Failed to initialize vault", { error: errorMsg }));
      }
      process.exit(1);
    }
  });
