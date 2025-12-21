/**
 * Unit tests for core vault operations
 */

import { describe, it, expect } from "vitest";
import {
  createTempDir,
  getTempDir,
  createMockVault,
  readJSON,
  fileExists,
  dirExists,
} from "../conftest";
import { initVault } from "../../src/core/vault";
import type { VaultConfig } from "../../src/core/types";
import path from "path";

describe("Vault Operations", () => {
  describe("initVault", () => {
    it("should create a new vault with default settings", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "my-vault");

      // Initialize vault
      const vault = await initVault({
        path: vaultPath,
        name: "my-vault",
        type: "default",
      });

      // Verify vault was created
      expect(vault).toBeDefined();
      expect(vault.name).toBe("my-vault");
      expect(vault.path).toBe(vaultPath);
      expect(vault.type).toBe("default");

      // Verify .bozly directory structure
      expect(await dirExists(path.join(vaultPath, ".bozly"))).toBe(true);
      expect(await dirExists(path.join(vaultPath, ".bozly", "sessions"))).toBe(true);
      expect(await dirExists(path.join(vaultPath, ".bozly", "tasks"))).toBe(true);
      expect(await dirExists(path.join(vaultPath, ".bozly", "commands"))).toBe(true);
      expect(await dirExists(path.join(vaultPath, ".bozly", "workflows"))).toBe(true);
      expect(await dirExists(path.join(vaultPath, ".bozly", "hooks"))).toBe(true);
    });

    it("should create config.json with correct structure", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "my-vault");

      await initVault({
        path: vaultPath,
        name: "test-vault",
        type: "music",
      });

      const configPath = path.join(vaultPath, ".bozly", "config.json");
      expect(await fileExists(configPath)).toBe(true);

      const config = await readJSON<VaultConfig>(configPath);
      expect(config.name).toBe("test-vault");
      expect(config.type).toBe("music");
      expect(config.version).toBe("0.3.0");
      expect(config.ai.defaultProvider).toBe("claude");
      expect(config.ai.providers).toContain("claude");
      expect(config.ai.providers).toContain("gpt");
    });

    it("should create context.md file", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "my-vault");

      await initVault({
        path: vaultPath,
        name: "my-vault",
        type: "default",
      });

      const contextPath = path.join(vaultPath, ".bozly", "context.md");
      expect(await fileExists(contextPath)).toBe(true);
    });

    it("should create index.json file", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "my-vault");

      await initVault({
        path: vaultPath,
        name: "my-vault",
        type: "default",
      });

      const indexPath = path.join(vaultPath, ".bozly", "index.json");
      expect(await fileExists(indexPath)).toBe(true);
    });

    it("should reject if vault already exists without force flag", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "my-vault");

      // Create first vault
      await initVault({
        path: vaultPath,
        name: "my-vault",
        type: "default",
      });

      // Try to create again without force
      await expect(
        initVault({
          path: vaultPath,
          name: "my-vault",
          type: "default",
        })
      ).rejects.toThrow("Vault already exists");
    });

    it("should overwrite existing vault with force flag", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "my-vault");

      // Create first vault
      await initVault({
        path: vaultPath,
        name: "original",
        type: "default",
      });

      // Create with force
      const vault = await initVault({
        path: vaultPath,
        name: "updated",
        type: "music",
        force: true,
      });

      // Verify updated
      expect(vault.name).toBe("updated");

      const configPath = path.join(vaultPath, ".bozly", "config.json");
      const config = await readJSON<VaultConfig>(configPath);
      expect(config.name).toBe("updated");
      expect(config.type).toBe("music");
    });

    it("should use directory name as default vault name", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "my-vault");

      const vault = await initVault({
        path: vaultPath,
      });

      expect(vault.name).toBe("my-vault");
    });

    it("should set created timestamp", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "my-vault");
      const beforeTime = new Date();

      await initVault({
        path: vaultPath,
        name: "my-vault",
      });

      const configPath = path.join(vaultPath, ".bozly", "config.json");
      const config = await readJSON<VaultConfig>(configPath);
      const createdTime = new Date(config.created);

      expect(createdTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(createdTime.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });

    it("should handle nested vault paths", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "projects", "my-project", "music-vault");

      const vault = await initVault({
        path: vaultPath,
        name: "music-vault",
      });

      expect(vault.path).toBe(vaultPath);
      expect(await dirExists(vaultPath)).toBe(true);
      expect(await dirExists(path.join(vaultPath, ".bozly"))).toBe(true);
    });

    it("should return VaultInfo with correct id format", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "my-vault");

      const vault = await initVault({
        path: vaultPath,
        name: "my-vault",
      });

      expect(vault.id).toBeDefined();
      expect(vault.id).toMatch(/^[a-f0-9-]+$/); // UUID format
      expect(vault.active).toBe(true);
    });
  });

  describe("Mock Vault Creation", () => {
    it("should create a complete mock vault structure", async () => {
      await createTempDir();
      const tempDir = getTempDir();

      const vaultPath = await createMockVault(tempDir);

      expect(await dirExists(vaultPath)).toBe(true);
      expect(await dirExists(path.join(vaultPath, ".bozly"))).toBe(true);
      expect(await fileExists(path.join(vaultPath, ".bozly", "config.json"))).toBe(true);
      expect(await fileExists(path.join(vaultPath, ".bozly", "context.md"))).toBe(true);
      expect(await fileExists(path.join(vaultPath, ".bozly", "index.json"))).toBe(true);
    });

    it("should have valid config structure in mock vault", async () => {
      await createTempDir();
      const tempDir = getTempDir();

      const vaultPath = await createMockVault(tempDir);
      const configPath = path.join(vaultPath, ".bozly", "config.json");
      const config = await readJSON<VaultConfig>(configPath);

      expect(config.name).toBe("test-vault");
      expect(config.type).toBe("default");
      expect(config.version).toBe("0.3.0");
      expect(config.ai).toBeDefined();
    });
  });
});
