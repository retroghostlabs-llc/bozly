/**
 * bozly optimize - Optimize context.md size
 *
 * Analyzes and optimizes vault context.md by extracting large sections
 * to dedicated guide files in .bozly/guides/. Keeps context.md <25KB.
 *
 * Usage:
 *   bozly optimize                       # Analyze and show suggestions
 *   bozly optimize --apply               # Apply suggested optimizations
 *   bozly optimize --extract-to guides   # Extract to .bozly/guides/
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  analyzeContext,
  extractLargeSections,
  formatAnalysisResults,
  formatExtractionResults,
} from "../../core/context-optimizer.js";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";

export const optimizeCommand = new Command("optimize")
  .description("Optimize context.md size by extracting large sections to guides")
  .option("-a, --apply", "Apply suggested optimizations and extract sections")
  .option("--extract-to <dir>", "Extract sections to specific directory (default: .bozly/guides)")
  .action(async (options: { apply: boolean; extractTo?: string }) => {
    try {
      await logger.debug("bozly optimize command started", {
        apply: options.apply,
        extractTo: options.extractTo,
      });

      // Get current vault
      const node = await getCurrentNode();
      if (!node) {
        throw new Error("Not in a BOZLY vault directory. Run 'bozly init' first.");
      }

      console.log();

      if (options.apply) {
        // Extract and apply optimizations
        console.log(chalk.blue("⏳ Extracting large sections..."));
        const result = await extractLargeSections(node.path);

        const formatted = formatExtractionResults(result);
        console.log(formatted);

        if (result.guidesCreated.length > 0) {
          console.log(
            chalk.green(
              `✅ Successfully optimized context! Size reduced by ${(result.reduction / 1024).toFixed(1)} KB`
            )
          );
        } else {
          console.log(chalk.yellow("⚠️  No large sections found to extract"));
        }

        await logger.info("Context optimization applied", {
          guidesCreated: result.guidesCreated.length,
          sizeReduction: `${(result.reduction / 1024).toFixed(1)} KB`,
          newSize: `${(result.newSize / 1024).toFixed(1)} KB`,
        });
      } else {
        // Analyze and show suggestions
        const analysis = await analyzeContext(node.path);

        const formatted = formatAnalysisResults(analysis);
        console.log(formatted);

        await logger.info("Context analysis complete", {
          currentSize: analysis.currentSizeKb,
          isOptimized: analysis.isOptimized,
          suggestionsCount: analysis.suggestions.length,
          potentialSavings: `${(analysis.potentialSavings / 1024).toFixed(1)} KB`,
        });

        if (analysis.suggestions.length === 0) {
          console.log(chalk.green("✅ Your context.md is already optimized!"));
        } else {
          console.log(chalk.blue("💡 Run with --apply to extract these sections"));
        }
      }

      console.log();
      process.exit(0);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Context optimization failed", {
        error: errorMsg,
      });

      console.error(chalk.red("❌ Optimization error:"), errorMsg);
      process.exit(1);
    }
  });
