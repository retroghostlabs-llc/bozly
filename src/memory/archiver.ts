/**
 * Memory Archiver
 * Handles automatic archival of old, unused memories to monthly archive files
 * when cache exceeds 5MB threshold.
 *
 * Features:
 * - Detect total cache size (global + per-vault)
 * - Identify unused memories (>90 days without access)
 * - Archive in chunks to monthly files
 * - Maintain searchability of archived memories
 * - Handle both global and vault-specific memory directories
 */

import path from "path";
import fs from "fs/promises";

export interface CacheSize {
  totalSizeMB: number;
  fileCount: number;
  byVault: Record<string, number>;
}

export interface ArchivableMemory {
  sessionId: string;
  nodeId: string;
  filePath: string;
  daysOld: number;
  lastUsed: string;
  memoryContent: string;
  metadata: Record<string, unknown>;
}

export interface ArchiveResult {
  archived: number;
  totalArchivedMB: number;
  byVault: Record<string, number>;
}

export interface ArchiveCheckResult {
  triggered: boolean;
  archived: number;
  finalCacheSizeMB: number;
}

export interface ArchivedMemoryEntry {
  sessionId: string;
  nodeId: string;
  title?: string;
  summary?: string;
  tags?: string[];
  archivedAt: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface ArchiveFile {
  entries: ArchivedMemoryEntry[];
  createdAt: string;
  lastUpdated: string;
}

export class MemoryArchiver {
  private bozlyHome: string;
  private sessionsPath: string;
  private archiveThresholdMB = 5;
  private unusedThresholdDays = 90;

  constructor(bozlyHome: string) {
    this.bozlyHome = bozlyHome;
    this.sessionsPath = path.join(bozlyHome, "sessions");
  }

  /**
   * Detect total cache size across all memory directories
   */
  async detectCacheSize(): Promise<CacheSize> {
    const byVault: Record<string, number> = {};
    let totalSizeMB = 0;
    let fileCount = 0;

    try {
      const sessionsExist = await fs
        .access(this.sessionsPath)
        .then(() => true)
        .catch(() => false);

      if (!sessionsExist) {
        return { totalSizeMB: 0, fileCount: 0, byVault: {} };
      }

      // List all vault directories
      const vaults = await fs.readdir(this.sessionsPath);

      for (const vaultId of vaults) {
        const vaultPath = path.join(this.sessionsPath, vaultId);
        const stat = await fs.stat(vaultPath);

        if (!stat.isDirectory()) {
          continue;
        }

        const vaultSize = await this.calculateDirectorySize(vaultPath);
        const vaultSizeMB = vaultSize.bytes / (1024 * 1024);

        byVault[vaultId] = vaultSizeMB;
        totalSizeMB += vaultSizeMB;
        fileCount += vaultSize.fileCount;
      }
    } catch (error) {
      // Directory doesn't exist yet
      return { totalSizeMB: 0, fileCount: 0, byVault: {} };
    }

    return { totalSizeMB: Math.round(totalSizeMB * 100) / 100, fileCount, byVault };
  }

  /**
   * Find memories unused for longer than threshold days
   */
  async findArchivableCandidates(unusedDays: number): Promise<ArchivableMemory[]> {
    const candidates: ArchivableMemory[] = [];
    const cutoffDate = new Date(Date.now() - unusedDays * 24 * 60 * 60 * 1000);

    try {
      const sessionsExist = await fs
        .access(this.sessionsPath)
        .then(() => true)
        .catch(() => false);

      if (!sessionsExist) {
        return [];
      }

      const vaults = await fs.readdir(this.sessionsPath);

      for (const vaultId of vaults) {
        const vaultPath = path.join(this.sessionsPath, vaultId);
        const stat = await fs.stat(vaultPath);

        if (!stat.isDirectory()) {
          continue;
        }

        const memories = await this.findMemoriesInDirectory(vaultPath, vaultId);

        for (const memory of memories) {
          const lastUsedDate = new Date(memory.lastUsed);

          if (lastUsedDate < cutoffDate) {
            const daysOld = Math.floor(
              (Date.now() - lastUsedDate.getTime()) / (24 * 60 * 60 * 1000)
            );
            candidates.push({
              ...memory,
              daysOld,
            });
          }
        }
      }
    } catch (error) {
      // Ignore errors, return empty list
    }

    return candidates;
  }

  /**
   * Archive old memories to monthly archive files
   */
  async archiveOldMemories(unusedDays: number): Promise<ArchiveResult> {
    const candidates = await this.findArchivableCandidates(unusedDays);
    const result: ArchiveResult = { archived: 0, totalArchivedMB: 0, byVault: {} };

    // Group by vault and month
    const byVaultAndMonth: Record<string, Record<string, ArchivableMemory[]>> = {};

    for (const memory of candidates) {
      if (!byVaultAndMonth[memory.nodeId]) {
        byVaultAndMonth[memory.nodeId] = {};
      }

      const date = new Date(memory.lastUsed);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!byVaultAndMonth[memory.nodeId][monthKey]) {
        byVaultAndMonth[memory.nodeId][monthKey] = [];
      }

      byVaultAndMonth[memory.nodeId][monthKey].push(memory);
    }

