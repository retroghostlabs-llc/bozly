/**
 * Version Management - Single Source of Truth
 *
 * Reads version from package.json at runtime to ensure
 * all components always report the same version.
 *
 * For development builds, appends git commit info to distinguish
 * from official releases:
 *   - Release:    0.6.0
 *   - Dev build:  0.6.0-dev+abc1234
 *   - Dirty dev:  0.6.0-dev+abc1234.dirty
 *
 * @module core/version
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

/**
 * Check if running from a development environment (npm link, local build)
 * vs installed from npm registry
 */
function isDevEnvironment(): boolean {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Check if we're in a git repo (dev environment)
    const gitDir = path.join(__dirname, "../../.git");
    if (fs.existsSync(gitDir)) {
      return true;
    }

    // Check if installed via npm link (symlinked)
    const realPath = fs.realpathSync(__dirname);
    if (realPath !== __dirname) {
      return true;
    }

    // Check for development indicators
    const nodeModulesPath = path.join(__dirname, "../../node_modules");
    const srcPath = path.join(__dirname, "../../src");

    // If both node_modules and src exist, likely dev environment
    if (fs.existsSync(nodeModulesPath) && fs.existsSync(srcPath)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get git commit info for development builds
 */
function getGitInfo(): { hash: string; dirty: boolean } | null {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const repoRoot = path.join(__dirname, "../..");

    // Get short commit hash
    const hash = execSync("git rev-parse --short HEAD", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // Check if working directory is dirty
    const status = execSync("git status --porcelain", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    return {
      hash,
      dirty: status.length > 0,
    };
  } catch {
    return null;
  }
}

/**
 * Get BOZLY version from package.json
 * Uses import.meta.url to locate package.json relative to source
 */
export function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJsonPath = path.join(__dirname, "../../package.json");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as {
      version?: string;
    };
    return packageJson.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Get full version string including dev build info
 *
 * Format:
 *   - Release build:     0.6.0
 *   - Dev build:         0.6.0-dev+abc1234
 *   - Dirty dev build:   0.6.0-dev+abc1234.dirty
 */
export function getFullVersion(): string {
  const baseVersion = getVersion();

  if (!isDevEnvironment()) {
    return baseVersion;
  }

  const gitInfo = getGitInfo();
  if (!gitInfo) {
    return `${baseVersion}-dev`;
  }

  const suffix = gitInfo.dirty ? `.dirty` : "";
  return `${baseVersion}-dev+${gitInfo.hash}${suffix}`;
}

/**
 * Check if this is a development build
 */
export function isDevBuild(): boolean {
  return isDevEnvironment();
}

// Export cached versions for performance
export const VERSION = getVersion();
export const FULL_VERSION = getFullVersion();
export const IS_DEV_BUILD = isDevBuild();
