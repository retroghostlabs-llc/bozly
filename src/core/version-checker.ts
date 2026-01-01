/**
 * Version Checker Module
 *
 * Checks for BOZLY updates and provides version management.
 * Detects current version, checks npm registry for latest version,
 * and guides users through update process.
 *
 * Key features:
 * - Detect current BOZLY version
 * - Check npm registry for latest version
 * - Compare versions and detect available updates
 * - Display changelog information
 * - Guide update installation process
 * - Handle version metadata and timestamps
 *
 * Usage:
 *   import { checkLatestVersion, getUpdateInfo } from './version-checker.js';
 *   const info = await checkLatestVersion();
 *   console.log(info);
 *
 * @module core/version-checker
 */

import { execSync } from "child_process";
import { logger } from "./logger.js";

/**
 * Information about available updates
 */
export interface UpdateInfo {
  /** Current installed version */
  currentVersion: string;
  /** Latest version in npm registry */
  latestVersion: string;
  /** Whether an update is available */
  isUpdateAvailable: boolean;
  /** Version comparison details */
  comparison: "up-to-date" | "out-of-date" | "prerelease";
  /** Changelog/release notes URL */
  changelogUrl: string;
  /** Installation command */
  installCommand: string;
  /** Timestamp of check */
  checkedAt: string;
}

/**
 * Parse semantic version string into components
 *
 * Handles formats like "0.6.0", "v0.6.0-beta.1", "0.6.0+build"
 *
 * @param version - Version string to parse
 * @returns Object with major, minor, patch, prerelease info
 */
function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
  isValid: boolean;
} {
  // Remove 'v' prefix if present
  const cleaned = version.replace(/^v/, "");

  // Split on prerelease
  const [mainPart, prereleasePart] = cleaned.split("-");
  const [major, minor, patch] = mainPart.split(".").map(Number);

  const isValid = !isNaN(major) && !isNaN(minor) && !isNaN(patch);

  return {
    major,
    minor,
    patch,
    prerelease: prereleasePart || null,
    isValid,
  };
}

/**
 * Compare two semantic versions
 *
 * Returns:
 * - -1 if version1 < version2
 * - 0 if version1 == version2
 * - 1 if version1 > version2
 *
 * @param version1 - First version to compare
 * @param version2 - Second version to compare
 * @returns Comparison result (-1, 0, or 1)
 */
function compareVersions(version1: string, version2: string): number {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  if (!v1.isValid || !v2.isValid) {
    return 0; // Can't compare invalid versions
  }

  // Compare major.minor.patch
  if (v1.major !== v2.major) {
    return v1.major < v2.major ? -1 : 1;
  }
  if (v1.minor !== v2.minor) {
    return v1.minor < v2.minor ? -1 : 1;
  }
  if (v1.patch !== v2.patch) {
    return v1.patch < v2.patch ? -1 : 1;
  }

  // Handle prerelease versions
  const hasPrerelease1 = v1.prerelease !== null;
  const hasPrerelease2 = v2.prerelease !== null;

  if (hasPrerelease1 && !hasPrerelease2) {
    return -1; // 1.0.0-beta < 1.0.0
  }
  if (!hasPrerelease1 && hasPrerelease2) {
    return 1; // 1.0.0 > 1.0.0-beta
  }

  if (hasPrerelease1 && hasPrerelease2) {
    // Both are prerelease, compare strings
    const pre1 = v1.prerelease!;
    const pre2 = v2.prerelease!;
    if (pre1 < pre2) {
      return -1;
    } else if (pre1 > pre2) {
      return 1;
    }
  }

  return 0;
}

/**
 * Get latest version from npm registry
 *
 * Queries npm registry for @retroghostlabs/bozly latest version.
 * Falls back to current version if npm check fails.
 *
 * @returns Latest version string from registry
 */
function getLatestVersionFromNpm(): string {
  try {
    const output = execSync("npm view @retroghostlabs/bozly version", {
      stdio: ["pipe", "pipe", "ignore"],
      timeout: 10000, // 10 second timeout
    })
      .toString()
      .trim();

    return output || "unknown";
  } catch (error) {
    // Log error synchronously - npm check failed
    return "unknown";
  }
}

