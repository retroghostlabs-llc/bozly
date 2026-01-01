/**
 * BOZLY Validation Module
 *
 * Validates vault configuration, context files, and command definitions.
 * Focuses on structural integrity and configuration validity.
 *
 * Features:
 * - Validate vault context detection
 * - Check .bozly directory structure
 * - Validate config.json integrity
 * - Check context.md existence and size
 * - Validate command and workflow files
 * - Check vault registry entries
 *
 * @module core/validate
 */

import fs from "fs/promises";
import path from "path";
import { getCurrentNode } from "./node.js";
import { getRegistry } from "./registry.js";

export interface ValidationCheckResult {
  name: string;
  description: string;
  level: "pass" | "fail" | "warn";
  message: string;
  details?: string;
  fixable: boolean;
}

export interface ValidationReport {
  vaultName: string;
  vaultPath: string;
  timestamp: string;
  checks: ValidationCheckResult[];
  passCount: number;
  failCount: number;
  warnCount: number;
  summary: string;
  isValid: boolean;
}

export class VaultValidator {
  constructor() {
    // Vault validation module
  }

  /**
   * Run all validation checks for current vault
   * @param overridePath Optional path to vault (for testing)
   */
  async validateVault(overridePath?: string): Promise<ValidationReport> {
    let vaultName = "unknown";
    let vaultPath = overridePath || process.cwd();

    if (!overridePath) {
      try {
        const currentNode = await getCurrentNode();
        if (currentNode) {
          vaultName = currentNode.name;
          vaultPath = currentNode.path;
        }
      } catch {
        // Vault detection will fail in the first check
      }
    }

    const checks: ValidationCheckResult[] = [];

    // Run all checks
    checks.push(await this.checkVaultDetection(vaultPath));
    checks.push(await this.checkDirectoryStructure(vaultPath));
    checks.push(await this.checkConfigValidity(vaultPath));
    checks.push(await this.checkContextExistence(vaultPath));
    checks.push(await this.checkContextSize(vaultPath));
    checks.push(await this.checkMarkdownStructure(vaultPath));
    checks.push(await this.checkCommandFiles(vaultPath));
    checks.push(await this.checkWorkflowFiles(vaultPath));
    checks.push(await this.checkCommandIndex(vaultPath));
    checks.push(await this.checkRegistryEntry(vaultPath));

    // Calculate statistics
    const passCount = checks.filter((c) => c.level === "pass").length;
    const failCount = checks.filter((c) => c.level === "fail").length;
    const warnCount = checks.filter((c) => c.level === "warn").length;
    const isValid = failCount === 0; // Only pass if no failures (warnings okay)

    let summary = `${passCount}/${checks.length} checks passed`;
    if (warnCount > 0) {
      summary += `, ${warnCount} warning${warnCount > 1 ? "s" : ""}`;
    }
    if (failCount > 0) {
      summary += `, ${failCount} failure${failCount > 1 ? "s" : ""}`;
    }

    return {
      vaultName,
      vaultPath,
      timestamp: new Date().toISOString(),
      checks,
      passCount,
      failCount,
      warnCount,
      summary,
      isValid,
    };
  }

  /**
   * Check 1: Vault Context Detection
   */
  private async checkVaultDetection(vaultPath: string): Promise<ValidationCheckResult> {
    try {
      const bozlyPath = path.join(vaultPath, ".bozly");
      await fs.stat(bozlyPath);

      // Try to get vault name from config
      try {
        const configPath = path.join(bozlyPath, "config.json");
        const content = await fs.readFile(configPath, "utf-8");
        const config = JSON.parse(content);
        const vaultName = config.name || "unknown";

        return {
          name: "Vault Detection",
          description: "Check if we are in a valid vault context",
          level: "pass",
          message: `Vault detected: ${vaultName}`,
          fixable: false,
        };
      } catch {
        // .bozly exists but config might be invalid - still detected
        return {
          name: "Vault Detection",
          description: "Check if we are in a valid vault context",
          level: "pass",
          message: `Vault detected at: ${vaultPath}`,
          fixable: false,
        };
      }
    } catch {
      return {
        name: "Vault Detection",
        description: "Check if we are in a valid vault context",
        level: "fail",
        message: "Not in a vault (no .bozly directory found)",
        fixable: false,
      };
    }
  }