    // Archive each group
    for (const vaultId in byVaultAndMonth) {
      if (!result.byVault[vaultId]) {
        result.byVault[vaultId] = 0;
      }

      for (const monthKey in byVaultAndMonth[vaultId]) {
        const memories = byVaultAndMonth[vaultId][monthKey];
        const archivedMB = await this.archiveMemoriesToMonth(vaultId, monthKey, memories);

        result.archived += memories.length;
        result.totalArchivedMB += archivedMB;
        result.byVault[vaultId] += memories.length;

        // Delete from active cache
        for (const memory of memories) {
          await this.deleteMemoryFromCache(memory.filePath);
        }
      }
    }

    return result;
  }

  /**
   * Archive in chunks until cache is below threshold (5MB)
   */
  async archiveUntilBelowThreshold(thresholdMB: number = 5): Promise<ArchiveCheckResult> {
    const result: ArchiveCheckResult = {
      triggered: false,
      archived: 0,
      finalCacheSizeMB: 0,
    };

    let currentSize = await this.detectCacheSize();
    result.finalCacheSizeMB = currentSize.totalSizeMB;

    if (currentSize.totalSizeMB <= thresholdMB) {
      return result;
    }

    result.triggered = true;

    // Archive in chunks until below threshold
    let candidates = await this.findArchivableCandidates(this.unusedThresholdDays);

    while (candidates.length > 0 && currentSize.totalSizeMB > thresholdMB) {
      // Archive oldest memory first (1 chunk)
      const toArchive = [candidates[0]];
      const vaultId = candidates[0].nodeId;

      const date = new Date(candidates[0].lastUsed);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      await this.archiveMemoriesToMonth(vaultId, monthKey, toArchive);
      await this.deleteMemoryFromCache(candidates[0].filePath);

      result.archived++;

      // Check new size
      currentSize = await this.detectCacheSize();
      result.finalCacheSizeMB = currentSize.totalSizeMB;

      // Remove archived candidate from list
      candidates = candidates.slice(1);
    }

    return result;
  }

  /**
   * Check if archival is needed and perform if necessary
   */
  async checkAndArchiveIfNeeded(thresholdMB: number = 5): Promise<ArchiveCheckResult> {
    const size = await this.detectCacheSize();

    if (size.totalSizeMB <= thresholdMB) {
      return {
        triggered: false,
        archived: 0,
        finalCacheSizeMB: size.totalSizeMB,
      };
    }

    return this.archiveUntilBelowThreshold(thresholdMB);
  }

