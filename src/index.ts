/**
 * BOZLY - Build. OrganiZe. Link. Yield.
 *
 * AI-agnostic framework for domain-specific workspaces
 *
 * @packageDocumentation
 */

// Export core functionality for programmatic use
export {
  // Types
  VaultConfig,
  VaultInfo,
  Registry,
  GlobalConfig,
  VaultCommand,
  // Vault operations
  initVault,
  getCurrentVault,
  // Registry operations
  getRegistry,
  addVault,
  removeVault,
  // Context generation
  generateContext,
  // Command operations
  getVaultCommands,
  getCommand,
  runVaultCommand,
  // Configuration
  getConfig,
  setConfig,
  getGlobalConfig,
  getVaultConfig,
} from "./core/index.js";

// Version
export const VERSION = "0.3.0-alpha.1";
