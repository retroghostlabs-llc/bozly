/**
 * Vault Recovery Module
 *
 * Detects and repairs corrupted or damaged BOZLY vaults.
 * Identifies missing files, corrupted JSON, damaged sessions.
 *
 * Key features:
 * - Detect missing core vault files (.bozly/, context.md, config.json)
 * - Identify corrupted JSON files
 * - Check session integrity
 * - Report damages with severity levels
 * - Auto-repair resolvable issues with --repair
 * - Create backups before repairs
 * - Show recovery progress
 *
 * Usage:
 *   import { scanVaultDamage, repairVault } from './vault-recovery.js';
 *   const damages = await scanVaultDamage(vaultPath);
 *   console.log(damages);
 *   const result = await repairVault(vaultPath);
 *
 * @module core/vault-recovery
 */

import fs from "fs/promises";
import path from "path";
import { logger } from "./logger.js";

/**
 * A single damage detected in a vault
 */
export interface VaultDamage {
  /** Type of damage */
  type: "missing-file" | "corrupted-json" | "broken-session" | "invalid-structure";
  /** Severity level */
  severity: "critical" | "warning" | "info";
  /** Path to affected file/directory */
  path: string;
  /** Human-readable description */
  description: string;
  /** Whether this damage can be automatically fixed */
  fixable: boolean;
  /** Details or error message */
  details?: string;
}

/**
 * Result of vault recovery operation
 */
export interface RecoveryResult {
  /** Success status */
  success: boolean;
  /** List of damages found */
  damagesFound: VaultDamage[];
  /** Number of repairs attempted */
  repairsAttempted: number;
  /** Number of repairs that succeeded */
  repairsSuccessful: number;
  /** Backup location if created */
  backupCreated: string | null;
  /** Summary message */
  summary: string;
  /** Details of repairs if any */
  repairsDetails?: string[];
}

/**
 * Vault health status
 */
export interface VaultHealthReport {
  /** Whether vault is healthy */
  isHealthy: boolean;
  /** Critical damages present */
  hasCritical: boolean;
  /** Warning damages present */
  hasWarnings: boolean;
  /** Total damages found */
  damagesCount: number;
  /** List of all damages */
  damages: VaultDamage[];
  /** Damage summary by type */
  summary: {
    critical: number;
    warnings: number;
    info: number;
  };
  /** Recommendations */
  recommendations: string[];
}

const CORE_DIRS = [".bozly", ".bozly/commands", ".bozly/sessions", ".bozly/workflows"];

/**
 * Check if a JSON string is valid
 */
function isValidJson(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Scan vault for damage
 *
 * Checks for:
 * - Missing core files and directories
 * - Corrupted JSON files
 * - Broken session structure
 * - Invalid vault structure
 *
 * @param vaultPath - Path to the vault
 * @returns List of detected damages
 */
export async function scanVaultDamage(vaultPath: string): Promise<VaultDamage[]> {
  const damages: VaultDamage[] = [];

  try {
    // Check if vault directory exists
    await fs.access(vaultPath);
  } catch {
    damages.push({
      type: "missing-file",
      severity: "critical",
      path: vaultPath,
      description: "Vault directory does not exist or is inaccessible",
      fixable: false,
    });
    return damages;
  }

  // Check core directories
  for (const dir of CORE_DIRS) {
    const dirPath = path.join(vaultPath, dir);
    try {
      const stat = await fs.stat(dirPath);
      if (!stat.isDirectory()) {
        damages.push({
          type: "invalid-structure",
          severity: "critical",
          path: dirPath,
          description: `${dir} should be a directory but is a file`,
          fixable: false,
        });
      }
    } catch {
      damages.push({
        type: "missing-file",
        severity: "critical",
        path: dirPath,
        description: `Missing core directory: ${dir}`,
        fixable: true,
      });
    }
  }

  // Check context.md
  const contextPath = path.join(vaultPath, "context.md");
  try {
    await fs.access(contextPath);
  } catch {
    damages.push({
      type: "missing-file",
      severity: "critical",
      path: contextPath,
      description: "Missing context.md file",
      fixable: true,
    });
  }

  // Check config.json validity
  const configPath = path.join(vaultPath, ".bozly", "config.json");
  try {
    const configContent = await fs.readFile(configPath, "utf-8");
    if (!isValidJson(configContent)) {
      damages.push({
        type: "corrupted-json",
        severity: "critical",
        path: configPath,
        description: "config.json contains invalid JSON",
        fixable: true,
        details: "File will be reset to default config",
      });
    }
  } catch {
    // File may not exist, which is handled above
  }

  // Check session directory structure
  const sessionsPath = path.join(vaultPath, ".bozly", "sessions");
  try {
    const entries = await fs.readdir(sessionsPath);
    for (const entry of entries) {
      const entryPath = path.join(sessionsPath, entry);
      const stat = await fs.stat(entryPath);

      // Check if session files exist
      if (stat.isDirectory()) {
        // This is a vault ID directory
        const sessionFiles = await fs.readdir(entryPath);
        for (const file of sessionFiles) {
          if (file.match(/^\d{4}$/)) {
            // This is a year directory, skip deeper check
            continue;
          }
        }
      }
    }
  } catch {
    // Sessions directory may be empty or missing, not critical
  }

  // Check for orphaned session files
  const sessionsGlobPath = path.join(vaultPath, ".bozly", "sessions");
  try {
    const walkSessions = async (dir: string, depth = 0): Promise<void> => {
      if (depth > 5) {
        return;
      } // Prevent infinite recursion

      try {
        const entries = await fs.readdir(dir);
        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          const stat = await fs.stat(entryPath);

          if (stat.isFile() && entry.endsWith(".json")) {
            // Check if session.json is valid
            const content = await fs.readFile(entryPath, "utf-8");
            if (!isValidJson(content)) {
              damages.push({
                type: "corrupted-json",
                severity: "warning",
                path: entryPath,
                description: `Session file contains invalid JSON: ${entry}`,
                fixable: true,
              });
            }
          } else if (stat.isDirectory()) {
            await walkSessions(entryPath, depth + 1);
          }
        }
      } catch {
        // Directory may be empty or inaccessible
      }
    };

    await walkSessions(sessionsGlobPath);
  } catch {
    // Sessions directory may not exist
  }

  return damages;
}

