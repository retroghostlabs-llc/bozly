/**
 * Node Registry Module
 *
 * Manages the global vault registry stored in ~/.bozly/bozly-registry.json.
 * Provides functionality for registering, updating, removing, and querying vaults.
 * The registry is the central source of truth for all vaults known to BOZLY.
 *
 * Key features:
 * - Global registry management in ~/.bozly/
 * - Automatic registry creation and initialization
 * - Vault registration and metadata tracking
 * - Vault deregistration with integrity checking
 * - Timestamp tracking for created and last-accessed times
 *
 * Usage:
 *   import { getRegistry, addNodeToRegistry, removeNode } from './registry.js';
 *   const registry = await getRegistry();
 *   const vault = await addNodeToRegistry({ name: 'vault', path: '/path', type: 'default' });
 *   await removeNode(vault.id);
 *
 * @module core/registry
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import { createHash } from "crypto";
import { logger } from "./logger.js";
import { Registry, NodeInfo, AddNodeOptions } from "./types.js";

const REGISTRY_FILE = "bozly-registry.json";

/**
 * Get BOZLY_HOME directory path
 * Respects BOZLY_HOME environment variable (useful for testing)
 * Falls back to ~/.bozly if not set
 */
function getBozlyHome(): string {
  return process.env.BOZLY_HOME || path.join(os.homedir(), ".bozly");
}

/**
 * Get the global node registry
 *
 * Loads the registry from ~/.bozly/bozly-registry.json. If the registry doesn't
 * exist, creates a new default registry and initializes the .bozly directory.
 *
 * @returns Global vault registry with all registered nodes
 * @throws {Error} If registry file is malformed or unreadable
 */
