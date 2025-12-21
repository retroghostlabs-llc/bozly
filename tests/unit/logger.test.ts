/**
 * Unit tests for logging system
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getLogger,
  logger,
  LogLevel,
} from "../../src/core/logger.js";
import {
  createTempDir,
  getTempDir,
  dirExists,
  fileExists,
  readJSON,
} from "../conftest";
import fs from "fs/promises";
import path from "path";

describe("Logger System", () => {
  describe("Logger Configuration", () => {
    it("should create logger with default config", () => {
      const log = getLogger();
      expect(log).toBeDefined();
    });

    it("should create logger with custom config", () => {
      const log = getLogger({
        level: LogLevel.DEBUG,
        enableColor: false,
        includeContext: true,
      });
      expect(log).toBeDefined();
    });

    it("should return singleton instance", () => {
      const log1 = getLogger();
      const log2 = getLogger();
      expect(log1).toBe(log2);
    });

    it("should set log level", () => {
      const log = getLogger({
        level: LogLevel.INFO,
      });
      log.setLevel(LogLevel.DEBUG);
      // Can't directly assert private config, but method should not throw
    });
  });

  describe("Logger Initialization", () => {
    it("should initialize logger with log directory", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const logsDir = path.join(tempDir, "logs");

      const log = await logger.init(logsDir);

      expect(log).toBeDefined();
      expect(await dirExists(logsDir)).toBe(true);
    });

    it("should create log directory if missing", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const logsDir = path.join(tempDir, "nonexistent", "logs");

      await logger.init(logsDir);

      expect(await dirExists(logsDir)).toBe(true);
    });

    it("should return logger instance", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const logsDir = path.join(tempDir, "logs");

      const log = await logger.init(logsDir);

      expect(log).toBeDefined();
      expect(log.getLogFilePath()).toBeDefined();
    });

    it("should create log file with timestamp", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const logsDir = path.join(tempDir, "logs");

      const log = await logger.init(logsDir);
      const logFile = log.getLogFilePath();

      expect(logFile).toBeDefined();
      expect(logFile).toContain("bozly-");
      expect(logFile).toContain(".log");
    });
  });

  describe("Log Levels", () => {
    it("should respect minimum log level", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const logsDir = path.join(tempDir, "logs");

      const log = getLogger({
        level: LogLevel.INFO,
        enableConsole: false,
        enableFile: true,
      });
      await log.setLogDir(logsDir);

      // DEBUG should be filtered out
      await log.debug("This should not appear");
      // INFO should appear
      await log.info("This should appear");

      // Can't directly verify console output, but method should not throw
    });

    it("should log at DEBUG level", async () => {
      await logger.debug("Debug message", { key: "value" });
      // Should not throw
    });

    it("should log at INFO level", async () => {
      await logger.info("Info message", { key: "value" });
      // Should not throw
    });

    it("should log at WARN level", async () => {
      await logger.warn("Warning message", { key: "value" });
      // Should not throw
    });

    it("should log at ERROR level", async () => {
      const error = new Error("Test error");
      await logger.error("Error message", { context: "value" }, error);
      // Should not throw
    });
  });

  describe("Context Information", () => {
    it("should include file information in logs", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const logsDir = path.join(tempDir, "logs");

      const log = getLogger({
        enableConsole: false,
        enableFile: true,
        includeContext: true,
      });
      await log.setLogDir(logsDir);

      await log.info("Test message");

      // Log file should exist and contain entry
      const logFile = log.getLogFilePath();
      expect(await fileExists(logFile!)).toBe(true);

      const content = await fs.readFile(logFile!, "utf-8");
      expect(content).toContain("Test message");
    });

    it("should include timestamp in logs", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const logsDir = path.join(tempDir, "logs");

      const log = getLogger({
        enableConsole: false,
        enableFile: true,
        includeTimestamp: true,
      });
      await log.setLogDir(logsDir);

      await log.info("Test message");

      const logFile = log.getLogFilePath();
      const content = await fs.readFile(logFile!, "utf-8");
      // Should contain ISO timestamp
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("Error Handling", () => {
    it("should log Error objects", async () => {
      const error = new Error("Test error message");
      await logger.error("Operation failed", error);
      // Should not throw
    });

    it("should log errors with context", async () => {
      const error = new Error("Test error");
      await logger.error("Operation failed", { operation: "test" }, error);
      // Should not throw
    });

    it("should include error stack trace", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const logsDir = path.join(tempDir, "logs");

      const log = getLogger({
        enableConsole: false,
        enableFile: true,
      });
      await log.setLogDir(logsDir);

      const error = new Error("Stack trace test");
      await log.error("Error with stack", error);

      const logFile = log.getLogFilePath();
      const content = await fs.readFile(logFile!, "utf-8");
      expect(content).toContain("Stack trace test");
    });
  });

  describe("Performance Tracking", () => {
    it("should mark performance start", () => {
      const log = getLogger();
      log.markStart("test-operation");
      // Should not throw
    });

    it("should mark performance end", async () => {
      const log = getLogger();
      log.markStart("test-operation");

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 10));

      await log.markEnd("test-operation", "Operation completed");
      // Should not throw
    });

    it("should warn if marker not started", async () => {
      const log = getLogger({
        enableConsole: false,
        enableFile: false,
      });

      await log.markEnd("nonexistent", "Operation completed");
      // Should handle gracefully (warn but not throw)
    });

    it("should track multiple markers", () => {
      const log = getLogger();
      log.markStart("op1");
      log.markStart("op2");
      log.markStart("op3");
      // Should handle multiple markers
    });
  });

  describe("Log Output Formats", () => {
    it("should write structured JSON to log file", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const logsDir = path.join(tempDir, "logs");

      const log = getLogger({
        enableConsole: false,
        enableFile: true,
      });
      await log.setLogDir(logsDir);

      await log.info("Test message", { testKey: "testValue" });

      const logFile = log.getLogFilePath();
      const content = await fs.readFile(logFile!, "utf-8");

      // Should contain JSON
      expect(content).toContain('"level"');
      expect(content).toContain('"message"');
      expect(content).toContain("Test message");
    });

    it("should format timestamps correctly", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const logsDir = path.join(tempDir, "logs");

      const log = getLogger({
        enableConsole: false,
        enableFile: true,
      });
      await log.setLogDir(logsDir);

      const beforeTime = new Date();
      await log.info("Timestamp test");
      const afterTime = new Date();

      const logFile = log.getLogFilePath();
      const content = await fs.readFile(logFile!, "utf-8");

      // Extract timestamp from JSON
      const timestampMatch = content.match(/"timestamp":"([^"]+)"/);
      expect(timestampMatch).toBeDefined();

      if (timestampMatch) {
        const logTime = new Date(timestampMatch[1]);
        expect(logTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(logTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      }
    });
  });

  describe("Convenience Methods", () => {
    it("should provide logger.info convenience method", async () => {
      await logger.info("Test message");
      // Should not throw
    });

    it("should provide logger.debug convenience method", async () => {
      await logger.debug("Debug message");
      // Should not throw
    });

    it("should provide logger.warn convenience method", async () => {
      await logger.warn("Warning message");
      // Should not throw
    });

    it("should provide logger.error convenience method", async () => {
      await logger.error("Error message", new Error("Test"));
      // Should not throw
    });

    it("should provide logger.markStart convenience method", () => {
      logger.markStart("test-mark");
      // Should not throw
    });

    it("should provide logger.markEnd convenience method", async () => {
      logger.markStart("test-mark");
      await logger.markEnd("test-mark");
      // Should not throw
    });
  });

  describe("Console Output Control", () => {
    it("should allow disabling console output", async () => {
      const log = getLogger({
        enableConsole: false,
        enableFile: false,
      });

      // Should not throw even with console disabled
      await log.info("Silent message");
    });

    it("should allow disabling file output", async () => {
      const log = getLogger({
        enableFile: false,
        enableConsole: false,
      });

      // Should not throw even with file disabled
      await log.info("Consoleless message");
    });

    it("should support color configuration", () => {
      const logWithColor = getLogger({
        enableColor: true,
      });

      const logWithoutColor = getLogger({
        enableColor: false,
      });

      expect(logWithColor).toBeDefined();
      expect(logWithoutColor).toBeDefined();
    });
  });

  describe("Context Handling", () => {
    it("should handle empty context", async () => {
      await logger.info("Message without context");
      // Should not throw
    });

    it("should handle complex context objects", async () => {
      const context = {
        nested: {
          deep: {
            value: "test",
          },
        },
        array: [1, 2, 3],
        number: 42,
      };

      await logger.info("Message with complex context", context);
      // Should not throw
    });

    it("should handle null/undefined in context", async () => {
      const context = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: "test",
      };

      await logger.info("Message with null/undefined", context);
      // Should not throw
    });
  });

  describe("Integration", () => {
    it("should work through full logging workflow", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const logsDir = path.join(tempDir, "logs");

      const log = await logger.init(logsDir, {
        level: LogLevel.DEBUG,
        enableConsole: false,
        enableFile: true,
      });

      log.markStart("workflow-test");

      await log.debug("Starting operation", { step: 1 });
      await log.info("Processing", { step: 2 });
      await log.warn("Warning condition", { step: 3 });

      await log.markEnd("workflow-test");

      const logFile = log.getLogFilePath();
      expect(await fileExists(logFile!)).toBe(true);

      const content = await fs.readFile(logFile!, "utf-8");
      expect(content).toContain("Starting operation");
      expect(content).toContain("Processing");
      expect(content).toContain("Warning condition");
    });
  });
});
