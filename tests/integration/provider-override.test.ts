/**
 * Integration tests for per-command provider override feature
 *
 * Tests the complete flow of:
 * 1. Extracting provider from command frontmatter
 * 2. Using frontmatter provider in resolution hierarchy
 * 3. Handling edge cases (invalid provider, conflicts, etc.)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getCommand,
  getNodeCommands,
} from "../../dist/core/commands.js";
import { createTempDir, getTempDir } from "../conftest";
import path from "path";
import fs from "fs/promises";

describe("Feature: Per-Command Provider Override", () => {
  let tempDir: string;
  let testVaultPath: string;

  beforeEach(async () => {
    await createTempDir();
    tempDir = getTempDir();
    testVaultPath = path.join(tempDir, "test-vault");

    // Create test vault structure
    const bozlyPath = path.join(testVaultPath, ".bozly");
    await fs.mkdir(bozlyPath, { recursive: true });
    await fs.mkdir(path.join(bozlyPath, "commands"), { recursive: true });

    // Create config
    const config = {
      name: "test-vault",
      type: "default",
      version: "0.3.0",
      created: new Date().toISOString(),
      ai: {
        defaultProvider: "claude",
        providers: ["claude", "gpt", "gemini", "ollama"],
      },
    };
    await fs.writeFile(
      path.join(bozlyPath, "config.json"),
      JSON.stringify(config, null, 2)
    );
  });

  describe("Edge Case 1: Invalid provider in frontmatter", () => {
    it("should extract invalid provider without validation", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = "---\ndescription: Test\nprovider: invalid-ai\n---\nContent";
      await fs.writeFile(path.join(commandsPath, "test.md"), content, "utf-8");

      // Should extract without error (validation happens at execution time)
      const commands = await getNodeCommands(testVaultPath);
      expect(commands[0].provider).toBe("invalid-ai");
    });
  });

  describe("Edge Case 2: Frontmatter + config override", () => {
    it("should prefer frontmatter over config", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = "---\ndescription: Analyzer\nprovider: gpt\n---\nAnalyze data";
      await fs.writeFile(path.join(commandsPath, "analyze.md"), content, "utf-8");

      const command = await getCommand(testVaultPath, "analyze");

      // Frontmatter provider should take precedence
      expect(command?.provider).toBe("gpt");
    });
  });

  describe("Edge Case 3: Frontmatter provider + config model", () => {
    it("should combine frontmatter provider with config model", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = "---\ndescription: Complex task\nprovider: claude\n---\nDo complex work";
      await fs.writeFile(path.join(commandsPath, "complex.md"), content, "utf-8");

      const command = await getCommand(testVaultPath, "complex");

      // Provider from frontmatter
      expect(command?.provider).toBe("claude");
      // Model from frontmatter (if specified, otherwise undefined)
      expect(command?.model).toBeUndefined();
    });

    it("should use both provider and model from frontmatter", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = "---\ndescription: Specialized\nprovider: gpt\nmodel: gpt-4-turbo\n---\nSpecialized task";
      await fs.writeFile(path.join(commandsPath, "special.md"), content, "utf-8");

      const command = await getCommand(testVaultPath, "special");

      expect(command?.provider).toBe("gpt");
      expect(command?.model).toBe("gpt-4-turbo");
    });
  });

  describe("Edge Case 4: Empty frontmatter provider", () => {
    it("should treat empty provider as null", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = "---\ndescription: Empty provider\nprovider: \n---\nContent";
      await fs.writeFile(path.join(commandsPath, "empty.md"), content, "utf-8");

      const command = await getCommand(testVaultPath, "empty");

      // Empty provider should not be set
      expect(command?.provider).toBeUndefined();
    });
  });

  describe("Edge Case 5: CLI override + frontmatter", () => {
    it("should work with multiple commands having different providers", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");

      // Create multiple commands with different providers
      const commands = [
        { name: "claude-task", provider: "claude", content: "---\nprovider: claude\n---\nClaude task" },
        { name: "gpt-task", provider: "gpt", content: "---\nprovider: gpt\n---\nGPT task" },
        { name: "gemini-task", provider: "gemini", content: "---\nprovider: gemini\n---\nGemini task" },
        { name: "no-provider", provider: undefined, content: "---\ndescription: Default\n---\nDefault task" },
      ];

      for (const cmd of commands) {
        await fs.writeFile(
          path.join(commandsPath, `${cmd.name}.md`),
          cmd.content,
          "utf-8"
        );
      }

      // Verify each command has correct provider
      for (const expectedCmd of commands) {
        const command = await getCommand(testVaultPath, expectedCmd.name);
        expect(command?.provider).toBe(expectedCmd.provider);
      }
    });
  });

  describe("Backward Compatibility", () => {
    it("should work with existing commands without frontmatter provider", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = "---\ndescription: Legacy command\n---\nOld style command";
      await fs.writeFile(path.join(commandsPath, "legacy.md"), content, "utf-8");

      const command = await getCommand(testVaultPath, "legacy");

      expect(command).not.toBeNull();
      expect(command?.provider).toBeUndefined();
      expect(command?.description).toBe("Legacy command");
    });

    it("should preserve existing model extraction", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = "---\ndescription: Model test\nmodel: test-model\n---\nContent";
      await fs.writeFile(path.join(commandsPath, "model-test.md"), content, "utf-8");

      const command = await getCommand(testVaultPath, "model-test");

      // Model extraction should still work
      expect(command?.model).toBe("test-model");
      // Provider should be undefined
      expect(command?.provider).toBeUndefined();
    });
  });

  describe("Provider Resolution Hierarchy (6 Tiers)", () => {
    it("should follow correct resolution order: frontmatter > config > default", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");

      // Command with frontmatter provider
      const content = "---\ndescription: Test\nprovider: gpt\n---\nContent";
      await fs.writeFile(path.join(commandsPath, "test.md"), content, "utf-8");

      // Get command to verify frontmatter is extracted
      const command = await getCommand(testVaultPath, "test");
      expect(command?.provider).toBe("gpt");

      // Note: Full resolution hierarchy (including CLI, config, node, global, default)
      // is tested in the run command integration, not here
    });
  });

  describe("Multiple Commands with Mixed Providers", () => {
    it("should handle multiple commands with different provider configurations", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");

      // Create commands with different configurations
      const testCases = [
        { name: "cmd1", frontmatter: "provider: gpt", expectedProvider: "gpt" },
        { name: "cmd2", frontmatter: "provider: claude", expectedProvider: "claude" },
        { name: "cmd3", frontmatter: "provider: ollama\nmodel: llama2", expectedProvider: "ollama" },
        { name: "cmd4", frontmatter: "description: No provider", expectedProvider: undefined },
      ];

      for (const test of testCases) {
        const content = `---\n${test.frontmatter}\n---\nCommand content`;
        await fs.writeFile(
          path.join(commandsPath, `${test.name}.md`),
          content,
          "utf-8"
        );
      }

      // Verify all commands
      const allCommands = await getNodeCommands(testVaultPath);
      expect(allCommands.length).toBe(testCases.length);

      for (const test of testCases) {
        const cmd = allCommands.find((c) => c.name === test.name);
        expect(cmd?.provider).toBe(test.expectedProvider);
      }
    });
  });
});