  /**
   * Search archived memories by query
   */
  async searchArchives(query: string, vaultId?: string): Promise<ArchivedMemoryEntry[]> {
    const results: ArchivedMemoryEntry[] = [];

    try {
      const vaults = vaultId ? [vaultId] : await this.getVaultIds();

      for (const vault of vaults) {
        const archivesDir = path.join(this.sessionsPath, vault, ".archives");

        const archiveExists = await fs
          .access(archivesDir)
          .then(() => true)
          .catch(() => false);

        if (!archiveExists) {
          continue;
        }

        const files = await fs.readdir(archivesDir);

        for (const file of files) {
          if (!file.startsWith("memories-archive-") || !file.endsWith(".json")) {
            continue;
          }

          const filePath = path.join(archivesDir, file);
          const content = await fs.readFile(filePath, "utf-8");
          const archiveFile: ArchiveFile = JSON.parse(content);

          for (const entry of archiveFile.entries) {
            const searchTarget = [
              entry.summary,
              entry.title,
              entry.content,
              (entry.tags || []).join(" "),
            ]
              .join(" ")
              .toLowerCase();

            if (searchTarget.includes(query.toLowerCase())) {
              results.push(entry);
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors, return empty results
    }

    return results;
  }

  /**
   * Load individual archived memory by session ID
   */
  async loadArchivedMemory(vaultId: string, sessionId: string): Promise<string | null> {
    try {
      const archivesDir = path.join(this.sessionsPath, vaultId, ".archives");

      const archiveExists = await fs
        .access(archivesDir)
        .then(() => true)
        .catch(() => false);

      if (!archiveExists) {
        return null;
      }

      const files = await fs.readdir(archivesDir);

      for (const file of files) {
        if (!file.startsWith("memories-archive-") || !file.endsWith(".json")) {
          continue;
        }

        const filePath = path.join(archivesDir, file);
        const content = await fs.readFile(filePath, "utf-8");
        const archiveFile: ArchiveFile = JSON.parse(content);

        const entry = archiveFile.entries.find((e) => e.sessionId === sessionId);
        if (entry) {
          return entry.content;
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return null;
  }

  /**
   * Private helper: Calculate directory size recursively
   */
  private async calculateDirectorySize(
    dirPath: string
  ): Promise<{ bytes: number; fileCount: number }> {
    let totalBytes = 0;
    let fileCount = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Skip archives directory in size calculation (they're not active cache)
          if (entry.name === ".archives") {
            continue;
          }

          const subSize = await this.calculateDirectorySize(path.join(dirPath, entry.name));
          totalBytes += subSize.bytes;
          fileCount += subSize.fileCount;
        } else {
          const filePath = path.join(dirPath, entry.name);
          const stat = await fs.stat(filePath);
          totalBytes += stat.size;
          fileCount++;
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return { bytes: totalBytes, fileCount };
  }

  /**
   * Private helper: Find all memories in a vault directory
   */
  private async findMemoriesInDirectory(
    vaultPath: string,
    vaultId: string
  ): Promise<ArchivableMemory[]> {
    const memories: ArchivableMemory[] = [];

    try {
      const years = await fs.readdir(vaultPath);

      for (const year of years) {
        if (year === ".archives") {
          continue;
        }

        const yearPath = path.join(vaultPath, year);
        const stat = await fs.stat(yearPath);

        if (!stat.isDirectory()) {
          continue;
        }

        const months = await fs.readdir(yearPath);

        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const monthStat = await fs.stat(monthPath);

          if (!monthStat.isDirectory()) {
            continue;
          }

          const days = await fs.readdir(monthPath);

          for (const day of days) {
            const dayPath = path.join(monthPath, day);
            const dayStat = await fs.stat(dayPath);

            if (!dayStat.isDirectory()) {
              continue;
            }

            const sessions = await fs.readdir(dayPath);

            for (const sessionId of sessions) {
              const sessionPath = path.join(dayPath, sessionId);
              const sessionStat = await fs.stat(sessionPath);

              if (!sessionStat.isDirectory()) {
                continue;
              }

              const metadataPath = path.join(sessionPath, "metadata.json");
              const memoryPath = path.join(sessionPath, "memory.md");

              const metadataExists = await fs
                .access(metadataPath)
                .then(() => true)
                .catch(() => false);
              const memoryExists = await fs
                .access(memoryPath)
                .then(() => true)
                .catch(() => false);

              if (metadataExists && memoryExists) {
                try {
                  const metadataContent = await fs.readFile(metadataPath, "utf-8");
                  const metadata = JSON.parse(metadataContent);
                  const memoryContent = await fs.readFile(memoryPath, "utf-8");

                  let lastUsed = metadata.usage?.lastUsed || metadata.timestamp;
                  if (!lastUsed) {
                    const stat = await fs.stat(metadataPath);
                    lastUsed = stat.mtime.toISOString();
                  }

                  memories.push({
                    sessionId,
                    nodeId: vaultId,
                    filePath: sessionPath,
                    daysOld: 0, // Will be calculated later
                    lastUsed,
                    memoryContent,
                    metadata,
                  });
                } catch (error) {
                  // Skip invalid metadata
                }
              }
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return memories;
  }

  /**
   * Private helper: Archive memories to a monthly archive file
   */
  private async archiveMemoriesToMonth(
    vaultId: string,
    monthKey: string,
    memories: ArchivableMemory[]
  ): Promise<number> {
    const vaultPath = path.join(this.sessionsPath, vaultId);
    const archivesDir = path.join(vaultPath, ".archives");

    // Create archives directory if needed
    await fs.mkdir(archivesDir, { recursive: true });

    const archiveFile = path.join(archivesDir, `memories-archive-${monthKey}.json`);

    // Load existing archive or create new
    let archiveData: ArchiveFile;

    const exists = await fs
      .access(archiveFile)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      const content = await fs.readFile(archiveFile, "utf-8");
      archiveData = JSON.parse(content);
    } else {
      archiveData = {
        entries: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
    }

    // Add new entries
    let totalArchivedMB = 0;

    for (const memory of memories) {
      const entry: ArchivedMemoryEntry = {
        sessionId: memory.sessionId,
        nodeId: memory.nodeId,
        title: memory.metadata.title,
        summary: memory.metadata.summary,
        tags: memory.metadata.tags,
        archivedAt: new Date().toISOString(),
        content: memory.memoryContent,
        metadata: memory.metadata,
      };

      archiveData.entries.push(entry);
      totalArchivedMB += memory.memoryContent.length / (1024 * 1024);
    }

    archiveData.lastUpdated = new Date().toISOString();

    // Write archive file
    await fs.writeFile(archiveFile, JSON.stringify(archiveData, null, 2));

    return totalArchivedMB;
  }

  /**
   * Private helper: Delete memory from active cache
   */
  private async deleteMemoryFromCache(filePath: string): Promise<void> {
    try {
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        // Delete the entire session directory
        await fs.rm(filePath, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Private helper: Get all vault IDs
   */
  private async getVaultIds(): Promise<string[]> {
    try {
      const vaults = await fs.readdir(this.sessionsPath);
      return vaults.filter(async (v) => {
        const stat = await fs.stat(path.join(this.sessionsPath, v));
        return stat.isDirectory() && v !== ".archives";
      });
    } catch {
      return [];
    }
  }
}

export default MemoryArchiver;
