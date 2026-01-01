/**
 * BOZLY Diagnostics Module
 *
 * Provides comprehensive health checks for BOZLY framework and vaults.
 * Includes detection, reporting, and auto-fix capabilities.
 *
 * Features:
 * - Check framework installation integrity
 * - Detect missing core files and directories
 * - Validate provider installation status
 * - Check vault registration
 * - Validate context.md size
 * - Auto-fix common issues
 *
 * @module core/diagnostics
 */

import fs from "fs/promises";
import path from "path";
import { getRegistry } from "./registry.js";
import { getCurrentNode } from "./node.js";
import { getInstalledProviders } from "./providers.js";
import { VERSION } from "./version.js";

export interface CheckResult {
  pass: boolean;
  message: string;
  details?: string;
  fixable?: boolean;
}

export interface DiagnosticResult {
  name: string;
  description: string;
  pass: boolean;
  message: string;
  details?: string;
  fixable: boolean;
}

export interface DiagnosticsReport {
  timestamp: string;
  version: string;
  results: DiagnosticResult[];
  passCount: number;
  failCount: number;
  fixableCount: number;
  summary: string;
}

export class FrameworkDiagnostics {
  constructor() {
    // Framework diagnostics module
  }

  /**
   * Run all diagnostic checks
   */
  async runAll(): Promise<DiagnosticsReport> {
    const checks = this.getChecks();
    const results: DiagnosticResult[] = [];

    for (const check of checks) {
      const result = await this.runCheck(check.name);
      results.push(result);
    }

    const passCount = results.filter((r) => r.pass).length;
    const failCount = results.filter((r) => !r.pass).length;
    const fixableCount = results.filter((r) => !r.pass && r.fixable).length;

    let summary = `${passCount}/${results.length} checks passed`;
    if (failCount > 0) {
      summary += `, ${failCount} failed`;
      if (fixableCount > 0) {
        summary += ` (${fixableCount} fixable)`;
      }
    }

    return {
      timestamp: new Date().toISOString(),
      version: VERSION,
      results,
      passCount,
      failCount,
      fixableCount,
      summary,
    };
  }

  /**
   * Run a single diagnostic check by name
   */
  async runCheck(name: string): Promise<DiagnosticResult> {
    const checks = this.getChecks();
    const check = checks.find((c) => c.name === name);

    if (!check) {
      throw new Error(`Unknown check: ${name}`);
    }

    try {
      const result = await check.check();
      return {
        name: check.name,
        description: check.description,
        pass: result.pass,
        message: result.message,
        details: result.details,
        fixable: Boolean(check.fix),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        name: check.name,
        description: check.description,
        pass: false,
        message: `Check failed: ${errorMsg}`,
        fixable: Boolean(check.fix),
      };
    }
  }

