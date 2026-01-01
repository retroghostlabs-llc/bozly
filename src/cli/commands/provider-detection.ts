/**
 * bozly provider-detection - Detect installed AI providers
 *
 * Auto-detects installed AI provider CLIs (Claude, GPT, Gemini, Ollama, etc)
 * and shows their versions and availability status.
 *
 * Usage:
 *   bozly provider-detection              # Auto-detect providers
 *   bozly provider-detection --verbose    # Show detailed output
 *   bozly provider-detection --save       # Auto-save results to config
 */

import { Command } from "commander";
import chalk from "chalk";
import { detectAllProviders, formatDetectionResults } from "../../core/provider-detection.js";
import { logger } from "../../core/logger.js";

export const providerDetectionCommand = new Command("provider-detection")
  .description("Auto-detect installed AI providers")
  .option("-v, --verbose", "Show detailed detection information")
  .option("--save", "Save detected providers to current vault config")
  .action(async (options: { verbose: boolean; save: boolean }) => {
    try {
      await logger.debug("bozly provider-detection command started", {
        verbose: options.verbose,
        save: options.save,
      });

      // Run detection
      console.log();
      const result = detectAllProviders();

      // Format and display results
      const formatted = formatDetectionResults(result, options.verbose);
      console.log(formatted);

      // Log summary
      await logger.info("Provider detection completed", {
        found: result.foundCount,
        total: result.totalCount,
        installed: result.installed,
        notFound: result.notFound,
      });

      // Handle --save option
      if (options.save && result.foundCount > 0) {
        console.log(
          chalk.blue(
            `✓ Detected ${result.foundCount} provider${result.foundCount === 1 ? "" : "s"}`
          )
        );
        console.log(
          chalk.gray("Note: To permanently save, configure your .bozly/config.json manually")
        );
        console.log();
      }

      process.exit(0);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Provider detection failed", {
        error: errorMsg,
      });

      console.error(chalk.red("❌ Provider detection error:"), errorMsg);
      process.exit(1);
    }
  });
