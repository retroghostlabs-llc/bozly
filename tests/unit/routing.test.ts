/**
 * Smart Routing unit tests
 *
 * Tests provider resolution hierarchy, availability checking, and fallback chains
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveProvider,
  isProviderAvailable,
  getProviderConfig,
  resolveFallbackChain,
  clearProviderCache,
  getKnownProviders,
  validateProviderConfig,
} from "../../src/core/routing.js";
import * as config from "../../src/core/config.js";
import * as providers from "../../src/core/providers.js";

// Mock modules
vi.mock("../../src/core/config.js");
vi.mock("../../src/core/providers.js");
vi.mock("../../src/core/logger.js");

describe("Smart Routing", () => {
  beforeEach(() => {
    clearProviderCache();
    vi.clearAllMocks();
  });

  describe("resolveProvider", () => {
    it("should prefer CLI override over all other config sources", async () => {
      const mockNodeConfig = {
        name: "test",
        type: "custom",
        version: "1.0.0",
        created: "2025-01-01",
        ai: { defaultProvider: "claude", providers: ["claude"] },
        provider: "gpt", // Node-level config
        commands: { test: { provider: "gemini" } }, // Command-level config
      };

      vi.mocked(config.getNodeConfig).mockResolvedValue(mockNodeConfig);

      const result = await resolveProvider("test", "ollama");

      expect(result.selectedProvider).toBe("ollama");
      expect(result.resolvedFrom).toBe("cli");
    });

    it("should prefer command-level config over node and global config", async () => {
      const mockNodeConfig = {
        name: "test",
        type: "custom",
        version: "1.0.0",
        created: "2025-01-01",
        ai: { defaultProvider: "claude", providers: ["claude"] },
        provider: "gpt", // Node-level config
        commands: { daily: { provider: "gemini", model: "pro" } },
      };

      vi.mocked(config.getNodeConfig).mockResolvedValue(mockNodeConfig);
      vi.mocked(config.getGlobalConfig).mockResolvedValue({
        version: "1.0.0",
        defaultAI: "claude",
      });

      const result = await resolveProvider("daily");

      expect(result.selectedProvider).toBe("gemini");
      expect(result.selectedModel).toBe("pro");
      expect(result.resolvedFrom).toBe("command");
    });

    it("should use node-level config if command config not found", async () => {
      const mockNodeConfig = {
        name: "test",
        type: "custom",
        version: "1.0.0",
        created: "2025-01-01",
        ai: { defaultProvider: "claude", providers: ["claude"] },
        provider: "gpt",
        model: "gpt-4o",
      };

      vi.mocked(config.getNodeConfig).mockResolvedValue(mockNodeConfig);
      vi.mocked(config.getGlobalConfig).mockResolvedValue({
        version: "1.0.0",
        defaultAI: "claude",
      });

      const result = await resolveProvider("daily");

      expect(result.selectedProvider).toBe("gpt");
      expect(result.selectedModel).toBe("gpt-4o");
      expect(result.resolvedFrom).toBe("node");
    });

    it("should use global config if node config not provided", async () => {
      vi.mocked(config.getNodeConfig).mockResolvedValue(null);
      vi.mocked(config.getGlobalConfig).mockResolvedValue({
        version: "1.0.0",
        defaultAI: "gpt",
      });

      const result = await resolveProvider();

      expect(result.selectedProvider).toBe("gpt");
      expect(result.resolvedFrom).toBe("global");
    });

    it("should fall back to hardcoded default when all configs missing", async () => {
      vi.mocked(config.getNodeConfig).mockResolvedValue(null);
      vi.mocked(config.getGlobalConfig).mockResolvedValue({
        version: "1.0.0",
      });

      const result = await resolveProvider();

      expect(result.selectedProvider).toBe("claude");
      expect(result.resolvedFrom).toBe("default");
    });

    it("should handle node config loading errors gracefully", async () => {
      vi.mocked(config.getNodeConfig).mockRejectedValue(new Error("Config error"));
      vi.mocked(config.getGlobalConfig).mockResolvedValue({
        version: "1.0.0",
        defaultAI: "gpt",
      });

      const result = await resolveProvider();

      expect(result.selectedProvider).toBe("gpt");
      expect(result.resolvedFrom).toBe("global");
    });

    it("should handle global config loading errors gracefully", async () => {
      vi.mocked(config.getNodeConfig).mockResolvedValue(null);
      vi.mocked(config.getGlobalConfig).mockRejectedValue(new Error("Config error"));

      const result = await resolveProvider();

      expect(result.selectedProvider).toBe("claude");
      expect(result.resolvedFrom).toBe("default");
    });
  });

  describe("isProviderAvailable", () => {
    it("should check if provider is available", () => {
      vi.mocked(providers.isProviderAvailable).mockReturnValue(true);

      const available = isProviderAvailable("claude");

      expect(available).toBe(true);
      expect(providers.isProviderAvailable).toHaveBeenCalledWith("claude");
    });

    it("should return false for unknown provider", () => {
      vi.mocked(providers.isProviderAvailable).mockReturnValue(false);

      const available = isProviderAvailable("unknown");

      expect(available).toBe(false);
    });

    it("should delegate to providers module", () => {
      vi.mocked(providers.isProviderAvailable).mockReturnValue(true);

      const available = isProviderAvailable("gpt");

      expect(available).toBe(true);
      expect(providers.isProviderAvailable).toHaveBeenCalledWith("gpt");
    });

    it("should handle multiple providers", () => {
      vi.mocked(providers.isProviderAvailable).mockImplementation((name) => {
        return name === "claude" ? true : false;
      });

      const claudeAvailable = isProviderAvailable("claude");
      const gptAvailable = isProviderAvailable("gpt");

      expect(claudeAvailable).toBe(true);
      expect(gptAvailable).toBe(false);
      expect(providers.isProviderAvailable).toHaveBeenCalledTimes(2);
    });
  });

  describe("getProviderConfig", () => {
    it("should return config for known provider", () => {
      const config = getProviderConfig("claude");

      expect(config).toBeDefined();
      expect(config?.name).toBe("claude");
      expect(config?.command).toBe("claude");
      expect(config?.modelFlag).toBe("--model");
    });

    it("should return null for unknown provider", () => {
      const config = getProviderConfig("unknown");

      expect(config).toBeNull();
    });

    it("should return configs for all known providers", () => {
      const providers = ["claude", "gpt", "gemini", "ollama"];

      for (const provider of providers) {
        const config = getProviderConfig(provider);
        expect(config).toBeDefined();
        expect(config?.name).toBe(provider);
      }
    });

    it("should handle ollama with positional model", () => {
      const config = getProviderConfig("ollama");

      expect(config?.name).toBe("ollama");
      expect(config?.command).toBe("ollama run");
      expect(config?.modelFlag).toBeUndefined();
    });
  });

  describe("resolveFallbackChain", () => {
    it("should return primary provider if available", async () => {
      vi.mocked(providers.isProviderAvailable).mockReturnValue(true);

      const result = await resolveFallbackChain("claude", ["gpt", "ollama"]);

      expect(result.selectedProvider).toBe("claude");
      expect(result.fallbackChain).toEqual(["claude", "gpt", "ollama"]);
    });

    it("should try fallback chain when primary unavailable", async () => {
      let callCount = 0;
      vi.mocked(providers.isProviderAvailable).mockImplementation((name) => {
        callCount++;
        if (name === "claude") return false; // First provider unavailable
        if (name === "gpt") return true; // Second provider available
        return false;
      });

      const result = await resolveFallbackChain("claude", ["gpt", "ollama"]);

      expect(result.selectedProvider).toBe("gpt");
      expect(callCount).toBe(2);
    });

    it("should continue through fallback chain", async () => {
      let callCount = 0;
      vi.mocked(providers.isProviderAvailable).mockImplementation((name) => {
        callCount++;
        if (name === "claude") return false;
        if (name === "gpt") return false;
        if (name === "ollama") return true; // Third provider available
        return false;
      });

      const result = await resolveFallbackChain("claude", ["gpt", "ollama"]);

      expect(result.selectedProvider).toBe("ollama");
      expect(callCount).toBe(3);
    });

    it("should remove duplicates from fallback chain", async () => {
      vi.mocked(providers.isProviderAvailable).mockReturnValue(true);

      const result = await resolveFallbackChain("claude", ["claude", "gpt", "claude"]);

      // Should have unique providers only
      expect(result.fallbackChain).toEqual(["claude", "gpt"]);
    });

    it("should handle empty fallback chain", async () => {
      vi.mocked(providers.isProviderAvailable).mockReturnValue(true);

      const result = await resolveFallbackChain("claude", undefined);

      expect(result.selectedProvider).toBe("claude");
      expect(result.fallbackChain).toEqual(["claude"]);
    });

    it("should return primary provider even if all fail", async () => {
      vi.mocked(providers.isProviderAvailable).mockReturnValue(false);

      const result = await resolveFallbackChain("claude", ["gpt", "ollama"]);

      expect(result.selectedProvider).toBe("claude");
      expect(result.fallbackChain).toEqual(["claude", "gpt", "ollama"]);
    });
  });

  describe("getKnownProviders", () => {
    it("should return list of known providers", () => {
      const providers = getKnownProviders();

      expect(providers).toContain("claude");
      expect(providers).toContain("gpt");
      expect(providers).toContain("gemini");
      expect(providers).toContain("ollama");
      expect(providers.length).toBe(4);
    });
  });

  describe("validateProviderConfig", () => {
    it("should validate known provider", () => {
      const error = validateProviderConfig("claude");

      expect(error).toBeNull();
    });

    it("should reject unknown provider", () => {
      const error = validateProviderConfig("unknown");

      expect(error).toBeDefined();
      expect(error).toContain("Unknown provider");
    });

    it("should reject empty provider name", () => {
      const error = validateProviderConfig("");

      expect(error).toBeDefined();
      expect(error).toContain("cannot be empty");
    });

    it("should list known providers in error message", () => {
      const error = validateProviderConfig("invalid");

      expect(error).toContain("claude");
      expect(error).toContain("gpt");
      expect(error).toContain("ollama");
    });
  });

  describe("clearProviderCache", () => {
    it("should be callable (no-op for backwards compatibility)", () => {
      // clearProviderCache is a no-op since we don't cache anymore
      // It's kept for backwards compatibility with existing code
      expect(() => clearProviderCache()).not.toThrow();
    });
  });

  describe("Edge cases", () => {
    it("should handle undefined command name in resolution", async () => {
      const mockNodeConfig = {
        name: "test",
        type: "custom",
        version: "1.0.0",
        created: "2025-01-01",
        ai: { defaultProvider: "claude", providers: ["claude"] },
        provider: "gpt",
      };

      vi.mocked(config.getNodeConfig).mockResolvedValue(mockNodeConfig);

      const result = await resolveProvider(undefined);

      expect(result.selectedProvider).toBe("gpt");
      expect(result.resolvedFrom).toBe("node");
    });

    it("should handle empty command config object", async () => {
      const mockNodeConfig = {
        name: "test",
        type: "custom",
        version: "1.0.0",
        created: "2025-01-01",
        ai: { defaultProvider: "claude", providers: ["claude"] },
        provider: "gpt",
        commands: {}, // Empty commands object
      };

      vi.mocked(config.getNodeConfig).mockResolvedValue(mockNodeConfig);

      const result = await resolveProvider("daily");

      expect(result.selectedProvider).toBe("gpt");
      expect(result.resolvedFrom).toBe("node");
    });

    it("should handle large fallback chains efficiently", async () => {
      const largeChain = Array.from(
        { length: 10 },
        (_, i) => `provider${i}`
      );

      vi.mocked(providers.isProviderAvailable).mockImplementation((name) => {
        // Only last provider available
        return name === "provider9";
      });

      const result = await resolveFallbackChain("claude", largeChain);

      expect(result.selectedProvider).toBe("provider9");
    });
  });
});
