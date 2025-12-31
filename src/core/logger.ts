/**
 * BOZLY Logging System
 *
 * Comprehensive logging module providing:
 * - Multiple log levels (debug, info, warn, error, fatal)
 * - Console output with color coding
 * - File output to .bozly/logs/
 * - Structured logging for machine readability
 * - Context tracking (file, function, line)
 * - Performance metrics
 *
 * Usage:
 *   import { logger } from './logger.js';
 *   logger.info('Initializing vault', { vaultName: 'my-vault' });
 *   logger.error('Failed to load config', { error: err.message });
 */

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { ConfigManager } from "./config-manager.js";

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * Log level names for display
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.FATAL]: "FATAL",
};

/**
 * Color codes for each log level
 */
const LOG_LEVEL_COLORS: Record<LogLevel, (text: string) => string> = {
  [LogLevel.DEBUG]: chalk.gray,
  [LogLevel.INFO]: chalk.blue,
  [LogLevel.WARN]: chalk.yellow,
  [LogLevel.ERROR]: chalk.red,
  [LogLevel.FATAL]: chalk.bgRed.white,
};

/**
 * Configuration for logging
 */
interface LoggerConfig {
  level: LogLevel;
  consoleLevel: LogLevel; // Separate level for console output (only WARN+ by default)
  logDir?: string;
  enableFile: boolean;
  enableConsole: boolean;
  enableColor: boolean;
  includeContext: boolean;
  includeTimestamp: boolean;
}

/**
 * Structured log entry
 */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  error?: string;
  stack?: string;
  file?: string;
  function?: string;
  line?: number;
  performance?: Record<string, number>;
}

/**
 * Logger class providing comprehensive logging functionality
 */
class Logger {
  private config: LoggerConfig;
  private logFilePath: string | null = null;
  private performanceMarkers: Map<string, number> = new Map();

  /**
   * Initialize logger with configuration
   */
  constructor(config: Partial<LoggerConfig> = {}) {
    const loggingConfig = ConfigManager.getInstance().getLogging();

    // Map LogLevel string to enum value
    const levelMap: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
      fatal: LogLevel.FATAL,
    };

