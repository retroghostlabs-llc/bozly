import { Command } from "commander";
import chalk from "chalk";
import { runTUI } from "../tui/index.js";

export const tuiCommand = new Command("tui")
  .description("Launch Terminal UI Dashboard (requires bozly serve running)")
  .option(
    "--api-url <url>",
    "API server URL (default: http://localhost:3000/api)",
    "http://localhost:3000/api"
  )
  .option("--refresh <ms>", "Refresh interval in milliseconds", "5000")
  .action(async (options) => {
    try {
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
