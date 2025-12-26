/**
 * Unit tests for vault registry operations
 */

import { describe, it, expect } from "vitest";
import {
  createTempDir,
  getTempDir,
  createMockRegistry,
  readJSON,
  fileExists,
  writeJSON,
} from "../conftest";
import { addNodeToRegistry, listNodes, getNode, removeNode, getRegistry, saveRegistry, addNode } from "../../dist/core/registry.js";
import type { Registry } from "../../dist/core/types.js";
import path from "path";
import fs from "fs/promises";

/**
 * Helper to set BOZLY_HOME for tests
 */
function setBozlyHome(homePath: string): void {
  process.env.BOZLY_HOME = homePath;
}

describe("Node Operations", () => {
  describe("addNodeToRegistry", () => {
    it("should add a new node to registry", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      // Create registry first
      await createMockRegistry(tempDir);

      const nodePath = path.join(tempDir, "new-vault");
      await fs.mkdir(nodePath, { recursive: true });

      const vault = await addNodeToRegistry({
        path: nodePath,
        name: "new-vault",
      });

      expect(vault).toBeDefined();
      expect(vault.name).toBe("new-vault");
      expect(vault.path).toBe(nodePath);
      expect(vault.active).toBe(true);
    });

    it("should generate unique vault ID", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vault1Path = path.join(tempDir, "vault-1");
      const vault2Path = path.join(tempDir, "vault-2");
      await fs.mkdir(vault1Path, { recursive: true });
      await fs.mkdir(vault2Path, { recursive: true });

      const vault1 = await addNodeToRegistry({
        path: vault1Path,
        name: "vault-1",
      });

      const vault2 = await addNodeToRegistry({
        path: vault2Path,
        name: "vault-2",
      });

      expect(vault1.id).not.toBe(vault2.id);
    });

    it("should persist vault to registry file", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const nodePath = path.join(tempDir, "new-vault");
      await fs.mkdir(nodePath, { recursive: true });

      await addNodeToRegistry({
        path: nodePath,
        name: "new-vault",
        type: "default",
      });

      const registryPath = path.join(tempDir, "bozly-registry.json");
      const registry = await readJSON<Registry>(registryPath);

      expect(registry.nodes).toHaveLength(2); // original + new
      expect(registry.nodes.some((v) => v.name === "new-vault")).toBe(true);
    });
  });

  describe("listNodes", () => {
    it("should return empty array when no vaults exist", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      // Create empty registry
      const emptyRegistry: Registry = {
        version: "0.3.0",
        nodes: [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      await writeJSON(path.join(tempDir, "bozly-registry.json"), emptyRegistry);

      const vaults = await listNodes();
      expect(vaults).toEqual([]);
    });

    it("should list all registered vaults", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vaults = await listNodes();
      expect(vaults.length).toBeGreaterThan(0);
      expect(vaults[0]).toHaveProperty("id");
      expect(vaults[0]).toHaveProperty("name");
      expect(vaults[0]).toHaveProperty("path");
    });

    it("should include vault metadata", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vaults = await listNodes();
      const vault = vaults[0];

      expect(vault.name).toBe("test-node");
      expect(vault.type).toBe("default");
      expect(vault.active).toBe(true);
      expect(vault.created).toBeDefined();
    });
  });

  describe("getNode", () => {
    it("should retrieve vault by ID", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vaults = await listNodes();
      const nodeId = vaults[0].id;

      const vault = await getNode(nodeId);

      expect(vault).toBeDefined();
      expect(vault?.id).toBe(nodeId);
      expect(vault?.name).toBe("test-node");
    });

    it("should return undefined for non-existent vault", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vault = await getNode("non-existent-id");
      expect(vault).toBeUndefined();
    });

    it("should retrieve vault by name", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vault = await getNode("test-node");

      expect(vault).toBeDefined();
      expect(vault?.name).toBe("test-node");
    });
  });

  describe("removeNode", () => {
    it("should remove vault from registry", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vaults = await listNodes();
      const nodeId = vaults[0].id;
      const initialCount = vaults.length;

      await removeNode(nodeId);

      const updatedVaults = await listNodes();
      expect(updatedVaults.length).toBe(initialCount - 1);
      expect(updatedVaults.some((v) => v.id === nodeId)).toBe(false);
    });

    it("should throw error for non-existent vault", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      await expect(removeNode("non-existent-id")).rejects.toThrow();
    });

    it("should persist changes to registry file", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vaults = await listNodes();
      const nodeId = vaults[0].id;

      await removeNode(nodeId);

      const registryPath = path.join(tempDir, "bozly-registry.json");
      const registry = await readJSON<Registry>(registryPath);

      expect(registry.nodes.some((v) => v.id === nodeId)).toBe(false);
    });
  });

  describe("Registry File Integrity", () => {
    it("should update lastUpdated timestamp on changes", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const registryPath = path.join(tempDir, "bozly-registry.json");
      const beforeRegistry = await readJSON<Registry>(registryPath);

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const nodePath = path.join(tempDir, "vault-2");
      await fs.mkdir(nodePath, { recursive: true });
      await addNodeToRegistry({
        path: nodePath,
        name: "vault-2",
      });

      const afterRegistry = await readJSON<Registry>(registryPath);

      expect(new Date(afterRegistry.lastUpdated).getTime()).toBeGreaterThan(
        new Date(beforeRegistry.lastUpdated).getTime()
      );
    });

    it("should maintain version number", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const registryPath = path.join(tempDir, "bozly-registry.json");
      const registry = await readJSON<Registry>(registryPath);

      expect(registry.version).toBe("0.3.0");
    });
  });

  describe("getRegistry error handling", () => {
    it("should create default registry when file doesn't exist", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      // Don't create registry - test auto-creation
      const registry = await getRegistry();

      expect(registry).toBeDefined();
      expect(registry.version).toBe("0.3.0");
      expect(registry.nodes).toEqual([]);
      expect(await fileExists(path.join(tempDir, "bozly-registry.json"))).toBe(true);
    });

    it("should throw error for malformed registry JSON", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      const registryPath = path.join(tempDir, "bozly-registry.json");
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(registryPath, "{ invalid json", "utf-8");

      await expect(getRegistry()).rejects.toThrow();
    });

    it("should throw error for registry with missing nodes/vaults arrays", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      const registryPath = path.join(tempDir, "bozly-registry.json");
      await fs.mkdir(tempDir, { recursive: true });
      await writeJSON(registryPath, {
        version: "0.3.0",
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });

      await expect(getRegistry()).rejects.toThrow("malformed");
    });

    it("should migrate registry from old vaults format to new nodes format", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      const registryPath = path.join(tempDir, "bozly-registry.json");
      await fs.mkdir(tempDir, { recursive: true });

      const oldRegistry = {
        version: "0.3.0",
        vaults: [
          {
            id: "test-id",
            name: "test-vault",
            path: "/path/to/vault",
            type: "default",
            active: true,
            created: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
          },
        ],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      await writeJSON(registryPath, oldRegistry);

      const registry = await getRegistry();

      expect(registry.nodes).toHaveLength(1);
      expect(registry.nodes[0].name).toBe("test-vault");
      expect(registry.nodes).not.toBeUndefined();
    });
  });

  describe("saveRegistry error handling", () => {
    it("should successfully save registry to disk", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);
      const registry = await getRegistry();
      registry.nodes.push({
        id: "new-id",
        name: "new-node",
        path: "/test/path",
        type: "music",
        active: true,
        created: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      });

      await saveRegistry(registry);

      const saved = await readJSON<Registry>(path.join(tempDir, "bozly-registry.json"));
      expect(saved.nodes).toHaveLength(2);
      expect(saved.nodes[1].name).toBe("new-node");
    });

    it("should update lastUpdated timestamp when saving", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);
      const registry = await getRegistry();
      const oldTimestamp = registry.lastUpdated;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await saveRegistry(registry);

      const saved = await readJSON<Registry>(path.join(tempDir, "bozly-registry.json"));
      expect(new Date(saved.lastUpdated).getTime()).toBeGreaterThan(
        new Date(oldTimestamp).getTime()
      );
    });
  });

  describe("addNode function", () => {
    it("should add node by reading .bozly directory", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      // Create node with .bozly structure
      const nodePath = path.join(tempDir, "my-music-node");
      await fs.mkdir(nodePath, { recursive: true });
      const bozlyPath = path.join(nodePath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });

      const config = {
        name: "my-music",
        type: "music",
        created: new Date().toISOString(),
      };
      await writeJSON(path.join(bozlyPath, "config.json"), config);

      const node = await addNode({ path: nodePath });

      expect(node).toBeDefined();
      expect(node.name).toBe("my-music");
      expect(node.type).toBe("music");
      expect(node.path).toBe(nodePath);
    });

    it("should override config name with provided name parameter", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const nodePath = path.join(tempDir, "my-node");
      await fs.mkdir(nodePath, { recursive: true });
      const bozlyPath = path.join(nodePath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });

      const config = {
        name: "config-name",
        type: "default",
        created: new Date().toISOString(),
      };
      await writeJSON(path.join(bozlyPath, "config.json"), config);

      const node = await addNode({ path: nodePath, name: "override-name" });

      expect(node.name).toBe("override-name");
    });

    it("should throw error if .bozly directory not found", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      const nodePath = path.join(tempDir, "uninitialized-node");
      await fs.mkdir(nodePath, { recursive: true });

      await expect(addNode({ path: nodePath })).rejects.toThrow(".bozly");
    });

    it("should throw error for invalid config.json", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      const nodePath = path.join(tempDir, "bad-config-node");
      await fs.mkdir(nodePath, { recursive: true });
      const bozlyPath = path.join(nodePath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });

      // Write invalid JSON
      await fs.writeFile(path.join(bozlyPath, "config.json"), "{ invalid", "utf-8");

      await expect(addNode({ path: nodePath })).rejects.toThrow("configuration");
    });

    it("should use directory name when config has no name", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const nodePath = path.join(tempDir, "my-vault");
      await fs.mkdir(nodePath, { recursive: true });
      const bozlyPath = path.join(nodePath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });

      const config = {
        type: "default",
        created: new Date().toISOString(),
      };
      await writeJSON(path.join(bozlyPath, "config.json"), config);

      const node = await addNode({ path: nodePath });

      expect(node.name).toBe("my-vault");
    });

    it("should use default type when config type is missing", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const nodePath = path.join(tempDir, "no-type-node");
      await fs.mkdir(nodePath, { recursive: true });
      const bozlyPath = path.join(nodePath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });

      const config = {
        name: "no-type-node",
        created: new Date().toISOString(),
      };
      await writeJSON(path.join(bozlyPath, "config.json"), config);

      const node = await addNode({ path: nodePath });

      expect(node.type).toBe("default");
    });
  });

  describe("addNodeToRegistry update path", () => {
    it("should update existing node when path matches", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const nodePath = path.join(tempDir, "test-node");
      await fs.mkdir(nodePath, { recursive: true });

      // Add initial node
      const initial = await addNodeToRegistry({
        path: nodePath,
        name: "original-name",
        type: "music",
      });

      // Update same path with new data
      const updated = await addNodeToRegistry({
        path: nodePath,
        name: "updated-name",
        type: "journal",
      });

      expect(updated.id).toBe(initial.id);
      expect(updated.name).toBe("updated-name");
      expect(updated.type).toBe("journal");
    });

    it("should update lastAccessed timestamp on existing node", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const nodePath = path.join(tempDir, "update-test");
      await fs.mkdir(nodePath, { recursive: true });

      const initial = await addNodeToRegistry({
        path: nodePath,
        name: "test",
        type: "default",
      });

      const oldAccessed = initial.lastAccessed;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await addNodeToRegistry({
        path: nodePath,
        name: "test",
        type: "default",
      });

      expect(new Date(updated.lastAccessed).getTime()).toBeGreaterThan(
        new Date(oldAccessed).getTime()
      );
    });

    it("should persist updated node to registry", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const nodePath = path.join(tempDir, "persist-update");
      await fs.mkdir(nodePath, { recursive: true });

      await addNodeToRegistry({
        path: nodePath,
        name: "original",
        type: "music",
      });

      await addNodeToRegistry({
        path: nodePath,
        name: "updated",
        type: "journal",
      });

      const registry = await readJSON<Registry>(path.join(tempDir, "bozly-registry.json"));
      const node = registry.nodes.find((n) => n.path === nodePath);

      expect(node?.name).toBe("updated");
      expect(node?.type).toBe("journal");
      expect(registry.nodes).toHaveLength(2); // original + new
    });
  });

  describe("Registry initialization and defaults", () => {
    it("should set created timestamp on new nodes", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const nodePath = path.join(tempDir, "timestamp-test");
      await fs.mkdir(nodePath, { recursive: true });

      const node = await addNodeToRegistry({
        path: nodePath,
        name: "timestamp-node",
        type: "default",
      });

      expect(node.created).toBeDefined();
      expect(new Date(node.created).getTime()).toBeGreaterThan(0);
    });

    it("should set active=true on new nodes", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const nodePath = path.join(tempDir, "active-test");
      await fs.mkdir(nodePath, { recursive: true });

      const node = await addNodeToRegistry({
        path: nodePath,
        name: "active-node",
        type: "default",
      });

      expect(node.active).toBe(true);
    });

    it("should preserve node ID across registry reads", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const nodePath = path.join(tempDir, "id-test");
      await fs.mkdir(nodePath, { recursive: true });

      const node1 = await addNodeToRegistry({
        path: nodePath,
        name: "id-node",
        type: "default",
      });

      const node2 = await getNode(node1.id);

      expect(node2?.id).toBe(node1.id);
    });
  });
});
