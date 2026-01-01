/**
 * AI Provider Detection and Version Discovery
 *
 * Detects installed AI provider CLIs and retrieves version information.
 * Used during vault initialization and for provider management.
 *
 * Supports: Claude, GPT, Gemini, Ollama, and custom providers.
 *
 * @module core/provider-detection
 */

import { execSync } from "child_process";
import { listProviders } from "./providers.js";

/**
 * Result of detecting a single provider
 */
export interface DetectedProvider {
  /** Provider name (e.g., 'claude') */
  name: string;
  /** Display name (e.g., 'Claude') */
  displayName: string;
  /** Whether the provider is installed */
  found: boolean;
  /** Version string (if installed), null otherwise */
  version: string | null;
  /** CLI command path (e.g., 'claude') */
  command: string;
  /** Error message if detection failed */
  error?: string;
}

/**
 * Summary of provider detection results
 */
export interface ProviderDetectionResult {
  /** List of detected providers with status */
  providers: DetectedProvider[];
  /** Number of providers found */
  foundCount: number;
  /** Total providers checked */
  totalCount: number;
  /** List of installed provider names */
  installed: string[];
  /** List of not-found provider names */
  notFound: string[];
  /** Timestamp of detection */
  detectedAt: string;
}

/**
 * Get version from provider CLI
 *
 * Tries multiple approaches to get version info:
 * 1. `<command> --version`
 * 2. `<command> -v`
 * 3. `<command> version`
 *
 * @param command - CLI command (e.g., 'claude')
 * @returns Version string or null if detection fails
 */
function getProviderVersion(command: string): string | null {
  const versionCommands = [`${command} --version`, `${command} -v`, `${command} version`];

  for (const versionCmd of versionCommands) {
    try {
      const version = execSync(versionCmd, {
        stdio: ["pipe", "pipe", "ignore"],
        timeout: 5000, // 5 second timeout per attempt
      })
        .toString()
        .trim();

      if (version && version.length > 0) {
        // Clean up version output (remove 'v' prefix, etc)
        return version.replace(/^v/, "").split("\n")[0];
      }
    } catch {
      // Try next version command
    }
  }

  return null;
}

/**
 * Check if a provider CLI is installed
 *
 * Uses `which` (Unix) or `where` (Windows) to check if command exists.
 *
 * @param command - CLI command (e.g., 'claude')
 * @returns True if installed
 */
function isCommandInstalled(command: string): boolean {
  try {
    if (process.platform === "win32") {
      execSync(`where ${command}`, { stdio: "ignore" });
    } else {
      execSync(`which ${command}`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect a single provider
 *
 * Checks if provider CLI is installed and retrieves version info.
 *
 * @param name - Provider name (e.g., 'claude')
 * @param displayName - Display name (e.g., 'Claude')
 * @param command - CLI command (e.g., 'claude')
 * @returns Detection result
 */
function detectProvider(name: string, displayName: string, command: string): DetectedProvider {
  const found = isCommandInstalled(command);
  let version: string | null = null;
  let error: string | undefined;

  if (found) {
    try {
      version = getProviderVersion(command);
    } catch (err) {
      error = `Could not retrieve version: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return {
    name,
    displayName,
    found,
    version,
    command,
    error,
  };
}

/**
 * Detect all configured AI providers
 *
 * Checks system for installed provider CLIs and retrieves versions.
 * Returns comprehensive results including installed vs not-found lists.
 *
 * @returns Complete provider detection results
 */
export function detectAllProviders(): ProviderDetectionResult {
  const providers = listProviders();
  const detected: DetectedProvider[] = [];

  for (const provider of providers) {
    const result = detectProvider(provider.name, provider.displayName, provider.command);
    detected.push(result);
  }

  const installed = detected.filter((p) => p.found).map((p) => p.name);
  const notFound = detected.filter((p) => !p.found).map((p) => p.name);

  return {
    providers: detected,
    foundCount: installed.length,
    totalCount: detected.length,
    installed,
    notFound,
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Detect providers and filter by status
 *
 * @param status - 'installed' or 'notFound'
 * @returns Filtered list of providers
 */
export function getProvidersByStatus(status: "installed" | "notFound"): DetectedProvider[] {
  const result = detectAllProviders();

  if (status === "installed") {
    return result.providers.filter((p) => p.found);
  } else {
    return result.providers.filter((p) => !p.found);
  }
}

/**
 * Format detection results for display
 *
 * Returns human-readable formatted output showing detection results.
 * Used by CLI command to display results to user.
 *
 * @param result - Detection result from detectAllProviders()
 * @param verbose - If true, show detailed output with versions and error messages
 * @returns Formatted string for display
 */
export function formatDetectionResults(
  result: ProviderDetectionResult,
  verbose: boolean = false
): string {
  const lines: string[] = [];

  lines.push("\n🔍 DETECTING AI PROVIDERS\n");
  lines.push("Checking for installed AI CLIs...\n");

  // Show each provider check
  for (let i = 0; i < result.providers.length; i++) {
    const provider = result.providers[i];
    const num = i + 1;
    const status = provider.found ? "✅ FOUND" : "❌ NOT FOUND";
    const versionInfo = provider.version ? ` (v${provider.version})` : "";

    lines.push(`Check ${num}: ${provider.displayName.padEnd(20)} ${status}${versionInfo}`);
  }

  lines.push("\n" + "═".repeat(50));
  lines.push(`Results: ${result.foundCount} provider${result.foundCount === 1 ? "" : "s"} found\n`);

  // Show installed providers
  if (result.installed.length > 0) {
    lines.push("INSTALLED:");
    for (const provider of result.providers.filter((p) => p.found)) {
      const versionInfo = provider.version ? ` (v${provider.version})` : "";
      const readyMsg = provider.version ? "Ready to use" : "Ready to use";
      lines.push(`  • ${provider.name}${versionInfo} — ${readyMsg}`);
    }
    lines.push("");
  }

  // Show not found providers
  if (result.notFound.length > 0) {
    lines.push("NOT INSTALLED:");
    for (const providerName of result.notFound) {
      lines.push(`  • ${providerName}`);
    }
    lines.push("");
  }

  // Verbose mode: show version attempts and details
  if (verbose) {
    lines.push("\n" + "═".repeat(50));
    lines.push("VERBOSE DETAILS:\n");

    for (const provider of result.providers) {
      lines.push(`${provider.displayName} (${provider.name})`);
      lines.push(`  Command: ${provider.command}`);
      lines.push(`  Status: ${provider.found ? "✅ Installed" : "❌ Not installed"}`);
      if (provider.version) {
        lines.push(`  Version: ${provider.version}`);
      }
      if (provider.error) {
        lines.push(`  Error: ${provider.error}`);
      }
      lines.push("");
    }
  }

  lines.push("═".repeat(50) + "\n");

  return lines.join("\n");
}
