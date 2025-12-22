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

// Package info
const VERSION = "0.3.0-alpha.1";

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
    version: VERSION,
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
    )
    .version(VERSION, "-v, --version", "Show version number");

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

  // Default action (no command specified)
  program.action(() => {
    console.log(
      chalk.cyan(`
╔═══════════════════════════════════════════╗
║                                           ║
║   ${chalk.bold("BOZLY")} — Build. OrganiZe. Link. Yield.  ║
║                                           ║
║   AI-agnostic workspace framework         ║
║                                           ║
╚═══════════════════════════════════════════╝
`)
    );
    console.log(chalk.gray("Version:"), VERSION);
    console.log();
    console.log(chalk.yellow("Quick Start:"));
    console.log("  bozly init              Initialize a node in current directory");
    console.log("  bozly list              List all registered vaults");
    console.log("  bozly status            Show current node status");
    console.log();
    console.log(chalk.yellow("Context & Execution:"));
    console.log("  bozly context           Generate AI context");
    console.log("  bozly run <command>     Execute a node command");
    console.log("  bozly logs              View session logs");
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
