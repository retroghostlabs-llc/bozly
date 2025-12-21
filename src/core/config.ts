/**
 * Configuration Management Module
 *
 * Handles configuration at both global (~/.bozly/bozly-config.json) and
 * vault (.bozly/config.json) levels. Provides unified interface for reading,
 * writing, and discovering configuration files.
 *
 * Key features:
 * - Global configuration for BOZLY-wide settings
 * - Vault configuration for vault-specific settings
 * - Nested key-value access (e.g., "ai.defaultProvider")
 * - Automatic creation of default configurations
 * - Configuration file discovery via directory tree walk
 *
 * Usage:
 *   import { getGlobalConfig, getVaultConfig, setConfig } from './config.js';
 *   const globalConfig = await getGlobalConfig();
 *   const vaultConfig = await getVaultConfig();
 *   await setConfig('ai.defaultProvider', 'gpt', true); // global
 *
 * @module core/config
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import { logger } from "./logger.js";
import { GlobalConfig, VaultConfig } from "./types.js";

const BOZLY_HOME = path.join(os.homedir(), ".bozly");
const GLOBAL_CONFIG_FILE = "bozly-config.json";
const VAULT_CONFIG_FILE = "config.json";

/**
 * Get configuration
 */
export async function getConfig(isGlobal = false): Promise<GlobalConfig | VaultConfig> {
  if (isGlobal) {
    return getGlobalConfig();
  }
  return getVaultConfig();
}

/**
 * Get global configuration
 *
 * Loads global BOZLY configuration from ~/.bozly/bozly-config.json.
 * If the file doesn't exist, creates a default configuration.
 *
 * @returns Global configuration object
 * @throws {Error} If unable to read or parse existing config file
 */
export async function getGlobalConfig(): Promise<GlobalConfig> {
  const configPath = path.join(BOZLY_HOME, GLOBAL_CONFIG_FILE);

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content) as GlobalConfig;
    await logger.debug("Loaded global configuration", {
      configPath,
      defaultAI: config.defaultAI,
    });
    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // Return default config
      const defaultConfig: GlobalConfig = {
        version: "0.3.0",
        defaultAI: "claude",
      };
      await ensureBozlyHome();
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      await logger.info("Created default global configuration", {
        configPath,
        defaultAI: defaultConfig.defaultAI,
      });
      return defaultConfig;
    }
    await logger.error("Failed to load global configuration", { configPath }, error as Error);
    throw error;
  }
}

/**
 * Get vault configuration (from current directory)
 *
 * Searches up the directory tree for a vault configuration file and loads it.
 * Requires being inside a vault directory (one containing .bozly/config.json).
 *
 * @returns Vault configuration object
 * @throws {Error} If not in a vault directory or config is invalid
 */
export async function getVaultConfig(): Promise<VaultConfig> {
  const configPath = await findVaultConfig();
  if (!configPath) {
    await logger.warn("Vault configuration not found", { cwd: process.cwd() });
    throw new Error("Not in a vault directory. Run 'bozly init' first.");
  }

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content) as VaultConfig;
    await logger.debug("Loaded vault configuration", {
      configPath,
      vaultName: config.name,
      vaultType: config.type,
    });
    return config;
  } catch (error) {
    await logger.error("Failed to load vault configuration", { configPath }, error as Error);
    throw error;
  }
}

/**
 * Set configuration value
 *
 * Sets a configuration key to a value. Supports nested keys using dot notation
 * (e.g., "ai.defaultProvider"). Attempts to parse values as JSON, falls back to
 * string storage if parsing fails.
 *
 * @param key - Configuration key (dot-separated for nested keys)
 * @param value - Value to set (as string, will attempt JSON parse)
 * @param isGlobal - If true, sets in global config; otherwise in vault config
 * @throws {Error} If not in a vault directory (for vault config) or can't write file
 */
export async function setConfig(key: string, value: string, isGlobal = false): Promise<void> {
  const scope = isGlobal ? "global" : "vault";
  await logger.debug(`Setting ${scope} config value`, { key, value });

  const config = await getConfig(isGlobal);
  const keys = key.split(".");

  // Navigate to nested key
  let current: Record<string, unknown> = config as unknown as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }

  // Set the value (try to parse as JSON first)
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    parsedValue = value;
  }
  current[keys[keys.length - 1]] = parsedValue;

  // Save config
  try {
    if (isGlobal) {
      const configPath = path.join(BOZLY_HOME, GLOBAL_CONFIG_FILE);
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      await logger.info("Global config updated", { key });
    } else {
      const configPath = await findVaultConfig();
      if (configPath) {
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        await logger.info("Vault config updated", { key });
      }
    }
  } catch (error) {
    await logger.error(`Failed to save ${scope} config`, { key }, error as Error);
    throw error;
  }
}

/**
 * Get config file path
 *
 * Returns the full path to the configuration file.
 * For global config, returns ~/.bozly/bozly-config.json.
 * For vault config, searches up directory tree.
 *
 * @param isGlobal - If true, returns path to global config
 * @returns Full path to configuration file
 * @throws {Error} If not in a vault directory (for vault config)
 */
export async function getConfigPath(isGlobal = false): Promise<string> {
  if (isGlobal) {
    const configPath = path.join(BOZLY_HOME, GLOBAL_CONFIG_FILE);
    await logger.debug("Global config path", { configPath });
    return configPath;
  }

  const configPath = await findVaultConfig();
  if (!configPath) {
    await logger.warn("Vault config not found", { cwd: process.cwd() });
    throw new Error("Not in a vault directory");
  }
  await logger.debug("Vault config path", { configPath });
  return configPath;
}

/**
 * Find vault config.json by walking up directory tree
 */
async function findVaultConfig(): Promise<string | null> {
  let currentPath = process.cwd();
  let searchDepth = 0;

  await logger.debug("Searching for vault config", { startPath: currentPath });

  while (currentPath !== path.dirname(currentPath)) {
    searchDepth += 1;
    const configPath = path.join(currentPath, ".bozly", VAULT_CONFIG_FILE);
    try {
      await fs.access(configPath);
      await logger.debug("Found vault config", { configPath, searchDepth });
      return configPath;
    } catch {
      // Continue up
    }
    currentPath = path.dirname(currentPath);
  }

  await logger.debug("Vault config not found", { startPath: process.cwd(), searchDepth });
  return null;
}

/**
 * Ensure ~/.bozly directory exists
 */
async function ensureBozlyHome(): Promise<void> {
  await fs.mkdir(BOZLY_HOME, { recursive: true });
}
