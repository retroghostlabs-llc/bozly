/**
 * Version Management Module (Pattern 4)
 *
 * Manages version tracking and history for BOZLY components:
 * - Model versions (semantic versioning)
 * - Context file versions (change tracking)
 * - Command versions (change tracking)
 * - Framework version compatibility
 *
 * Features:
 * - Semantic version parsing and comparison
 * - Version history tracking with timestamps
 * - Hash-based change detection
 * - Version compatibility checking
 * - Changelog generation
 *
 * Usage:
 *   import { getVersionInfo, compareVersions, trackFileVersion } from './versions.js';
 *   const info = await getVersionInfo(vaultPath);
 *   const isCompatible = compareVersions('1.0.0', '1.0.1') <= 0;
 *   await trackFileVersion(vaultPath, 'context.md', fileHash, changelog);
 *
 * @module core/versions
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { logger } from "./logger.js";
import type { SemVer, ISODateTime, ModelChangelogEntry, Model } from "./types.js";

const VERSIONS_FILE = ".versions.json";

/**
 * Version tracking entry for a file
 */
export interface VersionEntry {
  file: string; // e.g., "context.md", "models/triple-score.yaml", "commands/daily.md"
  hash: string; // SHA256 hash of file content
  timestamp: ISODateTime;
  version?: SemVer; // For versioned files like models
  changes?: string[]; // List of changes in this version
}

/**
 * Version history for a vault
 */
export interface VaultVersionHistory {
  nodeId: string;
  nodeVersion: SemVer;
  created: ISODateTime;
  lastUpdated: ISODateTime;
  frameworkVersion: SemVer;
  files: VersionEntry[];
  models: ModelVersionInfo[];
}

/**
 * Model version information
 */
export interface ModelVersionInfo {
  name: string;
  currentVersion: SemVer;
  hash: string;
  timestamp: ISODateTime;
  changelog?: ModelChangelogEntry[];
  compatibilityNotes?: string;
}

/**
 * Version comparison result
 */
export interface VersionComparisonResult {
  older: SemVer;
  newer: SemVer;
  difference: "major" | "minor" | "patch" | "equal";
  comparison: number; // -1 (older < newer), 0 (equal), 1 (older > newer)
}

/**
 * Framework version info
 */
export interface FrameworkVersionInfo {
  bozlyVersion: SemVer;
  nodeVersion: string;
  platform: string;
}

/**
 * Parse semantic version into components
 *
 * @param version - Semantic version string (e.g., "1.2.3", "1.0.0-alpha.1")
 * @returns Object with major, minor, patch, and prerelease
 */
export function parseSemVer(version: SemVer): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
} {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
}

/**
 * Compare two semantic versions
 *
 * @param v1 - First version
 * @param v2 - Second version
 * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 * @throws Error if version format is invalid
 */
export function compareVersions(v1: SemVer, v2: SemVer): number {
  const parsed1 = parseSemVer(v1);
  const parsed2 = parseSemVer(v2);

  // Compare major
  if (parsed1.major !== parsed2.major) {
    return parsed1.major < parsed2.major ? -1 : 1;
  }

  // Compare minor
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor < parsed2.minor ? -1 : 1;
  }

  // Compare patch
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch < parsed2.patch ? -1 : 1;
  }

  // Compare prerelease (no prerelease > prerelease)
  if (parsed1.prerelease && !parsed2.prerelease) {
    return -1;
  }
  if (!parsed1.prerelease && parsed2.prerelease) {
    return 1;
  }
  if (parsed1.prerelease && parsed2.prerelease) {
    return parsed1.prerelease < parsed2.prerelease ? -1 : 1;
  }

  return 0;
}

/**
 * Get version difference type
 *
 * @param v1 - Earlier version
 * @param v2 - Later version
 * @returns Type of difference: "major", "minor", "patch", or "equal"
 */
export function getVersionDifference(
  v1: SemVer,
  v2: SemVer
): "major" | "minor" | "patch" | "equal" {
  const parsed1 = parseSemVer(v1);
  const parsed2 = parseSemVer(v2);

  if (parsed1.major !== parsed2.major) {
    return "major";
  }
  if (parsed1.minor !== parsed2.minor) {
    return "minor";
  }
  if (parsed1.patch !== parsed2.patch) {
    return "patch";
  }

  return "equal";
}

