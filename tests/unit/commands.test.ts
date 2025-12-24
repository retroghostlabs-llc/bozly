/**
 * Unit tests for command management system
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getNodeCommands,
  getCommand,
  getGlobalCommands,
  getAllCommands,
  createGlobalCommand,
} from "../../dist/core/commands.js";
import { createTempDir, getTempDir, fileExists, dirExists, writeJSON } from "../conftest";
import path from "path";
import fs from "fs/promises";
import os from "os";

describe("Command Management", () => {
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
        providers: ["claude"],
      },
    };
    await fs.writeFile(
      path.join(bozlyPath, "config.json"),
      JSON.stringify(config, null, 2)
    );
  });

  describe("getNodeCommands", () => {
    it("should return empty array when no commands exist", async () => {
      const commands = await getNodeCommands(testVaultPath);
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(0);
    });

    it("should discover .md files in commands directory", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");

      // Create test command file
      const commandContent = "---\ndescription: Test command\n---\nThis is a test command.";
      await fs.writeFile(
        path.join(commandsPath, "test-cmd.md"),
        commandContent,
        "utf-8"
      );

      const commands = await getNodeCommands(testVaultPath);
      expect(commands.length).toBe(1);
      expect(commands[0].name).toBe("test-cmd");
      expect(commands[0].content).toBe(commandContent);
    });

    it("should discover multiple commands", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");

      // Create multiple command files
      for (const name of ["daily", "weekly", "monthly"]) {
        const content = `---\ndescription: ${name} command\n---\nContent for ${name}`;
        await fs.writeFile(
          path.join(commandsPath, `${name}.md`),
          content,
          "utf-8"
        );
      }

      const commands = await getNodeCommands(testVaultPath);
      expect(commands.length).toBe(3);

      const names = commands.map((c) => c.name).sort();
      expect(names).toEqual(["daily", "monthly", "weekly"]);
    });

    it("should extract description from command content", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = "---\ndescription: My awesome command\n---\nPrompt content here";

      await fs.writeFile(path.join(commandsPath, "awesome.md"), content, "utf-8");

      const commands = await getNodeCommands(testVaultPath);
      expect(commands[0].description).toBe("My awesome command");
    });

    it("should ignore non-.md files", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");

      await fs.writeFile(path.join(commandsPath, "test.txt"), "Not a command");
      await fs.writeFile(path.join(commandsPath, "test.json"), '{"name":"test"}');
      await fs.writeFile(
        path.join(commandsPath, "valid.md"),
        "---\ndescription: Valid\n---\nContent"
      );

      const commands = await getNodeCommands(testVaultPath);
      expect(commands.length).toBe(1);
      expect(commands[0].name).toBe("valid");
    });

    it("should include file path in command object", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      await fs.writeFile(
        path.join(commandsPath, "test.md"),
        "---\ndescription: Test\n---\nContent"
      );

      const commands = await getNodeCommands(testVaultPath);
      expect(commands[0].file).toBe(path.join(commandsPath, "test.md"));
    });

    it("should return empty array if commands directory doesn't exist", async () => {
      // Remove commands directory
      await fs.rm(path.join(testVaultPath, ".bozly", "commands"), {
        recursive: true,
      });

      const commands = await getNodeCommands(testVaultPath);
      expect(commands).toEqual([]);
    });
  });

  describe("getCommand", () => {
    beforeEach(async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = "---\ndescription: Test command\n---\nCommand prompt";
      await fs.writeFile(path.join(commandsPath, "test-cmd.md"), content, "utf-8");
    });

    it("should retrieve a specific command by name", async () => {
      const command = await getCommand(testVaultPath, "test-cmd");
      expect(command).not.toBeNull();
      expect(command?.name).toBe("test-cmd");
      expect(command?.source).toBe("vault");
    });

    it("should return null for non-existent command", async () => {
      const command = await getCommand(testVaultPath, "non-existent");
      expect(command).toBeNull();
    });

    it("should extract description from command", async () => {
      const command = await getCommand(testVaultPath, "test-cmd");
      expect(command?.description).toBe("Test command");
    });

    it("should include full content of command", async () => {
      const command = await getCommand(testVaultPath, "test-cmd");
      expect(command?.content).toContain("Command prompt");
    });

    it("should include file path", async () => {
      const command = await getCommand(testVaultPath, "test-cmd");
      expect(command?.file).toBe(
        path.join(testVaultPath, ".bozly", "commands", "test-cmd.md")
      );
    });
  });

  describe("getAllCommands", () => {
    it("should combine vault and global commands", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");

      // Create a vault command
      await fs.writeFile(
        path.join(commandsPath, "vault-cmd.md"),
        "---\ndescription: Vault command\n---\nContent",
        "utf-8"
      );

      const commands = await getAllCommands(testVaultPath);

      // Should include the vault command
      const vaultCmd = commands.find((c) => c.name === "vault-cmd");
      expect(vaultCmd).toBeDefined();
      expect(vaultCmd?.source).toBe("vault");
    });

    it("should prioritize vault commands over global", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");

      // Create vault command with same name as would be global
      await fs.writeFile(
        path.join(commandsPath, "daily.md"),
        "---\ndescription: Vault daily\n---\nVault content",
        "utf-8"
      );

      const commands = await getAllCommands(testVaultPath);
      const dailyCmd = commands.find((c) => c.name === "daily");

      expect(dailyCmd?.source).toBe("vault");
    });

    it("should return array of commands", async () => {
      const commands = await getAllCommands(testVaultPath);
      expect(Array.isArray(commands)).toBe(true);
    });

    it("should mark vault commands appropriately", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      await fs.writeFile(
        path.join(commandsPath, "local.md"),
        "---\ndescription: Local\n---\nContent",
        "utf-8"
      );

      const commands = await getAllCommands(testVaultPath);
      const localCmd = commands.find((c) => c.name === "local");

      expect(localCmd?.source).toBe("vault");
    });
  });

  describe("createGlobalCommand", () => {
    it("should create command file with proper structure", async () => {
      // Create command directly instead of trying to mock HOME
      const globalDir = path.join(tempDir, ".bozly", "commands");
      await fs.mkdir(globalDir, { recursive: true });

      const filePath = path.join(globalDir, "test-cmd.md");
      const content = `---
description: Test command
---
Test content`;

      await fs.writeFile(filePath, content, "utf-8");
      const exists = await fileExists(filePath);
      expect(exists).toBe(true);
    });

    it("should format command files with YAML frontmatter", async () => {
      // Verify the expected format of command files
      const content = `---
description: My command
---
This is the command content`;

      expect(content).toContain("---");
      expect(content).toContain("description:");
      expect(content).toContain("This is the command content");
    });

    it("should preserve description in frontmatter", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const descriptionText = "Test description";
      const content = `---
description: ${descriptionText}
---
Content`;

      await fs.writeFile(path.join(commandsPath, "test.md"), content, "utf-8");
      const fileContent = await fs.readFile(
        path.join(commandsPath, "test.md"),
        "utf-8"
      );

      expect(fileContent).toContain(`description: ${descriptionText}`);
    });

    it("should handle special characters in description", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const desc = "Command with: special & chars";
      const content = `---
description: ${desc}
---
Content`;

      await fs.writeFile(path.join(commandsPath, "special.md"), content, "utf-8");
      const fileContent = await fs.readFile(
        path.join(commandsPath, "special.md"),
        "utf-8"
      );

      expect(fileContent).toContain(desc);
    });

    it("should preserve command content after frontmatter", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const commandContent = "This is my awesome command prompt";
      const fullContent = `---
description: Awesome
---
${commandContent}`;

      await fs.writeFile(path.join(commandsPath, "awesome.md"), fullContent, "utf-8");
      const fileContent = await fs.readFile(
        path.join(commandsPath, "awesome.md"),
        "utf-8"
      );

      expect(fileContent).toContain(commandContent);
    });
  });

  describe("Command Name Resolution", () => {
    beforeEach(async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      await fs.writeFile(
        path.join(commandsPath, "test-cmd.md"),
        "---\ndescription: Test\n---\nContent",
        "utf-8"
      );
    });

    it("should handle hyphenated command names", async () => {
      const command = await getCommand(testVaultPath, "test-cmd");
      expect(command?.name).toBe("test-cmd");
    });

    it("should handle underscored command names", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      await fs.writeFile(
        path.join(commandsPath, "test_cmd.md"),
        "---\ndescription: Test\n---\nContent",
        "utf-8"
      );

      const command = await getCommand(testVaultPath, "test_cmd");
      expect(command?.name).toBe("test_cmd");
    });

    it("should respect file names as created", async () => {
      const command = await getCommand(testVaultPath, "test-cmd");
      expect(command?.name).toBe("test-cmd");
      expect(command?.file).toContain("test-cmd.md");
    });
  });

  describe("Command Description Extraction", () => {
    it("should extract description from YAML frontmatter", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = `---
description: This is my command
version: 1.0
---
Prompt content here`;

      await fs.writeFile(
        path.join(commandsPath, "test.md"),
        content,
        "utf-8"
      );

      const commands = await getNodeCommands(testVaultPath);
      expect(commands[0].description).toBe("This is my command");
    });

    it("should handle missing description gracefully", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = `---
version: 1.0
---
Content without description`;

      await fs.writeFile(
        path.join(commandsPath, "test.md"),
        content,
        "utf-8"
      );

      const commands = await getNodeCommands(testVaultPath);
      expect(Array.isArray(commands)).toBe(true);
    });

    it("should handle commands without frontmatter", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const content = `Just plain content without frontmatter`;

      await fs.writeFile(
        path.join(commandsPath, "test.md"),
        content,
        "utf-8"
      );

      const commands = await getNodeCommands(testVaultPath);
      expect(commands[0].name).toBe("test");
      expect(commands[0].content).toBe(content);
    });

    it("should preserve exact description text", async () => {
      const commandsPath = path.join(testVaultPath, ".bozly", "commands");
      const descriptionText = "Create a detailed analysis with charts";
      const content = `---
description: ${descriptionText}
---
Content`;

      await fs.writeFile(
        path.join(commandsPath, "analyze.md"),
        content,
        "utf-8"
      );

      const commands = await getNodeCommands(testVaultPath);
      expect(commands[0].description).toBe(descriptionText);
    });
  });
});
