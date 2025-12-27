/**
 * Version Management - Single Source of Truth
 *
 * Reads version from package.json at runtime to ensure
 * all components always report the same version.
 *
 * @module core/version
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
    return packageJson.version || "unknown";
  } catch {
    return "unknown";
  }
}

// Export cached version for performance
export const VERSION = getVersion();
