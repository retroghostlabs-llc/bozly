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
  NodeConfig,
  NodeInfo,
  Registry,
  GlobalConfig,
  NodeCommand,
  // Node operations
  initNode,
  getCurrentNode,
  // Registry operations
  getRegistry,
  addNode,
  removeNode,
  // Context generation
  generateContext,
  // Command operations
  getNodeCommands,
  getCommand,
  runNodeCommand,
  // Configuration
  getConfig,
  setConfig,
  getGlobalConfig,
  getNodeConfig,
} from "./core/index.js";

// Version
export const VERSION = "0.3.0-alpha.1";
