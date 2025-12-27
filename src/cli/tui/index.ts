#!/usr/bin/env node

import { select } from "@inquirer/prompts";
import chalk from "chalk";
import { BozlyTUI } from "./core/app.js";
import { APIClient } from "./core/api-client.js";
import { spawnAPIServer, waitForAPIServer } from "./utils/server.js";
import { killServerOnPort } from "../../core/server-manager.js";
import { getDefaultPort, getAPIURL } from "../../core/port-config.js";
import { HomeScreen } from "./screens/home.js";
import { VaultsScreen } from "./screens/vaults.js";
import { SessionsScreen } from "./screens/sessions.js";
import { MemoryScreen } from "./screens/memory.js";
import { CommandsScreen } from "./screens/commands.js";
import { WorkflowsScreen } from "./screens/workflows.js";
import { ConfigScreen } from "./screens/config.js";
import { HealthScreen } from "./screens/health.js";

/**
 * TUI entry point
 * Usage: bozly tui [options]
 */
export async function runTUI(options?: Record<string, unknown>): Promise<void> {
  try {
    // Get API URL from config or options
    const port = options?.port as number | undefined;
    const host = options?.host as string | undefined;
    const apiUrl = options?.apiUrl ?? process.env.BOZLY_API_URL ?? getAPIURL(port, host);
    const refreshInterval = options?.refreshInterval ?? 5000;

    // Check if API server is running
    const apiClient = new APIClient(apiUrl as string);
    const isHealthy = await apiClient.isHealthy();

    if (!isHealthy) {
      console.log("");
      console.log(chalk.yellow("⚠️  API server is not running"));
      console.log("");

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
        process.exit(0);
      }

      if (action === "manual") {
        console.log("");
        console.log(chalk.yellow("To start the API server manually, run:"));
        console.log("");
        console.log(chalk.cyan("  bozly serve"));
        console.log("");
        process.exit(0);
      }

      if (action === "restart") {
        console.log(chalk.blue("→ Stopping existing server..."));
        const configPort = port ?? getDefaultPort();
        const killed = await killServerOnPort(configPort);
        if (killed) {
          console.log(chalk.green("✓ Server stopped"));
        } else {
          console.log(chalk.yellow("⚠️  Could not stop existing server"));
        }
        // Wait a moment before starting new one
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (action === "start" || action === "restart") {
        console.log(chalk.blue("→ Starting API server..."));

        try {
          await spawnAPIServer();

          // Wait for server to be ready
          console.log(chalk.blue(`→ Waiting for server to be ready at ${String(apiUrl)}...`));
          const isReady = await waitForAPIServer(apiUrl as string);

          if (!isReady) {
            console.error(chalk.red("✗ API server failed to start"));
            console.error(chalk.yellow("Troubleshooting:"));
            const configPort = port ?? getDefaultPort();
            console.error(
              `  • Run: bozly stop (to kill any existing server on port ${configPort})`
            );
            console.error(`  • Check if port ${configPort} is in use: lsof -i :${configPort}`);
            console.error("  • Try manual start: bozly serve");
            console.error("");
            console.error(chalk.yellow("Configure port globally:"));
            console.error("  • Set env: export BOZLY_PORT=3847");
            console.error("  • Or edit: ~/.bozly/bozly-config.json");
            process.exit(1);
          }

          console.log(chalk.green("✓ API server started successfully"));
          console.log("");
        } catch (error) {
          console.error(chalk.red("✗ Failed to start API server:"), error);
          process.exit(1);
        }
      }
    }

    // Create TUI app
    const tui = new BozlyTUI({
      apiUrl: apiUrl as string,
      refreshInterval: refreshInterval as number,
    });

    // Initialize app
    await tui.init();

    // Register all screens
    const screen = tui.getScreen();

    const homeScreen = new HomeScreen(screen, apiClient, { id: "home", name: "Home" });
    const vaultsScreen = new VaultsScreen(screen, { id: "vaults", name: "Vaults" }, apiClient);
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

    tui.registerScreen(homeScreen);
    tui.registerScreen(vaultsScreen);
    tui.registerScreen(sessionsScreen);
    tui.registerScreen(memoryScreen);
    tui.registerScreen(commandsScreen);
    tui.registerScreen(workflowsScreen);
    tui.registerScreen(configScreen);
    tui.registerScreen(healthScreen);

    // Start TUI
    await tui.start();
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red("✗ TUI Error:"), error.message);
    } else {
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