  /**
   * Check 2: .bozly Directory Structure
   */
  private async checkDirectoryStructure(vaultPath: string): Promise<ValidationCheckResult> {
    const requiredDirs = ["commands", "workflows", "sessions", "tasks", "hooks"];
    const bozlyPath = path.join(vaultPath, ".bozly");
    const missing: string[] = [];

    for (const dir of requiredDirs) {
      try {
        const dirPath = path.join(bozlyPath, dir);
        const stat = await fs.stat(dirPath);
        if (!stat.isDirectory()) {
          missing.push(dir);
        }
      } catch {
        missing.push(dir);
      }
    }

    if (missing.length === 0) {
      return {
        name: "Directory Structure",
        description: "Check .bozly directory structure",
        level: "pass",
        message: `All ${requiredDirs.length} required directories present`,
        details: `Directories: ${requiredDirs.join(", ")}`,
        fixable: false,
      };
    }

    return {
      name: "Directory Structure",
      description: "Check .bozly directory structure",
      level: "fail",
      message: `Missing ${missing.length} required directories`,
      details: `Missing: ${missing.join(", ")}`,
      fixable: true,
    };
  }

  /**
   * Check 3: config.json Validity
   */
  private async checkConfigValidity(vaultPath: string): Promise<ValidationCheckResult> {
    const configPath = path.join(vaultPath, ".bozly", "config.json");
    const requiredFields = ["name", "description"];

    try {
      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      const missingFields = requiredFields.filter((f) => !(f in config));

      if (missingFields.length === 0) {
        return {
          name: "config.json Validity",
          description: "Validate config.json structure and required fields",
          level: "pass",
          message: "config.json is valid with all required fields",
          details: `Fields present: ${Object.keys(config).join(", ")}`,
          fixable: false,
        };
      }

      return {
        name: "config.json Validity",
        description: "Validate config.json structure and required fields",
        level: "fail",
        message: "config.json missing required fields",
        details: `Missing: ${missingFields.join(", ")}`,
        fixable: true,
      };
    } catch (error) {
      const isNotFound = error instanceof Error && "code" in error && error.code === "ENOENT";

      return {
        name: "config.json Validity",
        description: "Validate config.json structure and required fields",
        level: "fail",
        message: isNotFound ? "config.json not found" : "config.json is invalid JSON",
        details: isNotFound ? "Create config.json with: bozly add" : "Fix JSON syntax errors",
        fixable: isNotFound,
      };
    }
  }

  /**
   * Check 4: context.md Existence
   */
  private async checkContextExistence(vaultPath: string): Promise<ValidationCheckResult> {
    const contextPath = path.join(vaultPath, ".bozly", "context.md");

    try {
      const stat = await fs.stat(contextPath);
      if (stat.isFile()) {
        return {
          name: "context.md Existence",
          description: "Check context.md file exists",
          level: "pass",
          message: "context.md exists",
          fixable: false,
        };
      }
    } catch {
      // File doesn't exist
    }

    return {
      name: "context.md Existence",
      description: "Check context.md file exists",
      level: "fail",
      message: "context.md not found",
      details: "Create context.md with vault-specific AI context",
      fixable: true,
    };
  }

  /**
   * Check 5: context.md Size
   */
  private async checkContextSize(vaultPath: string): Promise<ValidationCheckResult> {
    const contextPath = path.join(vaultPath, ".bozly", "context.md");
    const sizeLimit = 25 * 1024; // 25 KB
    const warnThreshold = 20 * 1024; // 20 KB

    try {
      const stat = await fs.stat(contextPath);
      const sizeKB = Math.round(stat.size / 1024);

      if (stat.size > sizeLimit) {
        return {
          name: "context.md Size",
          description: "Check context.md size is within limits",
          level: "fail",
          message: `context.md exceeds size limit (${sizeKB}KB / 25KB max)`,
          details: "Run: bozly optimize to reduce context size",
          fixable: false,
        };
      }

      if (stat.size > warnThreshold) {
        return {
          name: "context.md Size",
          description: "Check context.md size is within limits",
          level: "warn",
          message: `context.md approaching size limit (${sizeKB}KB / 25KB limit)`,
          details: "Consider running: bozly optimize",
          fixable: false,
        };
      }

      return {
        name: "context.md Size",
        description: "Check context.md size is within limits",
        level: "pass",
        message: `context.md size is healthy (${sizeKB}KB)`,
        fixable: false,
      };
    } catch (error) {
      const isNotFound = error instanceof Error && "code" in error && error.code === "ENOENT";

      if (isNotFound) {
        // Already checked in previous check
        return {
          name: "context.md Size",
          description: "Check context.md size is within limits",
          level: "pass",
          message: "context.md size check skipped (file not found)",
          fixable: false,
        };
      }

      return {
        name: "context.md Size",
        description: "Check context.md size is within limits",
        level: "fail",
        message: "Failed to check context.md size",
        fixable: false,
      };
    }
  }

