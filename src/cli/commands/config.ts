/**
 * bozly config - Manage configuration
 */

import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { getConfig, setConfig, getConfigPath } from "../../core/config.js";

export const configCommand = new Command("config")
  .description("Manage BOZLY configuration")
  .argument("[key]", "Configuration key to get/set")
  .argument("[value]", "Value to set")
  .option("-g, --global", "Use global configuration")
  .option("-l, --list", "List all configuration")
  .option("--path", "Show configuration file path")
  .action(async (key, value, options) => {
    try {
      const isGlobal = options.global;

      await logger.debug("bozly config command started", {
        key,
        isGlobal,
        path: options.path,
        list: options.list,
      });

      if (options.path) {
        const path = await getConfigPath(isGlobal);
        await logger.info("Config path requested", { path });
        console.log(path);
        return;
      }

      if (options.list || (!key && !value)) {
        const config = await getConfig(isGlobal);
        await logger.debug("Config listed", { isGlobal });
        console.log(chalk.cyan(isGlobal ? "Global Configuration:" : "Node Configuration:"));
        console.log();
        console.log(JSON.stringify(config, null, 2));
        return;
      }

      if (key && !value) {
        // Get single value
        const config = await getConfig(isGlobal);
        const keys = key.split(".");
        let current: unknown = config;

        for (const k of keys) {
          if (current && typeof current === "object" && k in current) {
            current = (current as Record<string, unknown>)[k];
          } else {
            await logger.warn("Config key not found", { key });
            console.log(chalk.yellow(`Key '${key}' not found`));
            return;
          }
        }

        await logger.debug("Config value retrieved", { key });
        console.log(typeof current === "object" ? JSON.stringify(current, null, 2) : current);
        return;
      }

      if (key && value) {
        // Set value
        await setConfig(key, value, isGlobal);
        await logger.info("Config value set", {
          key,
          isGlobal,
        });
        console.log(chalk.green(`Set ${key} = ${value}`));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Config operation failed", {
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
