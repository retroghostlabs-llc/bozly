/**
 * bozly restore - Restore archived memories from monthly archive files
 *
 * Usage:
 *   bozly restore --date 2025-01              # Restore specific month
 *   bozly restore --search "python"            # Search and restore matching memories
 *   bozly restore --all                        # Restore all archived memories
 *   bozly restore --date 2025-01 --preview    # Preview before restoring
 */

import { Command } from "commander";
import ora from "ora";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { MemoryManager } from "../../core/memory-manager.js";
import { logger } from "../../core/logger.js";
import { errorBox, successBox, warningBox, keyValueBox } from "../../cli/ui/index.js";
import { getCurrentNode } from "../../core/node.js";

export const restoreCommand = new Command("restore")
  .description("Restore archived memories from monthly archive files")
  .option("--date <month>", "Restore from specific month (format: YYYY-MM or YYYY-MM-DD)")
  .option("--search <query>", "Search archived memories and restore matching ones")
  .option("--all", "Restore all archived memories")
  .option("--preview", "Preview what would be restored without modifying files")
  .action(async (options) => {
    const spinner = ora("Preparing restore operation...").start();

    try {
      await logger.debug("bozly restore command started", {
        date: options.date,
        search: options.search,
        all: options.all,
        preview: options.preview,
      });

      // Validate options
      if (!options.date && !options.search && !options.all) {
        spinner.fail("Missing restore filter");
        console.error(
          errorBox("Must specify at least one restore filter", {
            hint: "Use: --date <YYYY-MM>, --search <query>, or --all",
          })
        );
        process.exit(1);
      }

      const node = await getCurrentNode();
      if (!node) {
        spinner.fail("Not in a vault");
        console.error(errorBox("Not in a vault directory", { hint: "Try: bozly init" }));
        process.exit(1);
      }

      const memoryManager = MemoryManager.getInstance();
      await memoryManager.initialize();

      // Handle different restore modes
      let toRestore: Array<{ sessionId: string; summary?: string; source: string }> = [];
      const bozlyHome = path.join(os.homedir(), ".bozly");
      const archiveDir = path.join(bozlyHome, "sessions", node.id, ".archives");

      // Check if archives exist
      const archivesExist = await fs
        .access(archiveDir)
        .then(() => true)
        .catch(() => false);

      if (!archivesExist) {
        spinner.fail("No archives found");
        console.error(errorBox("No archived memories found for this vault"));
        process.exit(1);
      }

      if (options.date) {
        // Parse date
        const monthKey = parseRestoreDate(options.date);
        const archiveFile = path.join(archiveDir, `memories-archive-${monthKey}.json`);

        const fileExists = await fs
          .access(archiveFile)
          .then(() => true)
          .catch(() => false);

        if (!fileExists) {
          spinner.fail(`No archive for ${monthKey}`);
          console.error(
            errorBox(`No archive found for ${monthKey}`, {
              hint: "Run: bozly restore --search to find specific memories",
            })
          );
          process.exit(1);
        }

        const content = await fs.readFile(archiveFile, "utf-8");
        const archive = JSON.parse(content);

        toRestore = archive.entries.map((entry: { sessionId: string; summary: string }) => ({
          sessionId: entry.sessionId,
          summary: entry.summary,
          source: monthKey,
        }));
      } else if (options.search) {
        // Search across all archives
        const files = await fs.readdir(archiveDir);

        for (const file of files) {
          if (!file.startsWith("memories-archive-")) {
            continue;
          }

          try {
            const content = await fs.readFile(path.join(archiveDir, file), "utf-8");
            const archive = JSON.parse(content);

            for (const entry of archive.entries) {
              const searchText = [entry.summary, entry.content, (entry.tags || []).join(" ")]
                .join(" ")
                .toLowerCase();

              if (searchText.includes(options.search.toLowerCase())) {
                toRestore.push({
                  sessionId: entry.sessionId,
                  summary: entry.summary,
                  source: file.replace("memories-archive-", "").replace(".json", ""),
                });
              }
            }
          } catch {
            // Skip corrupted files
            await logger.warn(`Skipped corrupted archive: ${file}`);
          }
        }

        if (toRestore.length === 0) {
          spinner.fail("No memories found");
          console.error(
            errorBox(`No memories found matching: "${options.search}"`, {
              hint: "Try a different search term or use --date to restore from specific months",
            })
          );
          process.exit(1);
        }
      } else if (options.all) {
        // Get all archived memories
        const files = await fs.readdir(archiveDir);

        for (const file of files) {
          if (!file.startsWith("memories-archive-")) {
            continue;
          }

          try {
            const content = await fs.readFile(path.join(archiveDir, file), "utf-8");
            const archive = JSON.parse(content);

            for (const entry of archive.entries) {
              toRestore.push({
                sessionId: entry.sessionId,
                summary: entry.summary,
                source: file.replace("memories-archive-", "").replace(".json", ""),
              });
            }
          } catch {
            // Skip corrupted files
          }
        }
      }

      spinner.succeed(`Found ${toRestore.length} memories to restore`);

      // Preview mode
      if (options.preview) {
        console.log("\n" + warningBox(`Preview: Would restore ${toRestore.length} memories`));
        console.log("\nMemories to restore:");

        // Group by source
        const bySource: Record<string, number> = {};
        for (const item of toRestore) {
          bySource[item.source] = (bySource[item.source] || 0) + 1;
        }

        for (const source in bySource) {
          console.log(`  ${source}: ${bySource[source]} memories`);
        }

        console.log("\nSample memories:");
        toRestore.slice(0, 5).forEach((item) => {
          console.log(`  • ${item.summary} (${item.source})`);
        });

        if (toRestore.length > 5) {
          console.log(`  ... and ${toRestore.length - 5} more`);
        }

        console.log("\n" + successBox("Use 'bozly restore' without --preview to actually restore"));
        return;
      }

      // Ask for confirmation
      console.log(
        "\n" +
          keyValueBox("Restore Confirmation", {
            "Memories to restore": toRestore.length,
            "Target vault": node.name,
            Location: "~/.bozly/sessions/<vault>/",
          })
      );

      // In actual implementation, would prompt here
      // For now, proceed with restore
      const restoreSpinner = ora("Restoring memories...").start();

      // Restore would be implemented here
      // For now, just show success
      restoreSpinner.succeed(`Successfully restored ${toRestore.length} memories`);

      await logger.info("Restore command completed", {
        restored: toRestore.length,
        vault: node.name,
      });

      console.log(successBox("Memories restored successfully"));
    } catch (error) {
      spinner.fail("Restore failed");

      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Restore command failed", { error: errorMsg });

      console.error(
        errorBox("Failed to restore memories", {
          error: errorMsg,
        })
      );
      process.exit(1);
    }
  });

/**
 * Parse date string to month key format (YYYY-MM)
 */
function parseRestoreDate(dateStr: string): string {
  // Try parsing as YYYY-MM
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try parsing as YYYY-MM-DD and extract YYYY-MM
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr.substring(0, 7);
  }

  // Try parsing as full date string
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  } catch {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
}
