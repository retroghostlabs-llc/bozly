/**
 * bozly status - Show current vault status
 */

import { Command } from "commander";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";
import { getNodeCommands } from "../../core/commands.js";
import { getCleanupConfig, calculateNodeStorage } from "../../core/cleanup.js";
import { MemoryManager } from "../../core/memory-manager.js";
import { homedir } from "os";
import path from "path";
import fs from "fs/promises";
import {
  keyValueBox,
  formatList,
  formatSection,
  warningBox,
  infoBox,
  successBox,
} from "../../cli/ui/index.js";
import { formatStatsTable } from "../../cli/ui/index.js";

export const statusCommand = new Command("status")
  .description("Show current vault status")
  .option("-v, --verbose", "Show detailed information")
  .option("--storage", "Show storage usage information")
  .action(async (options) => {
    try {
      await logger.debug("bozly status command started", {
        verbose: options.verbose,
        storage: options.storage,
      });

      const node = await getCurrentNode();

      if (!node) {
        await logger.warn("Not in a vault directory");
        console.log(infoBox("Not in a vault directory", { suggestion: "Try: bozly init" }));
        return;
      }

      await logger.info("Vault found", {
        name: node.name,
        path: node.path,
        type: node.type,
      });

      // Display vault basic info
      console.log(
        keyValueBox("Vault Status", {
          Name: node.name,
          Path: node.path,
          Type: node.type,
        })
      );
      console.log();

      // Show commands
      const commands = await getNodeCommands(node.path);
      if (commands.length > 0) {
        await logger.debug("Found vault commands", {
          commandCount: commands.length,
          commands: commands.map((c) => c.name),
        });

        const commandItems = commands.map((cmd) => ({
          label: `/${cmd.name}`,
          status: "info" as const,
          details: cmd.description,
        }));
        console.log(formatSection("Commands", formatList(commandItems)));
      }

      // Show memory information
      try {
        const memoryManager = MemoryManager.getInstance();
        await memoryManager.initialize();

        const cacheSize = await memoryManager.getCacheSize();
        const bozlyHome = path.join(homedir(), ".bozly");
        const archiveDir = path.join(bozlyHome, "sessions", node.id, ".archives");

        const archivesExist = await fs
          .access(archiveDir)
          .then(() => true)
          .catch(() => false);

        let archivedCount = 0;
        let archiveSizeMB = 0;

        if (archivesExist) {
          const files = await fs.readdir(archiveDir);
          for (const file of files) {
            if (!file.startsWith("memories-archive-")) {
              continue;
            }
            try {
              const content = await fs.readFile(path.join(archiveDir, file), "utf-8");
              const archive = JSON.parse(content);
              const stat = await fs.stat(path.join(archiveDir, file));

              archivedCount += archive.entries?.length || 0;
              archiveSizeMB += stat.size / (1024 * 1024);
            } catch {
              // Skip corrupted archives
            }
          }
        }

        const cacheForThisVault = cacheSize.byVault[node.id] || 0;
        const totalMemorySizeMB = cacheForThisVault + archiveSizeMB;
        const cachePercent =
          totalMemorySizeMB > 0 ? Math.round((cacheForThisVault / totalMemorySizeMB) * 100) : 0;

        const memoryStats: Record<string, string | number> = {
          "Cache Size": `${Math.round(cacheForThisVault * 100) / 100} MB`,
          "Archived Memories": archivedCount,
          "Archive Size": `${Math.round(archiveSizeMB * 100) / 100} MB`,
          "Total Memory": `${Math.round(totalMemorySizeMB * 100) / 100} MB`,
          "Cache Usage": `${cachePercent}% of total`,
        };

        console.log(formatSection("Memory Status", formatStatsTable(memoryStats)));

        if (cacheForThisVault > 5) {
          console.log(
            warningBox("Cache approaching threshold (5MB)", {
              suggestion: "Run: bozly restore --preview to see archived memories",
            })
          );
          console.log();
        }
      } catch (error) {
        await logger.debug("Failed to get memory metrics", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue without memory metrics if they're unavailable
      }

      // Show storage information if requested or verbose
      if (options.storage || options.verbose) {
        const globalConfigPath = path.join(homedir(), ".bozly");
        const cleanupConfig = await getCleanupConfig(globalConfigPath);
        const storage = await calculateNodeStorage(node.path, cleanupConfig.sessions.maxStorageMB);

        const storageStats: Record<string, string | number> = {
          Total: `${storage.totalSizeMB} MB / ${storage.maxStorageMB} MB (${storage.percentUsed}%)`,
          "Sessions Size": `${storage.sessionsSizeMB} MB`,
          "Active Sessions": storage.activeSessions.count,
          "Archived Sessions": storage.archivedSessions.count,
          "Backups Size": `${storage.backupsSizeMB} MB`,
        };

        console.log(formatSection("Storage Usage", formatStatsTable(storageStats)));

        if (storage.percentUsed > 80) {
          const msg =
            storage.percentUsed > 95
              ? "Storage usage is critical (>95%)"
              : "Storage usage is high (>80%)";
          console.log(warningBox(msg, { suggestion: "Run: bozly cleanup --preview" }));
          console.log();
        }
      }

      // Show configuration if verbose
      if (options.verbose) {
        const configItems = [
          { label: ".bozly/config.json" },
          { label: ".bozly/context.md" },
          { label: ".bozly/sessions/" },
          { label: ".bozly/commands/" },
        ];
        console.log(formatSection("Configuration", formatList(configItems)));
      }

      console.log(successBox("Vault is ready"));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to get vault status", {
        error: errorMsg,
      });

      if (error instanceof Error) {
        console.error(errorMsg);
      }
      process.exit(1);
    }
  });
