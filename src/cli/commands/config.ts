/**
 * bozly config - Manage configuration
 *
 * Manages two types of configuration:
 * 1. Vault/Global config (AI provider, timezone, cleanup) — stored in ~/.bozly/bozly-config.json
 * 2. System config (port, timeouts, logging) — managed by ConfigManager singleton
 */

import { Command } from "commander";
import { logger } from "../../core/logger.js";
import { getConfig, setConfig, getConfigPath } from "../../core/config.js";
import { ConfigManager } from "../../core/config-manager.js";
import { errorBox, infoBox, warningBox, successBox } from "../../cli/ui/index.js";

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

      // Check if key is a system config key (starts with system.*)
      const isSystemConfig = key?.startsWith("system.");

      if (options.path) {
        const path = await getConfigPath(isGlobal);
        await logger.info("Config path requested", { path });
        console.log(path);
        return;
      }

      if (options.list || (!key && !value)) {
        // List all configuration (both vault and system)
        const vaultConfig = await getConfig(isGlobal);
        const systemConfig = ConfigManager.getInstance().getConfig();

        await logger.debug("Config listed", { isGlobal });
        console.log(successBox(isGlobal ? "Global Configuration" : "Node Configuration"));
        console.log();

        // Show vault config
        console.log(infoBox("Vault/Global Settings"));
        console.log(JSON.stringify(vaultConfig, null, 2));
        console.log();

        // Show system config
        console.log(infoBox("System Configuration"));
        console.log(JSON.stringify(systemConfig, null, 2));
        return;
      }

      if (isSystemConfig && !value) {
        // Get system config value (remove 'system.' prefix)
        const systemKey = key.substring(7); // Remove 'system.'
        const systemConfig = ConfigManager.getInstance();
        try {
          const value = systemConfig.get(systemKey);
          await logger.debug("System config value retrieved", { key, systemKey });
          console.log(typeof value === "object" ? JSON.stringify(value, null, 2) : value);
        } catch {
          await logger.warn("System config key not found", { key });
          console.error(warningBox(`System config key not found: ${key}`));
          return;
        }
        return;
      }

      if (isSystemConfig && value) {
        // Set system config value (remove 'system.' prefix)
        const systemKey = key.substring(7); // Remove 'system.'
        const systemConfig = ConfigManager.getInstance();
        let parsedValue: unknown;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value;
        }
        systemConfig.set(systemKey, parsedValue);
        systemConfig.save();
        await logger.info("System config value set", { key, systemKey, value });
        console.log(
          successBox(`System configuration updated`, {
            [key]: String(parsedValue),
          })
        );
        return;
      }

      if (key && !value) {
        // Get single value from vault config
        const config = await getConfig(isGlobal);
        const keys = key.split(".");
        let current: unknown = config;

        for (const k of keys) {
          if (current && typeof current === "object" && k in current) {
            current = (current as Record<string, unknown>)[k];
          } else {
            await logger.warn("Config key not found", { key });
            console.error(warningBox(`Key not found: ${key}`));
            return;
          }
        }

        await logger.debug("Config value retrieved", { key });
        console.log(typeof current === "object" ? JSON.stringify(current, null, 2) : current);
        return;
      }

      if (key && value) {
        // Set vault config value
        await setConfig(key, value, isGlobal);
        await logger.info("Config value set", {
          key,
          isGlobal,
        });
        console.log(
          successBox(`Configuration updated`, {
            [key]: value,
          })
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Config operation failed", {
        error: errorMsg,
      });

      console.error(
        errorBox("Configuration operation failed", {
          error: errorMsg,
        })
      );
      process.exit(1);
    }
  });
