/**
 * bozly history - Show recent sessions across all or specific vaults
 *
 * Usage:
 *   bozly history                    # Show last 10 sessions across all vaults
 *   bozly history music              # Show history for 'music' vault
 *   bozly history --limit 20         # Show last 20
 *   bozly history --provider claude  # Filter by provider
 *   bozly history --command daily    # Filter by command
 *   bozly history --older-than 7     # Sessions from last 7 days
 *   bozly history --json             # JSON output
 */

import { Command } from "commander";
import { logger } from "../../core/logger.js";
import { CrossNodeSearcher } from "../../core/search.js";
import { HistoryOptions, HistoryResult } from "../../core/types.js";
import { errorBox, warningBox, theme } from "../../cli/ui/index.js";
import path from "path";

export const historyCommand = new Command("history")
  .description("Show recent sessions across all or specific vaults")
  .argument("[vault]", "Optional: specific vault ID")
  .option("-l, --limit <number>", "Max results (default: 10, max: 100)")
  .option("-p, --provider <provider>", "Filter by provider (claude, gpt, gemini, ollama)")
  .option("-c, --command <name>", "Filter by command name")
  .option("--older-than <days>", "Sessions from last N days")
  .option("--status <status>", "Filter by status (completed, failed, dry_run)")
  .option("--json", "Output as JSON")
  .action(async (nodeId: string | undefined, options) => {
    try {
      await logger.debug("bozly history command started", {
        nodeId,
        limit: options.limit,
        provider: options.provider,
        command: options.command,
        olderThan: options.olderThan,
        status: options.status,
      });

      const homeDir = process.env.HOME ?? "/root";
      const bozlyPath = path.join(homeDir, ".bozly");

      // Create searcher
      const searcher = new CrossNodeSearcher(bozlyPath);

      // Build history options
      const historyOptions: HistoryOptions = {
        limit: options.limit ? Math.min(parseInt(options.limit, 10), 100) : 10,
      };

      if (options.provider) {
        historyOptions.provider = options.provider;
      }

      if (options.command) {
        historyOptions.command = options.command;
      }

      if (options.status) {
        if (!["completed", "failed", "dry_run"].includes(options.status)) {
          console.error(
            errorBox("Invalid status", {
              valid: "completed, failed, dry_run",
              received: options.status,
            })
          );
          process.exit(1);
        }
        historyOptions.status = options.status;
      }

      if (options.olderThan) {
        historyOptions.older = parseInt(options.olderThan, 10);
      }

      // Get history
      const results = await searcher.getRecentSessions(historyOptions, nodeId);

      if (results.length === 0) {
        console.log(warningBox(`No sessions found${nodeId ? ` for vault '${nodeId}'` : ""}`));
        return;
      }

      // Output
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        displayHistory(results, nodeId);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("History command failed", {
        error: errorMsg,
      });

      console.error(
        errorBox("History command failed", {
          error: errorMsg,
        })
      );
      process.exit(1);
    }
  });

/**
 * Display history in formatted output grouped by node
 */
function displayHistory(results: HistoryResult[], singleNode?: string): void {
  console.log();

  if (singleNode) {
    console.log(theme.info(`HISTORY: ${singleNode} (${results.length})`));
  } else {
    console.log(theme.info(`RECENT SESSIONS (last ${results.length})`));
  }

  console.log(theme.muted("─".repeat(Math.min(process.stdout.columns || 120, 120))));
  console.log();

  if (singleNode) {
    // Single node - just list sessions
    displayNodeSessions(results);
  } else {
    // Multiple nodes - group by node
    const byNode: Record<string, HistoryResult[]> = {};
    for (const result of results) {
      const nodeId = result.nodeInfo.nodeId;
      if (!byNode[nodeId]) {
        byNode[nodeId] = [];
      }
      byNode[nodeId].push(result);
    }

    for (const sessions of Object.values(byNode)) {
      const nodeName = sessions[0].nodeInfo.nodeName;
      console.log(theme.bold(theme.info(`${nodeName} (${sessions.length})`)));
      displayNodeSessions(sessions);
      console.log();
    }
  }

  console.log(theme.muted(`Total: ${results.length} session${results.length === 1 ? "" : "s"}`));
  console.log();
}

/**
 * Display sessions for a node
 */
function displayNodeSessions(results: HistoryResult[]): void {
  for (const result of results) {
    const session = result.session;
    const timestamp = new Date(session.timestamp);
    const timeStr = timestamp.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const commandName = session.command || "?";
    const status = formatStatus(session.status);
    const provider = session.provider || "?";
    const duration = session.executionTimeMs
      ? `${(session.executionTimeMs / 1000).toFixed(1)}s`
      : "?";

    console.log(
      `  ${theme.muted(timeStr)} ${theme.info(
        commandName.padEnd(15)
      )} ${status.padEnd(15)} ${theme.muted(`[${provider}]`)} ${theme.muted(`${duration}`)}`
    );

    // Show memory summary if available
    if (result.memory) {
      console.log(theme.muted(`    → ${result.memory.summary.substring(0, 70)}`));
    }
  }
}

/**
 * Format session status with color
 */
function formatStatus(status: string): string {
  switch (status) {
    case "completed":
      return theme.success("✓ completed");
    case "failed":
      return theme.error("✗ failed");
    case "dry_run":
      return theme.warning("• dry_run");
    default:
      return status;
  }
}