/**
 * Get current BOZLY version
 *
 * Reads version from package.json or version module.
 * Returns "unknown" if version cannot be determined.
 *
 * @returns Current BOZLY version string
 */
export function getCurrentVersion(): string {
  try {
    // Try to get version from package.json
    const output = execSync("npm list @retroghostlabs/bozly --depth=0", {
      stdio: ["pipe", "pipe", "ignore"],
      timeout: 5000,
    })
      .toString()
      .trim();

    // Extract version from output like "@retroghostlabs/bozly@0.6.0-beta.1"
    const match = output.match(/@retroghostlabs\/bozly@([\d\w.-]+)/);
    return match ? match[1] : "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Check for available BOZLY updates
 *
 * Compares current version with latest version from npm registry.
 * Returns detailed update information including installation command.
 *
 * @returns Update information with version comparison results
 */
export async function checkLatestVersion(): Promise<UpdateInfo> {
  try {
    await logger.debug("Checking for BOZLY updates");

    const currentVersion = getCurrentVersion();
    const latestVersion = getLatestVersionFromNpm();

    const comparison = compareVersions(currentVersion, latestVersion);
    const isUpdateAvailable = comparison < 0;

    const v1 = parseVersion(currentVersion);
    const isPrerelease = v1.prerelease !== null;

    let comparisonType: "up-to-date" | "out-of-date" | "prerelease" = "up-to-date";
    if (isPrerelease) {
      comparisonType = "prerelease";
    } else if (isUpdateAvailable) {
      comparisonType = "out-of-date";
    }

    const info: UpdateInfo = {
      currentVersion,
      latestVersion,
      isUpdateAvailable,
      comparison: comparisonType,
      changelogUrl: `https://github.com/RetroGhostLabs/bozly/releases/tag/v${latestVersion}`,
      installCommand: `npm install -g @retroghostlabs/bozly@${latestVersion}`,
      checkedAt: new Date().toISOString(),
    };

    await logger.info("Version check complete", {
      currentVersion,
      latestVersion,
      isUpdateAvailable,
    });

    return info;
  } catch (error) {
    await logger.error("Failed to check version", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Return fallback info on error
    return {
      currentVersion: "unknown",
      latestVersion: "unknown",
      isUpdateAvailable: false,
      comparison: "up-to-date",
      changelogUrl: "https://github.com/RetroGhostLabs/bozly/releases",
      installCommand: "npm install -g @retroghostlabs/bozly",
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Format update check results for display
 *
 * Returns human-readable output showing version information
 * and update status with installation instructions if available.
 *
 * @param info - Update information from checkLatestVersion()
 * @returns Formatted string for display
 */
export function formatUpdateInfo(info: UpdateInfo): string {
  const lines: string[] = [];

  lines.push("\n🔄 BOZLY UPDATE CHECK\n");
  lines.push(`Current Version: ${info.currentVersion}`);
  lines.push(`Latest Version: ${info.latestVersion}\n`);

  if (info.comparison === "up-to-date") {
    lines.push("✅ You are running the latest version!\n");
  } else if (info.comparison === "prerelease") {
    lines.push("🚀 You are running a prerelease version.\n");
    lines.push(`To upgrade to the latest stable release:\n`);
    lines.push(`  ${info.installCommand}\n`);
  } else if (info.isUpdateAvailable) {
    lines.push("⚠️ An update is available!\n");
    lines.push(`To upgrade to v${info.latestVersion}:\n`);
    lines.push(`  ${info.installCommand}\n`);
    lines.push(`Changelog: ${info.changelogUrl}\n`);
  }

  lines.push("═".repeat(50) + "\n");

  return lines.join("\n");
}

/**
 * Format version for simple display
 *
 * Returns just the version string in a simple format.
 *
 * @param version - Version string to format
 * @returns Formatted version string
 */
export function formatVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}