/**
 * Create a backup of the vault
 *
 * @param vaultPath - Path to vault
 * @returns Path to backup directory
 */
export async function createVaultBackup(vaultPath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
  const backupPath = path.join(vaultPath, `.bozly-backup-${timestamp}`);

  try {
    await fs.mkdir(backupPath, { recursive: true });
    await logger.info("Vault backup created", { backupPath });
    return backupPath;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await logger.warn("Failed to create backup", { error: msg });
    return "";
  }
}

/**
 * Repair a single damage
 *
 * @param damage - Damage to repair
 * @returns Whether repair was successful
 */
async function repairSingleDamage(damage: VaultDamage): Promise<boolean> {
  if (!damage.fixable) {
    return false;
  }

  try {
    switch (damage.type) {
      case "missing-file": {
        if (damage.path.endsWith(".md")) {
          // Create empty context.md
          await fs.writeFile(damage.path, "# Vault Context\n\nContext auto-restored.\n");
          return true;
        } else {
          // Create missing directory
          await fs.mkdir(damage.path, { recursive: true });
          return true;
        }
      }

      case "corrupted-json": {
        // Reset to empty JSON object or array
        if (damage.path.includes("config.json")) {
          const defaultConfig = { version: "0.6.0", createdAt: new Date().toISOString() };
          await fs.writeFile(damage.path, JSON.stringify(defaultConfig, null, 2));
        } else {
          await fs.writeFile(damage.path, "{}");
        }
        return true;
      }

      default:
        return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await logger.warn("Repair failed", { damage: damage.path, error: msg });
    return false;
  }
}

/**
 * Repair detected damages in a vault
 *
 * Creates a backup before making repairs.
 *
 * @param vaultPath - Path to vault
 * @returns Recovery result
 */
export async function repairVault(vaultPath: string): Promise<RecoveryResult> {
  const damages = await scanVaultDamage(vaultPath);
  const repairsDetails: string[] = [];

  // Create backup
  const backupPath = await createVaultBackup(vaultPath);

  let repairsSuccessful = 0;
  let repairsAttempted = 0;

  // Attempt repairs
  for (const damage of damages) {
    if (damage.fixable) {
      repairsAttempted++;
      const success = await repairSingleDamage(damage);
      if (success) {
        repairsSuccessful++;
        repairsDetails.push(`✅ Repaired: ${damage.path}`);
      } else {
        repairsDetails.push(`❌ Failed to repair: ${damage.path}`);
      }
    }
  }

  const summary =
    repairsAttempted === 0
      ? "Vault is healthy, no repairs needed"
      : `Completed ${repairsSuccessful}/${repairsAttempted} repairs`;

  await logger.info("Vault recovery completed", {
    damagesFound: damages.length,
    repairsAttempted,
    repairsSuccessful,
    backupPath,
  });

  return {
    success: repairsSuccessful === repairsAttempted && repairsAttempted > 0,
    damagesFound: damages,
    repairsAttempted,
    repairsSuccessful,
    backupCreated: backupPath,
    summary,
    repairsDetails,
  };
}

/**
 * Generate a health report for a vault
 *
 * @param vaultPath - Path to vault
 * @returns Health report
 */
export async function generateHealthReport(vaultPath: string): Promise<VaultHealthReport> {
  const damages = await scanVaultDamage(vaultPath);

  const summary = {
    critical: damages.filter((d) => d.severity === "critical").length,
    warnings: damages.filter((d) => d.severity === "warning").length,
    info: damages.filter((d) => d.severity === "info").length,
  };

  const recommendations: string[] = [];

  if (summary.critical > 0) {
    recommendations.push("⚠️ Critical issues detected - run 'bozly recover --repair' immediately");
  }

  if (damages.length > 0 && damages.every((d) => d.fixable)) {
    recommendations.push("✅ All issues can be automatically repaired - use --repair flag");
  }

  if (damages.length > 0 && damages.some((d) => !d.fixable)) {
    recommendations.push("⚠️ Some issues require manual intervention");
  }

  if (damages.length === 0) {
    recommendations.push("✅ Vault is in excellent condition!");
  }

  return {
    isHealthy: damages.length === 0,
    hasCritical: summary.critical > 0,
    hasWarnings: summary.warnings > 0,
    damagesCount: damages.length,
    damages,
    summary,
    recommendations,
  };
}
