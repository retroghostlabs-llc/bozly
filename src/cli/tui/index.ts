#!/usr/bin/env node

import { BozlyTUI } from "./core/app.js";
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
    // Create TUI app
    const apiUrl = options?.apiUrl ?? process.env.BOZLY_API_URL ?? "http://localhost:3000/api";
    const refreshInterval = options?.refreshInterval ?? 5000;
    const tui = new BozlyTUI({
      apiUrl: apiUrl as string,
      refreshInterval: refreshInterval as number,
    });

    // Initialize app
    await tui.init();

    // Register all screens
    const apiClient = tui.getAPIClient();
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
      if (error.message.includes("not running")) {
        console.error("✗ BOZLY TUI requires the API server to be running");
        console.error("");
        console.error("Start the API server in another terminal:");
        console.error("  $ bozly serve");
        console.error("");
        console.error("Then start the TUI:");
        console.error("  $ bozly tui");
        process.exit(1);
      }

      console.error("✗ TUI Error:", error.message);
    } else {
      console.error("✗ TUI Error:", error);
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
