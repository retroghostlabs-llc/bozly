#!/usr/bin/env node

import { confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { BozlyTUI } from "./core/app.js";
import { APIClient } from "./core/api-client.js";
import { spawnAPIServer, waitForAPIServer } from "./utils/server.js";
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
    // Get API URL
    const apiUrl = options?.apiUrl ?? process.env.BOZLY_API_URL ?? "http://localhost:3000/api";
    const refreshInterval = options?.refreshInterval ?? 5000;

    // Check if API server is running
    const apiClient = new APIClient(apiUrl as string);
    const isHealthy = await apiClient.isHealthy();

    if (!isHealthy) {
      console.log("");
      console.log(chalk.yellow("⚠️  API server is not running"));
      console.log("");

      // Ask user if they want to start it
      const shouldStart = await confirm({
        message: "Start API server now?",
        default: true,
      });

      if (shouldStart) {
        console.log(chalk.blue("→ Starting API server..."));

        try {
          await spawnAPIServer();

          // Wait for server to be ready
          console.log(chalk.blue("→ Waiting for server to be ready..."));
          const isReady = await waitForAPIServer(apiUrl as string);

          if (!isReady) {
            console.error(chalk.red("✗ API server failed to start within timeout"));
            process.exit(1);
          }

          console.log(chalk.green("✓ API server started successfully"));
          console.log("");
        } catch (error) {
          console.error(chalk.red("✗ Failed to start API server:"), error);
          process.exit(1);
        }
      } else {
        console.log("");
        console.log(chalk.yellow("To start the API server manually, run:"));
        console.log("");
        console.log(chalk.cyan("  bozly serve"));
        console.log("");
        process.exit(1);
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
