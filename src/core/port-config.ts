import { ConfigManager } from "./config-manager.js";

/**
 * Backward compatibility wrapper for port-config
 *
 * This module now delegates to the comprehensive ConfigManager.
 * All functions are thin wrappers for backward compatibility.
 *
 * New code should use ConfigManager directly:
 *   import { ConfigManager } from './config-manager.js';
 *   const config = ConfigManager.getInstance();
 *   const port = config.getServer().port;
 */

/**
 * Get the configured BOZLY port
 * @deprecated Use ConfigManager.getInstance().getServer().port instead
 */
export function getDefaultPort(): number {
  return ConfigManager.getInstance().getServer().port;
}

/**
 * Get the configured BOZLY host
 * @deprecated Use ConfigManager.getInstance().getServer().host instead
 */
export function getDefaultHost(): string {
  return ConfigManager.getInstance().getServer().host;
}

/**
 * Validate port number
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

/**
 * Get API URL for TUI and other clients
 * @deprecated Use ConfigManager.getInstance().getServer() instead
 */
export function getAPIURL(port?: number, host?: string): string {
  const config = ConfigManager.getInstance().getServer();
  const configPort = port ?? config.port;
  const configHost = host ?? config.host;
  return `http://${configHost}:${configPort}/api`;
}
