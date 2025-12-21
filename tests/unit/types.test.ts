/**
 * Unit tests for type definitions and validation
 */

import { describe, it, expect } from "vitest";
import type {
  VaultConfig,
  VaultInfo,
  Registry,
  GlobalConfig,
  InitOptions,
  ContextOptions,
  RunOptions,
} from "../../src/core/types";

describe("Type Definitions", () => {
  describe("VaultConfig", () => {
    it("should allow valid vault config", () => {
      const config: VaultConfig = {
        name: "test",
        type: "default",
        version: "0.3.0",
        created: "2024-01-01T00:00:00Z",
        ai: {
          defaultProvider: "claude",
          providers: ["claude", "gpt"],
        },
      };

      expect(config.name).toBe("test");
      expect(config.ai.defaultProvider).toBe("claude");
    });

    it("should allow optional hooks field", () => {
      const config: VaultConfig = {
        name: "test",
        type: "default",
        version: "0.3.0",
        created: new Date().toISOString(),
        ai: {
          defaultProvider: "claude",
          providers: ["claude"],
        },
        hooks: {
          sessionStart: "echo 'start'",
        },
      };

      expect(config.hooks?.sessionStart).toBe("echo 'start'");
    });
  });

  describe("VaultInfo", () => {
    it("should create valid vault info", () => {
      const info: VaultInfo = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "my-vault",
        path: "/home/user/my-vault",
        type: "music",
        active: true,
        created: new Date().toISOString(),
      };

      expect(info.id).toBeDefined();
      expect(info.active).toBe(true);
    });

    it("should allow optional lastAccessed field", () => {
      const info: VaultInfo = {
        id: "id",
        name: "vault",
        path: "/path",
        type: "default",
        active: true,
        created: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      };

      expect(info.lastAccessed).toBeDefined();
    });
  });

  describe("Registry", () => {
    it("should create valid registry", () => {
      const registry: Registry = {
        version: "0.3.0",
        vaults: [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      expect(registry.vaults).toHaveLength(0);
    });

    it("should support multiple vaults in registry", () => {
      const registry: Registry = {
        version: "0.3.0",
        vaults: [
          {
            id: "1",
            name: "vault1",
            path: "/path1",
            type: "music",
            active: true,
            created: new Date().toISOString(),
          },
          {
            id: "2",
            name: "vault2",
            path: "/path2",
            type: "project",
            active: false,
            created: new Date().toISOString(),
          },
        ],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      expect(registry.vaults).toHaveLength(2);
      expect(registry.vaults[0].name).toBe("vault1");
      expect(registry.vaults[1].active).toBe(false);
    });
  });

  describe("GlobalConfig", () => {
    it("should create valid global config", () => {
      const config: GlobalConfig = {
        version: "0.3.0",
        defaultAI: "claude",
      };

      expect(config.defaultAI).toBe("claude");
    });

    it("should allow optional theme and editor", () => {
      const config: GlobalConfig = {
        version: "0.3.0",
        defaultAI: "gpt",
        theme: "dark",
        editor: "vim",
      };

      expect(config.theme).toBe("dark");
      expect(config.editor).toBe("vim");
    });
  });

  describe("InitOptions", () => {
    it("should create valid init options", () => {
      const options: InitOptions = {
        path: "/home/user/vault",
      };

      expect(options.path).toBeDefined();
    });

    it("should allow optional type, name, and force flags", () => {
      const options: InitOptions = {
        path: "/home/user/vault",
        type: "music",
        name: "my-music",
        force: true,
      };

      expect(options.type).toBe("music");
      expect(options.name).toBe("my-music");
      expect(options.force).toBe(true);
    });
  });

  describe("ContextOptions", () => {
    it("should create valid context options", () => {
      const options: ContextOptions = {
        provider: "claude",
      };

      expect(options.provider).toBe("claude");
    });

    it("should allow boolean flags", () => {
      const options: ContextOptions = {
        provider: "gpt",
        includeCommands: true,
        includeHistory: false,
      };

      expect(options.includeCommands).toBe(true);
      expect(options.includeHistory).toBe(false);
    });

    it("should be optional", () => {
      const emptyOptions: ContextOptions = {};

      expect(emptyOptions.provider).toBeUndefined();
    });
  });

  describe("RunOptions", () => {
    it("should create valid run options", () => {
      const options: RunOptions = {
        provider: "claude",
        dryRun: true,
      };

      expect(options.dryRun).toBe(true);
    });

    it("should allow all boolean flags", () => {
      const options: RunOptions = {
        dryRun: false,
        includeContext: true,
      };

      expect(options.dryRun).toBe(false);
      expect(options.includeContext).toBe(true);
    });
  });
});
