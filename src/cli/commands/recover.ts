/**
 * bozly recover - Recover corrupted vaults
 *
 * Detects and repairs corrupted or damaged BOZLY vaults.
 * Recovers from missing files, corrupted JSON, damaged sessions.
 *
 * Usage:
 *   bozly recover                    # Scan and show issues
 *   bozly recover --repair          # Auto-repair detected issues
 *   bozly recover --detailed        # Show detailed recovery report
 */

import { Command } from "commander";
import chalk from "chalk";
import { repairVault, generateHealthReport, VaultDamage } from "../../core/vault-recovery.js";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";

/**
 * Format damage for display
 */
function formatDamage(damage: VaultDamage): string {
  const icons: Record<string, string> = {
    "missing-file": "📁",
    "corrupted-json": "⚠️",
    "broken-session": "💔",
    "invalid-structure": "❌",
  };

  const severityColors: Record<string, (s: string) => string> = {
    critical: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
  };

  const icon = icons[damage.type] || "❓";
  const severity = severityColors[damage.severity](damage.severity.toUpperCase().padEnd(8));

  return `${icon} ${severity} ${damage.description}
   Path: ${chalk.gray(damage.path)}
   Fixable: ${damage.fixable ? chalk.green("Yes") : chalk.red("No")}${
     damage.details ? `\n   Details: ${damage.details}` : ""
   }`;
}

export const recoverCommand = new Command("recover")
  .description("Detect and repair corrupted BOZLY vaults")
  .option("-r, --repair", "Auto-repair detected issues (creates backup first)")
  .option("-d, --detailed", "Show detailed recovery report")
  .option("-v, --verbose", "Show verbose output")
  .action(async (options: { repair: boolean; detailed: boolean; verbose: boolean }) => {
    try {
      await logger.debug("bozly recover command started", {
        repair: options.repair,
        detailed: options.detailed,
      });

      // Get current vault
      const node = await getCurrentNode();
      if (!node) {
        throw new Error("Not in a BOZLY vault directory. Run 'bozly init' first.");
      }

      console.log();

      if (options.repair) {
        // Repair mode
        console.log(chalk.blue("🔧 Scanning vault for issues..."));
        const result = await repairVault(node.path);

        console.log();

        if (result.damagesFound.length === 0) {
          console.log(chalk.green("✅ Vault is healthy! No issues found."));
        } else {
          console.log(chalk.yellow(`⚠️  Found ${result.damagesFound.length} issue(s):`));
          console.log();

          for (const damage of result.damagesFound) {
            console.log(formatDamage(damage));
            console.log();
          }

          console.log(chalk.blue(`\n🔧 Repair Summary:`));
          console.log(`   Backup created: ${chalk.green(result.backupCreated ?? "N/A")}`);
          console.log(`   Repairs attempted: ${result.repairsAttempted}`);
          console.log(`   Repairs successful: ${chalk.green(result.repairsSuccessful)}`);
          console.log();

          if (result.repairsDetails) {
            for (const detail of result.repairsDetails) {
              console.log(`   ${detail}`);
            }
          }

          console.log();

          if (result.repairsSuccessful === result.repairsAttempted) {
            console.log(chalk.green("✅ Vault successfully repaired!"));
          } else {
            console.log(
              chalk.yellow(
                "⚠️  Some repairs failed. Review issues above and fix manually if needed."
              )
            );
          }
        }

        await logger.info("Vault repair completed", {
          damagesFound: result.damagesFound.length,
          repairsAttempted: result.repairsAttempted,
          repairsSuccessful: result.repairsSuccessful,
          backupPath: result.backupCreated,
        });
      } else {
        // Scan mode
        console.log(chalk.blue("🔍 Scanning vault for issues..."));
        const report = await generateHealthReport(node.path);

        console.log();

        // Health status
        if (report.isHealthy) {
          console.log(chalk.green("✅ Vault is in excellent condition!"));
        } else {
          console.log(
            chalk.yellow(`⚠️  Vault has ${report.damagesCount} issue(s) that need attention`)
          );
        }

        console.log();

        // Summary
        console.log(chalk.blue("📊 Damage Summary:"));
        console.log(`   Critical: ${chalk.red(String(report.summary.critical).padStart(2))}`);
        console.log(`   Warnings: ${chalk.yellow(String(report.summary.warnings).padStart(2))}`);
        console.log(`   Info:     ${chalk.blue(String(report.summary.info).padStart(2))}`);

        console.log();

        // Issues
        if (report.damages.length > 0) {
          console.log(chalk.blue("🔴 Issues Found:"));
          console.log();

          for (const damage of report.damages) {
            console.log(formatDamage(damage));
            console.log();
          }
        }

        // Recommendations
        console.log(chalk.blue("💡 Recommendations:"));
        for (const rec of report.recommendations) {
          console.log(`   ${rec}`);
        }

        if (options.detailed) {
          console.log();
          console.log(chalk.blue("📋 Detailed Report:"));
          console.log(JSON.stringify(report, null, 2));
        }

        if (report.damagesCount > 0) {
          console.log();
          console.log(chalk.blue("💡 Run with --repair to auto-fix issues"));
        }

        await logger.info("Vault scan completed", {
          damagesFound: report.damagesCount,
          hasCritical: report.hasCritical,
          hasWarnings: report.hasWarnings,
          isHealthy: report.isHealthy,
        });
      }

      console.log();
      process.exit(0);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Vault recovery failed", {
        error: errorMsg,
      });

      console.error(chalk.red("❌ Recovery error:"), errorMsg);
      process.exit(1);
    }
  });
