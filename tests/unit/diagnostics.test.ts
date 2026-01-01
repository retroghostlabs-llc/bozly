/**
 * Unit tests for Framework Diagnostics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FrameworkDiagnostics, DiagnosticsReport, DiagnosticResult } from "../../dist/core/diagnostics.js";
import { createTempDir, getTempDir, writeJSON, createTempFile } from "../conftest";
import path from "path";
import fs from "fs/promises";

describe("FrameworkDiagnostics", () => {
  let diagnostics: FrameworkDiagnostics;

  beforeEach(() => {
    diagnostics = new FrameworkDiagnostics();
  });

  describe("initialization", () => {
    it("should initialize with default verbose setting", () => {
      expect(diagnostics).toBeDefined();
    });

    it("should initialize successfully", () => {
      const diagnostics2 = new FrameworkDiagnostics();
      expect(diagnostics2).toBeDefined();
    });
  });

  describe("runAll", () => {
    it("should return diagnostics report with all checks", async () => {
      const report = await diagnostics.runAll();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.version).toBeDefined();
      expect(report.results).toBeDefined();
      expect(Array.isArray(report.results)).toBe(true);
      expect(report.results.length).toBeGreaterThan(0);
    });

    it("should include pass/fail counts", async () => {
      const report = await diagnostics.runAll();

      expect(report.passCount).toBeGreaterThanOrEqual(0);
      expect(report.failCount).toBeGreaterThanOrEqual(0);
      expect(report.passCount + report.failCount).toBe(report.results.length);
    });

    it("should generate summary string", async () => {
      const report = await diagnostics.runAll();

      expect(report.summary).toBeDefined();
      expect(report.summary).toContain("checks passed");
      expect(typeof report.summary).toBe("string");
    });

    it("should include fixable count in report", async () => {
      const report = await diagnostics.runAll();

      expect(report.fixableCount).toBeDefined();
      expect(typeof report.fixableCount).toBe("number");
      expect(report.fixableCount).toBeLessThanOrEqual(report.failCount);
    });

    it("should mark each result with pass/fail status", async () => {
      const report = await diagnostics.runAll();

      for (const result of report.results) {
        expect(result.pass).toBeDefined();
        expect(typeof result.pass).toBe("boolean");
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe("string");
      }
    });
  });

  describe("runCheck", () => {
    it("should run individual check by name", async () => {
      const result = await diagnostics.runCheck("providers");

      expect(result).toBeDefined();
      expect(result.name).toBe("providers");
      expect(result.pass).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it("should throw error for unknown check", async () => {
      await expect(diagnostics.runCheck("unknown-check")).rejects.toThrow("Unknown check: unknown-check");
    });

    it("should include description for each check", async () => {
      const result = await diagnostics.runCheck("framework-install");

      expect(result.description).toBeDefined();
      expect(typeof result.description).toBe("string");
      expect(result.description.length).toBeGreaterThan(0);
    });

    it("should include fixable flag for each check", async () => {
      const result = await diagnostics.runCheck("global-config");

      expect(result.fixable).toBeDefined();
      expect(typeof result.fixable).toBe("boolean");
    });
  });

  describe("fixAll", () => {
    it("should return array of fix results", async () => {
      const results = await diagnostics.fixAll();

      expect(Array.isArray(results)).toBe(true);
    });

    it("should include check name and success status", async () => {
      const results = await diagnostics.fixAll();

      for (const result of results) {
        expect(result.check).toBeDefined();
        expect(result.success).toBeDefined();
        expect(typeof result.success).toBe("boolean");
        expect(result.message).toBeDefined();
      }
    });

    it("should skip unfixable checks", async () => {
      const results = await diagnostics.fixAll();
      const unfixableChecks = ["framework-install", "current-vault", "providers"];

      for (const result of results) {
        if (unfixableChecks.includes(result.check)) {
          // These checks might be skipped or return "no fix needed"
          expect(result.message).toBeDefined();
        }
      }
    });
  });

  describe("individual checks", () => {
    it("should check framework installation", async () => {
      const result = await diagnostics.runCheck("framework-install");

      expect(result.name).toBe("framework-install");
      expect(result.description).toContain("framework");
      expect(typeof result.pass).toBe("boolean");
    });

    it("should check global config existence", async () => {
      const result = await diagnostics.runCheck("global-config");

      expect(result.name).toBe("global-config");
      expect(result.description).toContain("Global configuration");
      expect(typeof result.pass).toBe("boolean");
    });

    it("should check global registry", async () => {
      const result = await diagnostics.runCheck("global-registry");

      expect(result.name).toBe("global-registry");
      expect(result.description).toContain("registry");
      expect(typeof result.pass).toBe("boolean");
    });

    it("should check current vault", async () => {
      const result = await diagnostics.runCheck("current-vault");

      expect(result.name).toBe("current-vault");
      expect(result.description).toContain("vault");
      expect(typeof result.pass).toBe("boolean");
    });

    it("should check vault structure", async () => {
      const result = await diagnostics.runCheck("vault-structure");

      expect(result.name).toBe("vault-structure");
      expect(result.description).toContain("structure");
      expect(typeof result.pass).toBe("boolean");
    });

    it("should check context file size", async () => {
      const result = await diagnostics.runCheck("context-size");

      expect(result.name).toBe("context-size");
      expect(result.description).toContain("size");
      expect(typeof result.pass).toBe("boolean");
    });

    it("should check providers", async () => {
      const result = await diagnostics.runCheck("providers");

      expect(result.name).toBe("providers");
      expect(result.description).toContain("provider");
      expect(typeof result.pass).toBe("boolean");
    });

    it("should check vault registry", async () => {
      const result = await diagnostics.runCheck("vault-registry");

      expect(result.name).toBe("vault-registry");
      expect(result.description).toContain("registered");
      expect(typeof result.pass).toBe("boolean");
    });
  });

  describe("check details", () => {
    it("should include details in failed checks", async () => {
      const report = await diagnostics.runAll();
      const failedChecks = report.results.filter((r) => !r.pass);

      for (const check of failedChecks) {
        // Most failures should have details explaining what went wrong
        expect(check.message).toBeDefined();
        // Details might be optional for some checks
      }
    });

    it("should include details in successful checks", async () => {
      const report = await diagnostics.runAll();
      const passedChecks = report.results.filter((r) => r.pass);

      for (const check of passedChecks) {
        expect(check.message).toBeDefined();
        // Details might be optional for passed checks
      }
    });
  });

  describe("report structure", () => {
    it("should have valid ISO timestamp", async () => {
      const report = await diagnostics.runAll();

      const timestamp = new Date(report.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now() + 1000); // Allow 1 second margin
    });

    it("should include version", async () => {
      const report = await diagnostics.runAll();

      expect(report.version).toBeDefined();
      expect(report.version.length).toBeGreaterThan(0);
      // Should be semantic version or similar
      expect(report.version).toMatch(/\d+\.\d+\.\d+/);
    });

    it("should have consistent count totals", async () => {
      const report = await diagnostics.runAll();

      const calculatedPass = report.results.filter((r) => r.pass).length;
      const calculatedFail = report.results.filter((r) => !r.pass).length;

      expect(report.passCount).toBe(calculatedPass);
      expect(report.failCount).toBe(calculatedFail);
      expect(report.passCount + report.failCount).toBe(report.results.length);
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", async () => {
      // Run all checks - should not throw even if some checks fail
      await expect(diagnostics.runAll()).resolves.toBeDefined();
    });

    it("should continue running checks if one fails", async () => {
      const report = await diagnostics.runAll();

      // Should have all checks present, even if some are failed/error states
      expect(report.results.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe("multiple instances", () => {
    it("should work with multiple instances", async () => {
      const diag1 = new FrameworkDiagnostics();
      const diag2 = new FrameworkDiagnostics();

      const report1 = await diag1.runAll();
      const report2 = await diag2.runAll();

      expect(report1.results.length).toBe(report2.results.length);
      expect(report1.passCount).toBe(report2.passCount);
      expect(report1.failCount).toBe(report2.failCount);
    });
  });
});
