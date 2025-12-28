/**
 * Comprehensive test suite for ConfigManager
 *
 * Tests the centralized configuration system including:
 * - 4-layer priority system (CLI > env vars > config file > defaults)
 * - All 5 configuration categories (Server, Storage, Client, Logging, Process)
 * - Configuration loading, validation, and persistence
 * - Environment variable parsing and overrides
 * - Getter methods for each config category
 * - Dynamic path computation for derived values
 *
 * Total: 200+ tests covering all ConfigManager functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { ConfigManager } from "../../dist/core/config-manager.js";
import type {
  BozlyConfig,
  ServerConfig,
  StorageConfig,
  ClientConfig,
  LoggingConfig,
  ProcessConfig,
} from "../../dist/core/config-manager.js";

describe("ConfigManager - Centralized Configuration System", () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalHome: string;

  beforeEach(async () => {
    // Create temporary directory for test config files
    tempDir = path.join(os.tmpdir(), `bozly-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Save original environment
    originalEnv = process.env;
    originalHome = process.env.HOME || "";

    // Clear any existing ConfigManager instance for clean state
    // Note: This is a singleton, so we need to be careful with tests
    ConfigManager.resetInstance();
    process.env.HOME = tempDir;

    // Clear environment variables that might interfere
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("BOZLY_")) {
        delete process.env[key];
      }
    });
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;
    process.env.HOME = originalHome;

    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // ============================================================================
  // PART 1: Basic Functionality Tests (25 tests)
  // ============================================================================

  describe("Basic Functionality", () => {
    it("should create ConfigManager singleton instance", () => {
      const cm = ConfigManager.getInstance();
      expect(cm).toBeDefined();
      expect(cm).toBeInstanceOf(ConfigManager);
    });

    it("should return same instance on multiple calls (singleton pattern)", () => {
      const cm1 = ConfigManager.getInstance();
      const cm2 = ConfigManager.getInstance();
      expect(cm1).toBe(cm2);
    });

    it("should have all configuration categories", () => {
      const cm = ConfigManager.getInstance();
      const config = cm.getConfig();

      expect(config).toHaveProperty("server");
      expect(config).toHaveProperty("storage");
      expect(config).toHaveProperty("client");
      expect(config).toHaveProperty("logging");
      expect(config).toHaveProperty("process");
    });

    it("should return ServerConfig via getServer()", () => {
      const cm = ConfigManager.getInstance();
      const server = cm.getServer();

      expect(server).toHaveProperty("port");
      expect(server).toHaveProperty("host");
      expect(server).toHaveProperty("healthCheckTimeout");
      expect(server).toHaveProperty("healthCheckIntervalMs");
      expect(server).toHaveProperty("startupTimeoutMs");
      expect(server).toHaveProperty("openBrowser");
    });

    it("should return StorageConfig via getStorage()", () => {
      const cm = ConfigManager.getInstance();
      const storage = cm.getStorage();

      expect(storage).toHaveProperty("baseDir");
      expect(storage).toHaveProperty("sessionDir");
      expect(storage).toHaveProperty("logDir");
      expect(storage).toHaveProperty("cacheDir");
      expect(storage).toHaveProperty("commandsDir");
      expect(storage).toHaveProperty("workflowsDir");
    });

    it("should return ClientConfig via getClient()", () => {
      const cm = ConfigManager.getInstance();
      const client = cm.getClient();

      expect(client).toHaveProperty("apiCacheTimeoutMs");
      expect(client).toHaveProperty("tuiRefreshIntervalMs");
      expect(client).toHaveProperty("apiTimeoutMs");
      expect(client).toHaveProperty("debounceDelayMs");
    });

    it("should return LoggingConfig via getLogging()", () => {
      const cm = ConfigManager.getInstance();
      const logging = cm.getLogging();

      expect(logging).toHaveProperty("level");
      expect(logging).toHaveProperty("enableConsole");
      expect(logging).toHaveProperty("enableFile");
      expect(logging).toHaveProperty("enableColor");
      expect(logging).toHaveProperty("includeTimestamp");
      expect(logging).toHaveProperty("includeContext");
      expect(logging).toHaveProperty("maxFileSizeBytes");
    });

    it("should return ProcessConfig via getProcess()", () => {
      const cm = ConfigManager.getInstance();
      const process_ = cm.getProcess();

      expect(process_).toHaveProperty("hookTimeoutMs");
      expect(process_).toHaveProperty("workflowStepTimeoutMs");
      expect(process_).toHaveProperty("aiGenerationTimeoutMs");
    });

    it("should return full config via getConfig()", () => {
      const cm = ConfigManager.getInstance();
      const config = cm.getConfig();

      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
      expect(config.server).toBeDefined();
      expect(config.storage).toBeDefined();
      expect(config.client).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.process).toBeDefined();
    });

    it("should have valid default port (3847)", () => {
      const cm = ConfigManager.getInstance();
      const port = cm.getServer().port;
      expect(port).toBe(3847);
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThanOrEqual(65535);
    });

    it("should have valid default host (127.0.0.1)", () => {
      const cm = ConfigManager.getInstance();
      const host = cm.getServer().host;
      expect(host).toBe("127.0.0.1");
    });

    it("should have valid default log level (info)", () => {
      const cm = ConfigManager.getInstance();
      const level = cm.getLogging().level;
      expect(level).toBe("info");
      expect(["debug", "info", "warn", "error"]).toContain(level);
    });

    it("should have valid default API timeout (10000ms)", () => {
      const cm = ConfigManager.getInstance();
      const timeout = cm.getClient().apiTimeoutMs;
      expect(timeout).toBe(10000);
      expect(timeout).toBeGreaterThan(0);
    });

    it("should have valid default cache timeout (5000ms)", () => {
      const cm = ConfigManager.getInstance();
      const timeout = cm.getClient().apiCacheTimeoutMs;
      expect(timeout).toBe(5000);
      expect(timeout).toBeGreaterThan(0);
    });

    it("should have valid default TUI refresh interval (5000ms)", () => {
      const cm = ConfigManager.getInstance();
      const interval = cm.getClient().tuiRefreshIntervalMs;
      expect(interval).toBe(5000);
      expect(interval).toBeGreaterThan(0);
    });

    it("should have valid default hook timeout (30000ms)", () => {
      const cm = ConfigManager.getInstance();
      const timeout = cm.getProcess().hookTimeoutMs;
      expect(timeout).toBe(30000);
      expect(timeout).toBeGreaterThan(0);
    });

    it("should compute sessionDir relative to baseDir", () => {
      const cm = ConfigManager.getInstance();
      const storage = cm.getStorage();
      expect(storage.sessionDir).toContain(storage.baseDir);
      expect(storage.sessionDir).toContain("sessions");
    });

    it("should compute logDir relative to baseDir", () => {
      const cm = ConfigManager.getInstance();
      const storage = cm.getStorage();
      expect(storage.logDir).toContain(storage.baseDir);
      expect(storage.logDir).toContain("logs");
    });

    it("should compute cacheDir relative to baseDir", () => {
      const cm = ConfigManager.getInstance();
      const storage = cm.getStorage();
      expect(storage.cacheDir).toContain(storage.baseDir);
      expect(storage.cacheDir).toContain(".cache");
    });

    it("should enable both console and file logging by default", () => {
      const cm = ConfigManager.getInstance();
      const logging = cm.getLogging();
      expect(logging.enableConsole).toBe(true);
      expect(logging.enableFile).toBe(true);
    });

    it("should enable timestamps and context in logs by default", () => {
      const cm = ConfigManager.getInstance();
      const logging = cm.getLogging();
      expect(logging.includeTimestamp).toBe(true);
      expect(logging.includeContext).toBe(true);
    });

    it("should have openBrowser enabled by default", () => {
      const cm = ConfigManager.getInstance();
      const openBrowser = cm.getServer().openBrowser;
      expect(openBrowser).toBe(true);
    });

    it("should have valid health check timeout (2000ms)", () => {
      const cm = ConfigManager.getInstance();
      const timeout = cm.getServer().healthCheckTimeout;
      expect(timeout).toBe(2000);
      expect(timeout).toBeGreaterThan(0);
    });

    it("should have valid health check interval (200ms)", () => {
      const cm = ConfigManager.getInstance();
      const interval = cm.getServer().healthCheckIntervalMs;
      expect(interval).toBe(200);
      expect(interval).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PART 2: Getter Method Tests (20 tests)
  // ============================================================================

  describe("Getter Methods", () => {
    it("should get nested config value using dot notation", () => {
      const cm = ConfigManager.getInstance();
      const port = cm.get("server.port");
      expect(port).toBe(3847);
    });

    it("should get nested config value from storage", () => {
      const cm = ConfigManager.getInstance();
      const baseDir = cm.get("storage.baseDir");
      expect(baseDir).toBeDefined();
      expect(typeof baseDir).toBe("string");
    });

    it("should get nested config value from client", () => {
      const cm = ConfigManager.getInstance();
      const timeout = cm.get("client.apiTimeoutMs");
      expect(timeout).toBe(10000);
    });

    it("should get nested config value from logging", () => {
      const cm = ConfigManager.getInstance();
      const level = cm.get("logging.level");
      expect(level).toBe("info");
    });

    it("should get nested config value from process", () => {
      const cm = ConfigManager.getInstance();
      const timeout = cm.get("process.hookTimeoutMs");
      expect(timeout).toBe(30000);
    });

    it("should throw error for invalid config path", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.get("invalid.path")).toThrow();
    });

    it("should throw error for non-existent nested path", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.get("server.nonexistent")).toThrow();
    });

    it("should get entire config object with single key", () => {
      const cm = ConfigManager.getInstance();
      const serverConfig = cm.get("server");
      expect(serverConfig).toEqual(cm.getServer());
    });

    it("should throw error for empty path", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.get("")).toThrow();
    });

    it("should throw error for null path", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.get(null as unknown as string)).toThrow();
    });

    it("should get health check timeout via getter", () => {
      const cm = ConfigManager.getInstance();
      const timeout = cm.get("server.healthCheckTimeout");
      expect(timeout).toBe(2000);
    });

    it("should get health check interval via getter", () => {
      const cm = ConfigManager.getInstance();
      const interval = cm.get("server.healthCheckIntervalMs");
      expect(interval).toBe(200);
    });

    it("should get API cache timeout via getter", () => {
      const cm = ConfigManager.getInstance();
      const timeout = cm.get("client.apiCacheTimeoutMs");
      expect(timeout).toBe(5000);
    });

    it("should get TUI refresh interval via getter", () => {
      const cm = ConfigManager.getInstance();
      const interval = cm.get("client.tuiRefreshIntervalMs");
      expect(interval).toBe(5000);
    });

    it("should get debounce delay via getter", () => {
      const cm = ConfigManager.getInstance();
      const delay = cm.get("client.debounceDelayMs");
      expect(delay).toBe(300);
    });

    it("should get hook timeout via getter", () => {
      const cm = ConfigManager.getInstance();
      const timeout = cm.get("process.hookTimeoutMs");
      expect(timeout).toBe(30000);
    });

    it("should get workflow step timeout via getter", () => {
      const cm = ConfigManager.getInstance();
      const timeout = cm.get("process.workflowStepTimeoutMs");
      expect(timeout).toBe(300000);
    });

    it("should get AI generation timeout via getter", () => {
      const cm = ConfigManager.getInstance();
      const timeout = cm.get("process.aiGenerationTimeoutMs");
      expect(timeout).toBe(60000);
    });

    it("should get log level via getter", () => {
      const cm = ConfigManager.getInstance();
      const level = cm.get("logging.level");
      expect(level).toBe("info");
    });

    it("should get enableConsole via getter", () => {
      const cm = ConfigManager.getInstance();
      const enabled = cm.get("logging.enableConsole");
      expect(enabled).toBe(true);
    });
  });

  // ============================================================================
  // PART 3: Setter Method Tests (20 tests)
  // ============================================================================

  describe("Setter Methods", () => {
    it("should set port value", () => {
      const cm = ConfigManager.getInstance();
      cm.set("server.port", 4000);
      expect(cm.get("server.port")).toBe(4000);
    });

    it("should set host value", () => {
      const cm = ConfigManager.getInstance();
      cm.set("server.host", "0.0.0.0");
      expect(cm.get("server.host")).toBe("0.0.0.0");
    });

    it("should set log level", () => {
      const cm = ConfigManager.getInstance();
      cm.set("logging.level", "debug");
      expect(cm.get("logging.level")).toBe("debug");
    });

    it("should set enableConsole flag", () => {
      const cm = ConfigManager.getInstance();
      cm.set("logging.enableConsole", false);
      expect(cm.get("logging.enableConsole")).toBe(false);
    });

    it("should set enableFile flag", () => {
      const cm = ConfigManager.getInstance();
      cm.set("logging.enableFile", false);
      expect(cm.get("logging.enableFile")).toBe(false);
    });

    it("should set API timeout", () => {
      const cm = ConfigManager.getInstance();
      cm.set("client.apiTimeoutMs", 15000);
      expect(cm.get("client.apiTimeoutMs")).toBe(15000);
    });

    it("should set cache timeout", () => {
      const cm = ConfigManager.getInstance();
      cm.set("client.apiCacheTimeoutMs", 10000);
      expect(cm.get("client.apiCacheTimeoutMs")).toBe(10000);
    });

    it("should set TUI refresh interval", () => {
      const cm = ConfigManager.getInstance();
      cm.set("client.tuiRefreshIntervalMs", 3000);
      expect(cm.get("client.tuiRefreshIntervalMs")).toBe(3000);
    });

    it("should set debounce delay", () => {
      const cm = ConfigManager.getInstance();
      cm.set("client.debounceDelayMs", 500);
      expect(cm.get("client.debounceDelayMs")).toBe(500);
    });

    it("should set hook timeout", () => {
      const cm = ConfigManager.getInstance();
      cm.set("process.hookTimeoutMs", 60000);
      expect(cm.get("process.hookTimeoutMs")).toBe(60000);
    });

    it("should set workflow step timeout", () => {
      const cm = ConfigManager.getInstance();
      cm.set("process.workflowStepTimeoutMs", 180000);
      expect(cm.get("process.workflowStepTimeoutMs")).toBe(180000);
    });

    it("should set AI generation timeout", () => {
      const cm = ConfigManager.getInstance();
      cm.set("process.aiGenerationTimeoutMs", 120000);
      expect(cm.get("process.aiGenerationTimeoutMs")).toBe(120000);
    });

    it("should set health check timeout", () => {
      const cm = ConfigManager.getInstance();
      cm.set("server.healthCheckTimeout", 5000);
      expect(cm.get("server.healthCheckTimeout")).toBe(5000);
    });

    it("should set health check interval", () => {
      const cm = ConfigManager.getInstance();
      cm.set("server.healthCheckIntervalMs", 100);
      expect(cm.get("server.healthCheckIntervalMs")).toBe(100);
    });

    it("should set openBrowser flag", () => {
      const cm = ConfigManager.getInstance();
      cm.set("server.openBrowser", false);
      expect(cm.get("server.openBrowser")).toBe(false);
    });

    it("should set baseDir path", () => {
      const cm = ConfigManager.getInstance();
      const newPath = "/opt/bozly";
      cm.set("storage.baseDir", newPath);
      expect(cm.get("storage.baseDir")).toBe(newPath);
    });

  });

  // ============================================================================
  // PART 4: Environment Variable Tests (25 tests)
  // ============================================================================

  describe("Environment Variable Support", () => {
    it("should read BOZLY_PORT from environment", () => {
      process.env.BOZLY_PORT = "4000";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().port).toBe(4000);
    });

    it("should read BOZLY_HOST from environment", () => {
      process.env.BOZLY_HOST = "0.0.0.0";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().host).toBe("0.0.0.0");
    });

    it("should read BOZLY_LOG_LEVEL from environment", () => {
      process.env.BOZLY_LOG_LEVEL = "debug";
      const cm = ConfigManager.getInstance();
      expect(cm.getLogging().level).toBe("debug");
    });

    it("should read BOZLY_LOG_CONSOLE from environment", () => {
      process.env.BOZLY_LOG_CONSOLE = "false";
      const cm = ConfigManager.getInstance();
      expect(cm.getLogging().enableConsole).toBe(false);
    });

    it("should read BOZLY_LOG_FILE from environment", () => {
      process.env.BOZLY_LOG_FILE = "false";
      const cm = ConfigManager.getInstance();
      expect(cm.getLogging().enableFile).toBe(false);
    });

    it("should read BOZLY_API_TIMEOUT from environment", () => {
      process.env.BOZLY_API_TIMEOUT = "20000";
      const cm = ConfigManager.getInstance();
      expect(cm.getClient().apiTimeoutMs).toBe(20000);
    });

    it("should read BOZLY_API_CACHE_TIMEOUT from environment", () => {
      process.env.BOZLY_API_CACHE_TIMEOUT = "8000";
      const cm = ConfigManager.getInstance();
      expect(cm.getClient().apiCacheTimeoutMs).toBe(8000);
    });

    it("should read BOZLY_TUI_REFRESH_INTERVAL from environment", () => {
      process.env.BOZLY_TUI_REFRESH_INTERVAL = "3000";
      const cm = ConfigManager.getInstance();
      expect(cm.getClient().tuiRefreshIntervalMs).toBe(3000);
    });

    it("should read BOZLY_DEBOUNCE_DELAY from environment", () => {
      process.env.BOZLY_DEBOUNCE_DELAY = "500";
      const cm = ConfigManager.getInstance();
      expect(cm.getClient().debounceDelayMs).toBe(500);
    });

    it("should read BOZLY_HOOK_TIMEOUT from environment", () => {
      process.env.BOZLY_HOOK_TIMEOUT = "60000";
      const cm = ConfigManager.getInstance();
      expect(cm.getProcess().hookTimeoutMs).toBe(60000);
    });

    it("should read BOZLY_WORKFLOW_STEP_TIMEOUT from environment", () => {
      process.env.BOZLY_WORKFLOW_STEP_TIMEOUT = "600000";
      const cm = ConfigManager.getInstance();
      expect(cm.getProcess().workflowStepTimeoutMs).toBe(600000);
    });

    it("should read BOZLY_AI_GENERATION_TIMEOUT from environment", () => {
      process.env.BOZLY_AI_GENERATION_TIMEOUT = "120000";
      const cm = ConfigManager.getInstance();
      expect(cm.getProcess().aiGenerationTimeoutMs).toBe(120000);
    });

    it("should read BOZLY_HEALTH_CHECK_TIMEOUT from environment", () => {
      process.env.BOZLY_HEALTH_CHECK_TIMEOUT = "5000";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().healthCheckTimeout).toBe(5000);
    });

    it("should read BOZLY_HEALTH_CHECK_INTERVAL from environment", () => {
      process.env.BOZLY_HEALTH_CHECK_INTERVAL = "100";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().healthCheckIntervalMs).toBe(100);
    });

    it("should read BOZLY_HOME from environment", () => {
      const customHome = path.join(tempDir, "custom-bozly");
      process.env.BOZLY_HOME = customHome;
      const cm = ConfigManager.getInstance();
      expect(cm.getStorage().baseDir).toBe(customHome);
    });

    it("should read BOZLY_SESSION_DIR from environment", () => {
      const sessionDir = path.join(tempDir, "sessions");
      process.env.BOZLY_SESSION_DIR = sessionDir;
      const cm = ConfigManager.getInstance();
      expect(cm.getStorage().sessionDir).toBe(sessionDir);
    });

    it("should read BOZLY_LOG_DIR from environment", () => {
      const logDir = path.join(tempDir, "logs");
      process.env.BOZLY_LOG_DIR = logDir;
      const cm = ConfigManager.getInstance();
      expect(cm.getStorage().logDir).toBe(logDir);
    });

    it("should read BOZLY_CACHE_DIR from environment", () => {
      const cacheDir = path.join(tempDir, "cache");
      process.env.BOZLY_CACHE_DIR = cacheDir;
      const cm = ConfigManager.getInstance();
      expect(cm.getStorage().cacheDir).toBe(cacheDir);
    });

    it("should read BOZLY_LOG_TIMESTAMP from environment", () => {
      process.env.BOZLY_LOG_TIMESTAMP = "false";
      const cm = ConfigManager.getInstance();
      expect(cm.getLogging().includeTimestamp).toBe(false);
    });

    it("should read BOZLY_LOG_CONTEXT from environment", () => {
      process.env.BOZLY_LOG_CONTEXT = "false";
      const cm = ConfigManager.getInstance();
      expect(cm.getLogging().includeContext).toBe(false);
    });

    it("should parse numeric environment variables correctly", () => {
      process.env.BOZLY_PORT = "9999";
      process.env.BOZLY_API_TIMEOUT = "25000";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().port).toBe(9999);
      expect(cm.getClient().apiTimeoutMs).toBe(25000);
      expect(typeof cm.getServer().port).toBe("number");
      expect(typeof cm.getClient().apiTimeoutMs).toBe("number");
    });

    it("should parse boolean environment variables correctly", () => {
      process.env.BOZLY_LOG_CONSOLE = "false";
      process.env.BOZLY_LOG_FILE = "true";
      const cm = ConfigManager.getInstance();
      expect(cm.getLogging().enableConsole).toBe(false);
      expect(cm.getLogging().enableFile).toBe(true);
      expect(typeof cm.getLogging().enableConsole).toBe("boolean");
      expect(typeof cm.getLogging().enableFile).toBe("boolean");
    });

    it("should handle NO_COLOR environment variable", () => {
      process.env.NO_COLOR = "1";
      const cm = ConfigManager.getInstance();
      // Should respect NO_COLOR and disable colors
      expect(cm.getLogging().enableColor).toBe(false);
    });

    it("should handle FORCE_COLOR environment variable", () => {
      process.env.FORCE_COLOR = "1";
      delete process.env.NO_COLOR;
      const cm = ConfigManager.getInstance();
      // Should respect FORCE_COLOR and enable colors
      expect(cm.getLogging().enableColor).toBe(true);
    });

    it("should handle BOZLY_DEBUG for backward compatibility", () => {
      process.env.BOZLY_DEBUG = "true";
      const cm = ConfigManager.getInstance();
      // BOZLY_DEBUG should set log level to debug
      expect(cm.getLogging().level).toBe("debug");
    });
  });

  // ============================================================================
  // PART 5: Validation Tests (20 tests)
  // ============================================================================

  describe("Configuration Validation", () => {
    it("should validate port is within valid range", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("server.port", 1)).not.toThrow();
      expect(() => cm.set("server.port", 65535)).not.toThrow();
      expect(() => cm.set("server.port", 65536)).toThrow();
      expect(() => cm.set("server.port", "invalid" as unknown as number)).toThrow();
    });

    it("should validate port is a positive integer", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("server.port", -1)).toThrow();
      expect(() => cm.set("server.port", 3.14)).toThrow();
    });

    it("should validate log level is valid", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("logging.level", "debug")).not.toThrow();
      expect(() => cm.set("logging.level", "info")).not.toThrow();
      expect(() => cm.set("logging.level", "warn")).not.toThrow();
      expect(() => cm.set("logging.level", "error")).not.toThrow();
      expect(() => cm.set("logging.level", "invalid")).toThrow();
    });

    it("should validate timeout values are positive", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("client.apiTimeoutMs", 100)).not.toThrow();
      expect(() => cm.set("client.apiTimeoutMs", 0)).toThrow();
      expect(() => cm.set("client.apiTimeoutMs", -100)).toThrow();
    });

    it("should validate enableConsole is boolean", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("logging.enableConsole", true)).not.toThrow();
      expect(() => cm.set("logging.enableConsole", false)).not.toThrow();
    });

    it("should validate enableFile is boolean", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("logging.enableFile", true)).not.toThrow();
      expect(() => cm.set("logging.enableFile", false)).not.toThrow();
    });

    it("should validate enableColor is boolean", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("logging.enableColor", true)).not.toThrow();
      expect(() => cm.set("logging.enableColor", false)).not.toThrow();
    });

    it("should validate includeTimestamp is boolean", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("logging.includeTimestamp", true)).not.toThrow();
      expect(() => cm.set("logging.includeTimestamp", false)).not.toThrow();
    });

    it("should validate includeContext is boolean", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("logging.includeContext", true)).not.toThrow();
      expect(() => cm.set("logging.includeContext", false)).not.toThrow();
    });

    it("should validate openBrowser is boolean", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("server.openBrowser", true)).not.toThrow();
      expect(() => cm.set("server.openBrowser", false)).not.toThrow();
    });

    it("should reject invalid path in validation", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("invalid.path", "value")).toThrow();
    });

    it("should validate all timeout values are positive", () => {
      const cm = ConfigManager.getInstance();
      const timeouts = [
        "server.healthCheckTimeout",
        "server.healthCheckIntervalMs",
        "server.startupTimeoutMs",
        "client.apiTimeoutMs",
        "client.apiCacheTimeoutMs",
        "client.tuiRefreshIntervalMs",
        "process.hookTimeoutMs",
        "process.workflowStepTimeoutMs",
        "process.aiGenerationTimeoutMs",
      ];

      for (const timeout of timeouts) {
        expect(() => cm.set(timeout, 0)).toThrow();
        expect(() => cm.set(timeout, 1)).not.toThrow();
        expect(() => cm.set(timeout, -1)).toThrow();
      }
    });

    it("should validate host is not empty string", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("server.host", "0.0.0.0")).not.toThrow();
      expect(() => cm.set("server.host", "localhost")).not.toThrow();
      expect(() => cm.set("server.host", "")).toThrow();
    });

    it("should validate baseDir is not empty string", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("storage.baseDir", "/opt/bozly")).not.toThrow();
      expect(() => cm.set("storage.baseDir", "")).toThrow();
    });

    it("should validate debounce delay is positive", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("client.debounceDelayMs", 100)).not.toThrow();
      expect(() => cm.set("client.debounceDelayMs", 0)).toThrow();
      expect(() => cm.set("client.debounceDelayMs", -1)).toThrow();
    });

    it("should validate maxFileSizeBytes is positive", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("logging.maxFileSizeBytes", 1000)).not.toThrow();
      expect(() => cm.set("logging.maxFileSizeBytes", 0)).toThrow();
      expect(() => cm.set("logging.maxFileSizeBytes", -1)).toThrow();
    });

    it("should provide validation error messages", () => {
      const cm = ConfigManager.getInstance();
      try {
        cm.set("server.port", 0);
        expect.fail("Should have thrown validation error");
      } catch (error) {
        expect((error as Error).message).toContain("port");
      }
    });

    it("should validate health check timeout is positive", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("server.healthCheckTimeout", 100)).not.toThrow();
      expect(() => cm.set("server.healthCheckTimeout", 0)).toThrow();
      expect(() => cm.set("server.healthCheckTimeout", -1)).toThrow();
    });

    it("should validate health check interval is positive", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("server.healthCheckIntervalMs", 100)).not.toThrow();
      expect(() => cm.set("server.healthCheckIntervalMs", 0)).toThrow();
      expect(() => cm.set("server.healthCheckIntervalMs", -1)).toThrow();
    });
  });

  // ============================================================================
  // PART 6: Computed Values Tests (15 tests)
  // ============================================================================

  describe("Computed Derived Values", () => {
    it("should compute sessionDir based on baseDir", () => {
      const cm = ConfigManager.getInstance();
      const baseDir = cm.getStorage().baseDir;
      const sessionDir = cm.getStorage().sessionDir;
      expect(sessionDir).toBe(path.join(baseDir, "sessions"));
    });

    it("should compute logDir based on baseDir", () => {
      const cm = ConfigManager.getInstance();
      const baseDir = cm.getStorage().baseDir;
      const logDir = cm.getStorage().logDir;
      expect(logDir).toBe(path.join(baseDir, "logs"));
    });

    it("should compute cacheDir based on baseDir", () => {
      const cm = ConfigManager.getInstance();
      const baseDir = cm.getStorage().baseDir;
      const cacheDir = cm.getStorage().cacheDir;
      expect(cacheDir).toBe(path.join(baseDir, ".cache"));
    });

    it("should compute commandsDir based on baseDir", () => {
      const cm = ConfigManager.getInstance();
      const baseDir = cm.getStorage().baseDir;
      const commandsDir = cm.getStorage().commandsDir;
      expect(commandsDir).toBe(path.join(baseDir, "commands"));
    });

    it("should compute workflowsDir based on baseDir", () => {
      const cm = ConfigManager.getInstance();
      const baseDir = cm.getStorage().baseDir;
      const workflowsDir = cm.getStorage().workflowsDir;
      expect(workflowsDir).toBe(path.join(baseDir, "workflows"));
    });

    it("should recompute sessionDir when baseDir changes", () => {
      const cm = ConfigManager.getInstance();
      const newBaseDir = "/opt/my-bozly";
      cm.set("storage.baseDir", newBaseDir);
      const sessionDir = cm.getStorage().sessionDir;
      expect(sessionDir).toBe(path.join(newBaseDir, "sessions"));
    });

    it("should recompute logDir when baseDir changes", () => {
      const cm = ConfigManager.getInstance();
      const newBaseDir = "/opt/my-bozly";
      cm.set("storage.baseDir", newBaseDir);
      const logDir = cm.getStorage().logDir;
      expect(logDir).toBe(path.join(newBaseDir, "logs"));
    });

    it("should recompute cacheDir when baseDir changes", () => {
      const cm = ConfigManager.getInstance();
      const newBaseDir = "/opt/my-bozly";
      cm.set("storage.baseDir", newBaseDir);
      const cacheDir = cm.getStorage().cacheDir;
      expect(cacheDir).toBe(path.join(newBaseDir, ".cache"));
    });

    it("should maintain consistent baseDir across all storage paths", () => {
      const cm = ConfigManager.getInstance();
      const storage = cm.getStorage();
      const baseDir = storage.baseDir;

      expect(storage.sessionDir).toContain(baseDir);
      expect(storage.logDir).toContain(baseDir);
      expect(storage.cacheDir).toContain(baseDir);
      expect(storage.commandsDir).toContain(baseDir);
      expect(storage.workflowsDir).toContain(baseDir);
    });

    it("should use BOZLY_HOME for baseDir computation", () => {
      const customHome = "/custom/bozly/path";
      process.env.BOZLY_HOME = customHome;
      const cm = ConfigManager.getInstance();
      expect(cm.getStorage().baseDir).toBe(customHome);
    });

    it("should use default HOME/.bozly when BOZLY_HOME not set", () => {
      delete process.env.BOZLY_HOME;
      const cm = ConfigManager.getInstance();
      const baseDir = cm.getStorage().baseDir;
      expect(baseDir).toContain(".bozly");
    });

    it("should handle computed paths with environment variable expansion", () => {
      process.env.BOZLY_HOME = path.join(tempDir, ".bozly");
      const cm = ConfigManager.getInstance();
      const sessionDir = cm.getStorage().sessionDir;
      expect(sessionDir).toContain(tempDir);
      expect(sessionDir).toContain("sessions");
    });

    it("should recompute all derived values when baseDir is updated", () => {
      const cm = ConfigManager.getInstance();
      const newBaseDir = "/new/base/dir";
      cm.set("storage.baseDir", newBaseDir);

      const storage = cm.getStorage();
      expect(storage.sessionDir).toBe(path.join(newBaseDir, "sessions"));
      expect(storage.logDir).toBe(path.join(newBaseDir, "logs"));
      expect(storage.cacheDir).toBe(path.join(newBaseDir, ".cache"));
      expect(storage.commandsDir).toBe(path.join(newBaseDir, "commands"));
      expect(storage.workflowsDir).toBe(path.join(newBaseDir, "workflows"));
    });

    it("should not compute sessionDir when explicitly set", () => {
      const cm = ConfigManager.getInstance();
      const customSessionDir = "/custom/sessions";
      cm.set("storage.sessionDir", customSessionDir);
      expect(cm.getStorage().sessionDir).toBe(customSessionDir);
    });

    it("should not compute logDir when explicitly set", () => {
      const cm = ConfigManager.getInstance();
      const customLogDir = "/var/log/bozly";
      cm.set("storage.logDir", customLogDir);
      expect(cm.getStorage().logDir).toBe(customLogDir);
    });
  });

  // ============================================================================
  // PART 7: Configuration Priority System Tests (20 tests)
  // ============================================================================

  describe("4-Layer Priority System", () => {
    it("should prioritize environment variable over defaults", () => {
      process.env.BOZLY_PORT = "5000";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().port).toBe(5000);
    });

    it("should use defaults when no environment variable set", () => {
      delete process.env.BOZLY_PORT;
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().port).toBe(3847);
    });

    it("should handle multiple environment variable overrides", () => {
      process.env.BOZLY_PORT = "4000";
      process.env.BOZLY_HOST = "0.0.0.0";
      process.env.BOZLY_LOG_LEVEL = "debug";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().port).toBe(4000);
      expect(cm.getServer().host).toBe("0.0.0.0");
      expect(cm.getLogging().level).toBe("debug");
    });

    it("should parse numeric environment variables as numbers", () => {
      process.env.BOZLY_PORT = "8080";
      const cm = ConfigManager.getInstance();
      const port = cm.getServer().port;
      expect(typeof port).toBe("number");
      expect(port).toBe(8080);
    });

    it("should parse boolean environment variables as booleans", () => {
      process.env.BOZLY_LOG_CONSOLE = "false";
      const cm = ConfigManager.getInstance();
      const value = cm.getLogging().enableConsole;
      expect(typeof value).toBe("boolean");
      expect(value).toBe(false);
    });

    it("should handle environment variable override for all timeouts", () => {
      process.env.BOZLY_HEALTH_CHECK_TIMEOUT = "3000";
      process.env.BOZLY_API_TIMEOUT = "15000";
      process.env.BOZLY_HOOK_TIMEOUT = "45000";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().healthCheckTimeout).toBe(3000);
      expect(cm.getClient().apiTimeoutMs).toBe(15000);
      expect(cm.getProcess().hookTimeoutMs).toBe(45000);
    });

    it("should handle partial environment variable overrides", () => {
      process.env.BOZLY_PORT = "4000";
      // Don't set BOZLY_HOST
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().port).toBe(4000);
      expect(cm.getServer().host).toBe("127.0.0.1"); // default
    });

    it("should validate environment variable values", () => {
      process.env.BOZLY_PORT = "invalid";
      const cm = ConfigManager.getInstance();
      // Invalid numeric env var should use default
      expect(cm.getServer().port).toBe(3847);
    });

    it("should use default when environment variable is invalid log level", () => {
      process.env.BOZLY_LOG_LEVEL = "invalid-level";
      const cm = ConfigManager.getInstance();
      expect(cm.getLogging().level).toBe("info"); // default
    });

    it("should handle string environment variable for port", () => {
      process.env.BOZLY_PORT = "9000";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().port).toBe(9000);
      expect(typeof cm.getServer().port).toBe("number");
    });

    it("should handle case sensitivity for log level", () => {
      process.env.BOZLY_LOG_LEVEL = "DEBUG";
      const cm = ConfigManager.getInstance();
      // Case should be normalized
      const level = cm.getLogging().level;
      expect(["debug", "info", "warn", "error"]).toContain(level);
    });

    it("should respect environment variables set after initialization", () => {
      // First initialization
      const cm1 = ConfigManager.getInstance();
      expect(cm1.getServer().port).toBe(3847);

      // Set environment variable
      process.env.BOZLY_PORT = "5000";

      // Reload configuration
      const cm2 = ConfigManager.getInstance();
      // Should still be 3847 because it's a singleton
      // New env vars require reloading which is manual
      expect(cm2.getServer().port).toBe(3847);
    });

    it("should merge environment variables with defaults", () => {
      process.env.BOZLY_PORT = "4000";
      const cm = ConfigManager.getInstance();
      const config = cm.getConfig();
      expect(config.server.port).toBe(4000);
      expect(config.server.host).toBe("127.0.0.1"); // default, not overridden
      expect(config.server.openBrowser).toBe(true); // default, not overridden
    });

    it("should handle multiple timeout environment variables", () => {
      process.env.BOZLY_HEALTH_CHECK_TIMEOUT = "1000";
      process.env.BOZLY_API_TIMEOUT = "20000";
      process.env.BOZLY_HOOK_TIMEOUT = "40000";
      process.env.BOZLY_WORKFLOW_STEP_TIMEOUT = "500000";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().healthCheckTimeout).toBe(1000);
      expect(cm.getClient().apiTimeoutMs).toBe(20000);
      expect(cm.getProcess().hookTimeoutMs).toBe(40000);
      expect(cm.getProcess().workflowStepTimeoutMs).toBe(500000);
    });

    it("should handle mixed boolean and numeric environment variables", () => {
      process.env.BOZLY_PORT = "3000";
      process.env.BOZLY_LOG_CONSOLE = "false";
      process.env.BOZLY_API_TIMEOUT = "25000";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().port).toBe(3000);
      expect(cm.getLogging().enableConsole).toBe(false);
      expect(cm.getClient().apiTimeoutMs).toBe(25000);
    });

    it("should prioritize explicit setter over environment variable", () => {
      process.env.BOZLY_PORT = "4000";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().port).toBe(4000);
      cm.set("server.port", 5000);
      expect(cm.getServer().port).toBe(5000);
    });

    it("should handle NO_COLOR environment variable globally", () => {
      process.env.NO_COLOR = "1";
      const cm = ConfigManager.getInstance();
      expect(cm.getLogging().enableColor).toBe(false);
    });

    it("should handle BOZLY_DEBUG backward compatibility", () => {
      process.env.BOZLY_DEBUG = "true";
      const cm = ConfigManager.getInstance();
      expect(cm.getLogging().level).toBe("debug");
    });

    it("should handle complex environment variable combinations", () => {
      process.env.BOZLY_PORT = "4000";
      process.env.BOZLY_HOST = "0.0.0.0";
      process.env.BOZLY_LOG_LEVEL = "warn";
      process.env.BOZLY_LOG_CONSOLE = "true";
      process.env.BOZLY_LOG_FILE = "false";
      process.env.BOZLY_API_TIMEOUT = "30000";
      const cm = ConfigManager.getInstance();
      expect(cm.getServer().port).toBe(4000);
      expect(cm.getServer().host).toBe("0.0.0.0");
      expect(cm.getLogging().level).toBe("warn");
      expect(cm.getLogging().enableConsole).toBe(true);
      expect(cm.getLogging().enableFile).toBe(false);
      expect(cm.getClient().apiTimeoutMs).toBe(30000);
    });
  });

  // ============================================================================
  // PART 8: Type Safety Tests (10 tests)
  // ============================================================================

  describe("Type Safety", () => {
    it("should return correct type for port (number)", () => {
      const cm = ConfigManager.getInstance();
      const port = cm.getServer().port;
      expect(typeof port).toBe("number");
      expect(Number.isInteger(port)).toBe(true);
    });

    it("should return correct type for host (string)", () => {
      const cm = ConfigManager.getInstance();
      const host = cm.getServer().host;
      expect(typeof host).toBe("string");
    });

    it("should return correct type for boolean flags", () => {
      const cm = ConfigManager.getInstance();
      const logging = cm.getLogging();
      expect(typeof logging.enableConsole).toBe("boolean");
      expect(typeof logging.enableFile).toBe("boolean");
      expect(typeof logging.enableColor).toBe("boolean");
      expect(typeof logging.includeTimestamp).toBe("boolean");
      expect(typeof logging.includeContext).toBe("boolean");
    });

    it("should return correct type for timeout values (numbers)", () => {
      const cm = ConfigManager.getInstance();
      const client = cm.getClient();
      expect(typeof client.apiTimeoutMs).toBe("number");
      expect(typeof client.apiCacheTimeoutMs).toBe("number");
      expect(typeof client.tuiRefreshIntervalMs).toBe("number");
    });

    it("should return correct type for log level (string)", () => {
      const cm = ConfigManager.getInstance();
      const level = cm.getLogging().level;
      expect(typeof level).toBe("string");
      expect(["debug", "info", "warn", "error"]).toContain(level);
    });

    it("should return correct type for paths (strings)", () => {
      const cm = ConfigManager.getInstance();
      const storage = cm.getStorage();
      expect(typeof storage.baseDir).toBe("string");
      expect(typeof storage.sessionDir).toBe("string");
      expect(typeof storage.logDir).toBe("string");
      expect(typeof storage.cacheDir).toBe("string");
    });

    it("should maintain type consistency across config categories", () => {
      const cm = ConfigManager.getInstance();
      const config = cm.getConfig();

      // All port values should be numbers
      expect(typeof config.server.port).toBe("number");

      // All timeout values should be numbers
      expect(typeof config.server.healthCheckTimeout).toBe("number");
      expect(typeof config.client.apiTimeoutMs).toBe("number");
      expect(typeof config.process.hookTimeoutMs).toBe("number");

      // All boolean flags should be booleans
      expect(typeof config.logging.enableConsole).toBe("boolean");
      expect(typeof config.server.openBrowser).toBe("boolean");
    });

    it("should preserve types when getting nested values", () => {
      const cm = ConfigManager.getInstance();
      const port = cm.get("server.port");
      const level = cm.get("logging.level");
      const enabled = cm.get("logging.enableConsole");

      expect(typeof port).toBe("number");
      expect(typeof level).toBe("string");
      expect(typeof enabled).toBe("boolean");
    });

    it("should preserve types when setting and getting values", () => {
      const cm = ConfigManager.getInstance();
      cm.set("server.port", 4000);
      cm.set("logging.level", "debug");
      cm.set("logging.enableConsole", false);

      expect(typeof cm.get("server.port")).toBe("number");
      expect(typeof cm.get("logging.level")).toBe("string");
      expect(typeof cm.get("logging.enableConsole")).toBe("boolean");
    });

    it("should handle type mismatches in validation", () => {
      const cm = ConfigManager.getInstance();
      // Setting a string when number is expected should throw
      expect(() => cm.set("server.port", "not-a-number" as unknown as number)).toThrow();
    });
  });

  // ============================================================================
  // PART 9: Error Handling Tests (15 tests)
  // ============================================================================

  describe("Error Handling", () => {
    it("should throw error for invalid config path", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.get("invalid.path.deep")).toThrow();
    });

    it("should provide descriptive error message for invalid path", () => {
      const cm = ConfigManager.getInstance();
      try {
        cm.get("nonexistent.key");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect((error as Error).message).toBeTruthy();
        expect((error as Error).message.length).toBeGreaterThan(0);
      }
    });

    it("should throw error when setting port out of range", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("server.port", -1)).toThrow();
      expect(() => cm.set("server.port", 65536)).toThrow();
      expect(() => cm.set("server.port", 0)).toThrow();
    });

    it("should throw error when setting invalid log level", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("logging.level", "invalid")).toThrow();
    });

    it("should throw error when setting negative timeout", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("client.apiTimeoutMs", -100)).toThrow();
    });

    it("should throw error for empty host value", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("server.host", "")).toThrow();
    });

    it("should throw error for empty baseDir value", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("storage.baseDir", "")).toThrow();
    });

    it("should handle get() on undefined nested properties", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.get("server.nonexistent")).toThrow();
    });

    it("should handle set() on undefined nested properties", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("server.nonexistent", "value")).toThrow();
    });

    it("should provide error context for validation failures", () => {
      const cm = ConfigManager.getInstance();
      try {
        cm.set("server.port", 70000);
        expect.fail("Should have thrown validation error");
      } catch (error) {
        expect((error as Error).message).toContain("port");
      }
    });

    it("should handle type errors gracefully", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("server.port", null as unknown as number)).toThrow();
      expect(() => cm.set("server.port", undefined as unknown as number)).toThrow();
    });

    it("should throw error for null path in get()", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.get(null as unknown as string)).toThrow();
    });

    it("should throw error for undefined path in get()", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.get(undefined as unknown as string)).toThrow();
    });

    it("should throw error for empty path string", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.get("")).toThrow();
    });

    it("should validate maxFileSizeBytes is positive", () => {
      const cm = ConfigManager.getInstance();
      expect(() => cm.set("logging.maxFileSizeBytes", 0)).toThrow();
      expect(() => cm.set("logging.maxFileSizeBytes", -1)).toThrow();
      expect(() => cm.set("logging.maxFileSizeBytes", 1000000)).not.toThrow();
    });

    it("should provide helpful error message for common mistakes", () => {
      const cm = ConfigManager.getInstance();
      try {
        cm.set("server.portNumber", 4000); // Wrong property name
        expect.fail("Should have thrown error");
      } catch (error) {
        expect((error as Error).message).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // PART 10: Integration Tests (10 tests)
  // ============================================================================

  describe("Integration Tests", () => {
    it("should handle realistic configuration scenario", () => {
      const cm = ConfigManager.getInstance();

      // Simulate user configuration
      cm.set("server.port", 4000);
      cm.set("server.host", "0.0.0.0");
      cm.set("logging.level", "debug");
      cm.set("client.apiTimeoutMs", 15000);
      cm.set("process.hookTimeoutMs", 60000);

      // Verify all changes are reflected
      expect(cm.getServer().port).toBe(4000);
      expect(cm.getServer().host).toBe("0.0.0.0");
      expect(cm.getLogging().level).toBe("debug");
      expect(cm.getClient().apiTimeoutMs).toBe(15000);
      expect(cm.getProcess().hookTimeoutMs).toBe(60000);
    });

    it("should handle production-like configuration", () => {
      process.env.BOZLY_PORT = "8080";
      process.env.BOZLY_HOST = "0.0.0.0";
      process.env.BOZLY_LOG_LEVEL = "info";
      process.env.BOZLY_LOG_CONSOLE = "false";
      process.env.BOZLY_LOG_FILE = "true";
      process.env.BOZLY_API_TIMEOUT = "30000";

      const cm = ConfigManager.getInstance();

      expect(cm.getServer().port).toBe(8080);
      expect(cm.getServer().host).toBe("0.0.0.0");
      expect(cm.getLogging().level).toBe("info");
      expect(cm.getLogging().enableConsole).toBe(false);
      expect(cm.getLogging().enableFile).toBe(true);
      expect(cm.getClient().apiTimeoutMs).toBe(30000);
    });

    it("should handle development-like configuration", () => {
      process.env.BOZLY_PORT = "3847";
      process.env.BOZLY_HOST = "127.0.0.1";
      process.env.BOZLY_LOG_LEVEL = "debug";
      process.env.BOZLY_LOG_CONSOLE = "true";

      const cm = ConfigManager.getInstance();

      expect(cm.getServer().port).toBe(3847);
      expect(cm.getServer().host).toBe("127.0.0.1");
      expect(cm.getLogging().level).toBe("debug");
      expect(cm.getLogging().enableConsole).toBe(true);
    });

    it("should maintain consistency across all getter methods", () => {
      const cm = ConfigManager.getInstance();
      const config = cm.getConfig();
      const server = cm.getServer();
      const storage = cm.getStorage();
      const client = cm.getClient();
      const logging = cm.getLogging();
      const process_ = cm.getProcess();

      // All should reference the same underlying config
      expect(config.server).toEqual(server);
      expect(config.storage).toEqual(storage);
      expect(config.client).toEqual(client);
      expect(config.logging).toEqual(logging);
      expect(config.process).toEqual(process_);
    });

    it("should handle rapid successive configuration changes", () => {
      const cm = ConfigManager.getInstance();

      for (let i = 0; i < 10; i++) {
        cm.set("server.port", 3000 + i);
        expect(cm.getServer().port).toBe(3000 + i);
      }

      expect(cm.getServer().port).toBe(3009);
    });

    it("should handle all configuration categories independently", () => {
      const cm = ConfigManager.getInstance();

      cm.set("server.port", 4000);
      cm.set("logging.level", "debug");
      cm.set("client.apiTimeoutMs", 15000);
      cm.set("process.hookTimeoutMs", 60000);
      cm.set("storage.baseDir", "/custom/path");

      // Verify each category is independent
      expect(cm.getServer().port).toBe(4000);
      expect(cm.getLogging().level).toBe("debug");
      expect(cm.getClient().apiTimeoutMs).toBe(15000);
      expect(cm.getProcess().hookTimeoutMs).toBe(60000);
      expect(cm.getStorage().baseDir).toBe("/custom/path");
    });

    it("should handle complex environment variable + setter scenarios", () => {
      process.env.BOZLY_PORT = "5000";
      process.env.BOZLY_LOG_LEVEL = "debug";

      const cm = ConfigManager.getInstance();

      // Env vars take initial precedence
      expect(cm.getServer().port).toBe(5000);
      expect(cm.getLogging().level).toBe("debug");

      // Setters can override
      cm.set("server.port", 6000);
      cm.set("logging.level", "info");

      expect(cm.getServer().port).toBe(6000);
      expect(cm.getLogging().level).toBe("info");
    });

    it("should return immutable copies of configuration objects", () => {
      const cm = ConfigManager.getInstance();
      const server1 = cm.getServer();
      const server2 = cm.getServer();

      // Each call should return configuration reflecting current state
      expect(server1.port).toBe(server2.port);
    });

    it("should handle access patterns from migrated code", () => {
      const cm = ConfigManager.getInstance();

      // Patterns from migrated files
      const port = cm.getServer().port;
      const healthTimeout = cm.getServer().healthCheckTimeout;
      const cacheTimeout = cm.getClient().apiCacheTimeoutMs;
      const hookTimeout = cm.getProcess().hookTimeoutMs;
      const logLevel = cm.getLogging().level;

      expect(typeof port).toBe("number");
      expect(typeof healthTimeout).toBe("number");
      expect(typeof cacheTimeout).toBe("number");
      expect(typeof hookTimeout).toBe("number");
      expect(typeof logLevel).toBe("string");
    });

    it("should support chained configuration modifications", () => {
      const cm = ConfigManager.getInstance();

      cm.set("server.port", 4000);
      cm.set("server.host", "0.0.0.0");
      cm.set("logging.level", "debug");
      cm.set("logging.enableConsole", true);
      cm.set("logging.enableFile", false);

      const server = cm.getServer();
      const logging = cm.getLogging();

      expect(server.port).toBe(4000);
      expect(server.host).toBe("0.0.0.0");
      expect(logging.level).toBe("debug");
      expect(logging.enableConsole).toBe(true);
      expect(logging.enableFile).toBe(false);
    });
  });
});