  /**
   * Fix all fixable issues
   */
  async fixAll(): Promise<Array<{ check: string; success: boolean; message: string }>> {
    const checks = this.getChecks();
    const results: Array<{ check: string; success: boolean; message: string }> = [];

    for (const check of checks) {
      if (!check.fix) {
        continue;
      }

      try {
        // Only fix if check failed
        const checkResult = await check.check();
        if (checkResult.pass) {
          results.push({
            check: check.name,
            success: true,
            message: "Already passing, no fix needed",
          });
          continue;
        }

        await check.fix();
        results.push({
          check: check.name,
          success: true,
          message: "Fixed successfully",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({
          check: check.name,
          success: false,
          message: `Fix failed: ${errorMsg}`,
        });
      }
    }

    return results;
  }

  /**
   * Get all available checks
   */
  private getChecks(): Array<{
    name: string;
    description: string;
    check: () => Promise<CheckResult>;
    fix?: () => Promise<void>;
  }> {
    // eslint-disable-line no-unused-vars
    return [
      {
        name: "framework-install",
        description: "BOZLY framework is properly installed",
        check: () => this.checkFrameworkInstallation(),
      },
      {
        name: "global-config",
        description: "Global configuration exists (~/.bozly/bozly-config.json)",
        check: () => this.checkGlobalConfig(),
        fix: () => this.fixGlobalConfig(),
      },
      {
        name: "global-registry",
        description: "Global registry exists (~/.bozly/bozly-registry.json)",
        check: () => this.checkGlobalRegistry(),
        fix: () => this.fixGlobalRegistry(),
      },
      {
        name: "current-vault",
        description: "Currently in a valid vault",
        check: () => this.checkCurrentVault(),
      },
      {
        name: "vault-structure",
        description: "Vault has proper structure (.bozly/ directory with config.json, context.md)",
        check: () => this.checkVaultStructure(),
        fix: () => this.fixVaultStructure(),
      },
      {
        name: "context-size",
        description: "Context file is reasonable size (<25KB)",
        check: () => this.checkContextSize(),
      },
      {
        name: "providers",
        description: "At least one AI provider is installed",
        check: () => this.checkProviders(),
      },
      {
        name: "vault-registry",
        description: "Vault is registered in global registry",
        check: () => this.checkVaultRegistry(),
        fix: () => this.fixVaultRegistry(),
      },
    ];
  }

  /**
   * Check: Framework installation
   */
  private async checkFrameworkInstallation(): Promise<CheckResult> {
    try {
      const home = process.env.HOME ?? "";
      const bozlyDir = path.join(home, ".bozly");
      await fs.access(bozlyDir);
      return {
        pass: true,
        message: "BOZLY framework is installed",
      };
    } catch {
      return {
        pass: false,
        message: "BOZLY framework not found",
        details: "Run 'bozly init' in a directory to create a vault",
      };
    }
  }

  /**
   * Check: Global configuration file
   */
  private async checkGlobalConfig(): Promise<CheckResult> {
    try {
      const home = process.env.HOME ?? "";
      const configPath = path.join(home, ".bozly", "bozly-config.json");
      const stat = await fs.stat(configPath);
      return {
        pass: true,
        message: "Global config found",
        details: `Size: ${stat.size} bytes`,
      };
    } catch {
      return {
        pass: false,
        message: "Global config not found",
        details: "This will be created when needed",
      };
    }
  }

  /**
   * Fix: Global configuration
   */
  private async fixGlobalConfig(): Promise<void> {
    const home = process.env.HOME ?? "";
    const configDir = path.join(home, ".bozly");
    const configPath = path.join(configDir, "bozly-config.json");

    await fs.mkdir(configDir, { recursive: true });
    const config = {
      version: VERSION,
      defaultAI: "claude",
      theme: "dark",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Check: Global registry
   */
  private async checkGlobalRegistry(): Promise<CheckResult> {
    try {
      const home = process.env.HOME ?? "";
      const registryPath = path.join(home, ".bozly", "bozly-registry.json");
      const stat = await fs.stat(registryPath);
      return {
        pass: true,
        message: "Global registry found",
        details: `Size: ${stat.size} bytes`,
      };
    } catch {
      return {
        pass: false,
        message: "Global registry not found",
        details: "This will be created when you initialize vaults",
      };
    }
  }

  /**
   * Fix: Global registry
   */
  private async fixGlobalRegistry(): Promise<void> {
    const home = process.env.HOME ?? "";
    const registryDir = path.join(home, ".bozly");
    const registryPath = path.join(registryDir, "bozly-registry.json");

    await fs.mkdir(registryDir, { recursive: true });
    const registry = {
      version: VERSION,
      nodes: [],
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
  }

  /**
   * Check: Current vault exists
   */
  private async checkCurrentVault(): Promise<CheckResult> {
    try {
      const current = await getCurrentNode();
      if (!current) {
        return {
          pass: false,
          message: "Not in a vault directory",
          details: "Run 'bozly init' to create a vault, or 'cd' to an existing vault",
        };
      }
      return {
        pass: true,
        message: `In vault: ${current.name}`,
        details: `Path: ${current.path}`,
      };
    } catch {
      return {
        pass: false,
        message: "Unable to determine current vault",
        details: "Make sure you're in a directory with a .bozly/ folder",
      };
    }
  }

  /**
   * Check: Vault structure
   */
  private async checkVaultStructure(): Promise<CheckResult> {
    try {
      const current = await getCurrentNode();
      if (!current) {
        return {
          pass: false,
          message: "Not in a vault",
          fixable: false,
        };
      }

      const bozlyDir = path.join(current.path, ".bozly");
      const configFile = path.join(bozlyDir, "config.json");
      const contextFile = path.join(bozlyDir, "context.md");

      await fs.access(bozlyDir);
      await fs.access(configFile);
      await fs.access(contextFile);

      return {
        pass: true,
        message: "Vault structure is valid",
        details: `.bozly/config.json and context.md exist`,
      };
    } catch {
      return {
        pass: false,
        message: "Vault structure is incomplete",
        details: "Missing .bozly/config.json or .bozly/context.md",
      };
    }
  }

  /**
   * Fix: Vault structure
   */
  private async fixVaultStructure(): Promise<void> {
    const current = await getCurrentNode();
    if (!current) {
      throw new Error("Not in a vault directory");
    }

    const bozlyDir = path.join(current.path, ".bozly");
    const configFile = path.join(bozlyDir, "config.json");
    const contextFile = path.join(bozlyDir, "context.md");

    // Create directories
    await fs.mkdir(bozlyDir, { recursive: true });
    await fs.mkdir(path.join(bozlyDir, "sessions"), { recursive: true });
    await fs.mkdir(path.join(bozlyDir, "commands"), { recursive: true });
    await fs.mkdir(path.join(bozlyDir, "memory"), { recursive: true });

    // Create missing config
    if (!configFile) {
      const config = {
        name: path.basename(current.path),
        type: "default",
        version: VERSION,
        created: new Date().toISOString(),
        ai: {
          defaultProvider: "claude",
          providers: ["claude"],
        },
      };
      await fs.writeFile(configFile, JSON.stringify(config, null, 2));
    }

    // Create missing context
    if (!contextFile) {
      const context = `# ${path.basename(current.path)} Context

Add context here that will be available to all AI commands in this vault.

## Guidelines
- Keep this file concise (<25KB)
- Use markdown formatting
- This is AI-agnostic (used by Claude, GPT, Gemini, etc.)
`;
      await fs.writeFile(contextFile, context);
    }
  }

  /**
   * Check: Context file size
   */
  private async checkContextSize(): Promise<CheckResult> {
    try {
      const current = await getCurrentNode();
      if (!current) {
        return {
          pass: true,
          message: "Not in a vault (skipped)",
        };
      }

      const contextFile = path.join(current.path, ".bozly", "context.md");
      const stat = await fs.stat(contextFile);
      const sizeKb = stat.size / 1024;

      if (sizeKb > 25) {
        return {
          pass: false,
          message: `Context file is too large (${sizeKb.toFixed(1)}KB)`,
          details: `Recommended: <25KB. Large contexts may slow down AI processing.`,
        };
      }

      return {
        pass: true,
        message: `Context file size is good (${sizeKb.toFixed(1)}KB)`,
      };
    } catch (error) {
      return {
        pass: true,
        message: "Context file not found (will be created)",
      };
    }
  }

  /**
   * Check: Provider installation
   */
  private checkProviders(): Promise<CheckResult> {
    return Promise.resolve(
      (() => {
        try {
          const providers = getInstalledProviders();
          if (providers.length === 0) {
            return {
              pass: false,
              message: "No AI providers installed",
              details: "Install Claude CLI: npm install -g @anthropic-ai/claude-cli",
            };
          }

          return {
            pass: true,
            message: `Providers available: ${providers.map((p: { displayName: string }) => p.displayName).join(", ")}`,
            details: `${providers.length} provider(s) detected`,
          };
        } catch (error) {
          return {
            pass: false,
            message: "Unable to check providers",
            details: String(error),
          };
        }
      })()
    );
  }

  /**
   * Check: Vault is registered
   */
  private async checkVaultRegistry(): Promise<CheckResult> {
    try {
      const current = await getCurrentNode();
      if (!current) {
        return {
          pass: false,
          message: "Not in a vault",
        };
      }

      const registry = await getRegistry();
      const found = registry.nodes.some(
        (n: { path: string }) => path.resolve(n.path) === path.resolve(current.path)
      );

      if (!found) {
        return {
          pass: false,
          message: "Vault is not registered in global registry",
          details: `Run 'bozly add' to register this vault`,
        };
      }

      return {
        pass: true,
        message: `Vault is registered (ID: ${current.id})`,
      };
    } catch (error) {
      return {
        pass: false,
        message: "Unable to check vault registration",
        details: String(error),
      };
    }
  }

  /**
   * Fix: Register vault
   */
  private async fixVaultRegistry(): Promise<void> {
    const current = await getCurrentNode();
    if (!current) {
      throw new Error("Not in a vault directory");
    }

    const registry = await getRegistry();
    const found = registry.nodes.some(
      (n: { path: string }) => path.resolve(n.path) === path.resolve(current.path)
    );

    if (!found) {
      registry.nodes.push({
        id: current.id,
        name: current.name,
        path: current.path,
        type: current.type,
        active: true,
        created: new Date().toISOString(),
      });

      const home = process.env.HOME ?? "";
      const registryPath = path.join(home, ".bozly", "bozly-registry.json");
      registry.lastUpdated = new Date().toISOString();
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    }
  }
}
