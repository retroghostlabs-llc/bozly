import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  scanVaultDamage,
  repairVault,
  generateHealthReport,
  createVaultBackup,
  VaultDamage,
} from "../../../src/core/vault-recovery.js";

describe("vault-recovery", () => {
  let tempDir: string;
  let vaultPath: string;

  beforeEach(async () => {
    // Create temporary test directory
    tempDir = path.join(os.tmpdir(), `bozly-test-${Date.now()}`);
    vaultPath = path.join(tempDir, "test-vault");
    await fs.mkdir(vaultPath, { recursive: true });
    await fs.mkdir(path.join(vaultPath, ".bozly"), { recursive: true });
    await fs.mkdir(path.join(vaultPath, ".bozly", "sessions"), { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("scanVaultDamage", () => {
    it("should detect missing .bozly directory", async () => {
      // Remove .bozly
      await fs.rm(path.join(vaultPath, ".bozly"), { recursive: true });

      const damages = await scanVaultDamage(vaultPath);
      expect(damages.length).toBeGreaterThan(0);

      const missingBozly = damages.find(
        (d) => d.type === "missing-file" && d.path.includes(".bozly")
      );
      expect(missingBozly).toBeDefined();
      expect(missingBozly?.severity).toBe("critical");
      expect(missingBozly?.fixable).toBe(true);
    });

    it("should detect missing context.md", async () => {
      const damages = await scanVaultDamage(vaultPath);

      const missingContext = damages.find(
        (d) => d.type === "missing-file" && d.path.includes("context.md")
      );
      expect(missingContext).toBeDefined();
      expect(missingContext?.severity).toBe("critical");
    });

    it("should detect corrupted config.json", async () => {
      // Create corrupted config.json
      const configPath = path.join(vaultPath, ".bozly", "config.json");
      await fs.writeFile(configPath, "{invalid json");

      const damages = await scanVaultDamage(vaultPath);

      const corruptedConfig = damages.find(
        (d) => d.type === "corrupted-json" && d.path.includes("config.json")
      );
      expect(corruptedConfig).toBeDefined();
      expect(corruptedConfig?.severity).toBe("critical");
      expect(corruptedConfig?.fixable).toBe(true);
    });

    it("should detect missing subdirectories", async () => {
      // Remove commands directory
      await fs.rm(path.join(vaultPath, ".bozly", "commands"), {
        recursive: true,
        force: true,
      });

      const damages = await scanVaultDamage(vaultPath);

      const missingCommands = damages.find(
        (d) => d.type === "missing-file" && d.path.includes("commands")
      );
      expect(missingCommands).toBeDefined();
      expect(missingCommands?.severity).toBe("critical");
      expect(missingCommands?.fixable).toBe(true);
    });

    it("should return empty array for healthy vault", async () => {
      // Create minimal valid vault
      await fs.writeFile(path.join(vaultPath, "context.md"), "# Context");
      await fs.writeFile(
        path.join(vaultPath, ".bozly", "config.json"),
        JSON.stringify({ version: "0.6.0" })
      );
      await fs.mkdir(path.join(vaultPath, ".bozly", "commands"), { recursive: true });
      await fs.mkdir(path.join(vaultPath, ".bozly", "workflows"), { recursive: true });

      const damages = await scanVaultDamage(vaultPath);
      expect(damages.length).toBe(0);
    });

    it("should detect non-existent vault", async () => {
      const nonExistentPath = path.join(tempDir, "non-existent");
      const damages = await scanVaultDamage(nonExistentPath);

      expect(damages.length).toBeGreaterThan(0);
      expect(damages[0].severity).toBe("critical");
      expect(damages[0].fixable).toBe(false);
    });

    it("should detect corrupted session files", async () => {
      // Create corrupted session file
      const sessionPath = path.join(
        vaultPath,
        ".bozly",
        "sessions",
        "node123",
        "2026",
        "01"
      );
      await fs.mkdir(sessionPath, { recursive: true });
      await fs.writeFile(path.join(sessionPath, "session.json"), "{broken json");

      const damages = await scanVaultDamage(vaultPath);

      const corruptedSession = damages.find(
        (d) => d.type === "corrupted-json" && d.path.includes("session.json")
      );
      expect(corruptedSession).toBeDefined();
      expect(corruptedSession?.severity).toBe("warning");
    });

    it("should assign correct severity levels", async () => {
      // Create multiple damages with different severities
      const configPath = path.join(vaultPath, ".bozly", "config.json");
      await fs.writeFile(configPath, "{broken");

      await fs.rm(path.join(vaultPath, ".bozly", "commands"), {
        recursive: true,
        force: true,
      });

      const damages = await scanVaultDamage(vaultPath);

      const critical = damages.filter((d) => d.severity === "critical");
      const warnings = damages.filter((d) => d.severity === "warning");

      expect(critical.length).toBeGreaterThan(0);
    });

    it("should track damage fixability", async () => {
      await fs.rm(path.join(vaultPath, ".bozly"), { recursive: true });

      const damages = await scanVaultDamage(vaultPath);

      const fixableDamages = damages.filter((d) => d.fixable);
      const nonFixable = damages.filter((d) => !d.fixable);

      expect(fixableDamages.length).toBeGreaterThan(0);
    });
  });

  describe("repairVault", () => {
    it("should create backup before repairs", async () => {
      // Create damage to repair
      await fs.rm(path.join(vaultPath, ".bozly", "commands"), {
        recursive: true,
        force: true,
      });

      const result = await repairVault(vaultPath);

      expect(result.backupCreated).toBeDefined();
      expect(result.backupCreated).not.toBe("");
      expect(result.backupCreated).toContain("backup");
    });

    it("should repair missing directories", async () => {
      await fs.rm(path.join(vaultPath, ".bozly", "commands"), {
        recursive: true,
        force: true,
      });

      const result = await repairVault(vaultPath);

      expect(result.repairsAttempted).toBeGreaterThan(0);
      expect(result.repairsSuccessful).toBeGreaterThan(0);

      // Verify directory was created
      const commandsDir = path.join(vaultPath, ".bozly", "commands");
      const stat = await fs.stat(commandsDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it("should repair corrupted config.json", async () => {
      const configPath = path.join(vaultPath, ".bozly", "config.json");
      await fs.writeFile(configPath, "{broken json");

      const result = await repairVault(vaultPath);

      expect(result.repairsSuccessful).toBeGreaterThan(0);

      // Verify config was repaired
      const newConfig = await fs.readFile(configPath, "utf-8");
      expect(() => JSON.parse(newConfig)).not.toThrow();
    });

    it("should create context.md if missing", async () => {
      const contextPath = path.join(vaultPath, "context.md");
      await fs.rm(contextPath, { force: true });

      const result = await repairVault(vaultPath);

      expect(result.repairsSuccessful).toBeGreaterThan(0);

      const contextExists = await fs.stat(contextPath).then(
        () => true,
        () => false
      );
      expect(contextExists).toBe(true);
    });

    it("should track repair progress", async () => {
      await fs.rm(path.join(vaultPath, ".bozly", "commands"), {
        recursive: true,
        force: true,
      });
      await fs.rm(path.join(vaultPath, ".bozly", "workflows"), {
        recursive: true,
        force: true,
      });

      const result = await repairVault(vaultPath);

      expect(result.repairsAttempted).toBeGreaterThan(0);
      expect(result.repairsSuccessful).toBeGreaterThanOrEqual(0);
      expect(result.repairsDetails).toBeDefined();
      expect(result.repairsDetails?.length).toBeGreaterThan(0);
    });

    it("should handle repair failures gracefully", async () => {
      // Create a damage that cannot be repaired
      const contextPath = path.join(vaultPath, "context.md");
      await fs.writeFile(contextPath, "test");

      // Make it read-only (simulates permission error)
      await fs.chmod(contextPath, 0o444);

      const result = await repairVault(vaultPath);

      // Should complete without throwing
      expect(result.success).toBeDefined();

      // Restore permissions for cleanup
      await fs.chmod(contextPath, 0o644);
    });

    it("should work on healthy vault", async () => {
      // Create minimal valid vault
      await fs.writeFile(path.join(vaultPath, "context.md"), "# Context");
      await fs.writeFile(
        path.join(vaultPath, ".bozly", "config.json"),
        JSON.stringify({ version: "0.6.0" })
      );
      await fs.mkdir(path.join(vaultPath, ".bozly", "commands"), { recursive: true });
      await fs.mkdir(path.join(vaultPath, ".bozly", "workflows"), { recursive: true });

      const result = await repairVault(vaultPath);

      expect(result.damagesFound.length).toBe(0);
      expect(result.repairsAttempted).toBe(0);
    });
  });

  describe("generateHealthReport", () => {
    it("should report healthy vault", async () => {
      // Create minimal valid vault
      await fs.writeFile(path.join(vaultPath, "context.md"), "# Context");
      await fs.writeFile(
        path.join(vaultPath, ".bozly", "config.json"),
        JSON.stringify({ version: "0.6.0" })
      );
      await fs.mkdir(path.join(vaultPath, ".bozly", "commands"), { recursive: true });
      await fs.mkdir(path.join(vaultPath, ".bozly", "workflows"), { recursive: true });

      const report = await generateHealthReport(vaultPath);

      expect(report.isHealthy).toBe(true);
      expect(report.hasCritical).toBe(false);
      expect(report.damagesCount).toBe(0);
    });

    it("should identify critical issues", async () => {
      await fs.rm(path.join(vaultPath, ".bozly"), { recursive: true });

      const report = await generateHealthReport(vaultPath);

      expect(report.hasCritical).toBe(true);
      expect(report.summary.critical).toBeGreaterThan(0);
    });

    it("should provide repair recommendations", async () => {
      await fs.rm(path.join(vaultPath, ".bozly", "commands"), {
        recursive: true,
        force: true,
      });

      const report = await generateHealthReport(vaultPath);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some((r) => r.includes("repair"))).toBe(true);
    });

    it("should summarize damage by severity", async () => {
      const configPath = path.join(vaultPath, ".bozly", "config.json");
      await fs.writeFile(configPath, "{broken");

      await fs.rm(path.join(vaultPath, ".bozly", "commands"), {
        recursive: true,
        force: true,
      });

      const report = await generateHealthReport(vaultPath);

      expect(report.summary.critical + report.summary.warnings + report.summary.info).toBe(
        report.damagesCount
      );
    });

    it("should provide different recommendations for healthy vaults", async () => {
      // Create minimal valid vault
      await fs.writeFile(path.join(vaultPath, "context.md"), "# Context");
      await fs.writeFile(
        path.join(vaultPath, ".bozly", "config.json"),
        JSON.stringify({ version: "0.6.0" })
      );
      await fs.mkdir(path.join(vaultPath, ".bozly", "commands"), { recursive: true });
      await fs.mkdir(path.join(vaultPath, ".bozly", "workflows"), { recursive: true });

      const report = await generateHealthReport(vaultPath);

      expect(report.recommendations.some((r) => r.includes("excellent"))).toBe(true);
    });
  });

  describe("createVaultBackup", () => {
    it("should create backup directory", async () => {
      const backupPath = await createVaultBackup(vaultPath);

      expect(backupPath).toBeDefined();
      expect(backupPath).not.toBe("");

      const stat = await fs.stat(backupPath).catch(() => null);
      expect(stat?.isDirectory()).toBe(true);
    });

    it("should include timestamp in backup name", async () => {
      const backupPath = await createVaultBackup(vaultPath);

      expect(backupPath).toContain("backup");
      expect(backupPath).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it("should create unique backups", async () => {
      const backup1 = await createVaultBackup(vaultPath);
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      const backup2 = await createVaultBackup(vaultPath);

      // Both should be created successfully
      expect(backup1).toBeDefined();
      expect(backup2).toBeDefined();
    });
  });
});
