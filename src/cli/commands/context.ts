/**
 * bozly context - Generate AI context
 */

import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";
import { generateContext } from "../../core/context.js";

export const contextCommand = new Command("context")
  .description("Generate AI context from vault")
  .option("--ai <provider>", "Target AI provider (claude, gpt, gemini, ollama)", "claude")
  .option("--copy", "Copy context to clipboard")
  .option("--file <path>", "Write context to file")
  .action(async (options) => {
    try {
      await logger.debug("bozly context command started", {
        provider: options.ai,
        copy: options.copy,
        file: options.file,
      });

      const node = await getCurrentNode();

      if (!node) {
        await logger.warn("Not in a node directory");
        console.log(chalk.yellow("Not in a node directory."));
        console.log("Run 'bozly init' to initialize a node here.");
        process.exit(1);
      }

      await logger.info("Generating context for vault", {
        vaultName: node.name,
        provider: options.ai,
      });

      const context = await generateContext(node, {
        provider: options.ai,
      });

      if (options.file) {
        // Write to file
        const fs = await import("fs/promises");
        await fs.writeFile(options.file, context);
        await logger.info("Context written to file", {
          file: options.file,
        });
        console.log(chalk.green(`Context written to ${options.file}`));
      } else if (options.copy) {
        // Copy to clipboard (platform-specific)
        console.log(chalk.yellow("Clipboard support coming soon"));
        console.log(context);
      } else {
        // Output to stdout
        console.log(context);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to generate context", {
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
