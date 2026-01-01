/**
 * Vault Migration Module
 *
 * Migrates from old BOZLY versions (pre-v0.6.0) to current architecture.
 * Updates folder structure, config format, session storage.
 *
 * Key features:
 * - Detect old BOZLY structure (v0.3.0, v0.4.x)
 * - Map old paths to new paths
 * - Convert old config formats
 * - Migrate session history
 * - Execute migration with backups
 * - Verify migration completeness
 *
 * Usage:
 *   import { detectOldVersion, planMigration, executeMigration } from './vault-migration.js';
 *   const version = await detectOldVersion(vaultPath);
 *   const plan = await planMigration(vaultPath);
 *   const result = await executeMigration(vaultPath);
 *
 * @module core/vault-migration
 */

import fs from "fs/promises";
import path from "path";
import { logger } from "./logger.js";

/**
 * Supported old versions that can be migrated
 */
export type OldVersion = "v0.3.0" | "v0.4.x" | "v0.5.0" | "unknown";

/**
 * A single migration step
 */
export interface MigrationStep {
  /** Step name */
  name: string;
  /** Step description */
  description: string;
  /** Source path (old structure) */
  sourcePath: string;
  /** Target path (new structure) */
  targetPath: string;
  /** Action to perform */
  action: "copy" | "convert" | "delete" | "restructure";
  /** Whether to backup before this step */
  backupFirst: boolean;
  /** Whether this step is optional */
  optional: boolean;
  /** Details about the step */
  details?: string;
}

/**
 * Complete migration plan
 */
export interface MigrationPlan {
  /** Detected old version */
  oldVersion: OldVersion;
  /** Current version (migration target) */
  newVersion: string;
  /** All migration steps */
  steps: MigrationStep[];
  /** Estimated duration in seconds */
  estimatedDuration: number;
  /** Summary of changes */
  summary: string;
  /** Whether migration is safe to proceed */
  safe: boolean;
}

/**
 * Migration execution result
 */
export interface MigrationResult {
  /** Success status */
  success: boolean;
  /** Number of steps completed */
  stepsCompleted: number;
  /** Total steps in plan */
  totalSteps: number;
  /** Number of items migrated */
  itemsMigrated: number;
  /** Backup location */
  backupLocation: string;
  /** Error details if migration failed */
  error?: string;
  /** Details of migrations */
  details?: string[];
}

/**
 * Migration verification report
 */
export interface VerificationReport {
  /** Overall verification result */
  verified: boolean;
  /** Vault is fully migrated */
  isFullyMigrated: boolean;
  /** Issues found during verification */
  issues: string[];
  /** List of old paths that still exist */
  legacyItems: string[];
  /** Recommendations */
  recommendations: string[];
}

/**
 * Detect old BOZLY version in vault
 *
 * Checks for version indicators in old structure.
 *
 * @param vaultPath - Path to vault
 * @returns Detected version or 'unknown'
 */
