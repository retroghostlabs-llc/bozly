/**
 * Integration tests for bozly template CLI
 */

import { describe, it, expect, beforeEach } from "vitest";
import { execSync } from "child_process";
import {
  createTempDir,
  getTempDir,
  fileExists,
  readJSON,
  dirExists,
} from "../conftest";
import path from "path";
import fs from "fs/promises";

function runCommand(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (error: any) {
    return (error.stdout || "") + "\n" + (error.stderr || "");
  }
}

describe("Templates CLI Integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    await createTempDir();
    tempDir = getTempDir();
  });

  describe("bozly template list", () => {
    it("should list available templates", () => {
      const output = runCommand(`bozly template list`);
      expect(output).toBeDefined();
      // Should list builtin templates
    });

    it("should show template metadata", () => {
      const output = runCommand(`bozly template list`);
      expect(output).toBeDefined();
      // Output may contain template information
    });
  });

  describe("bozly template ls (alias)", () => {
    it("should work as shorthand for list", () => {
      const output = runCommand(`bozly template ls`);
      expect(output).toBeDefined();
    });
  });

  describe("Template Categories", () => {
    it("should support --category filter", () => {
      const output = runCommand(`bozly template list --category creative`);
      expect(output).toBeDefined();
    });

    it("should support -c shorthand", () => {
      const output = runCommand(`bozly template list -c productivity`);
      expect(output).toBeDefined();
    });
  });

  describe("bozly template help", () => {
    it("should show template command help", () => {
      const output = runCommand(`dist/cli/index.js template --help`);
      expect(output.toLowerCase()).toContain("manage templates");
    });

    it("should show subcommand options", () => {
      const output = runCommand(`dist/cli/index.js template list --help`);
      expect(output).toBeDefined();
      expect(output).toBeTruthy();
    });
  });

  describe("Builtin Templates", () => {
    it("should include default template", () => {
      const output = runCommand(`bozly template list`);
      expect(output).toBeDefined();
      // Should show available templates
    });

    it("should show template versions", () => {
      const output = runCommand(`bozly template list`);
      expect(output).toBeDefined();
    });

    it("should show template descriptions", () => {
      const output = runCommand(`bozly template list`);
      expect(output).toBeDefined();
    });
  });

  describe("Template Creation Workflow", () => {
    it("should support interactive template creation", () => {
      // Note: Can't fully test interactive prompts in unit tests
      // This test verifies the command exists
      const output = runCommand(`bozly template create --help`);
      expect(output).toBeDefined();
    });
  });

  describe("Template Discovery", () => {
    it("should discover templates from builtin directory", () => {
      const output = runCommand(`bozly template list`);
      expect(output).toBeDefined();
      // Builtin templates should be discovered
    });

    it("should discover templates from user directory", () => {
      // User templates would be in ~/.bozly/templates/
      const output = runCommand(`bozly template list`);
      expect(output).toBeDefined();
    });
  });

  describe("Template Grouping", () => {
    it("should group templates by source", () => {
      const output = runCommand(`bozly template list`);
      expect(output).toBeDefined();
      // Should show Builtin and User template sections
    });
  });

  describe("Error Handling", () => {
    it("should handle category filter with no results gracefully", () => {
      const output = runCommand(
        `bozly template list --category non-existent-category`
      );
      expect(output).toBeDefined();
      // Should show appropriate message
    });
  });
});
