/**
 * bozly suggest - Suggest command improvements and new commands
 * Phase 2k & 2.5: Command Suggestions & AI-Assisted Creation
 */

import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";
import { getNodeConfig } from "../../core/config.js";
import { querySessions } from "../../core/sessions.js";
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
import { generateCommandSuggestions } from "../../core/ai-generation.js";
import { getDefaultProvider } from "../../core/providers.js";
import { createGlobalCommand } from "../../core/commands.js";
import type { Suggestion, Session, NodeInfo } from "../../core/types.js";

export const suggestCommand = new Command("suggest")
  .description("Analyze sessions and suggest improvements or new commands")
  .argument("[command]", "Command name to analyze (optional)")
  .option("-v, --verbose", "Show detailed analysis data")
  .option("--dry-run", "Preview suggestions without saving")
  .option("--all", "Show all suggestions including low-confidence ones")
  .option("--ai", "Use AI to suggest NEW commands (instead of improvements)")
  .option("--provider <name>", "AI provider to use (claude, gpt, gemini, ollama)")
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

      // Handle --ai mode: suggest NEW commands based on session patterns
      if (options.ai) {
        await suggestNewCommandsWithAI(node, options.provider);
        return;
      }

      // Standard mode: suggest improvements to existing command
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

/**
 * Suggest NEW commands using AI based on session history patterns
 */
async function suggestNewCommandsWithAI(node: NodeInfo, providerOverride?: string): Promise<void> {
  const provider = providerOverride ?? getDefaultProvider();

  console.log(infoBox(`Analyzing session history with ${provider}...`));

  try {
    // Get recent sessions
    const sessions = await querySessions(node.path, { limit: 20 });

    if (sessions.length === 0) {
      console.log(
        warningBox("No session history found", {
          hint: "Run some commands first to build up session history",
        })
      );
      return;
    }

    // Build session summary for AI
    const sessionSummary = sessions
      .slice(0, 10)
      .map((s: Session) => `- Command: ${s.command} (${s.status}, ${s.executionTimeMs}ms)`)
      .join("\n");

    const historyText = `Recent sessions from node "${node.name}":\n${sessionSummary}\n\nBased on these patterns, suggest 3-5 new commands.`;

    console.log(theme.muted("Generating suggestions..."));

    // Generate suggestions via AI
    const suggestionsJson = await generateCommandSuggestions(historyText, provider);

    // Parse suggestions
    interface AISuggestion {
      name: unknown;
      purpose?: unknown;
      rationale?: unknown;
      confidence?: unknown;
    }
    let suggestions: AISuggestion[];
    try {
      const parsed = JSON.parse(suggestionsJson);
      suggestions = Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      throw new Error(
        `Failed to parse AI suggestions: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (suggestions.length === 0) {
      console.log(
        warningBox("No suggestions generated", {
          hint: "Try running more commands to build up session history",
        })
      );
      return;
    }

    console.log(
      successBox(
        `Generated ${suggestions.length} command suggestion${suggestions.length === 1 ? "" : "s"}`
      )
    );
    console.log();

    // Display suggestions
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const confidencePercent = Math.round(
        (typeof suggestion.confidence === "number" ? suggestion.confidence : 0) * 100
      );
      const name = String(suggestion.name);
      const purpose = suggestion.purpose ? String(suggestion.purpose) : "N/A";
      const rationale = suggestion.rationale ? String(suggestion.rationale) : "";

      console.log(`${symbols.info} [${i + 1}/${suggestions.length}] ${theme.bold(name)}`);
      console.log(theme.muted(`  Purpose: ${purpose}`));
      console.log(theme.muted(`  Confidence: ${confidencePercent}%`));
      if (rationale) {
        console.log(theme.muted(`  Rationale: ${rationale}`));
      }
      console.log();
    }

    // Interactive approval for creating commands
    console.log(formatSection("Create Commands", ""));

    let createdCount = 0;
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const name = String(suggestion.name);
      const purpose = suggestion.purpose ? String(suggestion.purpose) : "";
      const confidence = typeof suggestion.confidence === "number" ? suggestion.confidence : 0;

      const create = await confirm({
        message: `Create command '${name}'?`,
        default: confidence > 0.7,
      });

      if (create) {
        // Generate a basic description if not provided
        const description = purpose || `AI-suggested command: ${name}`;

        // Create a basic prompt template for the command
        const content = `You are an expert assistant. Help the user with: ${purpose || name}

Provide clear, actionable guidance. If the user provides context or examples, use them to tailor your response.`;

        try {
          await createGlobalCommand(name, description, content);
          createdCount++;

          console.log(
            successBox(`Created command: /${name}`, {
              Description: description,
            })
          );
        } catch (error) {
          console.error(
            errorBox(`Failed to create command '${name}'`, {
              error: error instanceof Error ? error.message : String(error),
            })
          );
        }
      } else {
        console.log(warningBox(`Skipped command: ${name}`));
      }
      console.log();
    }

    // Summary
    if (createdCount > 0) {
      console.log(formatSection("Summary", ""));
      console.log(
        successBox(`Created ${createdCount} new command${createdCount === 1 ? "" : "s"}`, {
          "Try them": `bozly command list`,
        })
      );
    }
  } catch (error) {
    console.error(
      errorBox("AI suggestion failed", {
        error: error instanceof Error ? error.message : String(error),
        hint: `Make sure ${provider} is installed and configured`,
      })
    );
    throw error;
  }
}
