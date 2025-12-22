/**
 * Vitest configuration and shared test utilities
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { beforeEach, afterEach } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Temporary directory for test isolation
 */
let tempTestDir: string;

/**
 * Create isolated temporary directory for each test
 */
export async function createTempDir(): Promise<string> {
  const tempBase = path.join(__dirname, "..", ".tmp");
  await fs.mkdir(tempBase, { recursive: true });

  // Create unique directory with timestamp and random suffix
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  tempTestDir = path.join(tempBase, `test-${timestamp}-${random}`);

  await fs.mkdir(tempTestDir, { recursive: true });
  return tempTestDir;
}

/**
 * Clean up temporary test directory
 */
export async function cleanupTempDir(): Promise<void> {
  if (tempTestDir && (await dirExists(tempTestDir))) {
    await fs.rm(tempTestDir, { recursive: true, force: true });
  }
}

/**
 * Get current temp directory (created in test)
 */
export function getTempDir(): string {
  if (!tempTestDir) {
    throw new Error("Temp directory not created. Call createTempDir() first.");
  }
  return tempTestDir;
}

/**
 * Check if directory exists
 */
export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Read JSON file with error handling
 */
export async function readJSON<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

/**
 * Write JSON file with formatting
 */
export async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Create mock vault structure for testing
 */
export async function createMockVault(basePath: string): Promise<string> {
  const nodePath = path.join(basePath, "test-vault");
  const bozlyPath = path.join(nodePath, ".bozly");

  // Create directory structure
  await fs.mkdir(path.join(bozlyPath, "sessions"), { recursive: true });
  await fs.mkdir(path.join(bozlyPath, "tasks"), { recursive: true });
  await fs.mkdir(path.join(bozlyPath, "commands"), { recursive: true });
  await fs.mkdir(path.join(bozlyPath, "workflows"), { recursive: true });
  await fs.mkdir(path.join(bozlyPath, "hooks"), { recursive: true });

  // Create config.json
  const config = {
    name: "test-vault",
    type: "default",
    version: "0.3.0",
    created: new Date().toISOString(),
    ai: {
      defaultProvider: "claude",
      providers: ["claude", "gpt", "gemini", "ollama"],
    },
  };
  await writeJSON(path.join(bozlyPath, "config.json"), config);

  // Create context.md
  const context = "# Test Vault Context\n\nThis is a test vault for unit testing.";
  await fs.writeFile(path.join(bozlyPath, "context.md"), context);

  // Create index.json
  const index = { tasks: [], lastUpdated: new Date().toISOString() };
  await writeJSON(path.join(bozlyPath, "index.json"), index);

  return nodePath;
}

/**
 * Create mock registry file for testing
 */
export async function createMockRegistry(basePath: string): Promise<void> {
  const registry = {
    version: "0.3.0",
    vaults: [
      {
        id: "test-vault-1",
        name: "test-vault",
        path: path.join(basePath, "test-vault"),
        type: "default",
        active: true,
        created: new Date().toISOString(),
      },
    ],
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
  await writeJSON(path.join(basePath, "bozly-registry.json"), registry);
}

/**
 * Clean up test vaults from global registry
 * Removes any vaults registered during test runs
 */
export async function cleanupGlobalRegistry(testMarker?: string): Promise<void> {
  try {
    const registryPath = path.join(os.homedir(), ".bozly", "bozly-registry.json");

    if (await fileExists(registryPath)) {
      const registry = await readJSON<any>(registryPath);

      // Remove vaults with .tmp in path (test vaults) or matching test marker
      const originalCount = registry.nodes.length;
      registry.nodes = registry.nodes.filter((vault: any) => {
        const isTestVault = vault.path.includes("/.tmp/");
        const isMarkedTest = testMarker && vault.name.includes(testMarker);
        return !isTestVault && !isMarkedTest;
      });

      if (registry.nodes.length < originalCount) {
        registry.lastUpdated = new Date().toISOString();
        await writeJSON(registryPath, registry);
      }
    }
  } catch (error) {
    // Log error but don't fail tests if registry cleanup fails
    console.warn("Failed to cleanup global registry:", error);
  }
}

/**
 * Setup hooks - run before each test
 */
beforeEach(async () => {
  // Clear any previous temp directory
  if (tempTestDir) {
    await cleanupTempDir();
  }
});

/**
 * Teardown hooks - run after each test
 */
afterEach(async () => {
  // Always cleanup temp directories
  await cleanupTempDir();

  // Clean test vaults from registry (.tmp directories)
  await cleanupGlobalRegistry("test");
});

/**
 * Suppress console output during tests (optional)
 */
export function silenceConsole(): void {
  global.console.log = () => {
    // no-op
  };
  global.console.info = () => {
    // no-op
  };
  global.console.warn = () => {
    // no-op
  };
}

/**
 * Restore console output
 */
export function restoreConsole(): void {
  delete (global.console as any).log;
  delete (global.console as any).info;
  delete (global.console as any).warn;
}