  /**
   * Check 6: context.md Markdown Structure
   */
  private async checkMarkdownStructure(vaultPath: string): Promise<ValidationCheckResult> {
    const contextPath = path.join(vaultPath, ".bozly", "context.md");

    try {
      const content = await fs.readFile(contextPath, "utf-8");

      if (!content || content.trim().length === 0) {
        return {
          name: "Markdown Structure",
          description: "Check context.md markdown structure",
          level: "warn",
          message: "context.md is empty",
          details: "Add content to context.md to provide vault context",
          fixable: true,
        };
      }

      // Check for markdown header
      if (!content.includes("#")) {
        return {
          name: "Markdown Structure",
          description: "Check context.md markdown structure",
          level: "warn",
          message: "context.md appears to lack markdown headers",
          details: "Add # Header to structure the document",
          fixable: true,
        };
      }

      return {
        name: "Markdown Structure",
        description: "Check context.md markdown structure",
        level: "pass",
        message: "context.md has valid markdown structure",
        fixable: false,
      };
    } catch (error) {
      const isNotFound = error instanceof Error && "code" in error && error.code === "ENOENT";

      if (isNotFound) {
        // Skip if file doesn't exist (already checked)
        return {
          name: "Markdown Structure",
          description: "Check context.md markdown structure",
          level: "pass",
          message: "context.md structure check skipped (file not found)",
          fixable: false,
        };
      }

      return {
        name: "Markdown Structure",
        description: "Check context.md markdown structure",
        level: "fail",
        message: "Failed to read context.md",
        fixable: false,
      };
    }
  }

  /**
   * Check 7: Command Files Validity
   */
  private async checkCommandFiles(vaultPath: string): Promise<ValidationCheckResult> {
    const commandsPath = path.join(vaultPath, ".bozly", "commands");
    let commandCount = 0;
    let validCount = 0;

    try {
      const entries = await fs.readdir(commandsPath, { withFileTypes: true });
      const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md"));
      commandCount = mdFiles.length;

      for (const file of mdFiles) {
        try {
          const content = await fs.readFile(path.join(commandsPath, file.name), "utf-8");
          // Check for basic command structure (frontmatter or description)
          if (content.includes("---") || content.includes("#")) {
            validCount++;
          }
        } catch {
          // File read error
        }
      }

      if (commandCount === 0) {
        return {
          name: "Command Files",
          description: "Validate command file integrity",
          level: "pass",
          message: "No command files to validate",
          fixable: false,
        };
      }

      if (validCount === commandCount) {
        return {
          name: "Command Files",
          description: "Validate command file integrity",
          level: "pass",
          message: `${commandCount} command files are valid`,
          fixable: false,
        };
      }

      const invalid = commandCount - validCount;
      return {
        name: "Command Files",
        description: "Validate command file integrity",
        level: "warn",
        message: `${invalid}/${commandCount} command files may be malformed`,
        details: "Review command files for proper frontmatter",
        fixable: false,
      };
    } catch (error) {
      const isNotFound = error instanceof Error && "code" in error && error.code === "ENOENT";

      if (isNotFound) {
        return {
          name: "Command Files",
          description: "Validate command file integrity",
          level: "pass",
          message: "No commands directory found (not an error)",
          fixable: false,
        };
      }

      return {
        name: "Command Files",
        description: "Validate command file integrity",
        level: "fail",
        message: "Failed to validate command files",
        fixable: false,
      };
    }
  }

