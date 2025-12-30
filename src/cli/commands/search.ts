/**
 * bozly search - Search across all vaults for sessions, memories, and commands
 *
 * Usage:
 *   bozly search "query"                              # Search everywhere
 *   bozly search "query" --command music              # Filter by command
 *   bozly search "query" --provider claude            # Filter by provider
 *   bozly search "query" --older-than 7               # Sessions from last 7 days
 *   bozly search "query" --vaults music,journal       # Search specific vaults
 *   bozly search "query" --in sessions,memories       # Search specific targets
 *   bozly search "query" --limit 100                  # Max results
 *   bozly search "query" --json                       # JSON output
 *   bozly search "query" --export results.json        # Export to JSON
 *   bozly search "query" --export results.csv         # Export to CSV
 */

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { logger } from "../../core/logger.js";
import { CrossNodeSearcher } from "../../core/search.js";
import { SearchQuery, AggregatedSearchResults } from "../../core/types.js";
import { formatSearchResultsTable, successBox, errorBox, theme } from "../../cli/ui/index.js";

export const searchCommand = new Command("search")
  .description("Search across all vaults for sessions, memories, and commands")
  .argument("<query>", "Search query text")
  .option("-c, --command <name>", "Filter by command name")
  .option("-p, --provider <provider>", "Filter by provider (claude, gpt, gemini, ollama)")
  .option("-n, --vaults <vaults>", "Comma-separated vault IDs to search")
  .option("-s, --status <status>", "Filter by status (completed, failed, dry_run)")
  .option("--older-than <days>", "Sessions older than N days")
  .option("--newer-than <days>", "Sessions newer than N days")
  .option("--in <targets>", "Search targets (sessions,memories,commands)")
  .option("-l, --limit <number>", "Max results (default: 50)")
  .option("--json", "Output as JSON")
  .option("-e, --export <file>", "Export results to file (JSON or CSV based on extension)")
  .action(async (query: string, options) => {
    try {
      await logger.debug("bozly search command started", {
        query,
        command: options.command,
        provider: options.provider,
        nodes: options.nodes,
        status: options.status,
        olderThan: options.olderThan,
        newerThan: options.newerThan,
        in: options.in,
        limit: options.limit,
      });

      const homeDir = process.env.HOME ?? "/root";
      const bozlyPath = path.join(homeDir, ".bozly");

      // Create searcher
      const searcher = new CrossNodeSearcher(bozlyPath);

      // Build search query
      const searchQuery: SearchQuery = {
        text: query,
        limit: options.limit ? parseInt(options.limit, 10) : 50,
      };

      if (options.command) {
        searchQuery.command = options.command;
      }

      if (options.provider) {
        searchQuery.provider = options.provider;
      }

      if (options.status) {
        if (!["completed", "failed", "dry_run"].includes(options.status)) {
          console.error(
            errorBox("Invalid status", {
              received: options.status,
              valid: "completed, failed, dry_run",
            })
          );
          process.exit(1);
        }
        searchQuery.status = options.status;
      }

      // Handle date filters
      if (options.olderThan) {
        const days = parseInt(options.olderThan, 10);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        searchQuery.startDate = startDate.toISOString();
      }

      if (options.newerThan) {
        const days = parseInt(options.newerThan, 10);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - days);
        searchQuery.endDate = endDate.toISOString();
      }

      // Handle search targets
      if (options.in) {
        const targets = options.in.split(",").map((t: string) => t.trim());
        searchQuery.searchIn = targets;
      }

      // Execute search
      const results = await searcher.searchAll(searchQuery);

      // Output results
      if (options.json || options.export?.endsWith(".json")) {
        const jsonOutput = JSON.stringify(results, null, 2);
        if (options.export) {
          fs.writeFileSync(options.export, jsonOutput);
          console.log(successBox(`Results exported to ${options.export}`));
        } else {
          console.log(jsonOutput);
        }
      } else if (options.export?.endsWith(".csv")) {
        const csvContent = convertToCsv(results);
        fs.writeFileSync(options.export, csvContent);
        console.log(successBox(`Results exported to ${options.export}`));
      } else {
        // Display formatted results
        displaySearchResults(results);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Search command failed", {
        error: errorMsg,
      });

      console.error(
        errorBox("Search command failed", {
          error: errorMsg,
        })
      );
      process.exit(1);
    }
  });

