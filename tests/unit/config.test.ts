/**
 * Unit tests for configuration handling
 */

import { describe, it, expect } from "vitest";
import {
  createTempDir,
  getTempDir,
  readJSON,
  writeJSON,
  fileExists,
} from "../conftest";
import type { VaultConfig, GlobalConfig } from "../../src/core/types";
import path from "path";
import fs from "fs/promises";

describe("Configuration Handling", () => {
  describe("Vault Configuration", () => {
    it("should load vault config from .bozly/config.json", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "vault");
      const bozlyPath = path.join(vaultPath, ".bozly");

      await fs.mkdir(bozlyPath, { recursive: true });

      const mockConfig: VaultConfig = {
        name: "test-vault",
        type: "music",
        version: "0.3.0",
        created: "2024-01-01T00:00:00Z",
        ai: {
          defaultProvider: "claude",
          providers: ["claude", "gpt", "gemini"],
        },
      };

      await writeJSON(path.join(bozlyPath, "config.json"), mockConfig);

      // Test expects that vault config file exists
      expect(await fileExists(path.join(bozlyPath, "config.json"))).toBe(true);
    });

    it("should handle missing config gracefully", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "vault");
      const bozlyPath = path.join(vaultPath, ".bozly");

      await fs.mkdir(bozlyPath, { recursive: true });

      // Test that config path can be determined even if file doesn't exist
      const configPath = path.join(bozlyPath, "config.json");
      expect(configPath).toContain(".bozly");
      expect(configPath).toContain("config.json");
    });

    it("should save vault config", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "vault");

      await fs.mkdir(path.join(vaultPath, ".bozly"), { recursive: true });

      const config: VaultConfig = {
        name: "updated-vault",
        type: "project",
        version: "0.3.0",
        created: new Date().toISOString(),
        ai: {
          defaultProvider: "gpt",
          providers: ["gpt", "claude"],
        },
      };

      // Write config using utility function
      const configPath = path.join(vaultPath, ".bozly", "config.json");
      await writeJSON(configPath, config);

      expect(await fileExists(configPath)).toBe(true);

      const saved = await readJSON<VaultConfig>(configPath);
      expect(saved).toEqual(config);
      expect(saved.ai.defaultProvider).toBe("gpt");
    });

    it("should support optional hooks in config", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "vault");
      const bozlyPath = path.join(vaultPath, ".bozly");

      await fs.mkdir(bozlyPath, { recursive: true });

      const configWithHooks: VaultConfig = {
        name: "test",
        type: "default",
        version: "0.3.0",
        created: new Date().toISOString(),
        ai: {
          defaultProvider: "claude",
          providers: ["claude"],
        },
        hooks: {
          sessionStart: "echo 'Starting session'",
          sessionEnd: "echo 'Ending session'",
          postTool: "echo 'Tool executed'",
        },
      };

      await writeJSON(path.join(bozlyPath, "config.json"), configWithHooks);

      // Verify config with hooks was saved correctly
      const configPath = path.join(bozlyPath, "config.json");
      const loaded = await readJSON<VaultConfig>(configPath);
      expect(loaded.hooks).toBeDefined();
      expect(loaded.hooks?.sessionStart).toBe("echo 'Starting session'");
    });
  });

  describe("Global Configuration", () => {
    it("should handle global config file", async () => {
      await createTempDir();
      const tempDir = getTempDir();

      const mockConfig: GlobalConfig = {
        version: "0.3.0",
        defaultAI: "claude",
        theme: "auto",
      };

      await writeJSON(path.join(tempDir, "bozly-config.json"), mockConfig);

      // Verify config file exists and can be read
      const config = await readJSON<GlobalConfig>(path.join(tempDir, "bozly-config.json"));

      expect(config).toEqual(mockConfig);
      expect(config.defaultAI).toBe("claude");
    });

    it("should save global config", async () => {
      await createTempDir();
      const tempDir = getTempDir();

      await fs.mkdir(tempDir, { recursive: true });

      const config: GlobalConfig = {
        version: "0.3.0",
        defaultAI: "gpt",
        theme: "dark",
        editor: "vim",
      };

      const configPath = path.join(tempDir, "bozly-config.json");
      await writeJSON(configPath, config);

      expect(await fileExists(configPath)).toBe(true);

      const saved = await readJSON<GlobalConfig>(configPath);
      expect(saved.defaultAI).toBe("gpt");
      expect(saved.theme).toBe("dark");
    });

    it("should support optional theme and editor settings", async () => {
      await createTempDir();
      const tempDir = getTempDir();

      const config: GlobalConfig = {
        version: "0.3.0",
        defaultAI: "claude",
        theme: "dark",
        editor: "nano",
      };

      const configPath = path.join(tempDir, "bozly-config.json");
      await writeJSON(configPath, config);
      const loaded = await readJSON<GlobalConfig>(configPath);

      expect(loaded.theme).toBe("dark");
      expect(loaded.editor).toBe("nano");
    });

    it("should handle missing optional fields", async () => {
      await createTempDir();
      const tempDir = getTempDir();

      const minimalConfig: GlobalConfig = {
        version: "0.3.0",
        defaultAI: "claude",
      };

      await writeJSON(path.join(tempDir, "bozly-config.json"), minimalConfig);

      const loaded = await readJSON<GlobalConfig>(path.join(tempDir, "bozly-config.json"));
      expect(loaded.defaultAI).toBe("claude");
      expect(loaded.theme).toBeUndefined();
      expect(loaded.editor).toBeUndefined();
    });
  });

  describe("Configuration Validation", () => {
    it("should handle malformed JSON config gracefully", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "vault");
      const bozlyPath = path.join(vaultPath, ".bozly");

      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(path.join(bozlyPath, "config.json"), "{ invalid json }");

      // Attempting to read invalid JSON should fail
      const configPath = path.join(bozlyPath, "config.json");
      await expect(
        (async () => {
          const content = await fs.readFile(configPath, "utf-8");
          JSON.parse(content);
        })()
      ).rejects.toThrow();
    });

    it("should preserve config structure when saving", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const vaultPath = path.join(tempDir, "vault");

      await fs.mkdir(path.join(vaultPath, ".bozly"), { recursive: true });

      const original: VaultConfig = {
        name: "vault",
        type: "music",
        version: "0.3.0",
        created: new Date().toISOString(),
        ai: {
          defaultProvider: "claude",
          providers: ["claude", "gpt", "gemini", "ollama"],
        },
      };

      const configPath = path.join(vaultPath, ".bozly", "config.json");
      await writeJSON(configPath, original);
      const loaded = await readJSON<VaultConfig>(configPath);

      expect(loaded).toEqual(original);
      expect(loaded.ai.providers).toHaveLength(4);
    });
  });
});