  /**
   * Check 8: Workflow Files Validity
   */
  private async checkWorkflowFiles(vaultPath: string): Promise<ValidationCheckResult> {
    const workflowsPath = path.join(vaultPath, ".bozly", "workflows");
    let workflowCount = 0;
    let validCount = 0;

    try {
      const entries = await fs.readdir(workflowsPath, { withFileTypes: true });
      const jsonFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".json"));
      workflowCount = jsonFiles.length;

      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(workflowsPath, file.name), "utf-8");
          JSON.parse(content); // Validate JSON
          validCount++;
        } catch {
          // JSON parse error
        }
      }

      if (workflowCount === 0) {
        return {
          name: "Workflow Files",
          description: "Validate workflow file integrity",
          level: "pass",
          message: "No workflow files to validate",
          fixable: false,
        };
      }

      if (validCount === workflowCount) {
        return {
          name: "Workflow Files",
          description: "Validate workflow file integrity",
          level: "pass",
          message: `${workflowCount} workflow files are valid`,
          fixable: false,
        };
      }

      const invalid = workflowCount - validCount;
      return {
        name: "Workflow Files",
        description: "Validate workflow file integrity",
        level: "fail",
        message: `${invalid}/${workflowCount} workflow files have invalid JSON`,
        details: "Review workflow files for JSON syntax errors",
        fixable: false,
      };
    } catch (error) {
      const isNotFound = error instanceof Error && "code" in error && error.code === "ENOENT";

      if (isNotFound) {
        return {
          name: "Workflow Files",
          description: "Validate workflow file integrity",
          level: "pass",
          message: "No workflows directory found (not an error)",
          fixable: false,
        };
      }

      return {
        name: "Workflow Files",
        description: "Validate workflow file integrity",
        level: "fail",
        message: "Failed to validate workflow files",
        fixable: false,
      };
    }
  }

  /**
   * Check 9: Command Index Consistency
   */
  private async checkCommandIndex(vaultPath: string): Promise<ValidationCheckResult> {
    const bozlyPath = path.join(vaultPath, ".bozly");
    const indexPath = path.join(bozlyPath, "index.json");
    const commandsPath = path.join(bozlyPath, "commands");

    try {
      const indexContent = await fs.readFile(indexPath, "utf-8");
      const index = JSON.parse(indexContent);

      // Check if index has commands array
      if (Array.isArray(index.commands) && index.commands.length > 0) {
        return {
          name: "Command Index",
          description: "Check command index consistency",
          level: "pass",
          message: `Command index is present with ${index.commands.length} entries`,
          fixable: false,
        };
      }

      return {
        name: "Command Index",
        description: "Check command index consistency",
        level: "warn",
        message: "Command index exists but is empty or malformed",
        details: "Regenerate index with: bozly validate --fix",
        fixable: true,
      };
    } catch (error) {
      const isNotFound = error instanceof Error && "code" in error && error.code === "ENOENT";

      if (isNotFound) {
        // Check if commands directory exists
        try {
          await fs.stat(commandsPath);
          return {
            name: "Command Index",
            description: "Check command index consistency",
            level: "warn",
            message: "Command index not found (regenerate with: bozly validate --fix)",
            details: "Generate index for faster command discovery",
            fixable: true,
          };
        } catch {
          // No commands directory either - that's fine
          return {
            name: "Command Index",
            description: "Check command index consistency",
            level: "pass",
            message: "No command index needed (no commands)",
            fixable: false,
          };
        }
      }

      return {
        name: "Command Index",
        description: "Check command index consistency",
        level: "fail",
        message: "Command index is invalid JSON",
        fixable: false,
      };
    }
  }

  /**
   * Check 10: Vault Registry Entry
   */
  private async checkRegistryEntry(vaultPath: string): Promise<ValidationCheckResult> {
    try {
      const registry = await getRegistry();

      // Check if vault is in registry
      const vaultEntry = registry.nodes?.find(
        (v) => v.path === vaultPath || path.normalize(v.path) === path.normalize(vaultPath)
      );

      if (vaultEntry) {
        return {
          name: "Registry Entry",
          description: "Check vault is registered in framework registry",
          level: "pass",
          message: `Vault registered as: ${vaultEntry.name}`,
          fixable: false,
        };
      }

      return {
        name: "Registry Entry",
        description: "Check vault is registered in framework registry",
        level: "warn",
        message: "Vault not found in registry",
        details: "Register vault with: bozly add",
        fixable: true,
      };
    } catch {
      return {
        name: "Registry Entry",
        description: "Check vault is registered in framework registry",
        level: "warn",
        message: "Could not verify registry entry",
        details: "Check ~/.bozly/bozly-registry.json",
        fixable: false,
      };
    }
  }
}
