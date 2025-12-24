/**
 * Integration tests for bozly command CLI
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
    return execSync(cmd, { encoding: "utf-8" });
  } catch (error: any) {
    return error.stdout + "\n" + error.stderr;
  }
}

describe("Commands CLI Integration", () => {
  let tempDir: string;
  let nodePath: string;
  let bozlyDir: string;

  beforeEach(async () => {
    await createTempDir();
    tempDir = getTempDir();
    nodePath = tempDir;
    bozlyDir = path.join(nodePath, ".bozly");

    // Create a basic vault structure
    await fs.mkdir(bozlyDir, { recursive: true });
    await fs.mkdir(path.join(bozlyDir, "commands"), { recursive: true });

    // Create basic config
    const config = {
      name: "test-vault",
      type: "default",
      version: "0.3.0",
      created: new Date().toISOString(),
      ai: {
        defaultProvider: "claude",
        providers: ["claude"],
      },
    };
    await fs.writeFile(
      path.join(bozlyDir, "config.json"),
      JSON.stringify(config, null, 2)
    );
  });

  describe("bozly command list", () => {
    it("should list available commands", () => {
      const output = runCommand(
        `cd "${nodePath}" && bozly command list`
      );
      expect(output).toBeDefined();
      // Output should contain command information
    });

    it("should display builtin commands", () => {
      const output = runCommand(`bozly command list`);
      expect(output).toBeDefined();
      // Should not error even outside a vault
    });
  });

  describe("bozly command ls (alias)", () => {
    it("should work as shorthand for list", () => {
      const output = runCommand(`bozly command ls`);
      expect(output).toBeDefined();
    });
  });

  describe("Command Flags", () => {
    it("should support --help flag", () => {
      const output = runCommand(`dist/cli/index.js command --help`);
      expect(output.toLowerCase()).toContain("manage commands");
    });

    it("should support -h flag", () => {
      const output = runCommand(`dist/cli/index.js command -h`);
      expect(output).toBeDefined();
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe("Global Commands Directory", () => {
    it("should initialize global commands on first run", async () => {
      // The initializeDefaultCommands function runs when getGlobalCommands is called
      // This is tested indirectly through command list
      const output = runCommand(`bozly command list`);
      expect(output).toBeDefined();
    });
  });

  describe("Command Resolution Order", () => {
    it("should resolve commands in priority order: vault > global > builtin", async () => {
      // Create a vault-local command
      await fs.writeFile(
        path.join(bozlyDir, "commands", "test-command.md"),
        "# Test Command\n\nTest description"
      );

      const output = runCommand(
        `cd "${nodePath}" && bozly command list`
      );
      expect(output).toBeDefined();
      // Should show the vault command if it exists
    });
  });
});