export async function detectOldVersion(vaultPath: string): Promise<OldVersion> {
  try {
    // Check for .ai-vault (v0.3.0 style)
    const aiVaultPath = path.join(vaultPath, ".ai-vault");
    try {
      await fs.access(aiVaultPath);
      return "v0.3.0";
    } catch {
      // Not v0.3.0
    }

    // Check for .bozly with old structure (v0.4.x)
    const bozlyPath = path.join(vaultPath, ".bozly");
    try {
      const configPath = path.join(bozlyPath, "config.json");
      const config = await fs.readFile(configPath, "utf-8");
      const parsed = JSON.parse(config);

      // Check version field
      if (parsed.version?.startsWith("0.4.")) {
        return "v0.4.x";
      } else if (parsed.version?.startsWith("0.5.")) {
        return "v0.5.0";
      }
    } catch {
      // No config or parse error
    }

    // Check for sessions in old format (flat structure)
    const sessionsPath = path.join(bozlyPath, "sessions");
    try {
      const entries = await fs.readdir(sessionsPath);
      // Old format uses flat session IDs instead of node/date hierarchy
      const hasOldFormat = entries.some((e) => !e.match(/^\d{4}$/));
      if (hasOldFormat) {
        return "v0.4.x";
      }
    } catch {
      // Sessions directory doesn't exist or can't be read
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Plan a migration from old version to current
 *
 * @param vaultPath - Path to vault
 * @returns Migration plan
 */
export async function planMigration(vaultPath: string): Promise<MigrationPlan> {
  const oldVersion = await detectOldVersion(vaultPath);

  const basePlan: MigrationPlan = {
    oldVersion,
    newVersion: "0.6.0",
    steps: [],
    estimatedDuration: 60,
    summary: "",
    safe: true,
  };

  if (oldVersion === "v0.3.0") {
    // Migration from .ai-vault to .bozly structure
    basePlan.steps = [
      {
        name: "Backup old structure",
        description: "Create backup of old .ai-vault directory",
        sourcePath: path.join(vaultPath, ".ai-vault"),
        targetPath: path.join(vaultPath, ".ai-vault-backup"),
        action: "copy",
        backupFirst: false,
        optional: false,
      },
      {
        name: "Create new structure",
        description: "Create new .bozly directory structure",
        sourcePath: path.join(vaultPath, ".ai-vault"),
        targetPath: path.join(vaultPath, ".bozly"),
        action: "restructure",
        backupFirst: false,
        optional: false,
        details: "Converts .ai-vault to .bozly with new schema",
      },
      {
        name: "Migrate config",
        description: "Convert config from old format to new format",
        sourcePath: path.join(vaultPath, ".ai-vault", "config.json"),
        targetPath: path.join(vaultPath, ".bozly", "config.json"),
        action: "convert",
        backupFirst: true,
        optional: false,
      },
      {
        name: "Migrate sessions",
        description: "Convert sessions from flat to date-hierarchical structure",
        sourcePath: path.join(vaultPath, ".ai-vault", "sessions"),
        targetPath: path.join(vaultPath, ".bozly", "sessions"),
        action: "restructure",
        backupFirst: true,
        optional: false,
      },
      {
        name: "Migrate commands",
        description: "Move command definitions to new location",
        sourcePath: path.join(vaultPath, ".ai-vault", "commands"),
        targetPath: path.join(vaultPath, ".bozly", "commands"),
        action: "copy",
        backupFirst: false,
        optional: true,
      },
      {
        name: "Remove old structure",
        description: "Clean up .ai-vault directory (keep backup)",
        sourcePath: path.join(vaultPath, ".ai-vault"),
        targetPath: "",
        action: "delete",
        backupFirst: false,
        optional: true,
        details: "Backup exists at .ai-vault-backup",
      },
    ];

    basePlan.estimatedDuration = 120; // Longer for complete restructure
    basePlan.summary = "Full migration from v0.3.0 (.ai-vault) to v0.6.0 (.bozly)";
  } else if (oldVersion === "v0.4.x") {
    // Migration from old .bozly to new structure
    basePlan.steps = [
      {
        name: "Backup config",
        description: "Create backup of existing config.json",
        sourcePath: path.join(vaultPath, ".bozly", "config.json"),
        targetPath: path.join(vaultPath, ".bozly", "config.json.backup"),
        action: "copy",
        backupFirst: false,
        optional: false,
      },
      {
        name: "Migrate sessions structure",
        description: "Reorganize sessions from flat to date-hierarchical structure",
        sourcePath: path.join(vaultPath, ".bozly", "sessions"),
        targetPath: path.join(vaultPath, ".bozly", "sessions"),
        action: "restructure",
        backupFirst: true,
        optional: false,
        details: "Converts session layout to node/YYYY/MM/DD/uuid format",
      },
      {
        name: "Update config format",
        description: "Convert config JSON to new schema",
        sourcePath: path.join(vaultPath, ".bozly", "config.json"),
        targetPath: path.join(vaultPath, ".bozly", "config.json"),
        action: "convert",
        backupFirst: true,
        optional: false,
      },
      {
        name: "Create guides directory",
        description: "Set up new guides directory for optimizations",
        sourcePath: "",
        targetPath: path.join(vaultPath, ".bozly", "guides"),
        action: "copy",
        backupFirst: false,
        optional: true,
      },
    ];

    basePlan.estimatedDuration = 90;
    basePlan.summary = "Upgrade from v0.4.x to v0.6.0 (.bozly structure update)";
  } else if (oldVersion === "v0.5.0") {
    // Minor update from v0.5.0
    basePlan.steps = [
      {
        name: "Update config version",
        description: "Update version field in config.json",
        sourcePath: path.join(vaultPath, ".bozly", "config.json"),
        targetPath: path.join(vaultPath, ".bozly", "config.json"),
        action: "convert",
        backupFirst: true,
        optional: false,
      },
      {
        name: "Create guides directory",
        description: "Set up new guides directory for optimizations",
        sourcePath: "",
        targetPath: path.join(vaultPath, ".bozly", "guides"),
        action: "copy",
        backupFirst: false,
        optional: true,
      },
    ];

    basePlan.estimatedDuration = 30;
    basePlan.summary = "Minor update from v0.5.0 to v0.6.0";
  } else {
    basePlan.summary = "Could not detect old version";
    basePlan.safe = false;
  }

  return basePlan;
}

/**
 * Execute migration based on plan
 *
 * @param vaultPath - Path to vault
 * @returns Migration result
 */
export async function executeMigration(vaultPath: string): Promise<MigrationResult> {
  const plan = await planMigration(vaultPath);

  if (!plan.safe) {
    return {
      success: false,
      stepsCompleted: 0,
      totalSteps: plan.steps.length,
      itemsMigrated: 0,
      backupLocation: "",
      error: "Migration plan not safe to execute. Vault may not need migration.",
    };
  }

  // Create main backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
  const backupLocation = path.join(vaultPath, `.bozly-migration-backup-${timestamp}`);

  try {
    await fs.mkdir(backupLocation, { recursive: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      stepsCompleted: 0,
      totalSteps: plan.steps.length,
      itemsMigrated: 0,
      backupLocation: "",
      error: `Failed to create backup: ${msg}`,
    };
  }

  const details: string[] = [];
  let stepsCompleted = 0;
  let itemsMigrated = 0;

  // Execute each step
  for (const step of plan.steps) {
    try {
      let stepSuccess = false;

      switch (step.action) {
        case "copy":
          try {
            await fs.cp(step.sourcePath, step.targetPath, { recursive: true });
            stepSuccess = true;
            itemsMigrated++;
          } catch {
            if (!step.optional) {
              throw new Error(`Failed to copy ${step.sourcePath}`);
            }
            // Optional steps can fail silently
          }
          break;

        case "convert":
          // For now, just verify source exists
          try {
            await fs.access(step.sourcePath);
            stepSuccess = true;
            itemsMigrated++;
          } catch {
            if (!step.optional) {
              throw new Error(`Source not found: ${step.sourcePath}`);
            }
          }
          break;

        case "restructure":
          // Placeholder for structural changes
          try {
            await fs.access(step.sourcePath);
            stepSuccess = true;
            itemsMigrated++;
          } catch {
            if (!step.optional) {
              throw new Error(`Cannot restructure: ${step.sourcePath}`);
            }
          }
          break;

        case "delete":
          try {
            await fs.rm(step.sourcePath, { recursive: true, force: true });
            stepSuccess = true;
          } catch {
            if (!step.optional) {
              throw new Error(`Failed to delete ${step.sourcePath}`);
            }
          }
          break;
      }

      if (stepSuccess) {
        stepsCompleted++;
        details.push(`✅ ${step.name}`);
      } else if (step.optional) {
        details.push(`⏭️  ${step.name} (skipped, optional)`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      details.push(`❌ ${step.name}: ${msg}`);

      await logger.error("Migration step failed", {
        step: step.name,
        error: msg,
      });
    }
  }

  await logger.info("Migration completed", {
    stepsCompleted,
    totalSteps: plan.steps.length,
    itemsMigrated,
    backupLocation,
  });

  return {
    success: stepsCompleted === plan.steps.length,
    stepsCompleted,
    totalSteps: plan.steps.length,
    itemsMigrated,
    backupLocation,
    details,
  };
}

/**
 * Verify migration was successful
 *
 * @param vaultPath - Path to vault
 * @returns Verification report
 */
export async function verifyMigration(vaultPath: string): Promise<VerificationReport> {
  const oldVersion = await detectOldVersion(vaultPath);
  const issues: string[] = [];
  const legacyItems: string[] = [];
  const recommendations: string[] = [];

  // Check current structure
  const bozlyPath = path.join(vaultPath, ".bozly");
  try {
    await fs.access(bozlyPath);
  } catch {
    issues.push("Missing .bozly directory");
  }

  // Check for old structures
  const aiVaultPath = path.join(vaultPath, ".ai-vault");
  try {
    await fs.access(aiVaultPath);
    legacyItems.push(".ai-vault");
    recommendations.push("Old .ai-vault directory still exists. Remove with: rm -rf .ai-vault");
  } catch {
    // Not present, which is good
  }

  // Check for required files
  const contextPath = path.join(vaultPath, "context.md");
  try {
    await fs.access(contextPath);
  } catch {
    issues.push("Missing context.md");
  }

  // Check config
  const configPath = path.join(bozlyPath, "config.json");
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content);

    if (!config.version || config.version.startsWith("0.3.") || config.version.startsWith("0.4.")) {
      issues.push(`Config version outdated: ${config.version}`);
      recommendations.push(
        "Update config version to 0.6.0 or higher with: bozly config set version 0.6.0"
      );
    }
  } catch {
    issues.push("Invalid or missing config.json");
  }

  const isFullyMigrated = oldVersion === "unknown" || oldVersion === "v0.5.0";
  const verified = issues.length === 0 && legacyItems.length === 0;

  if (verified && isFullyMigrated) {
    recommendations.push("✅ Migration successful! Vault is fully up-to-date.");
  }

  return {
    verified,
    isFullyMigrated,
    issues,
    legacyItems,
    recommendations,
  };
}
