/**
 * bozly logs - View session logs with filtering
 *
 * Usage:
 *   bozly logs                           # Show recent sessions from current vault
 *   bozly logs --global                  # Show recent sessions across all vaults
 *   bozly logs --limit 20                # Show last 20 sessions
 *   bozly logs --command daily           # Filter by command
 *   bozly logs --provider claude         # Filter by AI provider
 *   bozly logs --status completed        # Filter by status (completed, failed, dry_run)
 *   bozly logs --node music-node       # Filter by node ID
 *   bozly logs --verbose                 # Show detailed information
 *   bozly logs --since 2025-12-20        # Sessions since date (ISO format)
 *   bozly logs --until 2025-12-21        # Sessions until date (ISO format)
 *   bozly logs --global --stats          # Show global statistics
 */

import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";
import {
  querySessions,
  formatSessionForLogs,
  querySessionsGlobal,
  getSessionStatsGlobal,
} from "../../core/sessions.js";
import { SessionQueryOptions } from "../../core/types.js";
import path from "path";
import os from "os";

export const logsCommand = new Command("logs")
  .description("View and filter session logs")
  .option("-l, --limit <number>", "Maximum number of sessions to show (default: 10)")
  .option("-c, --command <name>", "Filter by command name")
  .option("-p, --provider <name>", "Filter by AI provider (claude, gpt, gemini, ollama)")
  .option("-v, --node <id>", "Filter by node ID")
  .option("-s, --status <status>", "Filter by status (completed, failed, dry_run)")
  .option("--since <date>", "Sessions since date (ISO 8601 format)")
  .option("--until <date>", "Sessions until date (ISO 8601 format)")
  .option("--global", "Query sessions across all vaults")
  .option("--stats", "Show session statistics instead of details")
  .option("--verbose", "Show detailed session information")
  .action(async (options) => {
    try {
      await logger.debug("bozly logs command started", {
        limit: options.limit,
        command: options.command,
        provider: options.provider,
        vault: options.vault,
        status: options.status,
        since: options.since,
        until: options.until,
        global: options.global,
        stats: options.stats,
        verbose: options.verbose,
      });

      // Build query options
      const queryOptions: SessionQueryOptions = {
        limit: options.limit ? parseInt(options.limit, 10) : 10,
      };

      if (options.command) {
        queryOptions.command = options.command;
      }

      if (options.provider) {
        queryOptions.provider = options.provider;
      }

      if (options.vault) {
        queryOptions.node = options.vault;
      }

      if (options.status) {
        if (!["completed", "failed", "dry_run"].includes(options.status)) {
          console.error(chalk.red("Invalid status. Must be one of: completed, failed, dry_run"));
          process.exit(1);
        }
        queryOptions.status = options.status;
      }

      if (options.since) {
        try {
          const sinceDate = new Date(options.since);
          if (isNaN(sinceDate.getTime())) {
            throw new Error("Invalid date format");
          }
          queryOptions.startDate = sinceDate.toISOString();
        } catch {
          console.error(chalk.red("Invalid --since date format. Use ISO 8601 (e.g., 2025-12-20)"));
          process.exit(1);
        }
      }

      if (options.until) {
        try {
          const untilDate = new Date(options.until);
          if (isNaN(untilDate.getTime())) {
            throw new Error("Invalid date format");
          }
          queryOptions.endDate = untilDate.toISOString();
        } catch {
          console.error(chalk.red("Invalid --until date format. Use ISO 8601 (e.g., 2025-12-21)"));
          process.exit(1);
        }
      }

      // Handle global vs vault-specific queries
      if (options.global) {
        // Query across all vaults
        const globalSessionsPath = path.join(os.homedir(), ".bozly", "sessions");

        await logger.info("Querying sessions globally", {
          filters: queryOptions,
        });

        // Get sessions
        const sessions = await querySessionsGlobal(globalSessionsPath, queryOptions);

        // Handle stats mode
        if (options.stats) {
          const stats = await getSessionStatsGlobal(globalSessionsPath, queryOptions);

          console.log(chalk.cyan("\n📊 Global Session Statistics:\n"));
          console.log(chalk.gray(`  Total Sessions: ${stats.totalSessions}`));
          console.log(chalk.green(`  Successful: ${stats.totalSuccessful}`));
          console.log(chalk.red(`  Failed: ${stats.totalFailed}`));
          console.log(chalk.gray(`  Average Duration: ${stats.averageDuration}ms`));
          console.log(chalk.gray(`  Average Prompt Size: ${stats.averagePromptSize} chars`));

          if (stats.nodesWithSessions.length > 0) {
            console.log(chalk.cyan("\n  Sessions by Vault:"));
            for (const node of stats.nodesWithSessions) {
              const count = stats.sessionsByNode[node];
              console.log(chalk.gray(`    ${node}: ${count}`));
            }
          }

          if (stats.providersUsed.length > 0) {
            console.log(chalk.cyan("\n  Providers Used:"));
            for (const provider of stats.providersUsed) {
              const count = stats.sessionsByProvider[provider];
              console.log(chalk.gray(`    ${provider}: ${count}`));
            }
          }

          if (stats.commandsExecuted.length > 0) {
            console.log(chalk.cyan("\n  Commands Executed:"));
            for (const cmd of stats.commandsExecuted.slice(0, 10)) {
              console.log(chalk.gray(`    ${cmd}`));
            }
            if (stats.commandsExecuted.length > 10) {
              console.log(chalk.gray(`    ... and ${stats.commandsExecuted.length - 10} more`));
            }
          }

          return;
        }

        if (sessions.length === 0) {
          console.log(chalk.yellow("No matching sessions found across all vaults."));
          return;
        }

        // Display results
        console.log(chalk.cyan(`\nGlobal Session Logs (${sessions.length} result(s)):\n`));

        for (const session of sessions) {
          const formatted = formatSessionForLogs(session, options.verbose);
          console.log(formatted);

          if (options.verbose) {
            console.log(chalk.gray(`  ID: ${session.id}`));
            console.log(chalk.gray(`  Vault: ${session.nodeId}`));

            if (session.error) {
              console.log(chalk.red(`  Error: ${session.error.message}`));
            }
            console.log();
          }
        }

        // Show summary
        const successful = sessions.filter((s) => s.status === "completed").length;
        const failed = sessions.filter((s) => s.status === "failed").length;
        const avgDuration =
          sessions.reduce((sum, s) => sum + (s.executionTimeMs || 0), 0) / sessions.length;

        console.log(chalk.gray("\nSummary:"));
        console.log(chalk.gray(`  Successful: ${successful}`));
        console.log(chalk.gray(`  Failed: ${failed}`));
        console.log(chalk.gray(`  Average Duration: ${Math.round(avgDuration)}ms`));
      } else {
        // Query from current vault
        const node = await getCurrentNode();

        if (!node) {
          await logger.warn("Not in a node directory");
          console.log(chalk.yellow("✗ Not in a node directory"));
          console.log(
            "  Run 'bozly logs' from within a vault, or use 'bozly logs --global' to view all vaults."
          );
          process.exit(1);
        }

        await logger.info("Querying sessions from vault", {
          vaultPath: node.path,
          filters: queryOptions,
        });

        // Query sessions
        const vaultPath = node.path;
        const sessions = await querySessions(vaultPath, queryOptions);

        // Handle stats mode
        if (options.stats) {
          const stats = await getSessionStatsGlobal(
            path.join(vaultPath, ".bozly", "sessions"),
            queryOptions
          );

          console.log(chalk.cyan(`\n📊 Session Statistics for ${node.name}:\n`));
          console.log(chalk.gray(`  Total Sessions: ${stats.totalSessions}`));
          console.log(chalk.green(`  Successful: ${stats.totalSuccessful}`));
          console.log(chalk.red(`  Failed: ${stats.totalFailed}`));
          console.log(chalk.gray(`  Average Duration: ${stats.averageDuration}ms`));
          console.log(chalk.gray(`  Average Prompt Size: ${stats.averagePromptSize} chars`));

          if (stats.providersUsed.length > 0) {
            console.log(chalk.cyan("\n  Providers Used:"));
            for (const provider of stats.providersUsed) {
              const count = stats.sessionsByProvider[provider];
              console.log(chalk.gray(`    ${provider}: ${count}`));
            }
          }

          if (stats.commandsExecuted.length > 0) {
            console.log(chalk.cyan("\n  Commands Executed:"));
            for (const cmd of stats.commandsExecuted) {
              console.log(chalk.gray(`    ${cmd}`));
            }
          }

          return;
        }

        if (sessions.length === 0) {
          console.log(chalk.yellow("No matching sessions found."));

          if (options.command) {
            console.log(`\nTry running: ${chalk.gray(`bozly run ${options.command}`)}`);
          }
          return;
        }

        // Display results
        console.log(chalk.cyan(`\nSession Logs (${sessions.length} result(s)):\n`));

        for (const session of sessions) {
          const formatted = formatSessionForLogs(session, options.verbose);
          console.log(formatted);

          if (options.verbose) {
            const commandPath = path.join(vaultPath, ".bozly", "commands", `${session.command}.md`);
            console.log(chalk.gray(`  ID: ${session.id}`));
            console.log(chalk.gray(`  Path: ${commandPath}`));

            if (session.error) {
              console.log(chalk.red(`  Error: ${session.error.message}`));
            }
            console.log();
          }
        }

        // Show summary
        const successful = sessions.filter((s) => s.status === "completed").length;
        const failed = sessions.filter((s) => s.status === "failed").length;
        const avgDuration =
          sessions.reduce((sum, s) => sum + (s.executionTimeMs || 0), 0) / sessions.length;

        console.log(chalk.gray("\nSummary:"));
        console.log(chalk.gray(`  Successful: ${successful}`));
        console.log(chalk.gray(`  Failed: ${failed}`));
        console.log(chalk.gray(`  Average Duration: ${Math.round(avgDuration)}ms`));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to query logs", {
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
