/**
 * bozly migrate - Migrate from old BOZLY versions
 *
 * Migrates from old BOZLY versions (pre-v0.6.0) to current architecture.
 * Updates folder structure, config format, session storage.
 *
 * Usage:
 *   bozly migrate                   # Analyze migration needs
 *   bozly migrate --execute         # Execute migration
 *   bozly migrate --verify          # Verify migration success
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  detectOldVersion,
  planMigration,
  executeMigration,
  verifyMigration,
} from "../../core/vault-migration.js";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";

export const migrateCommand = new Command("migrate")
  .description("Migrate vault from old BOZLY versions to current architecture")
  .option("-e, --execute", "Execute the migration (creates backup first)")
  .option("-v, --verify", "Verify migration was successful")
  .action(async (options: { execute: boolean; verify: boolean }) => {
    try {
      await logger.debug("bozly migrate command started", {
        execute: options.execute,
        verify: options.verify,
      });

      // Get current vault
      const node = await getCurrentNode();
      if (!node) {
        throw new Error("Not in a BOZLY vault directory. Run 'bozly init' first.");
      }

      console.log();

      if (options.verify) {
        // Verify migration
        console.log(chalk.blue("🔍 Verifying migration..."));
        const report = await verifyMigration(node.path);

        console.log();

        if (report.verified) {
          console.log(chalk.green("✅ Migration verification passed!"));
        } else {
          console.log(chalk.yellow("⚠️  Migration verification found issues:"));
        }

        console.log();

        // Issues
        if (report.issues.length > 0) {
          console.log(chalk.red("🔴 Issues Found:"));
          for (const issue of report.issues) {
            console.log(`   ❌ ${issue}`);
          }
          console.log();
        }

        // Legacy items
        if (report.legacyItems.length > 0) {
          console.log(chalk.yellow("🟡 Legacy Items:"));
          for (const item of report.legacyItems) {
            console.log(`   📁 ${item}`);
          }
          console.log();
        }

        // Recommendations
        if (report.recommendations.length > 0) {
          console.log(chalk.blue("💡 Recommendations:"));
          for (const rec of report.recommendations) {
            console.log(`   ${rec}`);
          }
        }

        console.log();

        if (report.isFullyMigrated) {
          console.log(chalk.green("✅ Vault is fully migrated to current version!"));
        }

        await logger.info("Migration verification completed", {
          verified: report.verified,
          isFullyMigrated: report.isFullyMigrated,
          issuesCount: report.issues.length,
        });
      } else if (options.execute) {
        // Execute migration
        console.log(chalk.blue("🔄 Planning migration..."));
        const plan = await planMigration(node.path);

        console.log();
        console.log(chalk.blue("📋 Migration Plan:"));
        console.log(`   From: ${plan.oldVersion}`);
        console.log(`   To:   ${plan.newVersion}`);
        console.log(`   Steps: ${plan.steps.length}`);
        console.log(`   Summary: ${plan.summary}`);
        console.log();

        if (!plan.safe) {
          console.log(chalk.yellow("⚠️  Migration plan indicates vault may not need migration."));
          console.log(chalk.blue("💡 Run without flags to analyze migration needs."));
          console.log();
          process.exit(0);
        }

        console.log(chalk.blue("⏳ Executing migration..."));
        console.log();

        const result = await executeMigration(node.path);

        if (result.success) {
          console.log(chalk.green("✅ Migration completed successfully!"));
        } else {
          console.log(chalk.red("❌ Migration encountered issues:"));
          if (result.error) {
            console.log(chalk.red(`   Error: ${result.error}`));
          }
        }

        console.log();
        console.log(chalk.blue("📊 Migration Summary:"));
        console.log(`   Steps completed: ${result.stepsCompleted}/${result.totalSteps}`);
        console.log(`   Items migrated: ${result.itemsMigrated}`);
        console.log(`   Backup location: ${result.backupLocation}`);
        console.log();

        if (result.details) {
          console.log(chalk.blue("📋 Details:"));
          for (const detail of result.details) {
            console.log(`   ${detail}`);
          }
        }

        console.log();

        if (result.success) {
          console.log(chalk.green("✅ Vault successfully migrated!"));
          console.log(
            chalk.blue("💡 Run 'bozly migrate --verify' to confirm migration completeness.")
          );
        } else {
          console.log(chalk.yellow("⚠️  Some migration steps did not complete."));
          console.log(chalk.blue("💡 Review issues above and try again."));
        }

        await logger.info("Migration executed", {
          success: result.success,
          stepsCompleted: result.stepsCompleted,
          totalSteps: result.totalSteps,
          itemsMigrated: result.itemsMigrated,
          backupLocation: result.backupLocation,
        });
      } else {
        // Analyze mode
        console.log(chalk.blue("🔍 Analyzing migration needs..."));
        const oldVersion = await detectOldVersion(node.path);

        console.log();

        if (oldVersion === "unknown") {
          console.log(
            chalk.green("✅ Vault appears to be on current version (no migration needed).")
          );
          console.log();
          process.exit(0);
        }

        console.log(chalk.yellow(`⚠️  Detected old BOZLY version: ${oldVersion}`));
        console.log();

        const plan = await planMigration(node.path);

        console.log(chalk.blue("📋 Migration Plan:"));
        console.log(`   From:   ${plan.oldVersion}`);
        console.log(`   To:     ${plan.newVersion}`);
        console.log(`   Steps:  ${plan.steps.length}`);
        console.log(`   Summary: ${plan.summary}`);
        console.log();

        console.log(chalk.blue("📝 Steps:"));
        for (let i = 0; i < plan.steps.length; i++) {
          const step = plan.steps[i];
          const num = String(i + 1).padStart(2, "0");
          const optional = step.optional ? chalk.gray(" (optional)") : "";
          console.log(`   ${num}. ${step.name}${optional}`);
          console.log(`      ${step.description}`);
          if (step.details) {
            console.log(`      ${chalk.gray(step.details)}`);
          }
        }

        console.log();
        console.log(chalk.blue("⏱️  Estimated duration: ~${plan.estimatedDuration} seconds"));

        console.log();
        console.log(chalk.blue("💡 To execute migration, run:"));
        console.log(chalk.gray("   bozly migrate --execute"));

        console.log();
        console.log(chalk.blue("💡 To verify existing migration, run:"));
        console.log(chalk.gray("   bozly migrate --verify"));

        await logger.info("Migration analysis completed", {
          detectedVersion: oldVersion,
          stepsCount: plan.steps.length,
          safe: plan.safe,
        });
      }

      console.log();
      process.exit(0);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Migration failed", {
        error: errorMsg,
      });

      console.error(chalk.red("❌ Migration error:"), errorMsg);
      process.exit(1);
    }
  });
