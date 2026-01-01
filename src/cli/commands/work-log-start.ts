/**
 * bozly work-log-start - Initialize work session with context restoration
 *
 * Parses WORK-LOG.md to restore session context from the previous session.
 * Optionally restores tasks from TASKS.md for continuity.
 *
 * Usage:
 *   bozly work-log-start              # Initialize session with context
 *   bozly work-log-start --verbose    # Show detailed context restoration
 *   bozly work-log-start --restore    # Restore tasks from TASKS.md
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  initializeWorkSession,
  formatSessionStart,
  formatSessionStartVerbose,
} from "../../core/work-log-manager.js";
import { logger } from "../../core/logger.js";

export const workLogStartCommand = new Command("work-log-start")
  .description("Initialize work session and restore context from WORK-LOG.md")
  .option("-v, --verbose", "Show detailed context restoration information")
  .option("-r, --restore", "Restore tasks from TASKS.md (automatic if available)")
  .action(async (options: { verbose: boolean; restore: boolean }) => {
    try {
      await logger.debug("bozly work-log-start command started", {
        verbose: options.verbose,
        restore: options.restore,
      });

      console.log();

      // Initialize work session with context restoration
      const sessionInit = initializeWorkSession();

      // Format and display results
      const formatted = options.verbose
        ? formatSessionStartVerbose(sessionInit)
        : formatSessionStart(sessionInit);

      console.log(formatted);
      console.log();

      // Log summary
      await logger.info("Work session initialized", {
        isFreshStart: sessionInit.isFreshStart,
        hasLatestSession: sessionInit.latestSession !== null,
        tasksCount: sessionInit.tasks.length,
      });

      if (sessionInit.latestSession) {
        await logger.info("Restored session context", {
          sessionNumber: sessionInit.latestSession.sessionNumber,
          title: sessionInit.latestSession.title,
          status: sessionInit.latestSession.status,
          focus: sessionInit.latestSession.focus,
        });
      }

      process.exit(0);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Work session initialization failed", {
        error: errorMsg,
      });

      console.error(chalk.red("❌ Work session initialization error:"), errorMsg);
      process.exit(1);
    }
  });
