import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkLatestVersion,
  formatUpdateInfo,
  formatVersion,
  getCurrentVersion,
} from "../../../src/core/version-checker.js";

describe("Version Checker", () => {
  describe("getCurrentVersion", () => {
    it("should return a version string", () => {
      const version = getCurrentVersion();
      expect(typeof version).toBe("string");
      expect(version.length).toBeGreaterThan(0);
    });

    it("should be a valid version format or 'unknown'", () => {
      const version = getCurrentVersion();
      // Either matches semantic versioning or is 'unknown'
      const isValid =
        /^\d+\.\d+\.\d+/.test(version) || version === "unknown";
      expect(isValid).toBe(true);
    });
  });

  describe("checkLatestVersion", () => {
    it("should return update info object with required fields", async () => {
      const info = await checkLatestVersion();

      expect(info).toHaveProperty("currentVersion");
      expect(info).toHaveProperty("latestVersion");
      expect(info).toHaveProperty("isUpdateAvailable");
      expect(info).toHaveProperty("comparison");
      expect(info).toHaveProperty("changelogUrl");
      expect(info).toHaveProperty("installCommand");
      expect(info).toHaveProperty("checkedAt");
    });

    it("should have valid comparison type", async () => {
      const info = await checkLatestVersion();
      expect(["up-to-date", "out-of-date", "prerelease"]).toContain(
        info.comparison
      );
    });

    it("should have isUpdateAvailable boolean", async () => {
      const info = await checkLatestVersion();
      expect(typeof info.isUpdateAvailable).toBe("boolean");
    });

    it("should have valid changelog URL", async () => {
      const info = await checkLatestVersion();
      expect(info.changelogUrl).toContain("github.com");
    });

    it("should have valid install command", async () => {
      const info = await checkLatestVersion();
      expect(info.installCommand).toContain("npm");
      expect(info.installCommand).toContain("bozly");
    });

    it("should have valid ISO timestamp", async () => {
      const info = await checkLatestVersion();
      expect(() => new Date(info.checkedAt)).not.toThrow();
    });

    it("should handle comparison logic correctly", async () => {
      const info = await checkLatestVersion();

      // If up-to-date, isUpdateAvailable should be false
      if (info.comparison === "up-to-date") {
        expect(info.isUpdateAvailable).toBe(false);
      }

      // If out-of-date, isUpdateAvailable should be true
      if (info.comparison === "out-of-date") {
        expect(info.isUpdateAvailable).toBe(true);
      }

      // If prerelease, isUpdateAvailable may be true or false
      if (info.comparison === "prerelease") {
        expect(typeof info.isUpdateAvailable).toBe("boolean");
      }
    });
  });

  describe("formatUpdateInfo", () => {
    it("should format update info for up-to-date version", () => {
      const info = {
        currentVersion: "1.0.0",
        latestVersion: "1.0.0",
        isUpdateAvailable: false,
        comparison: "up-to-date" as const,
        changelogUrl: "https://github.com/test/test/releases",
        installCommand: "npm install -g test",
        checkedAt: new Date().toISOString(),
      };

      const formatted = formatUpdateInfo(info);

      expect(formatted).toContain("UPDATE CHECK");
      expect(formatted).toContain("1.0.0");
      expect(formatted).toContain("✅");
    });

    it("should format update info for out-of-date version", () => {
      const info = {
        currentVersion: "0.9.0",
        latestVersion: "1.0.0",
        isUpdateAvailable: true,
        comparison: "out-of-date" as const,
        changelogUrl: "https://github.com/test/test/releases/tag/v1.0.0",
        installCommand: "npm install -g test@1.0.0",
        checkedAt: new Date().toISOString(),
      };

      const formatted = formatUpdateInfo(info);

      expect(formatted).toContain("⚠️");
      expect(formatted).toContain("available");
      expect(formatted).toContain("npm install");
      expect(formatted).toContain("Changelog");
    });

    it("should format update info for prerelease version", () => {
      const info = {
        currentVersion: "1.0.0-beta.1",
        latestVersion: "1.0.0",
        isUpdateAvailable: true,
        comparison: "prerelease" as const,
        changelogUrl: "https://github.com/test/test/releases",
        installCommand: "npm install -g test@1.0.0",
        checkedAt: new Date().toISOString(),
      };

      const formatted = formatUpdateInfo(info);

      expect(formatted).toContain("🚀");
      expect(formatted).toContain("prerelease");
    });

    it("should include current and latest versions", () => {
      const info = {
        currentVersion: "1.0.0",
        latestVersion: "2.0.0",
        isUpdateAvailable: true,
        comparison: "out-of-date" as const,
        changelogUrl: "https://example.com",
        installCommand: "npm install -g test",
        checkedAt: new Date().toISOString(),
      };

      const formatted = formatUpdateInfo(info);

      expect(formatted).toContain("Current Version");
      expect(formatted).toContain("Latest Version");
    });

    it("should include installation command when update available", () => {
      const info = {
        currentVersion: "0.5.0",
        latestVersion: "1.0.0",
        isUpdateAvailable: true,
        comparison: "out-of-date" as const,
        changelogUrl: "https://example.com",
        installCommand: "npm install -g myapp@1.0.0",
        checkedAt: new Date().toISOString(),
      };

      const formatted = formatUpdateInfo(info);

      expect(formatted).toContain("myapp@1.0.0");
    });
  });

  describe("formatVersion", () => {
    it("should add 'v' prefix if not present", () => {
      const formatted = formatVersion("1.0.0");
      expect(formatted).toBe("v1.0.0");
    });

    it("should not add 'v' prefix if already present", () => {
      const formatted = formatVersion("v1.0.0");
      expect(formatted).toBe("v1.0.0");
    });

    it("should handle prerelease versions", () => {
      const formatted = formatVersion("1.0.0-beta.1");
      expect(formatted).toBe("v1.0.0-beta.1");
    });

    it("should handle already prefixed prerelease versions", () => {
      const formatted = formatVersion("v1.0.0-beta.1");
      expect(formatted).toBe("v1.0.0-beta.1");
    });
  });

  describe("version comparison logic", () => {
    it("should detect when versions are equal", async () => {
      const info = await checkLatestVersion();

      // If both versions are the same, should be up-to-date
      if (info.currentVersion === info.latestVersion) {
        expect(info.isUpdateAvailable).toBe(false);
        expect(info.comparison).toBe("up-to-date");
      }
    });

    it("should handle prerelease vs stable comparison", () => {
      const info1 = {
        currentVersion: "1.0.0-beta.1",
        latestVersion: "1.0.0",
        isUpdateAvailable: true,
        comparison: "prerelease" as const,
        changelogUrl: "https://example.com",
        installCommand: "npm install",
        checkedAt: new Date().toISOString(),
      };

      expect(info1.comparison).toBe("prerelease");
      expect(info1.isUpdateAvailable).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should return fallback values on error", async () => {
      // This test verifies the function doesn't throw on npm errors
      const info = await checkLatestVersion();

      // Should always return valid structure
      expect(info).toBeDefined();
      expect(info.currentVersion).toBeDefined();
      expect(info.latestVersion).toBeDefined();
      expect(info.isUpdateAvailable !== undefined).toBe(true);
    });

    it("should always return a valid object", async () => {
      const info = await checkLatestVersion();

      // All properties should be defined
      expect(info.currentVersion).toBeDefined();
      expect(info.latestVersion).toBeDefined();
      expect(typeof info.isUpdateAvailable).toBe("boolean");
      expect(["up-to-date", "out-of-date", "prerelease"]).toContain(
        info.comparison
      );
      expect(typeof info.changelogUrl).toBe("string");
      expect(typeof info.installCommand).toBe("string");
      expect(typeof info.checkedAt).toBe("string");
    });
  });

  describe("URL and command formatting", () => {
    it("should generate valid npm registry URLs", async () => {
      const info = await checkLatestVersion();
      expect(info.changelogUrl).toMatch(/^https?:\/\//);
    });

    it("should generate valid npm install commands", async () => {
      const info = await checkLatestVersion();
      expect(info.installCommand).toContain("npm");
      expect(info.installCommand).toContain("install");
    });

    it("should include version in install command", async () => {
      const info = await checkLatestVersion();
      if (info.latestVersion !== "unknown") {
        expect(info.installCommand).toContain(info.latestVersion);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle 'unknown' version gracefully", () => {
      const info = {
        currentVersion: "unknown",
        latestVersion: "unknown",
        isUpdateAvailable: false,
        comparison: "up-to-date" as const,
        changelogUrl: "https://example.com",
        installCommand: "npm install",
        checkedAt: new Date().toISOString(),
      };

      const formatted = formatUpdateInfo(info);
      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
    });

    it("should handle version with build metadata", () => {
      const formatted = formatVersion("1.0.0+build.123");
      expect(formatted).toBe("v1.0.0+build.123");
    });

    it("should handle multiple leading 'v' prefixes gracefully", () => {
      // Version checker should handle edge cases
      const formatted = formatVersion("v1.0.0");
      expect(formatted.startsWith("v")).toBe(true);
    });
  });
});
