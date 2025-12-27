import { Command } from "commander";
import chalk from "chalk";
import { getAPIURL } from "../../core/port-config.js";

export const tuiCommand = new Command("tui")
  .description("Launch Terminal UI Dashboard (requires bozly serve running)")
  .option("--api-url <url>", `API server URL (default: ${getAPIURL()})`, getAPIURL())
  .option("--refresh <ms>", "Refresh interval in milliseconds", "5000")
  .action(async (options) => {
    try {
      // Set safe TERM before importing blessed modules
      // This prevents terminfo parsing errors on systems with problematic xterm-256color definitions
      if (!process.env.TERM || process.env.TERM === "xterm-256color") {
        process.env.TERM = "xterm";
      }

      // Dynamically import runTUI to delay blessed import until TERM is set
      const { runTUI } = await import("../tui/index.js");

      await runTUI({
        apiUrl: options.apiUrl,
        refreshInterval: parseInt(options.refresh, 10),
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red("✗ TUI Error:"), error.message);
      } else {
        console.error(chalk.red("✗ TUI Error:"), error);
      }
      process.exit(1);
    }
  });
