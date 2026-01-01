#!/usr/bin/env node

/**
 * BOZLY CLI - Build. OrganiZe. Link. Yield.
 *
 * AI-agnostic framework for domain-specific workspaces
 */

import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import os from "os";

// Import logger
import { logger, LogLevel } from "../core/logger.js";

// Import commands
import { initCommand } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { addCommand } from "./commands/add.js";
import { removeCommand } from "./commands/remove.js";
import { statusCommand } from "./commands/status.js";
import { contextCommand } from "./commands/context.js";
import { runCommand } from "./commands/run.js";
import { configCommand } from "./commands/config.js";
import { logsCommand } from "./commands/logs.js";
import { diffCommand } from "./commands/diff.js";
import { versionCommand } from "./commands/version.js";
import { workflowsCommand } from "./commands/workflows.js";
import { cleanupCommand } from "./commands/cleanup.js";
import { commandCommand } from "./commands/command.js";
import { templateCommand } from "./commands/template.js";
import { suggestCommand } from "./commands/suggest.js";
import { searchCommand } from "./commands/search.js";
import { historyCommand } from "./commands/history.js";
import { serveCommand } from "./commands/serve.js";
import { stopCommand } from "./commands/stop.js";
import { tuiCommand } from "./commands/tui.js";
import { vaultCommand } from "./commands/vault.js";
import { diagnoseCommand } from "./commands/diagnose.js";

// Import version from single source of truth
import { FULL_VERSION } from "../core/version.js";

// Import UI utilities
import { renderBanner } from "./ui/index.js";

// Import Help class from commander
import { Help } from "commander";

/**
 * Custom Help class that prepends the BOZLY banner to all help output
 * This ensures the banner appears for:
 * - Main program help (bozly --help)
 * - All subcommand help (bozly init --help, bozly run --help, etc.)
 * - Future commands automatically
 */
class BozlyHelp extends Help {
  formatHelp(cmd: Command, helper: Help): string {
    return renderBanner() + super.formatHelp(cmd, helper);
  }
}

/**
 * Initialize logger based on environment variables
 */
async function initializeLogger(): Promise<void> {
  // Determine log level from BOZLY_DEBUG environment variable
  const debugMode = process.env.BOZLY_DEBUG === "true";
  const logLevel = debugMode ? LogLevel.DEBUG : LogLevel.INFO;

  // Set log directory to ~/.bozly/logs/
  const logDir = path.join(os.homedir(), ".bozly", "logs");

  try {
    await logger.init(logDir, {
      level: logLevel,
      enableFile: true,
      enableConsole: true,
      includeContext: true,
      includeTimestamp: true,
    });

    if (debugMode) {
      await logger.info("Debug mode enabled (BOZLY_DEBUG=true)");
    }
  } catch (error) {
    // Logger initialization errors are non-fatal, continue with console output
    if (debugMode) {
      console.error("Warning: Failed to initialize logger:", error);
    }
  }
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  // Initialize logger
  await initializeLogger();

  // Log CLI startup
  await logger.debug("BOZLY CLI starting", {
    version: FULL_VERSION,
    args: process.argv.slice(2),
    debugMode: process.env.BOZLY_DEBUG === "true",
  });

  // Create main program
  const program = new Command();

  program
    .name("bozly")
    .description(
      chalk.cyan("BOZLY") +
        " — Build. OrganiZe. Link. Yield.\n\n" +
        "AI-agnostic framework for domain-specific workspaces.\n" +
        "Works with Claude, GPT, Gemini, Ollama, and any AI CLI."
    );

  // Custom version output with banner
  program.option("-v, --version", "Show version number", () => {
    console.log(renderBanner());
    console.log(chalk.gray("Version:"), FULL_VERSION);
    process.exit(0);
  });

  // Use custom Help class for all commands (main + subcommands)
  program.helpCommand(false); // Disable default 'help' command
  program.addHelpCommand("help [command]", "Display help for command");
  program.createHelp = () => new BozlyHelp();

  // Helper function to apply BozlyHelp to a command
  const applyBozlyHelp = (cmd: Command): void => {
    cmd.createHelp = () => new BozlyHelp();
    // Recursively apply to subcommands
    cmd.commands.forEach((subCmd) => applyBozlyHelp(subCmd));
  };

  // Register commands
  program.addCommand(initCommand);
  program.addCommand(listCommand);
  program.addCommand(addCommand);
  program.addCommand(removeCommand);
  program.addCommand(statusCommand);
  program.addCommand(contextCommand);
  program.addCommand(runCommand);
  program.addCommand(configCommand);
  program.addCommand(logsCommand);
  program.addCommand(diffCommand);
  program.addCommand(versionCommand);
  program.addCommand(workflowsCommand);
  program.addCommand(cleanupCommand);
  program.addCommand(commandCommand);
  program.addCommand(templateCommand);
  program.addCommand(suggestCommand);
  program.addCommand(searchCommand);
  program.addCommand(historyCommand);
  program.addCommand(serveCommand);
  program.addCommand(stopCommand);
  program.addCommand(tuiCommand);
  program.addCommand(vaultCommand);
  program.addCommand(diagnoseCommand);

  // Apply BozlyHelp to all commands and subcommands
  program.commands.forEach((cmd) => applyBozlyHelp(cmd));

  // Default action (no command specified)
  program.action(() => {
    console.log(renderBanner());
    console.log(chalk.gray("Version:"), FULL_VERSION);
    console.log();
    console.log(chalk.yellow("Quick Start:"));
    console.log("  bozly init              Initialize a vault in current directory");
    console.log("  bozly list              List all registered vaults");
    console.log("  bozly status            Show current vault status");
    console.log();
    console.log(chalk.yellow("Context & Execution:"));
    console.log("  bozly context           Generate AI context");
    console.log("  bozly run <command>     Execute a vault command");
    console.log("  bozly logs              View session logs");
    console.log();
    console.log(chalk.yellow("Dashboard & UI:"));
    console.log("  bozly serve             Start API server (required for TUI)");
    console.log("  bozly tui               Launch Terminal UI Dashboard");
    console.log();
    console.log(chalk.gray("Run 'bozly --help' for all commands"));
  });

  // Parse arguments
  program.parse();
}

// Run main CLI
main().catch((error) => {
  console.error(chalk.red("Fatal error:"), error.message);
  process.exit(1);
});
