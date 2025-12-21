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
import { addVaultToRegistry, listVaults, getVault, removeVault } from "../../src/core/registry";
import type { Registry } from "../../src/core/types";
import path from "path";
import fs from "fs/promises";

/**
 * Helper to set BOZLY_HOME for tests
 */
function setBozlyHome(homePath: string): void {
  process.env.BOZLY_HOME = homePath;
}

describe("Vault Registry", () => {
  describe("addVaultToRegistry", () => {
    it("should add a new vault to registry", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      // Create registry first
      await createMockRegistry(tempDir);

      const vaultPath = path.join(tempDir, "new-vault");
      await fs.mkdir(vaultPath, { recursive: true });

      const vault = await addVaultToRegistry({
        path: vaultPath,
        name: "new-vault",
      });

      expect(vault).toBeDefined();
      expect(vault.name).toBe("new-vault");
      expect(vault.path).toBe(vaultPath);
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

      const vault1 = await addVaultToRegistry({
        path: vault1Path,
        name: "vault-1",
      });

      const vault2 = await addVaultToRegistry({
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

      const vaultPath = path.join(tempDir, "new-vault");
      await fs.mkdir(vaultPath, { recursive: true });

      await addVaultToRegistry({
        path: vaultPath,
        name: "new-vault",
        type: "default",
      });

      const registryPath = path.join(tempDir, "bozly-registry.json");
      const registry = await readJSON<Registry>(registryPath);

      expect(registry.vaults).toHaveLength(2); // original + new
      expect(registry.vaults.some((v) => v.name === "new-vault")).toBe(true);
    });
  });

  describe("listVaults", () => {
    it("should return empty array when no vaults exist", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      // Create empty registry
      const emptyRegistry: Registry = {
        version: "0.3.0",
        vaults: [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      await writeJSON(path.join(tempDir, "bozly-registry.json"), emptyRegistry);

      const vaults = await listVaults();
      expect(vaults).toEqual([]);
    });

    it("should list all registered vaults", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vaults = await listVaults();
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

      const vaults = await listVaults();
      const vault = vaults[0];

      expect(vault.name).toBe("test-vault");
      expect(vault.type).toBe("default");
      expect(vault.active).toBe(true);
      expect(vault.created).toBeDefined();
    });
  });

  describe("getVault", () => {
    it("should retrieve vault by ID", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vaults = await listVaults();
      const vaultId = vaults[0].id;

      const vault = await getVault(vaultId);

      expect(vault).toBeDefined();
      expect(vault?.id).toBe(vaultId);
      expect(vault?.name).toBe("test-vault");
    });

    it("should return undefined for non-existent vault", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vault = await getVault("non-existent-id");
      expect(vault).toBeUndefined();
    });

    it("should retrieve vault by name", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vault = await getVault("test-vault");

      expect(vault).toBeDefined();
      expect(vault?.name).toBe("test-vault");
    });
  });

  describe("removeVault", () => {
    it("should remove vault from registry", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vaults = await listVaults();
      const vaultId = vaults[0].id;
      const initialCount = vaults.length;

      await removeVault(vaultId);

      const updatedVaults = await listVaults();
      expect(updatedVaults.length).toBe(initialCount - 1);
      expect(updatedVaults.some((v) => v.id === vaultId)).toBe(false);
    });

    it("should throw error for non-existent vault", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      await expect(removeVault("non-existent-id")).rejects.toThrow();
    });

    it("should persist changes to registry file", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);

      await createMockRegistry(tempDir);

      const vaults = await listVaults();
      const vaultId = vaults[0].id;

      await removeVault(vaultId);

      const registryPath = path.join(tempDir, "bozly-registry.json");
      const registry = await readJSON<Registry>(registryPath);

      expect(registry.vaults.some((v) => v.id === vaultId)).toBe(false);
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

      const vaultPath = path.join(tempDir, "vault-2");
      await fs.mkdir(vaultPath, { recursive: true });
      await addVaultToRegistry({
        path: vaultPath,
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
