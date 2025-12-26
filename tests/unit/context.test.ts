/**
 * Unit tests for context generation
 */

import { describe, it, expect } from "vitest";
import {
  createTempDir,
  getTempDir,
  createMockVault,
  writeJSON,
  fileExists,
} from "../conftest";
import { generateContext } from "../../dist/core/context.js";
import type { ContextOptions, NodeInfo } from "../../dist/core/types.js";
import path from "path";
import fs from "fs/promises";

describe("Context Generation and Loading", () => {
  describe("generateContext", () => {
    it("should generate context with basic information", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toBeDefined();
      expect(typeof context).toBe("string");
      expect(context.length).toBeGreaterThan(0);
    });

    it("should include vault name in context", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain("test-vault");
    });

    it("should include vault config metadata", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "music-vault",
        path: nodePath,
        type: "music",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain("music-vault");
      expect(context).toContain("music");
    });

    it("should handle context options parameter", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const options: ContextOptions = {
        provider: "gpt",
        includeCommands: true,
      };

      const context = await generateContext(vault, options);

      expect(context).toBeDefined();
      expect(typeof context).toBe("string");
    });

    it("should include AI provider information", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const options: ContextOptions = {
        provider: "claude",
      };

      const context = await generateContext(vault, options);

      expect(context).toBeDefined();
      expect(typeof context).toBe("string");
    });

    it("should handle different vault types", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "project",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain("test-vault");
      expect(context).toContain("project");
    });

    it("should include vault path information", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toBeDefined();
      expect(context.length).toBeGreaterThan(0);
    });

    it("should handle vault with custom context file", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      // Add custom context.md
      const bozlyPath = path.join(nodePath, ".bozly");
      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, "# Custom Vault Context\n\nThis is a custom context.");

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain("Custom Vault Context");
    });

    it("should be consistent across multiple calls", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context1 = await generateContext(vault);
      const context2 = await generateContext(vault);

      expect(context1).toBe(context2);
    });

    it("should handle includeCommands option", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const contextWithCommands = await generateContext(vault, { includeCommands: true });
      const contextWithoutCommands = await generateContext(vault, { includeCommands: false });

      expect(contextWithCommands).toBeDefined();
      expect(contextWithoutCommands).toBeDefined();
    });

    it("should handle multiple AI providers", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const providers = ["claude", "gpt", "gemini", "ollama"];

      for (const provider of providers) {
        const context = await generateContext(vault, { provider });
        expect(context).toBeDefined();
        expect(typeof context).toBe("string");
      }
    });

    it("should include available commands in context", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      // Create commands
      const commandsDir = path.join(nodePath, ".bozly", "commands");
      await fs.mkdir(commandsDir, { recursive: true });

      await fs.writeFile(
        path.join(commandsDir, "review.md"),
        "---\ndescription: Review the work\n---\nCommand content",
        "utf-8"
      );

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault, { includeCommands: true });

      expect(context).toContain("Available Commands");
      expect(context).toContain("/review");
      expect(context).toContain("Review the work");
    });

    it("should not include Available Commands section when no commands exist", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault, { includeCommands: true });

      expect(context).not.toContain("Available Commands");
    });

    it("should extract description from YAML frontmatter", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const commandsDir = path.join(nodePath, ".bozly", "commands");
      await fs.mkdir(commandsDir, { recursive: true });

      // Command with YAML frontmatter
      await fs.writeFile(
        path.join(commandsDir, "task.md"),
        `---
description: Process daily tasks
author: John
version: 1.0
---

# Daily Task Processor

This command processes daily tasks.`,
        "utf-8"
      );

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault, { includeCommands: true });

      expect(context).toContain("Process daily tasks");
    });

    it("should extract description from first non-heading line", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const commandsDir = path.join(nodePath, ".bozly", "commands");
      await fs.mkdir(commandsDir, { recursive: true });

      // Command without YAML, description from first line
      await fs.writeFile(
        path.join(commandsDir, "simple.md"),
        `# Simple Command

This is a simple command that does something.

More content here.`,
        "utf-8"
      );

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault, { includeCommands: true });

      expect(context).toContain("This is a simple command that does something.");
    });

    it("should handle command with no description", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const commandsDir = path.join(nodePath, ".bozly", "commands");
      await fs.mkdir(commandsDir, { recursive: true });

      // Command with only headings
      await fs.writeFile(
        path.join(commandsDir, "empty.md"),
        `# Empty Command

## Section 1

## Section 2`,
        "utf-8"
      );

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault, { includeCommands: true });

      expect(context).toContain("/empty");
      expect(context).toContain("No description");
    });

    it("should handle command file read errors gracefully", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const commandsDir = path.join(nodePath, ".bozly", "commands");
      await fs.mkdir(commandsDir, { recursive: true });

      // Create a valid command
      await fs.writeFile(
        path.join(commandsDir, "valid.md"),
        "Valid command",
        "utf-8"
      );

      // Create a directory instead of file (will cause read error)
      await fs.mkdir(path.join(commandsDir, "invalid.md"), { recursive: true });

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      // Should not throw, should include valid command
      const context = await generateContext(vault, { includeCommands: true });

      expect(context).toContain("/valid");
    });

    it("should truncate long descriptions to 100 characters", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const commandsDir = path.join(nodePath, ".bozly", "commands");
      await fs.mkdir(commandsDir, { recursive: true });

      // Command with very long description
      const longDesc = "A".repeat(150);
      await fs.writeFile(
        path.join(commandsDir, "long.md"),
        `# Long Command

${longDesc}`,
        "utf-8"
      );

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault, { includeCommands: true });

      // Description should be truncated
      expect(context).toContain("A".repeat(100));
      expect(context).not.toContain("A".repeat(101));
    });

    it("should include multiple commands in context", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const commandsDir = path.join(nodePath, ".bozly", "commands");
      await fs.mkdir(commandsDir, { recursive: true });

      // Create multiple commands
      const commands = ["analyze", "report", "brainstorm", "outline"];
      for (const cmd of commands) {
        await fs.writeFile(
          path.join(commandsDir, `${cmd}.md`),
          `---\ndescription: ${cmd.charAt(0).toUpperCase() + cmd.slice(1)} something\n---`,
          "utf-8"
        );
      }

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault, { includeCommands: true });

      for (const cmd of commands) {
        expect(context).toContain(`/${cmd}`);
      }
    });

    it("should include correct provider in metadata", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault, { provider: "custom-ai" });

      expect(context).toContain("provider: custom-ai");
    });

    it("should default to claude provider when not specified", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain("provider: claude");
    });

    it("should handle context file with empty content", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      // Overwrite context.md with empty file
      const contextPath = path.join(nodePath, ".bozly", "context.md");
      await fs.writeFile(contextPath, "", "utf-8");

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toBeDefined();
      expect(typeof context).toBe("string");
    });

    it("should preserve custom context.md formatting", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const customContent = `# My Custom Context

This is a **formatted** context with:
- Bullet points
- Code: \`example\`
- [Links](https://example.com)`;

      const contextPath = path.join(nodePath, ".bozly", "context.md");
      await fs.writeFile(contextPath, customContent, "utf-8");

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain("formatted");
      expect(context).toContain("- Bullet points");
      expect(context).toContain("Links");
    });

    it("should include vault path in metadata", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain(`path: ${nodePath}`);
    });

    it("should include vault type in metadata", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "music",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain("type: music");
    });

    it("should handle ignoring non-markdown files in commands directory", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const commandsDir = path.join(nodePath, ".bozly", "commands");
      await fs.mkdir(commandsDir, { recursive: true });

      // Create both markdown and non-markdown files
      await fs.writeFile(path.join(commandsDir, "real.md"), "Real command", "utf-8");
      await fs.writeFile(path.join(commandsDir, "ignore.txt"), "Should be ignored", "utf-8");
      await fs.writeFile(path.join(commandsDir, "ignore.json"), '{"ignored": true}', "utf-8");

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault, { includeCommands: true });

      expect(context).toContain("/real");
      expect(context).not.toContain("ignore.txt");
      expect(context).not.toContain("ignore.json");
    });
  });
});