/**
 * Compute SHA256 hash of file content
 *
 * @param content - File content
 * @returns SHA256 hash
 */
export function computeHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Load version history for a vault
 *
 * @param vaultPath - Path to vault root directory
 * @returns Version history object, or undefined if not found
 */
export async function loadVersionHistory(
  vaultPath: string
): Promise<VaultVersionHistory | undefined> {
  const versionPath = path.join(vaultPath, ".bozly", VERSIONS_FILE);

  try {
    const content = await fs.readFile(versionPath, "utf-8");
    return JSON.parse(content) as VaultVersionHistory;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await logger.debug(`Version history file not found: ${versionPath}`);
      return undefined;
    }
    throw error;
  }
}

/**
 * Save version history for a vault
 *
 * @param vaultPath - Path to vault root directory
 * @param history - Version history object
 */
export async function saveVersionHistory(
  vaultPath: string,
  history: VaultVersionHistory
): Promise<void> {
  const versionPath = path.join(vaultPath, ".bozly", VERSIONS_FILE);

  await logger.debug("Saving version history", {
    vaultPath,
    versionPath,
    filesTracked: history.files.length,
  });

  await fs.writeFile(versionPath, JSON.stringify(history, null, 2), "utf-8");
}

/**
 * Track a file version (context, command, or model)
 *
 * @param vaultPath - Path to vault root directory
 * @param filePath - Relative path to file (e.g., "context.md")
 * @param fileContent - File content for hash computation
 * @param semVersion - Semantic version (optional, for versioned files)
 * @param changes - List of changes (optional)
 */
export async function trackFileVersion(
  vaultPath: string,
  filePath: string,
  fileContent: string,
  semVersion?: SemVer,
  changes?: string[]
): Promise<void> {
  let history = await loadVersionHistory(vaultPath);

  if (!history) {
    history = {
      nodeId: path.basename(vaultPath),
      nodeVersion: "0.1.0",
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      frameworkVersion: "0.3.0",
      files: [],
      models: [],
    };
  }

  const hash = computeHash(fileContent);
  const timestamp = new Date().toISOString();

  // Check if file already exists in history
  const existingIndex = history.files.findIndex((entry) => entry.file === filePath);

  if (existingIndex >= 0) {
    // Update existing entry
    history.files[existingIndex] = {
      file: filePath,
      hash,
      timestamp,
      version: semVersion,
      changes,
    };
  } else {
    // Add new entry
    history.files.push({
      file: filePath,
      hash,
      timestamp,
      version: semVersion,
      changes,
    });
  }

  history.lastUpdated = timestamp;

  await saveVersionHistory(vaultPath, history);

  await logger.debug("File version tracked", {
    filePath,
    hash: hash.substring(0, 8),
    version: semVersion,
  });
}

/**
 * Track model version with changelog
 *
 * @param vaultPath - Path to vault root directory
 * @param model - Model object with version and changelog
 */
export async function trackModelVersion(vaultPath: string, model: Model): Promise<void> {
  let history = await loadVersionHistory(vaultPath);

  if (!history) {
    history = {
      nodeId: path.basename(vaultPath),
      nodeVersion: "0.1.0",
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      frameworkVersion: "0.3.0",
      files: [],
      models: [],
    };
  }

  const hash = model.hash ?? computeHash(JSON.stringify(model));
  const timestamp = new Date().toISOString();

  // Check if model already exists in history
  const existingIndex = history.models.findIndex((entry) => entry.name === model.name);

  const modelInfo: ModelVersionInfo = {
    name: model.name,
    currentVersion: model.version,
    hash,
    timestamp,
    changelog: model.changelog,
  };

  if (existingIndex >= 0) {
    history.models[existingIndex] = modelInfo;
  } else {
    history.models.push(modelInfo);
  }

  history.lastUpdated = timestamp;

  await saveVersionHistory(vaultPath, history);

  await logger.debug("Model version tracked", {
    modelName: model.name,
    version: model.version,
    hash: hash.substring(0, 8),
  });
}

/**
 * Get version information for a vault
 *
 * @param vaultPath - Path to vault root directory
 * @returns Version information or undefined if not available
 */
