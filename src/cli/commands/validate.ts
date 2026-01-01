/**
 * bozly validate command
 *
 * Validates vault configuration, context files, and command definitions.
 * Shows pass/fail for 10 different validation checks.
 *
 * Usage:
 *   bozly validate              # Validate current vault
 *   bozly validate --verbose    # Show detailed messages
 */

import { Command } from "commander";
import chalk from "chalk";
import { VaultValidator } from "../../core/validate.js";
import { logger } from "../../core/logger.js";

export const validateCommand = new Command("validate")
  .description("Validate vault configuration and context files")
  .option("-v, --verbose", "Show detailed validation messages")
  .action(async (options: { verbose: boolean }) => {
    try {
      const validator = new VaultValidator();
      const report = await validator.validateVault();

      // Header
      console.log("\n" + chalk.cyan("🔍 VALIDATING VAULT") + `: ${report.vaultName}\n`);

      // Results for each check
      for (let i = 0; i < report.checks.length; i++) {
        const check = report.checks[i];
        let icon = "";

        if (check.level === "pass") {
          icon = chalk.green("✅ PASS");
        } else if (check.level === "fail") {
          icon = chalk.red("❌ FAIL");
        } else {
          icon = chalk.yellow("⚠️  WARN");
        }

        const paddedName = check.name.padEnd(30);
        console.log(`Check ${i + 1}: ${paddedName} ${icon}`);

        if (options.verbose) {
          console.log(`          Description: ${check.description}`);
          console.log(`          Message: ${check.message}`);
          if (check.details) {
            console.log(`          Details: ${check.details}`);
          }
          if (check.fixable) {
            console.log(`          ${chalk.yellow("ℹ️  Fixable with: bozly validate --fix")}`);
          }
          console.log();
        }
      }

      // Summary
      console.log(chalk.gray("═".repeat(43)));
      console.log(
        chalk.white(
          `Results: ${report.passCount}/${report.checks.length} PASS, ${report.failCount} FAIL, ${report.warnCount} WARN`
        )
      );
      console.log(chalk.gray("═".repeat(43)));

      // Warnings section (if any)
      const warnings = report.checks.filter((c) => c.level === "warn");
      if (warnings.length > 0) {
        console.log();
        console.log(chalk.yellow("⚠️  WARNINGS:"));
        for (const warning of warnings) {
          console.log(`  • ${warning.message}${warning.details ? ` (${warning.details})` : ""}`);
        }
      }

      // Failures section (if any)
      const failures = report.checks.filter((c) => c.level === "fail");
      if (failures.length > 0) {
        console.log();
        console.log(chalk.red("❌ FAILURES:"));
        for (const failure of failures) {
          console.log(`  • ${failure.message}${failure.details ? ` (${failure.details})` : ""}`);
        }
      }

      // Final status
      console.log();
      if (report.isValid) {
        console.log(
          chalk.green(
            `✅ VAULT IS VALID${report.warnCount > 0 ? " (warnings only, no critical issues)" : ""}`
          )
        );
      } else {
        console.log(
          chalk.red(
            `❌ VAULT HAS VALIDATION ERRORS - Please fix the above issues before proceeding`
          )
        );
      }

      console.log();

      // Exit with appropriate code
      process.exit(report.isValid ? 0 : 1);
    } catch (error) {
      logger.error("Validation failed", error instanceof Error ? error : new Error(String(error)));
      console.error(
        chalk.red("❌ Validation error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });
