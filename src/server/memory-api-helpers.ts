/**
 * Memory API Helpers
 * Client-side functions for fetching memory-related data from the API
 * These helpers manage all communication between the web UI and the backend memory API
 */

/**
 * Memory cache statistics
 */
export interface MemoryCacheStats {
  totalCacheMB: number;
  cacheFileCount: number;
  byVault: Record<string, number>;
}

/**
 * Archive statistics with breakdown by vault and month
 */
export interface MemoryArchiveStats {
  totalArchivedCount: number;
  totalArchivedMB: number;
  byVault: Record<string, { count: number; sizeMB: number }>;
  byMonth: Record<string, { count: number; sizeMB: number }>;
}

/**
 * Archived memory record
 */
export interface ArchivedMemory {
  sessionId: string;
  vaultId: string;
  timestamp: string;
  preview: string;
}

/**
 * Options for fetching archived memories
 */
export interface FetchArchivesOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * Restore request payload
 */
export interface MemoryRestoreRequest {
  mode: "session" | "date" | "search" | "all";
  sessionIds?: string[];
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Restore result
 */
export interface MemoryRestoreResult {
  restored: number;
  failed: number;
}

/**
 * Fetch cache statistics from the API
 */
export async function fetchMemoryCacheStats(): Promise<MemoryCacheStats> {
  const response = await fetch("/api/memory/cache-stats");

  if (!response.ok) {
    const error = (await response.json()) as Record<string, unknown>;
    throw new Error((error.error as string) || "Failed to fetch cache stats");
  }

  const data = (await response.json()) as Record<string, unknown>;
  if (!data.success) {
    throw new Error((data.error as string) || "Failed to fetch cache stats");
  }

  return data.data as MemoryCacheStats;
}

/**
 * Fetch archive statistics from the API
 * Optionally filter by vault/node ID
 */
export async function fetchMemoryArchiveStats(vaultId?: string): Promise<MemoryArchiveStats> {
  const url = vaultId
    ? `/api/memory/archive-stats?nodeId=${encodeURIComponent(vaultId)}`
    : "/api/memory/archive-stats";

  const response = await fetch(url);

  if (!response.ok) {
    const error = (await response.json()) as Record<string, unknown>;
    throw new Error((error.error as string) || "Failed to fetch archive stats");
  }

  const data = (await response.json()) as Record<string, unknown>;
  if (!data.success) {
    throw new Error((data.error as string) || "Failed to fetch archive stats");
  }

  return data.data as MemoryArchiveStats;
}

/**
 * Fetch archived memories with optional search and date filtering
 */
export async function fetchArchivedMemories(
  searchQuery: string,
  options?: FetchArchivesOptions
): Promise<ArchivedMemory[]> {
  const params = new URLSearchParams();
  params.append("archived", "true");

  if (searchQuery) {
    params.append("search", searchQuery);
  }

  if (options?.startDate) {
    params.append("startDate", options.startDate);
  }

  if (options?.endDate) {
    params.append("endDate", options.endDate);
  }

  params.append("limit", String(options?.limit || 50));

  const url = `/api/memory?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = (await response.json()) as Record<string, unknown>;
    throw new Error((error.error as string) || "Failed to fetch archived memories");
  }

  const data = (await response.json()) as Record<string, unknown>;
  if (!data.success) {
    throw new Error((data.error as string) || "Failed to fetch archived memories");
  }

  return (data.data || []) as ArchivedMemory[];
}

/**
 * Restore memories from archive
 * Supports multiple restore modes: by session, by date range, by search, or all
 */
export async function restoreMemories(request: MemoryRestoreRequest): Promise<MemoryRestoreResult> {
  const response = await fetch("/api/memory/restore", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = (await response.json()) as Record<string, unknown>;
    throw new Error((error.error as string) || "Failed to restore memories");
  }

  const data = (await response.json()) as Record<string, unknown>;
  if (!data.success) {
    throw new Error((data.error as string) || "Failed to restore memories");
  }

  return data.data as MemoryRestoreResult;
}

/**
 * Stream restore progress
 * For real-time progress updates during restore operations
 */
export async function* streamRestoreProgress(request: MemoryRestoreRequest): AsyncGenerator<{
  type: "progress" | "complete" | "error";
  restored?: number;
  total?: number;
  message?: string;
}> {
  const response = await fetch("/api/memory/restore/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Failed to stream restore progress");
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        try {
          const data = JSON.parse(line);
          yield data;
        } catch {
          // Skip invalid JSON lines
          continue;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