export async function getVersionInfo(vaultPath: string): Promise<VaultVersionHistory | undefined> {
  return await loadVersionHistory(vaultPath);
}

/**
 * Check if version is compatible with required minimum version
 *
 * @param currentVersion - Current version
 * @param minimumRequired - Minimum required version
 * @returns True if compatible, false otherwise
 */
export function isVersionCompatible(currentVersion: SemVer, minimumRequired: SemVer): boolean {
  return compareVersions(currentVersion, minimumRequired) >= 0;
}

/**
 * Get framework version information
 *
 * @returns Framework version info
 */
export function getFrameworkVersion(): FrameworkVersionInfo {
  return {
    bozlyVersion: "0.3.0-rc.1",
    nodeVersion: process.version,
    platform: process.platform,
  };
}

/**
 * Format version information for display
 *
 * @param history - Version history
 * @returns Formatted string
 */
export function formatVersionInfo(history: VaultVersionHistory): string {
  let output = "";

  output += `Vault Version: ${history.nodeVersion}\n`;
  output += `Framework Version: ${history.frameworkVersion}\n`;
  output += `Last Updated: ${history.lastUpdated}\n\n`;

  if (history.files.length > 0) {
    output += "File Versions:\n";
    for (const file of history.files) {
      output += `  ${file.file}: ${file.version ? file.version : "tracked"} (${file.hash.substring(0, 8)})\n`;
      if (file.changes && file.changes.length > 0) {
        for (const change of file.changes) {
          output += `    • ${change}\n`;
        }
      }
    }
    output += "\n";
  }

  if (history.models.length > 0) {
    output += "Model Versions:\n";
    for (const model of history.models) {
      output += `  ${model.name}: v${model.currentVersion} (${model.hash.substring(0, 8)})\n`;
      if (model.changelog && model.changelog.length > 0) {
        const latestChange = model.changelog[model.changelog.length - 1];
        if (latestChange.changes.length > 0) {
          output += `    Latest changes:\n`;
          for (const change of latestChange.changes.slice(0, 3)) {
            output += `    • ${change}\n`;
          }
        }
      }
    }
  }

  return output;
}

/**
 * Get version history for a specific file
 *
 * @param vaultPath - Path to vault root directory
 * @param filePath - Relative path to file
 * @returns Array of version entries for the file
 */
export async function getFileVersionHistory(
  vaultPath: string,
  filePath: string
): Promise<VersionEntry[]> {
  const history = await loadVersionHistory(vaultPath);
  if (!history) {
    return [];
  }

  return history.files.filter((entry) => entry.file === filePath);
}

/**
 * Get version history for a specific model
 *
 * @param vaultPath - Path to vault root directory
 * @param modelName - Name of the model
 * @returns Model version info or undefined
 */
export async function getModelVersionHistory(
  vaultPath: string,
  modelName: string
): Promise<ModelVersionInfo | undefined> {
  const history = await loadVersionHistory(vaultPath);
  if (!history) {
    return undefined;
  }

  return history.models.find((model) => model.name === modelName);
}

/**
 * Detect if file has changed since last version
 *
 * @param vaultPath - Path to vault root directory
 * @param filePath - Relative path to file
 * @param currentHash - SHA256 hash of current content
 * @returns True if file has changed, false otherwise
 */
export async function hasFileChanged(
  vaultPath: string,
  filePath: string,
  currentHash: string
): Promise<boolean> {
  const history = await loadVersionHistory(vaultPath);
  if (!history) {
    return true; // New file (no history yet)
  }

  const entry = history.files.find((e) => e.file === filePath);
  return !entry || entry.hash !== currentHash;
}

/**
 * Increment semantic version (for automatic versioning)
 *
 * @param version - Current version
 * @param bumpType - What to bump: "major", "minor", or "patch"
 * @returns Next version
 */
export function incrementVersion(version: SemVer, bumpType: "major" | "minor" | "patch"): SemVer {
  const parsed = parseSemVer(version);

  switch (bumpType) {
    case "major":
      parsed.major++;
      parsed.minor = 0;
      parsed.patch = 0;
      break;
    case "minor":
      parsed.minor++;
      parsed.patch = 0;
      break;
    case "patch":
      parsed.patch++;
      break;
  }

  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}