/**
 * Display search results in formatted table output
 */
function displaySearchResults(results: AggregatedSearchResults): void {
  const { counts, results: resultsByType, queryTimeMs, query } = results;

  console.log();
  console.log(
    theme.info(`SEARCH RESULTS: "${query.text ?? "(no text filter)"}"`) +
      ` ${theme.muted(`(${counts.total} results, ${queryTimeMs}ms)`)}`
  );
  console.log();

  // Build unified results array for formatSearchResultsTable
  const tableData: Array<{
    type: "session" | "command" | "memory";
    command?: string;
    node: string;
    date?: string;
    time?: string;
    status?: string;
    name?: string;
    source?: string;
    summary?: string;
    score: number;
  }> = [];

  // Add sessions
  for (const result of resultsByType.sessions.slice(0, 10)) {
    const session = result.session;
    const timestamp = new Date(session.timestamp);
    const dateStr = timestamp.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
    });
    const timeStr = timestamp.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    tableData.push({
      type: "session",
      command: session.command ?? "?",
      node: result.nodeInfo.nodeName,
      date: dateStr,
      time: timeStr,
      status: session.status,
      score: result.relevanceScore,
    });
  }

  // Add memories
  for (const result of resultsByType.memories.slice(0, 5)) {
    tableData.push({
      type: "memory",
      summary: result.memory.summary,
      node: result.memory.nodeName,
      score: result.relevanceScore,
    });
  }

  // Add commands
  for (const result of resultsByType.commands.slice(0, 10)) {
    const cmd = result.command;
    tableData.push({
      type: "command",
      name: cmd.name,
      source: cmd.source ?? "builtin",
      node: result.sourceNode?.nodeName ?? "global",
      score: result.relevanceScore,
    });
  }

  // Display table
  if (tableData.length > 0) {
    console.log(formatSearchResultsTable(tableData));
  }

  // Show truncation notices
  if (counts.sessions > 10) {
    console.log(theme.muted(`... and ${counts.sessions - 10} more sessions`));
  }
  if (counts.memories > 5) {
    console.log(theme.muted(`... and ${counts.memories - 5} more memories`));
  }
  if (counts.commands > 10) {
    console.log(theme.muted(`... and ${counts.commands - 10} more commands`));
  }
  console.log();

  // Summary
  console.log(
    theme.muted(
      `Total: ${counts.sessions} sessions, ${counts.memories} memories, ${counts.commands} commands`
    )
  );
}

/**
 * Convert search results to CSV format
 */
function convertToCsv(results: AggregatedSearchResults): string {
  const lines: string[] = [];

  // Sessions
  if (results.results.sessions.length > 0) {
    lines.push("Type,Command,Node,Status,Timestamp,Relevance");
    for (const result of results.results.sessions) {
      const session = result.session;
      lines.push(
        [
          "Session",
          session.command || "?",
          result.nodeInfo.nodeName,
          session.status,
          session.timestamp,
          (result.relevanceScore * 100).toFixed(1),
        ]
          .map((f) => `"${String(f).replace(/"/g, '""')}"`)
          .join(",")
      );
    }
    lines.push("");
  }

  // Memories
  if (results.results.memories.length > 0) {
    lines.push("Type,Summary,Node,Command,Timestamp,Relevance");
    for (const result of results.results.memories) {
      lines.push(
        [
          "Memory",
          result.memory.summary.substring(0, 100),
          result.memory.nodeName,
          result.memory.command,
          result.memory.timestamp,
          (result.relevanceScore * 100).toFixed(1),
        ]
          .map((f) => `"${String(f).replace(/"/g, '""')}"`)
          .join(",")
      );
    }
    lines.push("");
  }

  // Commands
  if (results.results.commands.length > 0) {
    lines.push("Type,Command,Source,Node,Description,Relevance");
    for (const result of results.results.commands) {
      lines.push(
        [
          "Command",
          result.command.name,
          result.command.source ?? "builtin",
          result.sourceNode?.nodeName ?? "global",
          (result.command.description ?? "").substring(0, 100),
          (result.relevanceScore * 100).toFixed(1),
        ]
          .map((f) => `"${String(f).replace(/"/g, '""')}"`)
          .join(",")
      );
    }
  }

  return lines.join("\n");
}
