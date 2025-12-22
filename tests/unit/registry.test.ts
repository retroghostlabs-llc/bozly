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
import { addNodeToRegistry, listNodes, getNode, removeNode } from "../../dist/core/registry.js";
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
});
