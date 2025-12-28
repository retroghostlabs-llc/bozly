/**
 * BOZLY Comprehensive Configuration Manager
 *
 * Centralized, type-safe configuration management for all BOZLY system settings.
 * Consolidates scattered hardcoded values into a single, configurable system.
 *
 * Configuration Priority (4-Layer System):
 * 1. CLI flags (highest) — e.g., bozly serve --port 4000
 * 2. Environment variables — e.g., BOZLY_PORT=4000
 * 3. Config file — ~/.bozly/bozly-config.json
 * 4. Hardcoded defaults (lowest)
 *
 * Features:
 * - Singleton pattern with lazy loading and caching
 * - Type-safe configuration with full TypeScript support
 * - Computed values (e.g., sessionDir defaults to {baseDir}/sessions)
 * - Environment variable support for all settings
 * - Config file support for non-CLI settings
 * - Validation with detailed error messages
 * - Helper methods for common access patterns
 *
 * Usage:
 *   import { ConfigManager } from './config-manager.js';
 *   const config = ConfigManager.getInstance();
 *   const port = config.get('server.port');
 *   const serverConfig = config.getServer();
 */

import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "./logger.js";

/**
 * Server configuration for BOZLY API server
 */
export interface ServerConfig {
  port: number;
  host: string;
  healthCheckTimeout: number;
  healthCheckIntervalMs: number;
  startupTimeoutMs: number;
  openBrowser: boolean;
}

/**
 * Storage configuration for directories and paths
 */
export interface StorageConfig {
  baseDir: string;
  sessionDir: string;
  logDir: string;
  cacheDir: string;
  commandsDir: string;
  workflowsDir: string;
}

/**
 * Client configuration for TUI and API clients
 */
export interface ClientConfig {
  apiCacheTimeoutMs: number;
  tuiRefreshIntervalMs: number;
  apiTimeoutMs: number;
  debounceDelayMs: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";
  enableConsole: boolean;
  enableFile: boolean;
  enableColor: boolean;
  includeTimestamp: boolean;
  includeContext: boolean;
  maxFileSizeBytes: number;
}

/**
 * Process-level timeout configuration
 */
export interface ProcessConfig {
  hookTimeoutMs: number;
  workflowStepTimeoutMs: number;
  aiGenerationTimeoutMs: number;
}

/**
 * Complete BOZLY configuration
 */
export interface BozlyConfig {
  server: ServerConfig;
  storage: StorageConfig;
  client: ClientConfig;
  logging: LoggingConfig;
  process: ProcessConfig;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: BozlyConfig = {
  server: {
    port: 3847,
    host: "127.0.0.1",
    healthCheckTimeout: 2000,
    healthCheckIntervalMs: 200,
    startupTimeoutMs: 30000,
    openBrowser: true,
  },
  storage: {
    baseDir: "", // Will be computed to ~/.bozly
    sessionDir: "",
    logDir: "",
    cacheDir: "",
    commandsDir: "",
    workflowsDir: "",
  },
  client: {
    apiCacheTimeoutMs: 5000,
    tuiRefreshIntervalMs: 5000,
    apiTimeoutMs: 10000,
    debounceDelayMs: 300,
  },
  logging: {
    level: "info",
    enableConsole: true,
    enableFile: true,
    enableColor: true,
    includeTimestamp: true,
    includeContext: true,
    maxFileSizeBytes: 10485760,
  },
  process: {
    hookTimeoutMs: 30000,
    workflowStepTimeoutMs: 300000,
    aiGenerationTimeoutMs: 60000,
  },
};

/**
 * ConfigManager: Singleton configuration manager
 * Handles loading, merging, and providing access to configuration
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: BozlyConfig;
  private configPath: string;
  private cliOverrides: Partial<BozlyConfig> = {};

  private constructor() {
    this.config = this.loadConfig();
    this.configPath = path.join(os.homedir(), ".bozly", "bozly-config.json");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Reset singleton instance (for testing only)
   * This allows tests to reinitialize ConfigManager with fresh state
   */
  static resetInstance(): void {
    ConfigManager.instance = null as unknown as ConfigManager;
  }

  /**
   * Initialize with CLI overrides
   * Useful for setting config from CLI flags
   */
  static initWithOverrides(overrides: Partial<BozlyConfig>): void {
    const instance = ConfigManager.getInstance();
    instance.cliOverrides = overrides;
    instance.config = instance.loadConfig();
  }

  /**
   * Get complete configuration
   */
  getConfig(): BozlyConfig {
    return this.config;
  }

  /**
   * Get server configuration
   */
  getServer(): ServerConfig {
    return this.config.server;
  }

  /**
   * Get storage configuration
   */
  getStorage(): StorageConfig {
    return this.config.storage;
  }