    this.config = {
      level: levelMap[loggingConfig.level] ?? LogLevel.INFO,
      consoleLevel: LogLevel.WARN, // Only WARN, ERROR, FATAL on console by default
      enableFile: loggingConfig.enableFile,
      enableConsole: loggingConfig.enableConsole,
      enableColor: loggingConfig.enableColor ?? process.stdout.isTTY ?? false,
      includeContext: loggingConfig.includeContext,
      includeTimestamp: loggingConfig.includeTimestamp,
      ...config,
    };
  }

  /**
   * Set log directory (typically .bozly/logs/)
   */
  async setLogDir(logDir: string): Promise<void> {
    // Create log directory if it doesn't exist
    await fs.mkdir(logDir, { recursive: true });

    // Set log file path with date only (one file per day)
    const dateOnly = new Date().toISOString().split("T")[0];
    this.logFilePath = path.join(logDir, `bozly-${dateOnly}.log`);

    // Write header to log file
    const header = `
═══════════════════════════════════════════════════════════════
BOZLY Session Log
Started: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════════
`;
    await fs.writeFile(this.logFilePath, header);
  }

  /**
   * Get caller information (file, function, line)
   */
  private getCallerInfo(): { file?: string; function?: string; line?: number } {
    const stack = new Error().stack ?? "";
    const lines = stack.split("\n");

    // Find the first stack frame outside of this logger
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes("logger.ts")) {
        const match = line.match(/at (.+) \((.+):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1].trim(),
            file: path.basename(match[2]),
            line: parseInt(match[3], 10),
          };
        }
      }
    }

    return {};
  }

  /**
   * Format log entry for console output
   */
  private formatConsoleOutput(entry: LogEntry): string {
    // Convert level string back to enum number for color lookup
    const levelEntry = Object.entries(LOG_LEVEL_NAMES).find(([_, name]) => name === entry.level);
    const levelNum = levelEntry ? (parseInt(levelEntry[0], 10) as LogLevel) : LogLevel.INFO;
    const levelColor = LOG_LEVEL_COLORS[levelNum];

    let output = this.config.enableColor ? levelColor(`[${entry.level}]`) : `[${entry.level}]`;

    if (this.config.includeTimestamp) {
      output += ` ${chalk.gray(entry.timestamp)}`;
    }

    output += ` ${entry.message}`;

    if (this.config.includeContext && entry.file) {
      output += chalk.gray(` (${entry.file}:${entry.line})`);
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += "\n" + chalk.gray(JSON.stringify(entry.context, null, 2));
    }

    if (entry.error) {
      output += "\n" + chalk.red(`Error: ${entry.error}`);
      // Note: Stack trace is logged to file but not console to avoid test runner interference
    }

    return output;
  }

  /**
   * Format log entry for file output
   */
  private formatFileOutput(entry: LogEntry): string {
    const json = JSON.stringify(entry, null, 2);
    return `${json}\n`;
  }

  /**
   * Write log entry to outputs
   */
  private async writeLogEntry(entry: LogEntry): Promise<void> {
    // Convert level string to enum for comparison
    const levelMap: Record<string, LogLevel> = {
      DEBUG: LogLevel.DEBUG,
      INFO: LogLevel.INFO,
      WARN: LogLevel.WARN,
      ERROR: LogLevel.ERROR,
      FATAL: LogLevel.FATAL,
    };
    const entryLevel = levelMap[entry.level] ?? LogLevel.INFO;

    // Write to console only if level meets consoleLevel threshold
    if (this.config.enableConsole && entryLevel >= this.config.consoleLevel) {
      const output = this.formatConsoleOutput(entry);

      if (entryLevel >= LogLevel.ERROR) {
        // eslint-disable-next-line no-console
        console.error(output);
      } else {
        // eslint-disable-next-line no-console
        console.log(output);
      }
    }

    // Write to file (only if log directory has been set up)
    if (this.config.enableFile && this.logFilePath) {
      const fileOutput = this.formatFileOutput(entry);
      try {
        await fs.appendFile(this.logFilePath, fileOutput);
      } catch (error) {
        // Silently skip file output if unable to write (directory not initialized)
        // This allows logger to be used before setLogDir() is called
      }
    }
  }

  /**
   * Core logging method
   */
  private async log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown> | Error,
    error?: Error
  ): Promise<void> {
    if (level < this.config.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const caller = this.config.includeContext ? this.getCallerInfo() : {};

    let contextObj: Record<string, unknown> | undefined;
    let errorStr: string | undefined;
    let stackStr: string | undefined;

    if (context instanceof Error) {
      errorStr = context.message;
      stackStr = context.stack;
    } else {
      contextObj = context;
    }

    if (error) {
      errorStr = error.message;
      stackStr = error.stack;
    }

    const entry: LogEntry = {
      timestamp,
      level: LOG_LEVEL_NAMES[level],
      message,
      context: contextObj,
      error: errorStr,
      stack: stackStr,
      file: caller.file,
      function: caller.function,
      line: caller.line,
    };

    await this.writeLogEntry(entry);
  }

  /**
   * Log at DEBUG level
   */
  async debug(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log at INFO level
   */
  async info(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log at WARN level
   */
  async warn(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log at ERROR level
   */
  async error(
    message: string,
    context?: Record<string, unknown> | Error,
    error?: Error
  ): Promise<void> {
    await this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log at FATAL level (and exit)
   */
  async fatal(
    message: string,
    context?: Record<string, unknown> | Error,
    error?: Error
  ): Promise<never> {
    await this.log(LogLevel.FATAL, message, context, error);
    process.exit(1);
  }

  /**
   * Mark start of performance measurement
   */
  markStart(label: string): void {
    this.performanceMarkers.set(label, Date.now());
  }

  /**
   * Mark end of performance measurement and log
   */
  async markEnd(label: string, message?: string): Promise<void> {
    const start = this.performanceMarkers.get(label);
    if (!start) {
      this.warn(`Performance marker "${label}" not started`);
      return;
    }

    const duration = Date.now() - start;
    this.performanceMarkers.delete(label);

    await this.info(message ?? `Completed: ${label}`, {
      duration: `${duration}ms`,
      label,
    });
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log file path
   */
  getLogFilePath(): string | null {
    return this.logFilePath;
  }
}

/**
 * Global logger instance (singleton)
 */
let globalLogger: Logger | null = null;

/**
 * Get or create global logger
 */
export function getLogger(config?: Partial<LoggerConfig>): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config);
  }
  return globalLogger;
}

/**
 * Convenience exports for common logging patterns
 */
export const logger = {
  /**
   * Initialize logger with log directory
   */
  async init(logDir: string, config?: Partial<LoggerConfig>): Promise<Logger> {
    const log = getLogger(config);
    await log.setLogDir(logDir);
    return log;
  },

  /**
   * Log at DEBUG level
   */
  debug: (message: string, context?: Record<string, unknown>): Promise<void> =>
    getLogger().debug(message, context),

  /**
   * Log at INFO level
   */
  info: (message: string, context?: Record<string, unknown>): Promise<void> =>
    getLogger().info(message, context),

  /**
   * Log at WARN level
   */
  warn: (message: string, context?: Record<string, unknown>): Promise<void> =>
    getLogger().warn(message, context),

  /**
   * Log at ERROR level
   */
  error: (
    message: string,
    context?: Record<string, unknown> | Error,
    error?: Error
  ): Promise<void> => getLogger().error(message, context, error),

  /**
   * Log at FATAL level and exit
   */
  fatal: (
    message: string,
    context?: Record<string, unknown> | Error,
    error?: Error
  ): Promise<never> => getLogger().fatal(message, context, error),

  /**
   * Mark performance start
   */
  markStart: (label: string): void => getLogger().markStart(label),

  /**
   * Mark performance end
   */
  markEnd: (label: string, message?: string): Promise<void> => getLogger().markEnd(label, message),
};

export default logger;
