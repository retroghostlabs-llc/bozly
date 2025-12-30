/**
 * bozly list - List all registered vaults
 */

import { Command } from "commander";
import { logger } from "../../core/logger.js";
import { getRegistry } from "../../core/registry.js";
import { formatNodeTable, infoBox } from "../../cli/ui/index.js";

export const listCommand = new Command("list")
  .alias("ls")
  .description("List all registered vaults")
  .option("-a, --all", "Show all details")
  .action(async (options) => {
    try {
      await logger.debug("bozly list command started", {
        all: options.all,
      });

      const registry = await getRegistry();

      await logger.info("Registry loaded", {
        vaultCount: registry.nodes.length,
      });

      if (registry.nodes.length === 0) {
        console.log(
          infoBox("No vaults registered", {
            hint1: "Try: bozly init (create new vault)",
            hint2: "Try: bozly add <path> (register existing)",
          })
        );
        return;
      }

      console.log(formatNodeTable(registry.nodes, { showDetails: options.all }));
      console.log();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to list vaults", {
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(errorMsg);
      }
      process.exit(1);
    }
  });
