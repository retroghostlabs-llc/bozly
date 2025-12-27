import fs from "fs";
import path from "path";
import os from "os";

export interface BozlyConfig {
  port?: number;
  host?: string;
  [key: string]: unknown;
}

/**
 * Get the configured BOZLY port from multiple sources
 * Priority order:
 * 1. Environment variable BOZLY_PORT
 * 2. Config file ~/.bozly/bozly-config.json (port field)
 * 3. Default port 3847
 */
export function getDefaultPort(): number {
  // Check environment variable first
  if (process.env.BOZLY_PORT) {
    const port = parseInt(process.env.BOZLY_PORT, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return port;
    }
  }

  // Check config file
  try {
    const configPath = path.join(os.homedir(), ".bozly", "bozly-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as BozlyConfig;
      if (config.port && typeof config.port === "number") {
        if (config.port > 0 && config.port <= 65535) {
          return config.port;
        }
      }
    }
  } catch {
    // Config file doesn't exist or is invalid, continue to default
  }

  // Default port
  return 3847;
}

/**
 * Get the configured BOZLY host
 * Priority order:
 * 1. Environment variable BOZLY_HOST
 * 2. Config file ~/.bozly/bozly-config.json (host field)
 * 3. Default host 127.0.0.1
 */
export function getDefaultHost(): string {
  // Check environment variable first
  if (process.env.BOZLY_HOST) {
    return process.env.BOZLY_HOST;
  }

  // Check config file
  try {
    const configPath = path.join(os.homedir(), ".bozly", "bozly-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as BozlyConfig;
      if (config.host && typeof config.host === "string") {
        return config.host;
      }
    }
  } catch {
    // Config file doesn't exist or is invalid, continue to default
  }

  // Default host
  return "127.0.0.1";
}

/**
 * Validate port number
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

/**
 * Get API URL for TUI and other clients
 */
export function getAPIURL(port?: number, host?: string): string {
  const configPort = port ?? getDefaultPort();
  const configHost = host ?? getDefaultHost();
  return `http://${configHost}:${configPort}/api`;
}
