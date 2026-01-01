/**
 * Tests for Provider Detection Module
 *
 * Tests detection of installed AI providers, version retrieval,
 * and formatted output generation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  detectAllProviders,
  getProvidersByStatus,
  formatDetectionResults,
  type DetectedProvider,
  type ProviderDetectionResult,
} from "../../src/core/provider-detection.js";

describe("Provider Detection", () => {
  describe("detectAllProviders", () => {
    it("should return detection result with all properties", () => {
      const result = detectAllProviders();

      expect(result).toBeDefined();
      expect(result.providers).toBeInstanceOf(Array);
      expect(result.foundCount).toBeLessThanOrEqual(result.totalCount);
      expect(result.installed).toBeInstanceOf(Array);
      expect(result.notFound).toBeInstanceOf(Array);
      expect(result.detectedAt).toBeDefined();
      expect(typeof result.detectedAt).toBe("string");
    });

    it("should have at least 4 providers in detection", () => {
      const result = detectAllProviders();

      expect(result.totalCount).toBeGreaterThanOrEqual(4);
      expect(result.providers.length).toBeGreaterThanOrEqual(4);
    });

    it("should have installed and notFound lists that sum to total", () => {
      const result = detectAllProviders();

      expect(result.installed.length + result.notFound.length).toBe(
        result.totalCount
      );
    });

    it("should return a valid timestamp in ISO format", () => {
      const result = detectAllProviders();

      // Check if timestamp is valid ISO format
      expect(() => new Date(result.detectedAt)).not.toThrow();
      expect(result.detectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("Provider Details", () => {
    it("should have correct provider names", () => {
      const result = detectAllProviders();
      const names = result.providers.map((p) => p.name);

      expect(names).toContain("claude");
      expect(names).toContain("gpt");
      expect(names).toContain("gemini");
      expect(names).toContain("ollama");
    });

    it("should have correct display names", () => {
      const result = detectAllProviders();
      const claude = result.providers.find((p) => p.name === "claude");
      const gpt = result.providers.find((p) => p.name === "gpt");
      const ollama = result.providers.find((p) => p.name === "ollama");

      expect(claude!.displayName).toBe("Claude");
      expect(gpt!.displayName).toBe("ChatGPT");
      expect(ollama!.displayName).toContain("Ollama");
    });

    it("should have command field for each provider", () => {
      const result = detectAllProviders();

      for (const provider of result.providers) {
        expect(provider.command).toBeDefined();
        expect(provider.command.length).toBeGreaterThan(0);
      }
    });

    it("should have boolean found status for each provider", () => {
      const result = detectAllProviders();

      for (const provider of result.providers) {
        expect(typeof provider.found).toBe("boolean");
      }
    });

    it("should have version as string or null", () => {
      const result = detectAllProviders();

      for (const provider of result.providers) {
        expect(
          provider.version === null || typeof provider.version === "string"
        ).toBe(true);
      }
    });
  });

  describe("getProvidersByStatus", () => {
    it("should filter by installed status", () => {
      const installed = getProvidersByStatus("installed");

      expect(installed).toBeInstanceOf(Array);
      expect(installed.every((p) => p.found)).toBe(true);
    });

    it("should filter by not-found status", () => {
      const notFound = getProvidersByStatus("notFound");

      expect(notFound).toBeInstanceOf(Array);
      expect(notFound.every((p) => !p.found)).toBe(true);
    });

    it("should have filtered providers sum to total", () => {
      const result = detectAllProviders();
      const installed = getProvidersByStatus("installed");
      const notFound = getProvidersByStatus("notFound");

      expect(installed.length + notFound.length).toBe(result.totalCount);
    });
  });

  describe("formatDetectionResults", () => {
    it("should format detection results as string", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });

    it("should include provider detection header", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      expect(formatted).toContain("🔍");
      expect(formatted).toContain("DETECTING AI PROVIDERS");
    });

    it("should include provider detection emoji", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      expect(formatted).toContain("✅");
      expect(formatted).toContain("❌");
    });

    it("should show provider names in output", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      expect(formatted).toContain("Claude");
    });

    it("should show results count", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      expect(formatted).toContain("Results:");
      expect(formatted).toContain("providers");
    });

    it("should not show verbose details by default", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result, false);

      expect(formatted).not.toContain("VERBOSE DETAILS");
    });

    it("should show verbose details when requested", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result, true);

      expect(formatted).toContain("VERBOSE DETAILS");
      expect(formatted).toContain("Command:");
      expect(formatted).toContain("Status:");
    });

    it("should show installed provider section if any found", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      if (result.foundCount > 0) {
        expect(formatted).toContain("INSTALLED:");
      }
    });

    it("should show not-found provider section if any missing", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      if (result.notFound.length > 0) {
        expect(formatted).toContain("NOT INSTALLED:");
      }
    });

    it("should have separators in output", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      expect(formatted).toContain("═");
    });
  });

  describe("Result Structure Validation", () => {
    it("should have correct result property types", () => {
      const result = detectAllProviders();

      expect(result).toHaveProperty("providers");
      expect(result).toHaveProperty("foundCount");
      expect(result).toHaveProperty("totalCount");
      expect(result).toHaveProperty("installed");
      expect(result).toHaveProperty("notFound");
      expect(result).toHaveProperty("detectedAt");

      expect(typeof result.foundCount).toBe("number");
      expect(typeof result.totalCount).toBe("number");
      expect(Array.isArray(result.providers)).toBe(true);
      expect(Array.isArray(result.installed)).toBe(true);
      expect(Array.isArray(result.notFound)).toBe(true);
      expect(typeof result.detectedAt).toBe("string");
    });

    it("should have correct provider object types", () => {
      const result = detectAllProviders();
      const provider = result.providers[0];

      expect(provider).toHaveProperty("name");
      expect(provider).toHaveProperty("displayName");
      expect(provider).toHaveProperty("found");
      expect(provider).toHaveProperty("version");
      expect(provider).toHaveProperty("command");

      expect(typeof provider.name).toBe("string");
      expect(typeof provider.displayName).toBe("string");
      expect(typeof provider.found).toBe("boolean");
      expect(
        provider.version === null || typeof provider.version === "string"
      ).toBe(true);
      expect(typeof provider.command).toBe("string");
    });

    it("should have provider names matching those from config", () => {
      const result = detectAllProviders();

      // All provider names should be lowercase
      for (const provider of result.providers) {
        expect(provider.name).toBe(provider.name.toLowerCase());
      }
    });

    it("should have consistent counts", () => {
      const result = detectAllProviders();

      // Count should match array lengths
      expect(result.foundCount).toBe(
        result.providers.filter((p) => p.found).length
      );
      expect(result.installed.length).toBe(
        result.providers.filter((p) => p.found).length
      );
      expect(result.notFound.length).toBe(
        result.providers.filter((p) => !p.found).length
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle all providers detected", () => {
      const result = detectAllProviders();

      // This is a valid state - might have all providers installed
      if (result.foundCount === result.totalCount) {
        expect(result.notFound.length).toBe(0);
      }
    });

    it("should handle no providers detected", () => {
      const result = detectAllProviders();

      // This is a valid state - might have no providers installed
      if (result.foundCount === 0) {
        expect(result.installed.length).toBe(0);
      }
    });

    it("should handle mixed results", () => {
      const result = detectAllProviders();

      // If we have both installed and not-found, verify consistency
      if (result.foundCount > 0 && result.notFound.length > 0) {
        expect(result.installed.length).toBeGreaterThan(0);
        expect(result.notFound.length).toBeGreaterThan(0);
      }
    });

    it("should format empty results gracefully", () => {
      const emptyResult: ProviderDetectionResult = {
        providers: [],
        foundCount: 0,
        totalCount: 0,
        installed: [],
        notFound: [],
        detectedAt: new Date().toISOString(),
      };

      const formatted = formatDetectionResults(emptyResult);
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });

    it("should handle provider with null version", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      // Should not crash and should produce valid output
      expect(typeof formatted).toBe("string");
    });
  });

  describe("Format Output Quality", () => {
    it("should have readable line breaks", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      expect(formatted).toContain("\n");
    });

    it("should not have excessive blank lines", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      // Should not have more than 2 consecutive newlines
      expect(formatted).not.toMatch(/\n\n\n/);
    });

    it("should include emoji indicators", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      // Should have emoji for detection UI
      expect(formatted).toMatch(/✅|❌|🔍|═/);
    });

    it("should show count in plural form", () => {
      const result = detectAllProviders();
      const formatted = formatDetectionResults(result);

      if (result.foundCount === 1) {
        expect(formatted).toContain("1 provider");
      }
    });
  });
});
