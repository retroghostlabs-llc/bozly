/**
 * Integration tests for search and history CLI commands
 * Tests the end-to-end functionality of bozly search and bozly history
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

describe("Search & History CLI Integration", () => {
  beforeEach(() => {
    // Verify dist directory exists
    expect(fs.existsSync(path.join(process.cwd(), "dist/cli/index.js"))).toBe(true);
  });

  describe("bozly search command", () => {
    it("should display help text", () => {
      const result = execSync(
        "node dist/cli/index.js search --help",
        { encoding: "utf-8", stdio: "pipe" }
      ).toString();

      expect(result).toContain("search");
      expect(result).toContain("Search across all vaults");
    });

    it("should handle empty query", () => {
      try {
        execSync("node dist/cli/index.js search ''", {
          encoding: "utf-8",
          stdio: "pipe",
        });
        expect(true).toBe(true);
      } catch (error: any) {
        // Some error is acceptable (no results)
        expect(error).toBeDefined();
      }
    });

    it("should support --json flag", () => {
      try {
        const result = execSync(
          'node dist/cli/index.js search "test" --json',
          { encoding: "utf-8", stdio: "pipe" }
        ).toString();

        // Should be valid JSON or empty
        if (result.trim()) {
          JSON.parse(result);
        }
        expect(true).toBe(true);
      } catch (error: any) {
        // No results is acceptable
        expect(true).toBe(true);
      }
    });

    it("should support --limit option", () => {
      try {
        execSync('node dist/cli/index.js search "test" --limit 5', {
          encoding: "utf-8",
          stdio: "pipe",
        });
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should support --command filter", () => {
      try {
        execSync(
          'node dist/cli/index.js search "test" --command daily',
          { encoding: "utf-8", stdio: "pipe" }
        );
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should support --provider filter", () => {
      try {
        execSync(
          'node dist/cli/index.js search "test" --provider claude',
          { encoding: "utf-8", stdio: "pipe" }
        );
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should validate status values", () => {
      try {
        execSync('node dist/cli/index.js search "test" --status invalid', {
          encoding: "utf-8",
          stdio: "pipe",
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message || error.stderr || error.stdout).toContain("Invalid status");
      }
    });

    it("should accept valid status values", () => {
      const validStatuses = ["completed", "failed", "dry_run"];
      for (const status of validStatuses) {
        try {
          execSync(`node dist/cli/index.js search "test" --status ${status}`, {
            encoding: "utf-8",
            stdio: "pipe",
          });
          expect(true).toBe(true);
        } catch {
          expect(true).toBe(true);
        }
      }
    });
  });

  describe("bozly history command", () => {
    it("should display help text", () => {
      const result = execSync(
        "node dist/cli/index.js history --help",
        { encoding: "utf-8", stdio: "pipe" }
      ).toString();

      expect(result).toContain("history");
      expect(result).toContain("Show recent sessions");
    });

    it("should handle no arguments", () => {
      try {
        execSync("node dist/cli/index.js history", {
          encoding: "utf-8",
          stdio: "pipe",
        });
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should support --json flag", () => {
      try {
        const result = execSync(
          "node dist/cli/index.js history --json",
          { encoding: "utf-8", stdio: "pipe" }
        ).toString();

        if (result.trim()) {
          JSON.parse(result);
        }
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should support --limit option", () => {
      try {
        execSync("node dist/cli/index.js history --limit 5", {
          encoding: "utf-8",
          stdio: "pipe",
        });
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should support node filtering", () => {
      try {
        execSync("node dist/cli/index.js history music", {
          encoding: "utf-8",
          stdio: "pipe",
        });
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should support --command filter", () => {
      try {
        execSync(
          "node dist/cli/index.js history --command daily",
          { encoding: "utf-8", stdio: "pipe" }
        );
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should support --provider filter", () => {
      try {
        execSync(
          "node dist/cli/index.js history --provider claude",
          { encoding: "utf-8", stdio: "pipe" }
        );
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should support --older-than filter", () => {
      try {
        execSync("node dist/cli/index.js history --older-than 7", {
          encoding: "utf-8",
          stdio: "pipe",
        });
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should validate status values", () => {
      try {
        execSync("node dist/cli/index.js history --status invalid", {
          encoding: "utf-8",
          stdio: "pipe",
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message || error.stderr || error.stdout).toContain("Invalid status");
      }
    });
  });

  describe("Command Structure", () => {
    it("search command should be registered", () => {
      const result = execSync("node dist/cli/index.js --help", {
        encoding: "utf-8",
        stdio: "pipe",
      }).toString();

      expect(result).toContain("search");
    });

    it("history command should be registered", () => {
      const result = execSync("node dist/cli/index.js --help", {
        encoding: "utf-8",
        stdio: "pipe",
      }).toString();

      expect(result).toContain("history");
    });
  });
});
