/**
 * bozly suggest - Suggest command improvements based on session analysis
 * Phase 2k: Command Suggestions & Learning
 */

import { Command } from "commander";
import chalk from "chalk";
import { confirm } from "@inquirer/prompts";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";
import { getNodeConfig } from "../../core/config.js";
import {
  SuggestionEngine,
  saveSuggestionToHistory,
  applySuggestion,
} from "../../core/suggestions.js";
import type { Suggestion } from "../../core/types.js";

export const suggestCommand = new Command("suggest")
  .description("Analyze command sessions and suggest improvements")
  .argument("[command]", "Command name to analyze (optional)")
  .option("-v, --verbose", "Show detailed analysis data")
  .option("--dry-run", "Preview suggestions without saving")
  .option("--all", "Show all suggestions including low-confidence ones")
  .action(async (commandName, options) => {
    try {
      const node = await getCurrentNode();

      if (!node) {
        console.log(chalk.yellow("Not in a node directory."));
        console.log("To initialize a node here:");
        console.log("  bozly init");
        return;
      }

      const nodeConfig = await getNodeConfig();
      if (!nodeConfig) {
        console.log(chalk.red("Error: Could not load node configuration"));
        return;
      }

      // If no command specified, ask user to select one
      let targetCommand = commandName;
      if (!targetCommand) {
        targetCommand = await selectCommand();
        if (!targetCommand) {
          console.log(chalk.yellow("No command selected."));
          return;
        }
      }

      console.log(chalk.cyan(`\nAnalyzing sessions for command: ${chalk.bold(targetCommand)}...`));

      // Create suggestion engine and analyze
      const engine = new SuggestionEngine(node.path, nodeConfig);
      const suggestions = await engine.analyzeSessions(targetCommand, {
        maxSessions: 20,
        minConfidence: options.all ? 0 : 0.5,
      });

      if (suggestions.length === 0) {
        console.log(chalk.yellow(`\nNo suggestions found for '${targetCommand}'.`));
        console.log(chalk.gray("Try running the command a few times to generate session history."));
        return;
      }

      console.log(
        chalk.green(
          `\nFound ${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"}\n`
        )
      );

      // Display all suggestions
      await displaySuggestions(suggestions, options.verbose);

      // If dry-run, stop here
      if (options.dryRun) {
        console.log(chalk.gray("\nDry-run mode: No suggestions were saved."));
        return;
      }

      // Interactive approval flow
      console.log(chalk.cyan("\nReview suggestions:\n"));

      let appliedCount = 0;
      for (let i = 0; i < suggestions.length; i++) {
        const suggestion = suggestions[i];

        const applyIt = await confirm({
          message: `Apply suggestion ${i + 1} of ${suggestions.length}? (${suggestion.title})`,
          default: suggestion.priority === "high",
        });

        if (applyIt) {
          // Save to history
          await saveSuggestionToHistory(node.path, suggestion);
          await applySuggestion(node.path, suggestion.id);
          appliedCount++;

          console.log(chalk.green(`✓ Saved: ${suggestion.title}`));
          console.log(chalk.gray(`  Action: ${suggestion.recommendation.action}`));
        } else {
          // Still save to history, but mark as not applied
          await saveSuggestionToHistory(node.path, suggestion);
          console.log(chalk.gray(`⊘ Skipped: ${suggestion.title}`));
        }
        console.log();
      }

      // Summary
      console.log(chalk.cyan("Summary:"));
      console.log(chalk.green(`Reviewed: ${suggestions.length}`));
      console.log(chalk.green(`Applied: ${appliedCount}`));
      console.log(chalk.gray(`Skipped: ${suggestions.length - appliedCount}`));
      console.log();

      if (appliedCount > 0) {
        console.log(
          chalk.yellow(
            "Next steps: Review the suggested changes in your command context or configuration."
          )
        );
      }
    } catch (error) {
      await logger.error("suggest command failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(chalk.red("Error: Failed to analyze sessions"));
      process.exit(1);
    }
  });

/**
 * Let user select a command from available options
 */
function selectCommand(): Promise<string | null> {
  // For now, return null - in full implementation,
  // would list available commands from context/history
  console.log(chalk.yellow("Please specify a command name:"));
  console.log(chalk.gray("  bozly suggest <command>"));
  return Promise.resolve(null);
}

/**
 * Display suggestions in formatted table
 */
function displaySuggestions(suggestions: Suggestion[], verbose: boolean): Promise<void> {
  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    const priorityColor =
      s.priority === "high"
        ? chalk.red("🔴 HIGH")
        : s.priority === "medium"
          ? chalk.yellow("🟡 MEDIUM")
          : chalk.green("🟢 LOW");

    console.log(`${priorityColor} [${i + 1}] ${s.title}`);
    console.log(chalk.gray(`  Description: ${s.description}`));
    console.log(chalk.gray(`  Type: ${s.type}`));
    console.log(chalk.gray(`  Confidence: ${Math.round(s.analysis.confidence * 100)}%`));

    console.log(chalk.cyan(`  Recommendation:`));
    console.log(chalk.gray(`    Action: ${s.recommendation.action}`));
    if (s.recommendation.example) {
      console.log(chalk.gray(`    Example: ${s.recommendation.example}`));
    }
    console.log(chalk.gray(`    Rationale: ${s.recommendation.rationale}`));

    console.log(chalk.cyan(`  Impact:`));
    console.log(chalk.gray(`    Expected: ${s.impact.expectedImprovement}`));
    console.log(
      chalk.gray(
        `    Risk: ${s.impact.riskLevel} (${s.impact.reversible ? "reversible" : "not reversible"})`
      )
    );

    if (verbose && s.analysis.data) {
      console.log(chalk.gray(`  Analysis: ${JSON.stringify(s.analysis.data, null, 2)}`));
    }

    console.log();
  }
  return Promise.resolve();
}
