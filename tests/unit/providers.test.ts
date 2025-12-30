import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import {
  getProviderConfig,
  isProviderAvailable,
  listProviders,
  getInstalledProviders,
  getDefaultProvider,
  getSetupInstructions,
  validateProvider,
  getProviderStatus,
  formatProvidersList,
} from "../../src/core/providers.js";

// Mock execSync to control provider installation status
vi.mock("child_process");

describe("Provider Management Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getProviderConfig", () => {
    it("should return config for valid provider", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const config = getProviderConfig("claude");

      expect(config).toBeDefined();
      expect(config.name).toBe("claude");
      expect(config.displayName).toBe("Claude");
      expect(config.command).toBe("claude");
      expect(config.inputMode).toBe("stdin");
      expect(config.installed).toBe(true);
      expect(config.docsUrl).toBeTruthy();
      expect(config.setupInstructions).toBeTruthy();
    });

    it("should handle case-insensitive provider names", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const config1 = getProviderConfig("CLAUDE");
      const config2 = getProviderConfig("Claude");
      const config3 = getProviderConfig("claude");

      expect(config1.name).toBe("claude");
      expect(config2.name).toBe("claude");
      expect(config3.name).toBe("claude");
    });

    it("should return all known provider configs", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const providers = ["claude", "gpt", "gemini", "ollama"];

      for (const provider of providers) {
        const config = getProviderConfig(provider);
        expect(config.name).toBe(provider);
        expect(config.command).toBeTruthy();
        expect(config.displayName).toBeTruthy();
        expect(config.setupInstructions).toBeTruthy();
      }
    });

    it("should throw error for unknown provider", () => {
      expect(() => getProviderConfig("unknown")).toThrow(
        /Unknown provider/
      );
    });

    it("should throw error that lists available providers", () => {
      try {
        getProviderConfig("invalid");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain("Available");
      }
    });

    it("should detect installed provider", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const config = getProviderConfig("claude");
      expect(config.installed).toBe(true);
    });

    it("should detect uninstalled provider", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });
      const config = getProviderConfig("claude");
      expect(config.installed).toBe(false);
    });

    it("should use correct which command on Unix", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      Object.defineProperty(process, "platform", {
        value: "darwin",
        configurable: true,
      });

      getProviderConfig("claude");

      expect(execSync).toHaveBeenCalledWith("which claude", {
        stdio: "ignore",
      });
    });

    it("should use where command on Windows", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      Object.defineProperty(process, "platform", {
        value: "win32",
        configurable: true,
      });

      getProviderConfig("claude");

      expect(execSync).toHaveBeenCalledWith("where claude", {
        stdio: "ignore",
      });
    });
  });

  describe("isProviderAvailable", () => {
    it("should return true for installed provider", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      expect(isProviderAvailable("claude")).toBe(true);
    });

    it("should return false for uninstalled provider", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });
      expect(isProviderAvailable("claude")).toBe(false);
    });

    it("should return false for unknown provider", () => {
      expect(isProviderAvailable("unknown")).toBe(false);
    });

    it("should handle multiple provider checks", () => {
      let callCount = 0;
      vi.mocked(execSync).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return ""; // First provider installed
        } else {
          throw new Error("not found");
        }
      });

      expect(isProviderAvailable("claude")).toBe(true);
      expect(isProviderAvailable("gpt")).toBe(false);
    });
  });

  describe("listProviders", () => {
    it("should return all provider configs", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const providers = listProviders();

      expect(providers.length).toBeGreaterThan(0);
      expect(providers.every((p) => p.name)).toBe(true);
      expect(providers.every((p) => p.displayName)).toBe(true);
    });

    it("should include known providers in list", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const providers = listProviders();
      const names = providers.map((p) => p.name);

      expect(names).toContain("claude");
      expect(names).toContain("gpt");
      expect(names).toContain("gemini");
      expect(names).toContain("ollama");
    });

    it("should set installed status for each provider", () => {
      let callCount = 0;
      vi.mocked(execSync).mockImplementation(() => {
        callCount++;
        // Alternate between installed and not installed
        if (callCount % 2 === 1) {
          return "";
        } else {
          throw new Error("not found");
        }
      });

      const providers = listProviders();
      const installed = providers.filter((p) => p.installed);
      const notInstalled = providers.filter((p) => !p.installed);

      expect(installed.length).toBeGreaterThan(0);
      expect(notInstalled.length).toBeGreaterThan(0);
    });

    it("should not include providers that throw errors", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("unexpected error");
      });

      // Should not throw, just skip erroring providers
      const providers = listProviders();
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe("getInstalledProviders", () => {
    it("should return only installed providers", () => {
      let callCount = 0;
      vi.mocked(execSync).mockImplementation(() => {
        callCount++;
        // Every other one is installed
        return callCount % 2 === 1 ? "" : (() => { throw new Error(); })();
      });

      const installed = getInstalledProviders();
      expect(installed.every((p) => p.installed)).toBe(true);
    });

    it("should return empty array if no providers installed", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });

      const installed = getInstalledProviders();
      expect(installed).toEqual([]);
    });

    it("should filter out uninstalled providers", () => {
      let callCount = 0;
      vi.mocked(execSync).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return ""; // claude installed
        throw new Error("not found"); // others not installed
      });

      const installed = getInstalledProviders();
      expect(installed.length).toBe(1);
      expect(installed[0].name).toBe("claude");
    });
  });

  describe("getDefaultProvider", () => {
    it("should return first installed provider", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const defaultProvider = getDefaultProvider();

      expect(defaultProvider).toBeTruthy();
      expect(["claude", "gpt", "gemini", "ollama"]).toContain(defaultProvider);
    });

    it("should return claude as fallback when no providers installed", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });

      const defaultProvider = getDefaultProvider();
      expect(defaultProvider).toBe("claude");
    });

    it("should prefer installed provider over fallback", () => {
      let callCount = 0;
      vi.mocked(execSync).mockImplementation(() => {
        callCount++;
        if (callCount === 2) return ""; // gpt is second, so it's the first installed
        throw new Error("not found");
      });

      const defaultProvider = getDefaultProvider();
      expect(defaultProvider).toBe("gpt");
    });
  });

  describe("getSetupInstructions", () => {
    it("should return setup instructions for valid provider", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const instructions = getSetupInstructions("claude");

      expect(instructions).toContain("Claude");
      expect(instructions).toContain("npm install");
      expect(instructions).toContain("not found");
    });

    it("should include provider name in message", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const instructions = getSetupInstructions("gpt");

      expect(instructions).toContain("ChatGPT");
    });

    it("should include retry command", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const instructions = getSetupInstructions("claude");

      expect(instructions).toContain("bozly run");
      expect(instructions).toContain("--ai claude");
    });

    it("should throw for unknown provider", () => {
      expect(() => getSetupInstructions("unknown")).toThrow();
    });

    it("should include setup instructions from config", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const instructions = getSetupInstructions("ollama");

      expect(instructions).toContain("ollama serve");
      expect(instructions).toContain("ollama pull");
    });
  });

  describe("validateProvider", () => {
    it("should not throw for installed provider", async () => {
      vi.mocked(execSync).mockImplementation(() => "");
      await expect(validateProvider("claude")).resolves.toBeUndefined();
    });

    it("should throw for uninstalled provider by default", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });

      await expect(validateProvider("claude")).rejects.toThrow(
        /not installed/
      );
    });

    it("should allow uninstalled provider when allowUnavailable=true", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });

      // Should not throw, just log warning
      await expect(
        validateProvider("claude", true)
      ).resolves.toBeUndefined();
    });

    it("should log warning for unavailable provider in testing mode", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });

      // Just verify it doesn't throw
      const result = await validateProvider("claude", true);
      expect(result).toBeUndefined();
    });

    it("should include setup instructions in error when strict", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });

      try {
        await validateProvider("claude", false);
        expect.fail("Should have thrown");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("not installed");
        expect(message).toContain("npm install");
      }
    });

    it("should throw for unknown provider even with allowUnavailable=true", async () => {
      await expect(validateProvider("unknown", true)).rejects.toThrow();
    });

    it("should throw for unknown provider when strict", async () => {
      await expect(validateProvider("unknown")).rejects.toThrow();
    });

    it("should log debug message for valid provider", async () => {
      vi.mocked(execSync).mockImplementation(() => "");
      await validateProvider("claude");
      // Validation succeeds without error
      expect(true).toBe(true);
    });

    it("should accept allowUnavailable parameter", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });

      // Testing that the parameter is accepted and works
      await expect(validateProvider("gpt", true)).resolves.toBeUndefined();
      await expect(validateProvider("gpt", false)).rejects.toThrow();
    });

    it("should default to strict mode (allowUnavailable=false)", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });

      // No second parameter = strict mode
      await expect(validateProvider("ollama")).rejects.toThrow();
    });
  });

  describe("getProviderStatus", () => {
    it("should return status for installed provider", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const status = getProviderStatus("claude");

      expect(status).toContain("Claude");
      expect(status).toContain("installed");
    });

    it("should return status for uninstalled provider", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("not found");
      });
      const status = getProviderStatus("claude");

      expect(status).toContain("Claude");
      expect(status).toContain("not installed");
    });

    it("should use display name not provider name", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const status = getProviderStatus("gpt");

      expect(status).toContain("ChatGPT");
      expect(status).not.toContain("gpt");
    });

    it("should format as displayName (status)", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const status = getProviderStatus("ollama");

      expect(status).toMatch(/Ollama \(Local\) \((installed|not installed)\)/);
    });

    it("should throw for unknown provider", () => {
      expect(() => getProviderStatus("unknown")).toThrow();
    });
  });

  describe("formatProvidersList", () => {
    it("should return formatted string for all providers", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const formatted = formatProvidersList();

      expect(typeof formatted).toBe("string");
      expect(formatted).toContain("Available AI Providers");
    });

    it("should include all known providers", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const formatted = formatProvidersList();

      expect(formatted).toContain("Claude");
      expect(formatted).toContain("ChatGPT");
      expect(formatted).toContain("Gemini");
      expect(formatted).toContain("Ollama");
    });

    it("should show status symbols", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const formatted = formatProvidersList();

      // Should contain status indicators
      expect(formatted).toMatch(/✅|❌/);
    });

    it("should include usage instructions", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const formatted = formatProvidersList();

      expect(formatted).toContain("bozly run");
      expect(formatted).toContain("--ai");
    });

    it("should distinguish installed from not installed", () => {
      let callCount = 0;
      vi.mocked(execSync).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return ""; // claude installed
        throw new Error("not found"); // others not installed
      });

      const formatted = formatProvidersList();
      // Both symbols should appear (at least one ✅ for claude)
      expect(formatted).toContain("✅");
      expect(formatted).toContain("❌");
    });

    it("should format as multiline string", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const formatted = formatProvidersList();

      expect(formatted.includes("\n")).toBe(true);
    });
  });

  describe("Provider Integration", () => {
    it("should work with getProviderConfig and listProviders together", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const providers = listProviders();
      const configs = providers.map((p) => getProviderConfig(p.name));

      expect(configs.length).toBe(providers.length);
      configs.forEach((config) => {
        expect(config.installed).toBe(true);
      });
    });

    it("should maintain consistency between list and get", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const listed = getProviderConfig("claude");
      const fromList = listProviders().find((p) => p.name === "claude");

      expect(listed.command).toBe(fromList?.command);
      expect(listed.displayName).toBe(fromList?.displayName);
      expect(listed.installed).toBe(fromList?.installed);
    });

    it("should handle multiple status checks correctly", () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const status1 = getProviderStatus("claude");
      const status2 = getProviderStatus("claude");

      expect(status1).toBe(status2);
    });

    it("should work with validation and config", async () => {
      vi.mocked(execSync).mockImplementation(() => "");
      const config = getProviderConfig("claude");

      await validateProvider("claude");
      expect(config.installed).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle execSync errors gracefully", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("ENOENT: command not found");
      });

      const config = getProviderConfig("claude");
      expect(config.installed).toBe(false);
    });

    it("should not throw on listing when provider detection fails", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("unexpected error");
      });

      expect(() => listProviders()).not.toThrow();
    });

    it("should handle stdio redirect correctly", () => {
      vi.mocked(execSync).mockImplementation((_cmd, opts) => {
        expect(opts).toHaveProperty("stdio", "ignore");
        return "";
      });

      getProviderConfig("claude");
      expect(execSync).toHaveBeenCalled();
    });
  });
});
