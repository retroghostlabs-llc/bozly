import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  detectOldVersion,
  planMigration,
  executeMigration,
  verifyMigration,
  OldVersion,
} from "../../../src/core/vault-migration.js";

describe("vault-migration", () => {
  let tempDir: string;
  let vaultPath: string;

  beforeEach(async () => {
    // Create temporary test directory
    tempDir = path.join(os.tmpdir(), `bozly-migration-test-${Date.now()}`);
    vaultPath = path.join(tempDir, "test-vault");
    await fs.mkdir(vaultPath, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("detectOldVersion", () => {
    it("should detect v0.3.0 (.ai-vault structure)", async () => {
      // Create .ai-vault structure
      await fs.mkdir(path.join(vaultPath, ".ai-vault"), { recursive: true });

      const version = await detectOldVersion(vaultPath);
      expect(version).toBe("v0.3.0");
    });

    it("should detect v0.4.x (.bozly with old config)", async () => {
      // Create .bozly with v0.4.x config
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.4.5" })
      );

      const version = await detectOldVersion(vaultPath);
      expect(version).toBe("v0.4.x");
    });

    it("should detect v0.5.0", async () => {
      // Create .bozly with v0.5.0 config
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.5.0" })
      );

      const version = await detectOldVersion(vaultPath);
      expect(version).toBe("v0.5.0");
    });

    it("should return unknown for current version", async () => {
      // Create current .bozly structure
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.6.0" })
      );

      const version = await detectOldVersion(vaultPath);
      expect(version).toBe("unknown");
    });

    it("should handle missing config gracefully", async () => {
      // Create .bozly without config
      await fs.mkdir(path.join(vaultPath, ".bozly"), { recursive: true });

      const version = await detectOldVersion(vaultPath);
      expect(version).toBe("unknown");
    });

    it("should detect old flat session structure", async () => {
      // Create .bozly with flat sessions (old format)
      const bozlyPath = path.join(vaultPath, ".bozly");
      const sessionsPath = path.join(bozlyPath, "sessions");
      await fs.mkdir(sessionsPath, { recursive: true });

      // Old format: flat session IDs
      await fs.mkdir(path.join(sessionsPath, "session-uuid-1"), { recursive: true });

      const version = await detectOldVersion(vaultPath);
      expect(version).toBe("v0.4.x");
    });
  });

  describe("planMigration", () => {
    it("should plan migration from v0.3.0", async () => {
      // Setup v0.3.0 vault
      await fs.mkdir(path.join(vaultPath, ".ai-vault"), { recursive: true });

      const plan = await planMigration(vaultPath);

      expect(plan.oldVersion).toBe("v0.3.0");
      expect(plan.newVersion).toBe("0.6.0");
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.summary).toContain("v0.3.0");
      expect(plan.safe).toBe(true);
    });

    it("should plan migration from v0.4.x", async () => {
      // Setup v0.4.x vault
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.4.5" })
      );

      const plan = await planMigration(vaultPath);

      expect(plan.oldVersion).toBe("v0.4.x");
      expect(plan.newVersion).toBe("0.6.0");
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.summary).toContain("v0.4.x");
      expect(plan.safe).toBe(true);
    });

    it("should plan migration from v0.5.0", async () => {
      // Setup v0.5.0 vault
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.5.0" })
      );

      const plan = await planMigration(vaultPath);

      expect(plan.oldVersion).toBe("v0.5.0");
      expect(plan.newVersion).toBe("0.6.0");
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.safe).toBe(true);
    });

    it("should mark plan as unsafe for unknown version", async () => {
      // Create current version vault
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.6.0" })
      );

      const plan = await planMigration(vaultPath);

      expect(plan.safe).toBe(false);
      expect(plan.summary).toContain("not detect");
    });

    it("should include backup steps for v0.3.0", async () => {
      // Setup v0.3.0 vault
      await fs.mkdir(path.join(vaultPath, ".ai-vault"), { recursive: true });

      const plan = await planMigration(vaultPath);

      const backupStep = plan.steps.find((s) => s.name.toLowerCase().includes("backup"));
      expect(backupStep).toBeDefined();
      expect(backupStep?.backupFirst).toBe(false);
    });

    it("should include restructure steps for sessions", async () => {
      // Setup v0.4.x vault
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.4.5" })
      );

      const plan = await planMigration(vaultPath);

      const sessionStep = plan.steps.find((s) =>
        s.description.toLowerCase().includes("session")
      );
      expect(sessionStep).toBeDefined();
      expect(sessionStep?.action).toBe("restructure");
    });

    it("should calculate estimated duration", async () => {
      // Setup v0.3.0 vault (longest migration)
      await fs.mkdir(path.join(vaultPath, ".ai-vault"), { recursive: true });

      const plan = await planMigration(vaultPath);

      expect(plan.estimatedDuration).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeLessThan(1000);
    });

    it("should include optional steps", async () => {
      // Setup v0.3.0 vault
      await fs.mkdir(path.join(vaultPath, ".ai-vault"), { recursive: true });

      const plan = await planMigration(vaultPath);

      const optionalSteps = plan.steps.filter((s) => s.optional);
      expect(optionalSteps.length).toBeGreaterThan(0);
    });
  });

  describe("executeMigration", () => {
    it("should return failure for unsafe plan", async () => {
      // Create current version vault
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.6.0" })
      );

      const result = await executeMigration(vaultPath);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should create backup before migration", async () => {
      // Setup v0.4.x vault
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.4.5" })
      );

      const result = await executeMigration(vaultPath);

      expect(result.backupLocation).toBeDefined();
      expect(result.backupLocation).not.toBe("");
    });

    it("should track steps completed", async () => {
      // Setup v0.5.0 vault (simpler migration)
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.5.0" })
      );

      const result = await executeMigration(vaultPath);

      expect(result.stepsCompleted).toBeGreaterThanOrEqual(0);
      expect(result.totalSteps).toBeGreaterThan(0);
    });

    it("should provide migration details", async () => {
      // Setup v0.5.0 vault
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.5.0" })
      );

      const result = await executeMigration(vaultPath);

      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
    });
  });

  describe("verifyMigration", () => {
    it("should verify fully migrated vault", async () => {
      // Create current version vault
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.mkdir(path.join(bozlyPath, "commands"), { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.6.0" })
      );
      await fs.writeFile(path.join(vaultPath, "context.md"), "# Context");

      const report = await verifyMigration(vaultPath);

      expect(report.verified).toBe(true);
      expect(report.isFullyMigrated).toBe(true);
      expect(report.issues.length).toBe(0);
    });

    it("should detect legacy .ai-vault", async () => {
      // Create vault with old .ai-vault
      await fs.mkdir(path.join(vaultPath, ".ai-vault"), { recursive: true });
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.6.0" })
      );

      const report = await verifyMigration(vaultPath);

      expect(report.legacyItems).toContain(".ai-vault");
    });

    it("should detect missing context.md", async () => {
      // Create vault without context.md
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.6.0" })
      );

      const report = await verifyMigration(vaultPath);

      expect(report.issues.some((i) => i.includes("context.md"))).toBe(true);
    });

    it("should detect outdated config version", async () => {
      // Create vault with old config version
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.4.5" })
      );
      await fs.writeFile(path.join(vaultPath, "context.md"), "# Context");

      const report = await verifyMigration(vaultPath);

      expect(report.issues.some((i) => i.includes("version"))).toBe(true);
    });

    it("should provide recommendations", async () => {
      // Create partially migrated vault
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.4.5" })
      );
      await fs.mkdir(path.join(vaultPath, ".ai-vault"), { recursive: true });

      const report = await verifyMigration(vaultPath);

      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it("should succeed for v0.5.0 migration", async () => {
      // Create v0.5.0 vault (should be considered fully migrated)
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(
        path.join(bozlyPath, "config.json"),
        JSON.stringify({ version: "0.5.0" })
      );
      await fs.writeFile(path.join(vaultPath, "context.md"), "# Context");

      const report = await verifyMigration(vaultPath);

      expect(report.isFullyMigrated).toBe(true);
    });

    it("should flag missing .bozly directory", async () => {
      // Create vault without .bozly
      await fs.writeFile(path.join(vaultPath, "context.md"), "# Context");

      const report = await verifyMigration(vaultPath);

      expect(report.issues.some((i) => i.includes(".bozly"))).toBe(true);
    });

    it("should handle invalid config.json", async () => {
      // Create vault with invalid config
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.mkdir(bozlyPath, { recursive: true });
      await fs.writeFile(path.join(bozlyPath, "config.json"), "{invalid json");
      await fs.writeFile(path.join(vaultPath, "context.md"), "# Context");

      const report = await verifyMigration(vaultPath);

      expect(report.issues.some((i) => i.includes("config"))).toBe(true);
    });
  });
});