export async function getRegistry(): Promise<Registry> {
  const registryPath = path.join(getBozlyHome(), REGISTRY_FILE);

  try {
    const content = await fs.readFile(registryPath, "utf-8");
    const registry = JSON.parse(content) as Registry;
    await logger.debug("Loaded vault registry", {
      nodeCount: registry.nodes.length,
      registryPath,
    });
    return registry;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // Create default registry
      const defaultRegistry: Registry = {
        version: "0.3.0",
        nodes: [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      await ensureBozlyHome();
      await fs.writeFile(registryPath, JSON.stringify(defaultRegistry, null, 2));
      await logger.info("Created default registry", {
        registryPath,
        bozlyHome: getBozlyHome(),
      });
      return defaultRegistry;
    }
    await logger.error("Failed to load registry", { registryPath }, error as Error);
    throw error;
  }
}

/**
 * Save the registry
 *
 * Persists the registry to disk at ~/.bozly/bozly-registry.json, updating the
 * lastUpdated timestamp. Ensures the .bozly directory exists before writing.
 *
 * @param registry - Registry object to save
 * @throws {Error} If unable to write to registry file
 */
export async function saveRegistry(registry: Registry): Promise<void> {
  const registryPath = path.join(getBozlyHome(), REGISTRY_FILE);
  try {
    await ensureBozlyHome();
    registry.lastUpdated = new Date().toISOString();
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    await logger.debug("Saved vault registry", {
      nodeCount: registry.nodes.length,
      lastUpdated: registry.lastUpdated,
    });
  } catch (error) {
    await logger.error("Failed to save registry", { registryPath }, error as Error);
    throw error;
  }
}

/**
 * Add an existing vault to the registry
 *
 * Discovers and registers an existing vault by reading its configuration.
 * The vault must have been initialized (with a .bozly directory) first.
 *
 * @param options - Vault options
 * @param options.path - Path to the vault directory (required)
 * @param options.name - Optional vault name (overrides config name)
 * @returns Vault information that was registered
 * @throws {Error} If node not found, uninitialized, or config is invalid
 */
export async function addNode(options: AddNodeOptions): Promise<NodeInfo> {
  const nodePath = path.resolve(options.path);

  await logger.debug("Adding vault to registry", {
    nodePath,
    name: options.name,
  });

  // Verify .bozly exists
  const bozlyPath = path.join(nodePath, ".bozly");
  try {
    await fs.access(bozlyPath);
    await logger.debug("Verified .bozly directory exists", { bozlyPath });
  } catch (error) {
    await logger.error("No .bozly directory found", { nodePath }, error as Error);
    throw new Error(`No .bozly directory found at ${nodePath}. Run 'bozly init' first.`);
  }

  // Read node config
  const configPath = path.join(bozlyPath, "config.json");
  let config;
  try {
    const content = await fs.readFile(configPath, "utf-8");
    config = JSON.parse(content);
    await logger.debug("Loaded node configuration", {
      nodeName: config.name,
      nodeType: config.type,
    });
  } catch (error) {
    await logger.error("Invalid node configuration", { configPath }, error as Error);
    throw new Error(`Invalid node configuration at ${configPath}`);
  }

  return addNodeToRegistry({
    name: options.name || config.name || path.basename(nodePath),
    path: nodePath,
    type: config.type || "default",
  });
}

/**
 * Add or update a vault in the registry (internal)
 *
 * If the vault is already registered (by path), updates its metadata.
 * Otherwise, creates a new registry entry with a unique ID.
 *
 * @param options - Vault options
 * @param options.name - Vault display name
 * @param options.path - Vault directory path
 * @param options.type - Vault type (e.g., 'music', 'journal', 'default')
 * @returns Vault information with ID and metadata
 */
export async function addNodeToRegistry(options: {
  name: string;
  path: string;
  type: string;
}): Promise<NodeInfo> {
  const registry = await getRegistry();

  // Check if vault already registered
  const existing = registry.nodes.find((v) => v.path === options.path);
  if (existing) {
    // Update existing
    await logger.debug("Updating existing vault registration", {
      nodeName: existing.name,
      nodePath: options.path,
    });
    existing.name = options.name;
    existing.type = options.type;
    existing.lastAccessed = new Date().toISOString();
    await saveRegistry(registry);
    await logger.info("Vault registration updated", {
      vaultId: existing.id,
      nodeName: existing.name,
    });
    return existing;
  }

  // Add new vault
  const vault: NodeInfo = {
    id: generateId(options.path),
    name: options.name,
    path: options.path,
    type: options.type,
    active: true,
    created: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
  };

  registry.nodes.push(vault);
  await saveRegistry(registry);

  await logger.info("New vault registered", {
    vaultId: vault.id,
    nodeName: vault.name,
    nodePath: vault.path,
    nodeType: vault.type,
  });

  return vault;
}

/**
 * List all nodes in the registry
 *
 * @returns Array of all registered nodes
 */
export async function listNodes(): Promise<NodeInfo[]> {
  const registry = await getRegistry();
  return registry.nodes;
}

/**
 * Get a node by ID or name
 *
 * @param idOrName - Vault ID or display name
 * @returns Vault information or undefined if not found
 */
export async function getNode(idOrName: string): Promise<NodeInfo | undefined> {
  const registry = await getRegistry();
  return registry.nodes.find((v) => v.id === idOrName || v.name === idOrName);
}

/**
 * Remove a node from the registry
 *
 * Removes a vault by ID or path. Note that this does NOT delete the vault
 * files from the file system, only removes it from the registry.
 *
 * @param pathOrId - Vault ID or file system path
 * @throws {Error} If vault is not found
 */
export async function removeNode(pathOrId: string): Promise<void> {
  const registry = await getRegistry();
  const index = registry.nodes.findIndex((v) => v.id === pathOrId || v.path === pathOrId);

  if (index === -1) {
    const error = new Error(`Vault not found: ${pathOrId}`);
    await logger.error("Vault not found in registry", { pathOrId }, error);
    throw error;
  }

  const vault = registry.nodes[index];
  registry.nodes.splice(index, 1);
  await saveRegistry(registry);

  await logger.info("Vault removed from registry", {
    vaultId: vault.id,
    nodeName: vault.name,
    nodePath: vault.path,
  });
}

/**
 * Ensure BOZLY_HOME directory exists
 */
async function ensureBozlyHome(): Promise<void> {
  await fs.mkdir(getBozlyHome(), { recursive: true });
}

/**
 * Generate a unique ID from vault path using SHA1 hash
 * Takes first 12 characters of hex-encoded SHA1 for a short, unique ID
 */
function generateId(nodePath: string): string {
  const hash = createHash("sha1").update(nodePath).digest("hex");
  return hash.slice(0, 12);
}
