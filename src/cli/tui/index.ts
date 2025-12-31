#!/usr/bin/env node

import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { BozlyTUI } from "./core/app.js";
import { APIClient } from "./core/api-client.js";
import { spawnAPIServer, waitForAPIServer } from "./utils/server.js";
import { killServerOnPort } from "../../core/server-manager.js";
import { getDefaultPort, getAPIURL } from "../../core/port-config.js";
import { logger, LogLevel } from "../../core/logger.js";
import { ConfigManager } from "../../core/config-manager.js";
import { HomeScreen } from "./screens/home.js";
import { NodesScreen } from "./screens/nodes.js";
import { SessionsScreen } from "./screens/sessions.js";
import { MemoryScreen } from "./screens/memory.js";
import { CommandsScreen } from "./screens/commands.js";
import { WorkflowsScreen } from "./screens/workflows.js";
import { ConfigScreen } from "./screens/config.js";
import { HealthScreen } from "./screens/health.js";
import { HelpScreen } from "./screens/help.js";

/**
 * TUI entry point
 * Usage: bozly tui [options]
 */
export async function runTUI(options?: Record<string, unknown>): Promise<void> {
  try {
    // Initialize ConfigManager to access settings
    const config = ConfigManager.getInstance();

    // Initialize logger with ConfigManager settings
    const logDir = config.getStorage().logDir;
    const loggingConfig = config.getLogging();
    // Map string log level to LogLevel enum
    const logLevelValue = loggingConfig.level;
    const logLevel =
      typeof logLevelValue === "string"
        ? (LogLevel[logLevelValue.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO)
        : (logLevelValue ?? LogLevel.INFO);

    await logger.init(logDir, {
      level: logLevel,
      enableConsole: false, // Disable console for TUI since it uses the terminal
      enableFile: loggingConfig.enableFile,
    });

    // Get API URL from config or options
    const port = options?.port as number | undefined;
    const host = options?.host as string | undefined;
    const apiUrl = options?.apiUrl ?? process.env.BOZLY_API_URL ?? getAPIURL(port, host);
    const refreshInterval =
      (options?.refreshInterval as number | undefined) ?? config.getClient().tuiRefreshIntervalMs;

    // Check if API server is running
    const apiClient = new APIClient(apiUrl as string);
    const isHealthy = await apiClient.isHealthy();

    if (!isHealthy) {
      await logger.warn("API server is not running", { apiUrl });
      console.log(chalk.yellow("⚠️  API server is not running"));

      // Ask user what they want to do
      const action = await select({
        message: "What would you like to do?",
        choices: [
          { name: "Start new server", value: "start" },
          { name: "Restart server", value: "restart" },
          { name: "Use manual startup", value: "manual" },
          { name: "Exit", value: "exit" },
        ],
      });

      if (action === "exit") {
        await logger.info("User exited TUI startup");
        process.exit(0);
      }

      if (action === "manual") {
        await logger.info("User selected manual server startup");
        console.log(chalk.yellow("To start the API server manually, run:"));
        console.log(chalk.cyan("  bozly serve"));
        process.exit(0);
      }

      if (action === "restart") {
        await logger.info("User selected server restart");
        console.log(chalk.blue("→ Stopping existing server..."));
        const configPort = port ?? getDefaultPort();
        const killed = await killServerOnPort(configPort);
        if (killed) {
          await logger.info("Existing server stopped successfully", { port: configPort });
          console.log(chalk.green("✓ Server stopped"));
        } else {
          await logger.warn("Could not stop existing server", { port: configPort });
          console.log(chalk.yellow("⚠️  Could not stop existing server"));
        }
        // Wait a moment before starting new one
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (action === "start" || action === "restart") {
        await logger.info("Starting API server", { apiUrl });
        console.log(chalk.blue("→ Starting API server..."));

        try {
          await spawnAPIServer();

          // Wait for server to be ready
          console.log(chalk.blue(`→ Waiting for server to be ready at ${String(apiUrl)}...`));
          const isReady = await waitForAPIServer(apiUrl as string);

          if (!isReady) {
            const configPort = port ?? getDefaultPort();
            await logger.error("API server failed to start or become ready", {
              apiUrl,
              port: configPort,
              timeout: "30 attempts × 200ms",
            });
            console.error(chalk.red("✗ API server failed to start"));
            console.error(chalk.yellow("Troubleshooting:"));
            console.error(
              `  • Run: bozly stop (to kill any existing server on port ${configPort})`
            );
            console.error(chalk.yellow("Configure port globally:"));
            process.exit(1);
          }

          await logger.info("API server started successfully", { apiUrl });
          console.log(chalk.green("✓ API server started successfully"));
        } catch (error) {
          await logger.error(
            "Failed to start API server",
            error instanceof Error ? error : new Error(String(error))
          );
          console.error(chalk.red("✗ Failed to start API server:"), error);
          process.exit(1);
        }
      }
    }

    // Create TUI app
    const tui = new BozlyTUI({
      apiUrl: apiUrl as string,
      refreshInterval: refreshInterval,
    });

    // Check for actual terminal compatibility issues (only if TERM is unset)
    const term = process.env.TERM;
    if (!term || term === "dumb") {
      await logger.warn("Terminal compatibility issue detected", { term });
      console.log(chalk.yellow("⚠️  Terminal Compatibility Mode"));
      console.log(chalk.gray("───────────────────────────────────────────────────────────"));
      console.log(chalk.yellow("  BOZLY detected an unsupported terminal."));
      console.log(chalk.yellow("  Your TERM variable is not set or set to 'dumb'."));
      console.log(chalk.gray("  To enable full features, set your terminal type:"));
      console.log(chalk.cyan("    export TERM=xterm-256color"));
      console.log(
        chalk.gray("  For iTerm2: Settings → Profiles → Terminal → Report Terminal Type")
      );
      console.log(chalk.gray("  For detailed instructions, see: docs/TROUBLESHOOTING.md"));
      console.log(chalk.gray("───────────────────────────────────────────────────────────"));
    }

    // Initialize app
    tui.init();

    // Register all screens
    const screen = tui.getScreen();

    const homeScreen = new HomeScreen(screen, apiClient, { id: "home", name: "Home" });
    const nodesScreen = new NodesScreen(screen, { id: "nodes", name: "Nodes" }, apiClient);
    const sessionsScreen = new SessionsScreen(
      screen,
      { id: "sessions", name: "Sessions" },
      apiClient
    );
    const memoryScreen = new MemoryScreen(screen, { id: "memory", name: "Memory" }, apiClient);
    const commandsScreen = new CommandsScreen(
      screen,
      { id: "commands", name: "Commands" },
      apiClient
    );
    const workflowsScreen = new WorkflowsScreen(
      screen,
      { id: "workflows", name: "Workflows" },
      apiClient
    );
    const configScreen = new ConfigScreen(screen, { id: "config", name: "Config" }, apiClient);
    const healthScreen = new HealthScreen(screen, { id: "health", name: "Health" }, apiClient);
    const helpScreen = new HelpScreen(screen, { id: "help", name: "Help" });

    tui.registerScreen(homeScreen); // Home is default/starting screen (no menu number)
    tui.registerScreen(nodesScreen, 1);
    tui.registerScreen(sessionsScreen, 2);
    tui.registerScreen(commandsScreen, 3);
    tui.registerScreen(memoryScreen, 4);
    tui.registerScreen(workflowsScreen, 5);
    tui.registerScreen(configScreen, 6);
    tui.registerScreen(healthScreen, 7);
    tui.registerScreen(helpScreen, 8); // Help is menu option 8 and also triggered by "?" key

    // Start TUI
    await tui.start();

    // Keep the process alive while the TUI is running
    // The blessed screen will handle stdin, or if running in test mode, resolve immediately
    if (process.env.NODE_ENV === "test") {
      // In test mode, don't block
      return;
    }

    // In normal mode, wait indefinitely for the TUI to handle shutdown via keybindings (q, Ctrl+C)
    await new Promise(() => {
      // Intentionally never resolve - blessed screen keeps process alive
      // Shutdown is handled by keybindings that call process.exit(0)
    });
  } catch (error) {
    if (error instanceof Error) {
      await logger.error("TUI Error", error);
      console.error(chalk.red("✗ TUI Error:"), error.message);
    } else {
      await logger.error("TUI Error (unknown type)", new Error(String(error)));
      console.error(chalk.red("✗ TUI Error:"), error);
    }

    process.exit(1);
  }
}

// Export for testing
export { BozlyTUI };
export * from "./core/api-client.js";
export * from "./core/app.js";
export * from "./core/keybindings.js";
export * from "./core/modal.js";
export * from "./core/screen.js";