  /**
   * Get client configuration
   */
  getClient(): ClientConfig {
    return this.config.client;
  }

  /**
   * Get logging configuration
   */
  getLogging(): LoggingConfig {
    return this.config.logging;
  }

  /**
   * Get process configuration
   */
  getProcess(): ProcessConfig {
    return this.config.process;
  }

  /**
   * Get a nested config value using dot notation
   * Example: get('server.port') returns 3847
   */
  get<T = unknown>(path: string): T {
    const keys = path.split(".");
    let current: unknown = this.config;

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        throw new Error(`Configuration key not found: ${path}`);
      }
    }

    return current as T;
  }

  /**
   * Set a configuration value (in-memory only, doesn't persist)
   * Validates the value before setting it
   */
  set(path: string, value: unknown): void {
    // Validate the value based on the config key
    this.validateValue(path, value);

    const keys = path.split(".");
    let current: Record<string, unknown> = this.config as unknown as Record<string, unknown>;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;

    // If baseDir changed, recompute all derived storage paths
    if (path === "storage.baseDir") {
      // Clear derived values so they get recomputed
      this.config.storage.sessionDir = "";
      this.config.storage.logDir = "";
      this.config.storage.cacheDir = "";
      this.config.storage.commandsDir = "";
      this.config.storage.workflowsDir = "";
      // Recompute them with new baseDir
      this.computeDerivedValues(this.config);
    }
  }

  /**
   * Validate a single configuration value
   */
  private validateValue(path: string, value: unknown): void {
    // First, check if this is a valid path in the configuration
    if (!this.isValidConfigPath(path)) {
      throw new Error(`Invalid configuration path: ${path}`);
    }

    // Port validation
    if (path === "server.port") {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        throw new Error(`Invalid port: must be an integer`);
      }
      if (value <= 0 || value > 65535) {
        throw new Error(`Invalid port: ${value} (must be 1-65535)`);
      }
    }

    // Log level validation
    if (path === "logging.level") {
      if (!["debug", "info", "warn", "error"].includes(String(value))) {
        throw new Error(
          `Invalid log level: ${String(value)} (must be debug, info, warn, or error)`
        );
      }
    }

    // Timeout validation (must be positive)
    if (
      path.includes("Timeout") ||
      path.includes("timeout") ||
      path.includes("IntervalMs") ||
      path.includes("Delay")
    ) {
      if (typeof value !== "number" || value <= 0) {
        throw new Error(`${path} must be a positive number`);
      }
    }

    // Host validation (non-empty string)
    if (path === "server.host") {
      if (!value || typeof value !== "string") {
        throw new Error(`Invalid host: must be a non-empty string`);
      }
    }

    // Base directory validation (non-empty string)
    if (path === "storage.baseDir") {
      if (!value || typeof value !== "string") {
        throw new Error(`Invalid baseDir: must be a non-empty string`);
      }
    }

    // Max file size validation (must be positive)
    if (path === "logging.maxFileSizeBytes") {
      if (typeof value !== "number" || value <= 0) {
        throw new Error(`maxFileSizeBytes must be a positive number`);
      }
    }
  }

  /**
   * Check if a path is valid in the current configuration
   */
  private isValidConfigPath(path: string): boolean {
    const keys = path.split(".");
    let current: unknown = this.config;

    for (const key of keys) {
      if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return false;
      }
    }

    return true;
  }

  /**
   * Reload configuration from file and environment
   */
  reload(): void {
    this.config = this.loadConfig();
  }

  /**
   * Save configuration to file
   */
  save(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      void logger.info("Configuration saved", { path: this.configPath });
    } catch (error) {
      void logger.error("Failed to save configuration", { path: this.configPath }, error as Error);
      throw error;
    }
  }

  /**
   * Load configuration from all sources
   * Priority: CLI overrides > env vars > config file > defaults
   */
  private loadConfig(): BozlyConfig {
    const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as BozlyConfig;

    // Layer 3: Load from config file
    this.loadFromFile(config);

    // Layer 2: Load from environment variables
    this.loadFromEnvironment(config);

    // Layer 1: Apply CLI overrides (highest priority)
    if (Object.keys(this.cliOverrides).length > 0) {
      this.mergeConfigs(config, this.cliOverrides);
    }

    // Compute derived values (e.g., sessionDir defaults)
    this.computeDerivedValues(config);

    // Validate configuration
    this.validateConfig(config);

    return config;
  }

  /**
   * Load configuration from ~/.bozly/bozly-config.json
   */
  private loadFromFile(config: BozlyConfig): void {
    try {
      const configPath = path.join(os.homedir(), ".bozly", "bozly-config.json");
      if (!fs.existsSync(configPath)) {
        return; // File doesn't exist, continue with defaults
      }

      const fileContent = fs.readFileSync(configPath, "utf-8");
      const fileConfig = JSON.parse(fileContent) as Partial<BozlyConfig>;
      this.mergeConfigs(config, fileConfig);
    } catch (error) {
      void logger.warn("Failed to load config file, using defaults", { error: String(error) });
    }
  }

  /**
   * Load configuration from environment variables
   * Supports BOZLY_* variables for all settings
   */
  private loadFromEnvironment(config: BozlyConfig): void {
    // Server config
    if (process.env.BOZLY_PORT) {
      const port = parseInt(process.env.BOZLY_PORT, 10);
      if (!isNaN(port) && port > 0 && port <= 65535) {
        config.server.port = port;
      }
    }
    if (process.env.BOZLY_HOST) {
      config.server.host = process.env.BOZLY_HOST;
    }
    if (process.env.BOZLY_HEALTH_CHECK_TIMEOUT) {
      const timeout = parseInt(process.env.BOZLY_HEALTH_CHECK_TIMEOUT, 10);
      if (!isNaN(timeout) && timeout > 0) {
        config.server.healthCheckTimeout = timeout;
      }
    }
    if (process.env.BOZLY_HEALTH_CHECK_INTERVAL) {
      const interval = parseInt(process.env.BOZLY_HEALTH_CHECK_INTERVAL, 10);
      if (!isNaN(interval) && interval > 0) {
        config.server.healthCheckIntervalMs = interval;
      }
    }
    if (process.env.BOZLY_STARTUP_TIMEOUT) {
      const timeout = parseInt(process.env.BOZLY_STARTUP_TIMEOUT, 10);
      if (!isNaN(timeout) && timeout > 0) {
        config.server.startupTimeoutMs = timeout;
      }
    }
    if (process.env.BOZLY_OPEN_BROWSER !== undefined) {
      config.server.openBrowser = process.env.BOZLY_OPEN_BROWSER === "true";
    }

    // Storage config
    if (process.env.BOZLY_HOME) {
      config.storage.baseDir = process.env.BOZLY_HOME;
    }
    if (process.env.BOZLY_SESSION_DIR) {
      config.storage.sessionDir = process.env.BOZLY_SESSION_DIR;
    }
    if (process.env.BOZLY_LOG_DIR) {
      config.storage.logDir = process.env.BOZLY_LOG_DIR;
    }
    if (process.env.BOZLY_CACHE_DIR) {
      config.storage.cacheDir = process.env.BOZLY_CACHE_DIR;
    }
    if (process.env.BOZLY_COMMANDS_DIR) {
      config.storage.commandsDir = process.env.BOZLY_COMMANDS_DIR;
    }
    if (process.env.BOZLY_WORKFLOWS_DIR) {
      config.storage.workflowsDir = process.env.BOZLY_WORKFLOWS_DIR;
    }

    // Client config
    if (process.env.BOZLY_API_CACHE_TIMEOUT) {
      const timeout = parseInt(process.env.BOZLY_API_CACHE_TIMEOUT, 10);
      if (!isNaN(timeout) && timeout > 0) {
        config.client.apiCacheTimeoutMs = timeout;
      }
    }
    if (process.env.BOZLY_TUI_REFRESH_INTERVAL) {
      const interval = parseInt(process.env.BOZLY_TUI_REFRESH_INTERVAL, 10);
      if (!isNaN(interval) && interval > 0) {
        config.client.tuiRefreshIntervalMs = interval;
      }
    }
    if (process.env.BOZLY_API_TIMEOUT) {
      const timeout = parseInt(process.env.BOZLY_API_TIMEOUT, 10);
      if (!isNaN(timeout) && timeout > 0) {
        config.client.apiTimeoutMs = timeout;
      }
    }
    if (process.env.BOZLY_DEBOUNCE_DELAY) {
      const delay = parseInt(process.env.BOZLY_DEBOUNCE_DELAY, 10);
      if (!isNaN(delay) && delay > 0) {
        config.client.debounceDelayMs = delay;
      }
    }

    // Logging config
    if (process.env.BOZLY_LOG_LEVEL) {
      const level = process.env.BOZLY_LOG_LEVEL as "debug" | "info" | "warn" | "error";
      if (["debug", "info", "warn", "error"].includes(level)) {
        config.logging.level = level;
      }
    }
    // Backward compatibility: BOZLY_DEBUG sets log level to debug
    if (process.env.BOZLY_DEBUG === "true") {
      config.logging.level = "debug";
    }
    if (process.env.BOZLY_LOG_CONSOLE !== undefined) {
      config.logging.enableConsole = process.env.BOZLY_LOG_CONSOLE === "true";
    }
    if (process.env.BOZLY_LOG_FILE !== undefined) {
      config.logging.enableFile = process.env.BOZLY_LOG_FILE === "true";
    }
    if (process.env.BOZLY_LOG_COLOR !== undefined) {
      config.logging.enableColor = process.env.BOZLY_LOG_COLOR === "true";
    }
    if (process.env.BOZLY_LOG_TIMESTAMP !== undefined) {
      config.logging.includeTimestamp = process.env.BOZLY_LOG_TIMESTAMP === "true";
    }
    if (process.env.BOZLY_LOG_CONTEXT !== undefined) {
      config.logging.includeContext = process.env.BOZLY_LOG_CONTEXT === "true";
    }
    if (process.env.BOZLY_LOG_MAX_FILE_SIZE) {
      const size = parseInt(process.env.BOZLY_LOG_MAX_FILE_SIZE, 10);
      if (!isNaN(size) && size > 0) {
        config.logging.maxFileSizeBytes = size;
      }
    }

    // Process config
    if (process.env.BOZLY_HOOK_TIMEOUT) {
      const timeout = parseInt(process.env.BOZLY_HOOK_TIMEOUT, 10);
      if (!isNaN(timeout) && timeout > 0) {
        config.process.hookTimeoutMs = timeout;
      }
    }
    if (process.env.BOZLY_WORKFLOW_STEP_TIMEOUT) {
      const timeout = parseInt(process.env.BOZLY_WORKFLOW_STEP_TIMEOUT, 10);
      if (!isNaN(timeout) && timeout > 0) {
        config.process.workflowStepTimeoutMs = timeout;
      }
    }
    if (process.env.BOZLY_AI_GENERATION_TIMEOUT) {
      const timeout = parseInt(process.env.BOZLY_AI_GENERATION_TIMEOUT, 10);
      if (!isNaN(timeout) && timeout > 0) {
        config.process.aiGenerationTimeoutMs = timeout;
      }
    }
  }

  /**
   * Compute derived values (e.g., sessionDir defaults to {baseDir}/sessions)
   */
  private computeDerivedValues(config: BozlyConfig): void {
    // If baseDir not set, use default
    if (!config.storage.baseDir) {
      config.storage.baseDir = path.join(os.homedir(), ".bozly");
    }

    // Compute derived paths
    if (!config.storage.sessionDir) {
      config.storage.sessionDir = path.join(config.storage.baseDir, "sessions");
    }
    if (!config.storage.logDir) {
      config.storage.logDir = path.join(config.storage.baseDir, "logs");
    }
    if (!config.storage.cacheDir) {
      config.storage.cacheDir = path.join(config.storage.baseDir, ".cache");
    }
    if (!config.storage.commandsDir) {
      config.storage.commandsDir = path.join(config.storage.baseDir, "commands");
    }
    if (!config.storage.workflowsDir) {
      config.storage.workflowsDir = path.join(config.storage.baseDir, "workflows");
    }

    // Auto-detect color support
    if (config.logging.enableColor) {
      if (process.env.NO_COLOR) {
        config.logging.enableColor = false;
      } else if (process.env.FORCE_COLOR) {
        config.logging.enableColor = true;
      } else if (process.env.TERM === "dumb") {
        config.logging.enableColor = false;
      }
    }
  }

  /**
   * Merge configuration objects (shallow merge for nested objects)
   */
  private mergeConfigs(target: BozlyConfig, source: Partial<BozlyConfig>): void {
    if (source.server) {
      Object.assign(target.server, source.server);
    }
    if (source.storage) {
      Object.assign(target.storage, source.storage);
    }
    if (source.client) {
      Object.assign(target.client, source.client);
    }
    if (source.logging) {
      Object.assign(target.logging, source.logging);
    }
    if (source.process) {
      Object.assign(target.process, source.process);
    }
  }

  /**
   * Validate configuration values
   */
  private validateConfig(config: BozlyConfig): void {
    // Validate port
    if (config.server.port <= 0 || config.server.port > 65535) {
      throw new Error(`Invalid port: ${config.server.port} (must be 1-65535)`);
    }

    // Validate log level
    if (!["debug", "info", "warn", "error"].includes(config.logging.level)) {
      throw new Error(`Invalid log level: ${config.logging.level}`);
    }

    // Validate timeouts (must be positive)
    if (config.server.healthCheckTimeout <= 0) {
      throw new Error("healthCheckTimeout must be positive");
    }
    if (config.server.startupTimeoutMs <= 0) {
      throw new Error("startupTimeoutMs must be positive");
    }
    if (config.process.hookTimeoutMs <= 0) {
      throw new Error("hookTimeoutMs must be positive");
    }
  }
}

/**
 * Export singleton instance getter for convenience
 */
export function getConfig(): ConfigManager {
  return ConfigManager.getInstance();
}
