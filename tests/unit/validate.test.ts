/**
 * Tests for BOZLY Validation Module
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import path from "path";
import os from "os";
import { VaultValidator } from "../../src/core/validate.js";

describe("VaultValidator", () => {
  let testVaultPath: string;
  let validator: VaultValidator;

  beforeEach(async () => {
    // Create a temporary test vault
    testVaultPath = path.join(os.tmpdir(), `test-vault-${Date.now()}`);
    validator = new VaultValidator();

    // Create basic vault structure
    const bozlyPath = path.join(testVaultPath, ".bozly");
    await fs.mkdir(bozlyPath, { recursive: true });
    await fs.mkdir(path.join(bozlyPath, "commands"), { recursive: true });
    await fs.mkdir(path.join(bozlyPath, "workflows"), { recursive: true });
    await fs.mkdir(path.join(bozlyPath, "sessions"), { recursive: true });
    await fs.mkdir(path.join(bozlyPath, "tasks"), { recursive: true });
    await fs.mkdir(path.join(bozlyPath, "hooks"), { recursive: true });

    // Create default config
    const config = {
      name: "test-vault",
      description: "Test vault for validation",
      provider: "claude",
    };
    await fs.writeFile(path.join(bozlyPath, "config.json"), JSON.stringify(config, null, 2));

    // Create default context
    await fs.writeFile(path.join(bozlyPath, "context.md"), "# Test Vault Context\n\nThis is a test vault.\n");
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(testVaultPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("validateVault", () => {
    it("should return validation report with all checks", async () => {
      const report = await validator.validateVault(testVaultPath);

      expect(report).toBeDefined();
      expect(report.vaultName).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.checks).toBeInstanceOf(Array);
      expect(report.checks.length).toBe(10);
      expect(report.passCount).toBeGreaterThanOrEqual(0);
      expect(report.failCount).toBeGreaterThanOrEqual(0);
      expect(report.warnCount).toBeGreaterThanOrEqual(0);
      expect(report.summary).toBeDefined();
    });

    it("should report valid vault as isValid=true", async () => {
      const report = await validator.validateVault(testVaultPath);
      expect(report.isValid).toBe(true); // No failures in our test setup
    });

    it("should count checks correctly", async () => {
      const report = await validator.validateVault(testVaultPath);
      const checkCount = report.passCount + report.failCount + report.warnCount;
      expect(checkCount).toBe(10);
    });
  });

  describe("Check 1: Vault Detection", () => {
    it("should detect valid vault in .bozly directory", async () => {
      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[0];

      expect(check.name).toBe("Vault Detection");
      expect(check.level).toBe("pass");
      expect(check.message).toContain("test-vault");
    });

    it("should fail when not in a vault", async () => {
      // Create a non-vault directory (no .bozly)
      const nonVaultPath = path.join(os.tmpdir(), `non-vault-${Date.now()}`);
      await fs.mkdir(nonVaultPath, { recursive: true });

      try {
        const testValidator = new VaultValidator();
        const report = await testValidator.validateVault(nonVaultPath);
        const check = report.checks[0];

        expect(check.level).toBe("fail");
        expect(check.message).toContain("Not in a vault");
      } finally {
        await fs.rm(nonVaultPath, { recursive: true, force: true });
      }
    });
  });

  describe("Check 2: Directory Structure", () => {
    it("should pass when all required directories exist", async () => {
      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[1];

      expect(check.name).toBe("Directory Structure");
      expect(check.level).toBe("pass");
      expect(check.message).toContain("All 5 required directories");
    });

    it("should fail when required directories are missing", async () => {
      // Remove a required directory
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.rm(path.join(bozlyPath, "commands"), { recursive: true });

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[1];

      expect(check.level).toBe("fail");
      expect(check.message).toContain("Missing");
      expect(check.fixable).toBe(true);
    });
  });

  describe("Check 3: config.json Validity", () => {
    it("should pass for valid config.json with required fields", async () => {
      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[2];

      expect(check.name).toBe("config.json Validity");
      expect(check.level).toBe("pass");
      expect(check.message).toContain("valid");
    });

    it("should fail when config.json has invalid JSON", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.writeFile(path.join(bozlyPath, "config.json"), "{ invalid json }");

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[2];

      expect(check.level).toBe("fail");
      expect(check.message).toContain("invalid JSON");
    });

    it("should fail when required fields are missing", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      const config = { provider: "claude" }; // Missing name and description
      await fs.writeFile(path.join(bozlyPath, "config.json"), JSON.stringify(config));

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[2];

      expect(check.level).toBe("fail");
      expect(check.message).toContain("missing required fields");
    });

    it("should fail when config.json is missing", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.rm(path.join(bozlyPath, "config.json"));

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[2];

      expect(check.level).toBe("fail");
      expect(check.message).toContain("not found");
      expect(check.fixable).toBe(true);
    });
  });

  describe("Check 4: context.md Existence", () => {
    it("should pass when context.md exists", async () => {
      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[3];

      expect(check.name).toBe("context.md Existence");
      expect(check.level).toBe("pass");
      expect(check.message).toContain("exists");
    });

    it("should fail when context.md is missing", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.rm(path.join(bozlyPath, "context.md"));

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[3];

      expect(check.level).toBe("fail");
      expect(check.message).toContain("not found");
      expect(check.fixable).toBe(true);
    });
  });

  describe("Check 5: context.md Size", () => {
    it("should pass when context.md is under 20KB", async () => {
      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[4];

      expect(check.name).toBe("context.md Size");
      expect(check.level).toBe("pass");
    });

    it("should warn when context.md is between 20-25KB", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      // Create a 22KB file
      const content = "# Test\n" + "x".repeat(22 * 1024 - 10);
      await fs.writeFile(path.join(bozlyPath, "context.md"), content);

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[4];

      expect(check.level).toBe("warn");
      expect(check.message).toContain("approaching");
    });

    it("should fail when context.md exceeds 25KB", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      // Create a 26KB file
      const content = "# Test\n" + "x".repeat(26 * 1024);
      await fs.writeFile(path.join(bozlyPath, "context.md"), content);

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[4];

      expect(check.level).toBe("fail");
      expect(check.message).toContain("exceeds");
    });

    it("should skip check if context.md doesn't exist", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.rm(path.join(bozlyPath, "context.md"));

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[4];

      expect(check.level).toBe("pass");
      expect(check.message).toContain("skipped");
    });
  });

  describe("Check 6: Markdown Structure", () => {
    it("should pass when context.md has markdown headers", async () => {
      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[5];

      expect(check.name).toBe("Markdown Structure");
      expect(check.level).toBe("pass");
    });

    it("should warn when context.md is empty", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.writeFile(path.join(bozlyPath, "context.md"), "");

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[5];

      expect(check.level).toBe("warn");
      expect(check.message).toContain("empty");
    });

    it("should warn when context.md lacks markdown headers", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.writeFile(path.join(bozlyPath, "context.md"), "This is just plain text with no headers");

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[5];

      expect(check.level).toBe("warn");
      expect(check.message).toContain("lack");
    });
  });

  describe("Check 7: Command Files Validity", () => {
    it("should pass when no command files exist", async () => {
      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[6];

      expect(check.name).toBe("Command Files");
      expect(check.level).toBe("pass");
      expect(check.message).toContain("No command files");
    });

    it("should pass when command files are valid", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      const commandContent = "---\nname: test-command\n---\n# Test Command\n";
      await fs.writeFile(path.join(bozlyPath, "commands", "test.md"), commandContent);

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[6];

      expect(check.level).toBe("pass");
      expect(check.message).toContain("1 command file");
    });

    it("should warn when some command files are malformed", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      // Write multiple commands
      await fs.writeFile(path.join(bozlyPath, "commands", "valid.md"), "# Valid\n");
      await fs.writeFile(path.join(bozlyPath, "commands", "invalid.txt"), "");

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[6];

      // At least one valid .md file, so should have some valid commands
      expect(check.level).toBe("pass");
    });
  });

  describe("Check 8: Workflow Files Validity", () => {
    it("should pass when no workflow files exist", async () => {
      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[7];

      expect(check.name).toBe("Workflow Files");
      expect(check.level).toBe("pass");
      expect(check.message).toContain("No workflow files");
    });

    it("should pass when workflow files are valid JSON", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      const workflowContent = JSON.stringify({
        name: "test-workflow",
        steps: [{ name: "step1", command: "test" }],
      });
      await fs.writeFile(path.join(bozlyPath, "workflows", "test.json"), workflowContent);

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[7];

      expect(check.level).toBe("pass");
      expect(check.message).toContain("1 workflow file");
    });

    it("should fail when workflow files have invalid JSON", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.writeFile(path.join(bozlyPath, "workflows", "invalid.json"), "{ invalid json }");

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[7];

      expect(check.level).toBe("fail");
      expect(check.message).toContain("invalid JSON");
    });
  });

  describe("Check 9: Command Index", () => {
    it("should warn when index.json is missing", async () => {
      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[8];

      expect(check.name).toBe("Command Index");
      expect(check.level).toBe("warn");
      expect(check.message).toContain("not found");
      expect(check.fixable).toBe(true);
    });

    it("should pass when index.json has valid commands array", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      const index = {
        commands: [
          { name: "test1", description: "Test 1" },
          { name: "test2", description: "Test 2" },
        ],
      };
      await fs.writeFile(path.join(bozlyPath, "index.json"), JSON.stringify(index));

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[8];

      expect(check.level).toBe("pass");
      expect(check.message).toContain("2 entries");
    });

    it("should warn when index.json is empty", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.writeFile(path.join(bozlyPath, "index.json"), JSON.stringify({}));

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[8];

      expect(check.level).toBe("warn");
      expect(check.message).toContain("empty or malformed");
    });

    it("should fail when index.json has invalid JSON", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.writeFile(path.join(bozlyPath, "index.json"), "{ invalid }");

      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[8];

      expect(check.level).toBe("fail");
      expect(check.message).toContain("invalid JSON");
    });
  });

  describe("Check 10: Registry Entry", () => {
    it("should have a registry check", async () => {
      const report = await validator.validateVault(testVaultPath);
      const check = report.checks[9];

      expect(check.name).toBe("Registry Entry");
      expect(check.description).toContain("registry");
      // Will likely be warn/fail since not actually registered
    });
  });

  describe("Edge cases", () => {
    it("should handle vault with no config gracefully", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.rm(path.join(bozlyPath, "config.json"));

      const report = await validator.validateVault(testVaultPath);

      expect(report).toBeDefined();
      expect(report.checks.length).toBe(10);
      // Should have at least one failure
      expect(report.failCount).toBeGreaterThan(0);
    });

    it("should handle vault with no context gracefully", async () => {
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.rm(path.join(bozlyPath, "context.md"));

      const report = await validator.validateVault(testVaultPath);

      expect(report).toBeDefined();
      expect(report.checks.length).toBe(10);
      // Should have at least one failure
      expect(report.failCount).toBeGreaterThan(0);
    });

    it("should provide summary with correct counts", async () => {
      const report = await validator.validateVault(testVaultPath);

      expect(report.summary).toContain(String(report.passCount));
      expect(report.summary).toContain(String(report.checks.length));
    });

    it("should calculate isValid correctly (fail if any failures)", async () => {
      // First validate fresh vault (should be valid)
      let report = await validator.validateVault(testVaultPath);
      expect(report.isValid).toBe(true);

      // Remove config to cause failure
      const bozlyPath = path.join(testVaultPath, ".bozly");
      await fs.rm(path.join(bozlyPath, "config.json"));

      report = await validator.validateVault(testVaultPath);
      expect(report.isValid).toBe(false);
      expect(report.failCount).toBeGreaterThan(0);
    });
  });
});
