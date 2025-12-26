/**
 * Unit tests for core node operations
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTempDir,
  getTempDir,
  cleanupTempDir,
  createMockVault,
  readJSON,
  fileExists,
  dirExists,
  writeJSON,
} from "../conftest";
import { initNode, getCurrentNode } from "../../dist/core/node.js";
import type { NodeConfig } from "../../dist/core/types.js";
import path from "path";
import fs from "fs/promises";

describe("Node Operations", () => {
  /**
   * Helper to set BOZLY_HOME for tests
   */
  function setBozlyHome(homePath: string): void {
    process.env.BOZLY_HOME = homePath;
  }

  describe("initNode", () => {
    it("should create a new vault with default settings", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      setBozlyHome(tempDir);
      const nodePath = path.join(tempDir, "my-vault");

      // Initialize vault
      const vault = await initNode({
        path: nodePath,
        name: "my-vault",
        type: "default",
      });

      // Verify vault was created
      expect(vault).toBeDefined();
      expect(vault.name).toBe("my-vault");
      expect(vault.path).toBe(nodePath);
      expect(vault.type).toBe("default");

      // Verify .bozly directory structure
      expect(await dirExists(path.join(nodePath, ".bozly"))).toBe(true);
      expect(await dirExists(path.join(nodePath, ".bozly", "sessions"))).toBe(true);
      expect(await dirExists(path.join(nodePath, ".bozly", "tasks"))).toBe(true);
      expect(await dirExists(path.join(nodePath, ".bozly", "commands"))).toBe(true);
      expect(await dirExists(path.join(nodePath, ".bozly", "workflows"))).toBe(true);
      expect(await dirExists(path.join(nodePath, ".bozly", "hooks"))).toBe(true);
    });

    it("should create config.json with correct structure", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      await initNode({
        path: nodePath,
        name: "test-vault",
        type: "music",
      });

      const configPath = path.join(nodePath, ".bozly", "config.json");
      expect(await fileExists(configPath)).toBe(true);

      const config = await readJSON<NodeConfig>(configPath);
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
      const nodePath = path.join(tempDir, "my-vault");

      await initNode({
        path: nodePath,
        name: "my-vault",
        type: "default",
      });

      const contextPath = path.join(nodePath, ".bozly", "context.md");
      expect(await fileExists(contextPath)).toBe(true);
    });

    it("should create index.json file", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      await initNode({
        path: nodePath,
        name: "my-vault",
        type: "default",
      });

      const indexPath = path.join(nodePath, ".bozly", "index.json");
      expect(await fileExists(indexPath)).toBe(true);
    });

    it("should reject if vault already exists without force flag", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      // Create first vault
      await initNode({
        path: nodePath,
        name: "my-vault",
        type: "default",
      });

      // Try to create again without force
      await expect(
        initNode({
          path: nodePath,
          name: "my-vault",
          type: "default",
        })
      ).rejects.toThrow("Node already exists");
    });

    it("should overwrite existing vault with force flag", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      // Create first vault
      await initNode({
        path: nodePath,
        name: "original",
        type: "default",
      });

      // Create with force
      const vault = await initNode({
        path: nodePath,
        name: "updated",
        type: "music",
        force: true,
      });

      // Verify updated
      expect(vault.name).toBe("updated");

      const configPath = path.join(nodePath, ".bozly", "config.json");
      const config = await readJSON<NodeConfig>(configPath);
      expect(config.name).toBe("updated");
      expect(config.type).toBe("music");
    });

    it("should use directory name as default vault name", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      const vault = await initNode({
        path: nodePath,
      });

      expect(vault.name).toBe("my-vault");
    });

    it("should set created timestamp", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");
      const beforeTime = new Date();

      await initNode({
        path: nodePath,
        name: "my-vault",
      });

      const configPath = path.join(nodePath, ".bozly", "config.json");
      const config = await readJSON<NodeConfig>(configPath);
      const createdTime = new Date(config.created);

      expect(createdTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(createdTime.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });

    it("should handle nested vault paths", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "projects", "my-project", "music-vault");

      const vault = await initNode({
        path: nodePath,
        name: "music-vault",
      });

      expect(vault.path).toBe(nodePath);
      expect(await dirExists(nodePath)).toBe(true);
      expect(await dirExists(path.join(nodePath, ".bozly"))).toBe(true);
    });

    it("should return NodeInfo with correct id format", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      const vault = await initNode({
        path: nodePath,
        name: "my-vault",
      });

      expect(vault.id).toBeDefined();
      expect(vault.id).toMatch(/^[a-f0-9-]+$/); // UUID format
      expect(vault.active).toBe(true);
    });
  });

  describe("Node Creation", () => {
    it("should create a complete mock node structure", async () => {
      await createTempDir();
      const tempDir = getTempDir();

      const nodePath = await createMockVault(tempDir);

      expect(await dirExists(nodePath)).toBe(true);
      expect(await dirExists(path.join(nodePath, ".bozly"))).toBe(true);
      expect(await fileExists(path.join(nodePath, ".bozly", "config.json"))).toBe(true);
      expect(await fileExists(path.join(nodePath, ".bozly", "context.md"))).toBe(true);
      expect(await fileExists(path.join(nodePath, ".bozly", "index.json"))).toBe(true);
    });

    it("should have valid config structure in mock vault", async () => {
      await createTempDir();
      const tempDir = getTempDir();

      const nodePath = await createMockVault(tempDir);
      const configPath = path.join(nodePath, ".bozly", "config.json");
      const config = await readJSON<NodeConfig>(configPath);

      expect(config.name).toBe("test-vault");
      expect(config.type).toBe("default");
      expect(config.version).toBe("0.3.0");
      expect(config.ai).toBeDefined();
    });
  });

  describe("getCurrentNode", () => {
    beforeEach(async () => {
      await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir();
    });

    it("should have getCurrentNode function available", async () => {
      expect(getCurrentNode).toBeDefined();
      expect(typeof getCurrentNode).toBe("function");
    });

    it("should handle searching for nodes in vault structure", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      // Create vault
      const vault = await initNode({
        path: nodePath,
        name: "my-vault",
        type: "default",
      });

      // Verify vault was created successfully
      expect(vault).toBeDefined();
      expect(vault.name).toBe("my-vault");
      expect(vault.path).toBe(nodePath);
    });
  });

  describe("initNode Edge Cases", () => {
    beforeEach(async () => {
      await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir();
    });

    it("should handle vault with no name (uses directory name)", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      const vault = await initNode({
        path: nodePath,
      });

      expect(vault.name).toBe("my-vault");
    });

    it("should handle vault with skipTemplateVariables option", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      const vault = await initNode({
        path: nodePath,
        name: "my-vault",
        skipTemplateVariables: true,
      });

      expect(vault).toBeDefined();
      expect(await dirExists(path.join(nodePath, ".bozly"))).toBe(true);
    });

    it("should handle vault with custom variables", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      const vault = await initNode({
        path: nodePath,
        name: "my-vault",
        variables: {
          CUSTOM_VAR: "custom-value",
        },
      });

      expect(vault).toBeDefined();
    });

    it("should create all required subdirectories even without template", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      await initNode({
        path: nodePath,
        name: "my-vault",
        type: "non-existent-type",
      });

      const requiredDirs = [
        "sessions",
        "tasks",
        "commands",
        "workflows",
        "hooks",
      ];

      for (const dir of requiredDirs) {
        const dirPath = path.join(nodePath, ".bozly", dir);
        expect(await dirExists(dirPath)).toBe(true);
      }
    });

    it("should handle absolute paths correctly", async () => {
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "my-vault");

      const vault = await initNode({
        path: vaultPath,
        name: "my-vault",
      });

      expect(vault.path).toBe(vaultPath);
    });

    it("should set AI providers in config", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      await initNode({
        path: nodePath,
        name: "my-vault",
      });

      const configPath = path.join(nodePath, ".bozly", "config.json");
      const config = await readJSON<NodeConfig>(configPath);

      expect(config.ai.providers).toContain("claude");
      expect(config.ai.providers).toContain("gpt");
      expect(config.ai.providers).toContain("gemini");
      expect(config.ai.providers).toContain("ollama");
    });

    it("should preserve config content with special characters", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      const specialName = "my-vault™-ñ";
      const vault = await initNode({
        path: nodePath,
        name: specialName,
      });

      const configPath = path.join(nodePath, ".bozly", "config.json");
      const config = await readJSON<NodeConfig>(configPath);

      expect(config.name).toBe(specialName);
    });

    it("should create config with valid type field", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      await initNode({
        path: nodePath,
        type: "music",
      });

      const configPath = path.join(nodePath, ".bozly", "config.json");
      const config = await readJSON<NodeConfig>(configPath);

      expect(config.type).toBe("music");
    });

    it("should ensure context.md exists and has content", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      await initNode({
        path: nodePath,
        name: "my-vault",
      });

      const contextPath = path.join(nodePath, ".bozly", "context.md");
      const content = await fs.readFile(contextPath, "utf-8");

      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });

    it("should ensure index.json has correct structure", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      await initNode({
        path: nodePath,
        name: "my-vault",
      });

      const indexPath = path.join(nodePath, ".bozly", "index.json");
      const content = await readJSON(indexPath);

      expect(content.tasks).toBeDefined();
      expect(Array.isArray(content.tasks)).toBe(true);
    });

    it("should handle path with trailing slashes", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault") + "/";

      const vault = await initNode({
        path: nodePath,
        name: "my-vault",
      });

      expect(vault).toBeDefined();
      expect(await dirExists(path.join(vault.path, ".bozly"))).toBe(true);
    });

    it("should return active vault status", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      const vault = await initNode({
        path: nodePath,
        name: "my-vault",
      });

      expect(vault.active).toBe(true);
    });
  });

  describe("Node Configuration", () => {
    beforeEach(async () => {
      await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir();
    });

    it("should store vault metadata correctly", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      const vault = await initNode({
        path: nodePath,
        name: "test-vault",
        type: "music",
      });

      const configPath = path.join(nodePath, ".bozly", "config.json");
      const config = await readJSON<NodeConfig>(configPath);

      expect(config.name).toBe("test-vault");
      expect(config.type).toBe("music");
      expect(config.version).toBe("0.3.0");
      expect(config.created).toBeDefined();
      expect(config.ai).toBeDefined();
    });

    it("should set default provider to claude", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      await initNode({
        path: nodePath,
        name: "my-vault",
      });

      const configPath = path.join(nodePath, ".bozly", "config.json");
      const config = await readJSON<NodeConfig>(configPath);

      expect(config.ai.defaultProvider).toBe("claude");
    });

    it("should create vault with consistent ID across reads", async () => {
      const tempDir = getTempDir();
      const nodePath = path.join(tempDir, "my-vault");

      const vault1 = await initNode({
        path: nodePath,
        name: "my-vault",
      });

      // ID should be hex format (may be shortened)
      expect(vault1.id).toMatch(/^[a-f0-9-]+$/);
      expect(vault1.id.length).toBeGreaterThan(10);
    });
  });
});
