/**
 * bozly diagnose - Framework and vault health check command
 *
 * Validates BOZLY installation, detects issues, and can auto-fix common problems.
 * Useful for troubleshooting and ensuring framework integrity.
 *
 * Usage:
 *   bozly diagnose              # Show all issues
 *   bozly diagnose --verbose   # Show detailed information
 *   bozly diagnose --fix       # Auto-fix issues
 */

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { FrameworkDiagnostics } from "../../core/diagnostics.js";
import { errorBox } from "../../cli/ui/index.js";

export const diagnoseCommand = new Command("diagnose")
  .description("Check BOZLY framework and vault health")
  .option("-v, --verbose", "Show detailed diagnostic information")
  .option("--fix", "Automatically fix detected issues")
  .action(async (options) => {
    const spinner = ora("Running diagnostics...").start();

    try {
      await logger.debug("bozly diagnose command started", {
        verbose: options.verbose,
        fix: options.fix,
      });

      const diagnostics = new FrameworkDiagnostics();
      const report = await diagnostics.runAll();

      spinner.stop();
      console.log();

      // Display header
      console.log(chalk.bold.cyan("═══════════════════════════════════════════════════════════"));
      console.log(chalk.bold.cyan("  BOZLY FRAMEWORK DIAGNOSTICS"));
      console.log(chalk.bold.cyan("═══════════════════════════════════════════════════════════"));
      console.log();

      // Display summary
      const summaryColor = report.failCount === 0 ? chalk.green : chalk.yellow;
      console.log(summaryColor(`Summary: ${report.summary}`));
      console.log(`Version: ${report.version}`);
      console.log(`Time: ${new Date(report.timestamp).toLocaleString()}`);
      console.log();

      // Display results
      console.log(chalk.bold("Checks:"));
      for (const result of report.results) {
        const icon = result.pass ? chalk.green("✓") : chalk.red("✗");
        const name = chalk.bold(result.name);
        const message = result.pass ? chalk.green(result.message) : chalk.yellow(result.message);

        console.log(`${icon} ${name}: ${message}`);

        if (options.verbose && result.details) {
          console.log(`  ${chalk.gray(result.details)}`);
        }
      }

      console.log();
      console.log(chalk.bold.cyan("═══════════════════════════════════════════════════════════"));
      console.log();

      // Handle --fix option
      if (options.fix && report.failCount > 0) {
        console.log(chalk.blue("Attempting to fix issues..."));
        console.log();

        const fixSpinner = ora("Fixing issues...").start();
        const fixResults = await diagnostics.fixAll();
        fixSpinner.stop();

        console.log(chalk.bold("Fix Results:"));
        for (const result of fixResults) {
          const icon = result.success ? chalk.green("✓") : chalk.red("✗");
          const checkName = chalk.bold(result.check);
          const message = result.success
            ? chalk.green(result.message)
            : chalk.yellow(result.message);

          console.log(`${icon} ${checkName}: ${message}`);
        }

        console.log();

        // Re-run diagnostics after fixes
        const rerunSpinner = ora("Verifying fixes...").start();
        const newReport = await diagnostics.runAll();
        rerunSpinner.stop();

        console.log();
        console.log(chalk.bold("After Fixes:"));
        const newSummaryColor = newReport.failCount === 0 ? chalk.green : chalk.yellow;
        console.log(newSummaryColor(`Summary: ${newReport.summary}`));
        console.log();

        if (newReport.failCount === 0) {
          console.log(chalk.green.bold("✓ All issues fixed! Framework is healthy."));
        } else {
          console.log(
            chalk.yellow.bold(
              `✗ ${newReport.failCount} issue(s) remain. Please address them manually.`
            )
          );
        }
      } else if (report.failCount === 0) {
        console.log(chalk.green.bold("✓ All checks passed! Framework is healthy."));
        if (report.fixableCount > 0) {
          console.log(
            chalk.blue(
              `\nTip: Run 'bozly diagnose --fix' to auto-fix ${report.fixableCount} issue(s).`
            )
          );
        }
      } else if (!options.fix) {
        console.log(chalk.yellow.bold(`⚠ ${report.failCount} issue(s) detected.`));
        if (report.fixableCount > 0) {
          console.log(
            chalk.blue(
              `\nTip: Run 'bozly diagnose --fix' to auto-fix ${report.fixableCount} issue(s).`
            )
          );
        }
      }

      console.log();

      await logger.info("Diagnostics completed", {
        passCount: report.passCount,
        failCount: report.failCount,
        fixableCount: report.fixableCount,
      });

      process.exit(report.failCount === 0 ? 0 : 1);
    } catch (error) {
      spinner.fail("Diagnostic check failed");

      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Diagnostics failed", {
        error: errorMsg,
      });

      console.log();
      console.log(errorBox("Diagnostic check failed", { error: errorMsg }));
      process.exit(1);
    }
  });
