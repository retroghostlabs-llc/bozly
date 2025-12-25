/**
 * bozly suggest - Suggest command improvements based on session analysis
 * Phase 2k: Command Suggestions & Learning
 */

import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";
import { getNodeConfig } from "../../core/config.js";
import {
  SuggestionEngine,
  saveSuggestionToHistory,
  applySuggestion,
} from "../../core/suggestions.js";
import {
  errorBox,
  warningBox,
  successBox,
  infoBox,
  formatSection,
  theme,
  symbols,
} from "../../cli/ui/index.js";
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
        console.error(
          warningBox("Not in a node directory", {
            hint: "Run 'bozly init' to initialize a node here",
          })
        );
        return;
      }

      const nodeConfig = await getNodeConfig();
      if (!nodeConfig) {
        console.error(errorBox("Could not load node configuration"));
        return;
      }

      // If no command specified, ask user to select one
      let targetCommand = commandName;
      if (!targetCommand) {
        targetCommand = await selectCommand();
        if (!targetCommand) {
          console.log(warningBox("No command selected"));
          return;
        }
      }

      console.log(infoBox(`Analyzing sessions for command: ${theme.bold(targetCommand)}...`));

      // Create suggestion engine and analyze
      const engine = new SuggestionEngine(node.path, nodeConfig);
      const suggestions = await engine.analyzeSessions(targetCommand, {
        maxSessions: 20,
        minConfidence: options.all ? 0 : 0.5,
      });

      if (suggestions.length === 0) {
        console.log(
          warningBox(`No suggestions found for '${targetCommand}'`, {
            hint: "Try running the command a few times to generate session history",
          })
        );
        return;
      }

      console.log(
        successBox(`Found ${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"}`)
      );

      // Display all suggestions
      await displaySuggestions(suggestions, options.verbose);

      // If dry-run, stop here
      if (options.dryRun) {
        console.log(infoBox("Dry-run mode: No suggestions were saved"));
        return;
      }

      // Interactive approval flow
      console.log(formatSection("Review suggestions", ""));

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

          console.log(
            successBox(`Saved: ${suggestion.title}`, {
              action: suggestion.recommendation.action,
            })
          );
        } else {
          // Still save to history, but mark as not applied
          await saveSuggestionToHistory(node.path, suggestion);
          console.log(warningBox(`Skipped: ${suggestion.title}`));
        }
        console.log();
      }

      // Summary
      console.log(formatSection("Summary", ""));
      console.log(
        infoBox("", {
          Reviewed: String(suggestions.length),
          Applied: String(appliedCount),
          Skipped: String(suggestions.length - appliedCount),
        })
      );

      if (appliedCount > 0) {
        console.log(
          warningBox(
            "Next steps: Review the suggested changes in your command context or configuration"
          )
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("suggest command failed", {
        error: errorMsg,
      });
      console.error(
        errorBox("Failed to analyze sessions", {
          error: errorMsg,
        })
      );
      process.exit(1);
    }
  });

/**
 * Let user select a command from available options
 */
function selectCommand(): Promise<string | null> {
  // For now, return null - in full implementation,
  // would list available commands from context/history
  console.log(
    warningBox("Please specify a command name", {
      usage: "bozly suggest <command>",
    })
  );
  return Promise.resolve(null);
}

/**
 * Display suggestions in formatted table
 */
function displaySuggestions(suggestions: Suggestion[], verbose: boolean): Promise<void> {
  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    const prioritySymbol =
      s.priority === "high"
        ? symbols.error
        : s.priority === "medium"
          ? symbols.warning
          : symbols.success;

    const details: Record<string, string> = {
      Description: s.description,
      Type: s.type,
      Confidence: `${Math.round(s.analysis.confidence * 100)}%`,
      Action: s.recommendation.action,
    };

    if (s.recommendation.example) {
      details["Example"] = s.recommendation.example;
    }

    details["Rationale"] = s.recommendation.rationale;
    details["Impact"] = s.impact.expectedImprovement;
    details["Risk"] =
      `${s.impact.riskLevel} (${s.impact.reversible ? "reversible" : "not reversible"})`;

    if (verbose && s.analysis.data) {
      details["Analysis"] = JSON.stringify(s.analysis.data, null, 2);
    }

    console.log(`${prioritySymbol} [${i + 1}/${suggestions.length}] ${s.title}`);
    console.log(formatSection("Details", theme.muted(JSON.stringify(details, null, 2))));
    console.log();
  }
  return Promise.resolve();
}
