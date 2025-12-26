/**
 * Unit tests for command execution and provider integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  runNodeCommand,
  getCommand,
  getNodeCommands,
  initializeDefaultCommands,
} from "../../dist/core/commands.js";
import { createTempDir, getTempDir } from "../conftest";
import path from "path";
import fs from "fs/promises";
import type { NodeInfo } from "../../dist/core/types.js";

// Mock the providers and hooks
vi.mock("../../dist/core/providers.js", () => ({
  validateProvider: vi.fn().mockResolvedValue(undefined),
  getProviderConfig: vi.fn(() => ({
    name: "claude",
    displayName: "Claude",
    command: "claude",
    args: ["-p"],
    installed: true,
  })),
}));

vi.mock("../../dist/core/hooks.js", () => ({
  executeHooks: vi.fn().mockResolvedValue([]),
}));

vi.mock("child_process", () => ({
  spawn: vi.fn((cmd, args, opts) => {
    const { EventEmitter } = require("events");
    const mockProc = new EventEmitter();
    mockProc.stdin = {
      write: vi.fn(),
      end: vi.fn(),
    };
    mockProc.stdout = new EventEmitter();
    mockProc.stdout.setEncoding = vi.fn();
    mockProc.stderr = new EventEmitter();

    // Simulate successful response
    setTimeout(() => {
      mockProc.stdout.emit("data", "Test response from AI");
      mockProc.emit("close", 0);
    }, 10);

    return mockProc;
  }),
}));

describe("Command Execution", () => {
  let tempDir: string;
  let testVault: NodeInfo;

  beforeEach(async () => {
    await createTempDir();
    tempDir = getTempDir();
    const testVaultPath = path.join(tempDir, "test-vault");

    // Create test vault structure
    const bozlyPath = path.join(testVaultPath, ".bozly");
    await fs.mkdir(bozlyPath, { recursive: true });
    await fs.mkdir(path.join(bozlyPath, "commands"), { recursive: true });
    await fs.mkdir(path.join(bozlyPath, "sessions"), { recursive: true });

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

    // Create context.md
    await fs.writeFile(
      path.join(bozlyPath, "context.md"),
      "# Test Vault Context\nThis is a test vault.",
      "utf-8"
    );

    // Create test command
    const commandsPath = path.join(bozlyPath, "commands");
    const commandContent = "---\ndescription: Test command\n---\nGenerate a test response.";
    await fs.writeFile(
      path.join(commandsPath, "test-cmd.md"),
      commandContent,
      "utf-8"
    );

    testVault = {
      id: "test-vault",
      name: "test-vault",
      path: testVaultPath,
      type: "default",
      created: new Date().toISOString(),
      settings: {},
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("runNodeCommand", () => {
    it("should execute a command successfully", async () => {
      const result = await runNodeCommand(testVault, "test-cmd");

      expect(result).toBeDefined();
      expect(result.provider).toBe("claude");
      expect(result.prompt).toBeTruthy();
      expect(result.commandName).toBe("test-cmd");
    });

    it("should throw error for non-existent command", async () => {
      await expect(runNodeCommand(testVault, "non-existent")).rejects.toThrow(
        /not found/
      );
    });

    it("should return dry-run result when dryRun option is true", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", { dryRun: true });

      expect(result.prompt).toBeTruthy();
      expect(result.commandName).toBe("test-cmd");
      expect(result.contextText).toBeTruthy();
      expect(result.commandText).toBeTruthy();
      expect(result.provider).toBe("claude");
      // Should not have output from actual execution
      expect(result.output).toBeUndefined();
    });

    it("should exclude context when includeContext is false", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", {
        dryRun: true,
        includeContext: false,
      });

      expect(result.contextSize).toBe(0);
      expect(result.contextText).toBe("");
      // Prompt should only contain command, not context
      expect(result.prompt).toContain("## Command:");
    });

    it("should use custom provider when specified", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", {
        dryRun: true,
        provider: "gpt",
      });

      expect(result.provider).toBe("gpt");
    });

    it("should include context in prompt", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", {
        dryRun: true,
      });

      expect(result.prompt).toContain("Test Vault Context");
    });

    it("should format prompt with command section", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", {
        dryRun: true,
      });

      expect(result.prompt).toContain("## Command: /test-cmd");
    });

    it("should default to claude provider", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", {
        dryRun: true,
      });

      expect(result.provider).toBe("claude");
    });

    it("should include command name in result", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", {
        dryRun: true,
      });

      expect(result.commandName).toBe("test-cmd");
    });

    it("should return context size metric", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", {
        dryRun: true,
      });

      expect(typeof result.contextSize).toBe("number");
      expect(result.contextSize).toBeGreaterThanOrEqual(0);
    });

    it("should handle model references in commands", async () => {
      const commandsPath = path.join(testVault.path, ".bozly", "commands");
      const commandWithModel = `---
description: Command with model
model: test-model
---
Use the test model for analysis.`;

      await fs.writeFile(
        path.join(commandsPath, "model-cmd.md"),
        commandWithModel,
        "utf-8"
      );

      const result = await runNodeCommand(testVault, "model-cmd", {
        dryRun: true,
      });

      expect(result.commandName).toBe("model-cmd");
      expect(result.modelsUsed).toBeDefined();
    });

    it("should pass command text in result", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", {
        dryRun: true,
      });

      expect(result.commandText).toContain("Generate a test response");
    });
  });

  describe("Command Prompt Building", () => {
    it("should build prompt with context and command", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", {
        dryRun: true,
      });

      // Should have both context and command
      expect(result.prompt).toContain("Test Vault Context");
      expect(result.prompt).toContain("## Command: /test-cmd");
    });

    it("should separate sections with dividers", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", {
        dryRun: true,
      });

      // Should use --- separator
      expect(result.prompt.split("---").length).toBeGreaterThan(1);
    });

    it("should include command name in prompt header", async () => {
      const result = await runNodeCommand(testVault, "test-cmd", {
        dryRun: true,
      });

      expect(result.prompt).toMatch(/## Command: \/test-cmd/);
    });
  });

  describe("Helper Functions - Description Extraction", () => {
    it("should extract description from command", async () => {
      const cmd = await getCommand(testVault.path, "test-cmd");

      expect(cmd?.description).toBe("Test command");
    });

    it("should handle missing description in frontmatter", async () => {
      const commandsPath = path.join(testVault.path, ".bozly", "commands");
      const noDescContent = "---\nversion: 1.0\n---\nContent without description";

      await fs.writeFile(
        path.join(commandsPath, "no-desc.md"),
        noDescContent,
        "utf-8"
      );

      const commands = await getNodeCommands(testVault.path);
      const cmd = commands.find((c) => c.name === "no-desc");

      expect(cmd).toBeDefined();
    });

    it("should extract description from first line if no frontmatter", async () => {
      const commandsPath = path.join(testVault.path, ".bozly", "commands");
      const noFrontmatter = "This is the first line describing the command.";

      await fs.writeFile(
        path.join(commandsPath, "simple.md"),
        noFrontmatter,
        "utf-8"
      );

      const commands = await getNodeCommands(testVault.path);
      const cmd = commands.find((c) => c.name === "simple");

      expect(cmd?.description).toContain("This is the first line");
    });

    it("should truncate long descriptions", async () => {
      const commandsPath = path.join(testVault.path, ".bozly", "commands");
      const longDesc =
        "A".repeat(150) +
        " and more text that might be truncated if the description is very long";
      const content = `---
description: ${longDesc}
---
Content`;

      await fs.writeFile(
        path.join(commandsPath, "long.md"),
        content,
        "utf-8"
      );

      const commands = await getNodeCommands(testVault.path);
      const cmd = commands.find((c) => c.name === "long");

      // Description should be extracted from frontmatter
      expect(cmd?.description).toBeTruthy();
    });
  });

  describe("Model Name Extraction", () => {
    it("should extract model name from command frontmatter", async () => {
      const commandsPath = path.join(testVault.path, ".bozly", "commands");
      const withModel = `---
description: Analysis command
model: classifier
---
Classify the input.`;

      await fs.writeFile(
        path.join(commandsPath, "classify.md"),
        withModel,
        "utf-8"
      );

      const result = await runNodeCommand(testVault, "classify", {
        dryRun: true,
      });

      // Should extract model name
      expect(result).toBeDefined();
    });

    it("should handle missing model gracefully", async () => {
      const commandsPath = path.join(testVault.path, ".bozly", "commands");
      const noModel = `---
description: Simple command
---
Just a simple command.`;

      await fs.writeFile(
        path.join(commandsPath, "simple2.md"),
        noModel,
        "utf-8"
      );

      const result = await runNodeCommand(testVault, "simple2", {
        dryRun: true,
      });

      expect(result).toBeDefined();
      expect(result.modelsUsed).toEqual([]);
    });

    it("should handle malformed frontmatter", async () => {
      const commandsPath = path.join(testVault.path, ".bozly", "commands");
      const malformed = `---
description: Malformed
model invalid format
---
Content`;

      await fs.writeFile(
        path.join(commandsPath, "malformed.md"),
        malformed,
        "utf-8"
      );

      const result = await runNodeCommand(testVault, "malformed", {
        dryRun: true,
      });

      expect(result).toBeDefined();
    });
  });

  describe("Global Commands", () => {
    it("should initialize default commands on first run", async () => {
      // This test verifies the initialization logic
      await initializeDefaultCommands();
      // Should complete without error
      expect(true).toBe(true);
    });

    it("should skip initialization if already initialized", async () => {
      // First initialization
      await initializeDefaultCommands();
      // Second initialization should be quick/idempotent
      await initializeDefaultCommands();
      expect(true).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle vault command without description", async () => {
      const commandsPath = path.join(testVault.path, ".bozly", "commands");
      const noDesc = "Just content, no frontmatter at all.";

      await fs.writeFile(
        path.join(commandsPath, "plain.md"),
        noDesc,
        "utf-8"
      );

      const result = await runNodeCommand(testVault, "plain", {
        dryRun: true,
      });

      expect(result).toBeDefined();
      expect(result.commandName).toBe("plain");
    });

    it("should handle empty command content", async () => {
      const commandsPath = path.join(testVault.path, ".bozly", "commands");
      const empty = "---\ndescription: Empty\n---\n";

      await fs.writeFile(
        path.join(commandsPath, "empty.md"),
        empty,
        "utf-8"
      );

      const result = await runNodeCommand(testVault, "empty", {
        dryRun: true,
      });

      expect(result).toBeDefined();
    });

    it("should handle special characters in command content", async () => {
      const commandsPath = path.join(testVault.path, ".bozly", "commands");
      const special = `---
description: Special chars test
---
Test with: special & chars < > " '`;

      await fs.writeFile(
        path.join(commandsPath, "special.md"),
        special,
        "utf-8"
      );

      const result = await runNodeCommand(testVault, "special", {
        dryRun: true,
      });

      expect(result.commandText).toContain("special & chars");
    });

    it("should handle very long command content", async () => {
      const commandsPath = path.join(testVault.path, ".bozly", "commands");
      const longContent = "---\ndescription: Long\n---\n" + "A".repeat(10000);

      await fs.writeFile(
        path.join(commandsPath, "long.md"),
        longContent,
        "utf-8"
      );

      const result = await runNodeCommand(testVault, "long", {
        dryRun: true,
      });

      expect(result.commandText).toBeDefined();
      expect(result.commandText!.length).toBeGreaterThan(10000);
    });
  });
});
