/**
 * Session Management - Multi-file Architecture
 *
 * Records command executions with a structured multi-file format:
 * ~/.bozly/sessions/{nodeId}/{YYYY}/{MM}/{DD}/{uuid}/
 *   ├── session.json       (metadata/index)
 *   ├── context.md         (what AI knew)
 *   ├── prompt.txt         (raw prompt for diff)
 *   ├── execution.json     (technical details)
 *   ├── results.md         (human-readable output)
 *   └── changes.json       (file modifications)
 *
 * This design enables:
 * - Easy archival by date/vault
 * - n8n monitoring specific directories
 * - Prompt diff comparisons
 * - Audit trail and transparency
 *
 * @module core/sessions
 */

import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  Session,
  SessionQueryOptions,
  SessionDiff,
  ISODateTime,
  ExecutionLogEntry,
  FileChange,
  ExecutionDetails,
  FileChanges,
  SessionFiles,
  SessionMemory,
  MemoryMetadata,
} from "./types.js";
import { logger } from "./logger.js";
import { MemoryExtractor } from "../memory/extractor.js";
import { MemoryLoader } from "../memory/loader.js";
import { MemoryIndex } from "../memory/index.js";
import { VERSION } from "./version.js";

/**
 * Format timestamp as ISO string
 */
function getCurrentTimestamp(): ISODateTime {
  return new Date().toISOString();
}

/**
 * Convert timestamp to vault/date/id directory structure path component
 * Input: "2025-12-20T14:32:00.123Z"
 * Output: "2025/12/20"
 */
function getDatePathComponent(timestamp: ISODateTime): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

/**
 * Build the full path to a session directory
 * Path: ~/.bozly/sessions/{nodeId}/{YYYY}/{MM}/{DD}/{uuid}/
 *
 * @param basePath - Base path (.bozly directory)
 * @param nodeId - Machine-readable vault ID
 * @param timestamp - ISO 8601 timestamp
 * @param sessionId - UUID session ID
 * @returns Full path to session directory
 */
export function getSessionPath(
  basePath: string,
  nodeId: string,
  timestamp: ISODateTime,
  sessionId: string
): string {
  const datePath = getDatePathComponent(timestamp);
  return path.join(basePath, "sessions", nodeId, datePath, sessionId);
}

/**
 * Create session directory with parent directories
 *
 * @param sessionPath - Full path to session directory
 * @returns True if created, false if already exists
 */
export async function createSessionDirectory(sessionPath: string): Promise<boolean> {
  try {
    await fs.mkdir(sessionPath, { recursive: true });
    return true;
  } catch (error) {
    await logger.error("Failed to create session directory", {
      path: sessionPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Write all session files to directory (atomic operation)
 *
 * @param sessionPath - Full path to session directory
 * @param files - All session files to write
 * @returns True if successful
 */
export async function saveSessionFiles(sessionPath: string, files: SessionFiles): Promise<boolean> {
  try {
    // Ensure directory exists
    await createSessionDirectory(sessionPath);

    // Write all files
    const writeOperations = [
      fs.writeFile(
        path.join(sessionPath, "session.json"),
        JSON.stringify(files.sessionJson, null, 2)
      ),
      fs.writeFile(path.join(sessionPath, "context.md"), files.contextMd),
      fs.writeFile(path.join(sessionPath, "prompt.txt"), files.promptTxt),
      fs.writeFile(
        path.join(sessionPath, "execution.json"),
        JSON.stringify(files.executionJson, null, 2)
      ),
      fs.writeFile(path.join(sessionPath, "results.md"), files.resultsMd),
      fs.writeFile(
        path.join(sessionPath, "changes.json"),
        JSON.stringify(files.changesJson, null, 2)
      ),
    ];

    await Promise.all(writeOperations);
    return true;
  } catch (error) {
    await logger.error("Failed to save session files", {
      path: sessionPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Load all session files from directory
 *
 * @param sessionPath - Full path to session directory
 * @returns SessionFiles object or null if not found
 */
export async function loadSessionFiles(sessionPath: string): Promise<SessionFiles | null> {
  try {
    const [sessionJson, contextMd, promptTxt, executionJson, resultsMd, changesJson] =
      await Promise.all([
        fs.readFile(path.join(sessionPath, "session.json"), "utf-8"),
        fs.readFile(path.join(sessionPath, "context.md"), "utf-8"),
        fs.readFile(path.join(sessionPath, "prompt.txt"), "utf-8"),
        fs.readFile(path.join(sessionPath, "execution.json"), "utf-8"),
        fs.readFile(path.join(sessionPath, "results.md"), "utf-8"),
        fs.readFile(path.join(sessionPath, "changes.json"), "utf-8"),
      ]);

    return {
      sessionJson: JSON.parse(sessionJson),
      contextMd,
      promptTxt,
      executionJson: JSON.parse(executionJson),
      resultsMd,
      changesJson: JSON.parse(changesJson),
    };
  } catch (error) {
    await logger.debug("Failed to load session files", {
      path: sessionPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Record a new session with multi-file architecture
 *
 * @param nodePath - Path to vault (.bozly directory base)
 * @param nodeId - Machine-readable vault ID
 * @param vaultName - Human-readable vault name
 * @param command - Command name
 * @param provider - AI provider used
 * @param prompt - Prompt components (context, command, models)
 * @param response - Response from provider
 * @param executionLog - Timeline of execution events
 * @param filesChanged - Files modified by command
 * @param timezone - User's configured timezone (e.g., "America/New_York")
 * @returns Recorded session
 */
export async function recordSession(
  nodePath: string,
  nodeId: string,
  nodeName: string,
  command: string,
  provider: string,
  prompt: {
    contextText?: string;
    commandText: string;
    modelsUsed?: string[];
  },
  response: {
    text: string;
    error?: string;
    duration: number;
  },
  executionLog: ExecutionLogEntry[] = [],
  filesChanged: FileChange[] = [],
  timezone?: string
): Promise<Session> {
  const now = getCurrentTimestamp();
  const sessionId = randomUUID();

  // Build session path
  const bozlyPath = path.join(nodePath, ".bozly");
  const sessionPath = getSessionPath(bozlyPath, nodeId, now, sessionId);

  // Create session metadata
  const session: Session = {
    schema_version: "1.0",
    id: sessionId,
    nodeId,
    timestamp: now,
    command,
    provider,
    status: response.error ? "failed" : "completed",
    executionTimeMs: response.duration,
    nodeName,
    nodePath,
    ...(response.error && {
      error: {
        message: response.error,
        code: "execution_failed",
        timestamp: now,
      },
    }),
    prompt: {
      metadata: {
        contextSize: prompt.contextText?.length ?? 0,
        commandSize: prompt.commandText.length,
        modelSize: prompt.modelsUsed?.reduce((sum, m) => sum + m.length, 0),
        total:
          (prompt.contextText?.length ?? 0) +
          prompt.commandText.length +
          (prompt.modelsUsed?.reduce((sum, m) => sum + m.length, 0) ?? 0),
      },
    },
    response: {
      metadata: {
        status: response.error ? "failed" : "completed",
        duration: response.duration,
        outputSize: response.text?.length,
      },
    },
    environment: {
      nodeVersion: process.version.replace(/^v/, ""),
      bozlyVersion: VERSION,
      platform: process.platform,
      timezone: timezone,
    },
  };

  // Build context.md (what AI knew)
  const contextMd = `## Summary
${command} execution on ${nodeName}

## Prompt Sent to AI
(exact text the AI received)

---

## Sources of This Context
- Vault knowledge: .bozly/context.md
- Command instructions: .bozly/commands/${command}.md
${prompt.modelsUsed?.length ? `- Models: ${prompt.modelsUsed.join(", ")}` : "- Models: none"}
- External data: none injected

---

## Variables/Dynamic Data
Timestamp: ${now}
Provider: ${provider}
Command: ${command}
`;

  // Build prompt.txt (raw prompt for diff)
  const promptTxt = `${prompt.contextText ?? ""}
---
${prompt.commandText}
${prompt.modelsUsed?.length ? `\n---\n${prompt.modelsUsed.join("\n")}` : ""}`;

  // Build execution.json (technical details)
  const startMs = Date.now() - response.duration;
  const executionJson: ExecutionDetails = {
    commandInput: {
      vault_id: nodeId,
      command,
      flags: {},
      args: {},
    },
    aiRequest: {
      provider,
      promptLength: prompt.contextText
        ? prompt.contextText.length + prompt.commandText.length
        : prompt.commandText.length,
    },
    aiResponse: {
      finishReason: response.error ? "error" : "end_turn",
      contentLength: response.text?.length ?? 0,
    },
    executionLog:
      executionLog.length > 0
        ? executionLog
        : [
            {
              timestamp: now,
              type: "start",
              message: "Session started",
            },
            {
              timestamp: now,
              type: "ai_call",
              message: `Called ${provider}`,
            },
            {
              timestamp: now,
              type: response.error ? "error" : "complete",
              message: response.error ?? "Execution completed",
            },
          ],
    timing: {
      startMs,
      endMs: Date.now(),
      totalMs: response.duration,
    },
  };

  // Build results.md (human-readable output)
  const resultsMd = `## Command
${command}

## AI Output
${response.text}

## Status
${response.error ? "❌ Failed" : "✅ Completed"}

## Duration
${response.duration}ms

${response.error ? `\n## Error\n${response.error}` : ""}`;

  // Build changes.json (file modifications)
  const changesJson: FileChanges = {
    filesModified: filesChanged,
    summary: {
      totalFilesModified: filesChanged.filter((f) => f.action === "modified").length,
      totalFilesCreated: filesChanged.filter((f) => f.action === "created").length,
      totalFilesDeleted: filesChanged.filter((f) => f.action === "deleted").length,
    },
    recommendations: [],
  };

  // Save all files
  const sessionFiles: SessionFiles = {
    sessionJson: session,
    contextMd,
    promptTxt,
    executionJson,
    resultsMd,
    changesJson,
  };

  const saved = await saveSessionFiles(sessionPath, sessionFiles);
  if (saved) {
    await logger.debug("Session recorded", {
      sessionId,
      command,
      provider,
      path: sessionPath,
      status: session.status,
    });

    // Auto-extract memory after session is saved
    const memory = await extractAndSaveMemory(
      sessionPath,
      session,
      prompt.contextText,
      prompt.commandText,
      response.text
    );

    // Index memory for cross-vault queries
    if (memory) {
      const bozlyPath = path.join(nodePath, ".bozly");
      await indexSessionMemory(bozlyPath, memory, sessionPath);
    }
  }

  return session;
}

/**
 * Load a session by ID (searches across all vaults and dates)
 *
 * @param vaultBasePath - Path to vault (.bozly directory base)
 * @param sessionId - Session UUID
 * @returns Session or null if not found
 */
export async function loadSession(
  vaultBasePath: string,
  sessionId: string
): Promise<Session | null> {
  try {
    const sessionsDir = path.join(vaultBasePath, ".bozly", "sessions");
    const files = await fs.readdir(sessionsDir, { recursive: true });

    // Find session.json with matching ID
    for (const file of files) {
      const filePath = path.join(sessionsDir, file);
      if (file.toString().endsWith("session.json")) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const session = JSON.parse(content) as Session;
          if (session.id === sessionId) {
            return session;
          }
        } catch {
          // Continue searching
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return null;
}

/**
 * Query sessions with filters
 *
 * Scans vault/date/id directory hierarchy and returns matching sessions
 *
 * @param vaultBasePath - Path to vault (.bozly directory base)
 * @param options - Query options (command, provider, vault, status, date range, limit)
 * @returns Matching sessions, newest first
 */
export async function querySessions(
  vaultBasePath: string,
  options: SessionQueryOptions = {}
): Promise<Session[]> {
  const sessions: Session[] = [];

  try {
    const sessionsDir = path.join(vaultBasePath, ".bozly", "sessions");

    // Check if directory exists
    try {
      await fs.access(sessionsDir);
    } catch {
      return [];
    }

    // Recursively find all session.json files
    const findSessions = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await findSessions(fullPath);
          } else if (entry.name === "session.json") {
            try {
              const content = await fs.readFile(fullPath, "utf-8");
              const session = JSON.parse(content) as Session;

              // Apply filters
              if (options.command && session.command !== options.command) {
                continue;
              }
              if (options.provider && session.provider !== options.provider) {
                continue;
              }
              if (options.node && session.nodeId !== options.node) {
                continue;
              }
              if (options.status && session.status !== options.status) {
                continue;
              }

              if (options.startDate && session.timestamp < options.startDate) {
                continue;
              }
              if (options.endDate && session.timestamp > options.endDate) {
                continue;
              }

              sessions.push(session);
            } catch {
              // Skip invalid JSON files
            }
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    await findSessions(sessionsDir);

    // Sort by timestamp, newest first
    sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Apply limit and offset
    const offset = options.offset ?? 0;
    const limit = options.limit ?? sessions.length;

    return sessions.slice(offset, offset + limit);
  } catch {
    return [];
  }
}

/**
 * Get latest session for a command
 *
 * @param nodePath - Path to vault
 * @param command - Command name
 * @returns Latest session or null
 */
export async function getLatestSession(nodePath: string, command: string): Promise<Session | null> {
  const sessions = await querySessions(nodePath, { command, limit: 1 });
  return sessions.length > 0 ? sessions[0] : null;
}

/**
 * Get all commands that have been executed
 *
 * @param nodePath - Path to vault
 * @returns Array of unique command names
 */
export async function getExecutedCommands(nodePath: string): Promise<string[]> {
  const sessions = await querySessions(nodePath);
  const commands = new Set(sessions.map((s) => s.command));
  return Array.from(commands).sort();
}

/**
 * Compare two sessions by reading prompt.txt files
 *
 * @param session1 - First session
 * @param session2 - Second session
 * @returns Diff information
 */
export function diffSessions(session1: Session, session2: Session): SessionDiff {
  return {
    left: session1,
    right: session2,
    differences: {
      prompt: {
        contextSize:
          (session2.prompt?.metadata?.contextSize ?? 0) -
          (session1.prompt?.metadata?.contextSize ?? 0),
        total: (session2.prompt?.metadata?.total ?? 0) - (session1.prompt?.metadata?.total ?? 0),
      },
      response: {
        duration:
          (session2.response?.metadata?.duration ?? 0) -
          (session1.response?.metadata?.duration ?? 0),
        status: session1.status !== session2.status,
      },
    },
  };
}

/**
 * Get session statistics
 *
 * @param nodePath - Path to vault
 * @param command - Optional: filter to specific command
 * @returns Statistics object
 */
export async function getSessionStats(
  nodePath: string,
  command?: string
): Promise<{
  totalSessions: number;
  totalSuccessful: number;
  totalFailed: number;
  averageDuration: number;
  averagePromptSize: number;
  providersUsed: string[];
}> {
  const sessions = await querySessions(nodePath, { command });

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      averageDuration: 0,
      averagePromptSize: 0,
      providersUsed: [],
    };
  }

  const successful = sessions.filter((s) => s.status === "completed").length;
  const failed = sessions.filter((s) => s.status === "failed").length;
  const avgDuration =
    sessions.reduce((sum, s) => sum + (s.executionTimeMs ?? 0), 0) / sessions.length;
  const avgPromptSize =
    sessions.reduce((sum, s) => sum + (s.prompt?.metadata?.total ?? 0), 0) / sessions.length;
  const providers = [...new Set(sessions.map((s) => s.provider))].sort();

  return {
    totalSessions: sessions.length,
    totalSuccessful: successful,
    totalFailed: failed,
    averageDuration: Math.round(avgDuration),
    averagePromptSize: Math.round(avgPromptSize),
    providersUsed: providers,
  };
}

/**
 * Format session for display in logs
 *
 * @param session - Session to format
 * @param verbose - Include detailed information
 * @returns Formatted string
 */
export function formatSessionForLogs(session: Session, verbose: boolean = false): string {
  const timestamp = new Date(session.timestamp).toLocaleString();
  const duration = session.executionTimeMs ?? 0;
  const status = session.status === "completed" ? "✅" : session.status === "failed" ? "❌" : "⊙";

  const base = `${status} ${timestamp} | ${session.command} | ${session.provider} | ${duration}ms`;

  if (verbose) {
    const contextSize = session.prompt?.metadata?.contextSize ?? 0;
    const totalSize = session.prompt?.metadata?.total ?? 0;
    return `${base} | Context: ${contextSize}B | Total: ${totalSize}B`;
  }

  return base;
}

/**
 * Format session for display (legacy function for compatibility)
 *
 * @param session - Session to format
 * @returns Formatted string
 */
export function formatSession(session: Session): string {
  return formatSessionForLogs(session, false);
}

/**
 * Get sessions for a specific vault
 *
 * @param nodePath - Path to vault
 * @param nodeId - Vault ID to filter by
 * @returns Sessions from this vault
 */
export async function getNodeSessions(nodePath: string, nodeId: string): Promise<Session[]> {
  return querySessions(nodePath, { node: nodeId });
}

/**
 * Clean up old sessions (archive older than N days)
 *
 * @param nodePath - Path to vault
 * @param daysToKeep - Keep sessions newer than this many days
 * @returns Number of sessions archived
 */
export async function cleanupOldSessions(
  nodePath: string,
  daysToKeep: number = 30
): Promise<number> {
  const sessionsDir = path.join(nodePath, ".bozly", "sessions");
  const archiveDir = path.join(nodePath, ".bozly", "sessions", "archive");

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  let archived = 0;

  try {
    const findAndArchive = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await findAndArchive(fullPath);
          } else if (entry.name === "session.json") {
            const stats = await fs.stat(fullPath);
            if (stats.mtime < cutoffDate) {
              // Move entire session directory to archive
              const sessionDir = path.dirname(fullPath);
              const relPath = path.relative(sessionsDir, sessionDir);
              const archivePath = path.join(archiveDir, relPath);
              await fs.mkdir(path.dirname(archivePath), { recursive: true });
              await fs.rename(sessionDir, archivePath);
              archived++;
            }
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    await findAndArchive(sessionsDir);

    if (archived > 0) {
      await logger.info("Sessions archived", {
        count: archived,
        daysToKeep,
      });
    }
  } catch (error) {
    await logger.warn("Failed to cleanup old sessions", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return archived;
}

/**
 * Query sessions across all vaults (global level)
 * Searches ~/.bozly/sessions/ across all vault directories
 *
 * @param globalSessionsPath - Path to ~/.bozly/sessions/
 * @param options - Query filters
 * @returns Sessions from all vaults matching filters
 */
export async function querySessionsGlobal(
  globalSessionsPath: string,
  options: SessionQueryOptions = {}
): Promise<Session[]> {
  const sessions: Session[] = [];

  try {
    // Check if directory exists
    try {
      await fs.access(globalSessionsPath);
    } catch {
      return [];
    }

    // Recursively find all session.json files across vaults
    const findSessions = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await findSessions(fullPath);
          } else if (entry.name === "session.json") {
            try {
              const content = await fs.readFile(fullPath, "utf-8");
              const session = JSON.parse(content) as Session;

              // Apply filters
              if (options.command && session.command !== options.command) {
                continue;
              }
              if (options.provider && session.provider !== options.provider) {
                continue;
              }
              if (options.node && session.nodeId !== options.node) {
                continue;
              }
              if (options.status && session.status !== options.status) {
                continue;
              }

              if (options.startDate && session.timestamp < options.startDate) {
                continue;
              }
              if (options.endDate && session.timestamp > options.endDate) {
                continue;
              }

              sessions.push(session);
            } catch {
              // Skip invalid JSON files
            }
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    await findSessions(globalSessionsPath);

    // Sort by timestamp, newest first
    sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Apply limit and offset
    const offset = options.offset ?? 0;
    const limit = options.limit ?? sessions.length;

    return sessions.slice(offset, offset + limit);
  } catch {
    return [];
  }
}

/**
 * Get list of vaults that have recorded sessions
 *
 * @param globalSessionsPath - Path to ~/.bozly/sessions/
 * @returns Array of vault IDs with sessions
 */
export async function getNodesWithSessions(globalSessionsPath: string): Promise<string[]> {
  const vaults = new Set<string>();

  try {
    try {
      await fs.access(globalSessionsPath);
    } catch {
      return [];
    }

    const entries = await fs.readdir(globalSessionsPath, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== "archive") {
        vaults.add(entry.name);
      }
    }
  } catch {
    // Return empty set if unable to read
  }

  return Array.from(vaults).sort();
}

/**
 * Get session statistics across all vaults (global level)
 *
 * @param globalSessionsPath - Path to ~/.bozly/sessions/
 * @param options - Optional filters
 * @returns Aggregated statistics
 */
export async function getSessionStatsGlobal(
  globalSessionsPath: string,
  options: SessionQueryOptions = {}
): Promise<{
  totalSessions: number;
  totalSuccessful: number;
  totalFailed: number;
  averageDuration: number;
  averagePromptSize: number;
  providersUsed: string[];
  nodesWithSessions: string[];
  commandsExecuted: string[];
  sessionsByNode: Record<string, number>;
  sessionsByProvider: Record<string, number>;
}> {
  const sessions = await querySessionsGlobal(globalSessionsPath, options);

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      averageDuration: 0,
      averagePromptSize: 0,
      providersUsed: [],
      nodesWithSessions: [],
      commandsExecuted: [],
      sessionsByNode: {},
      sessionsByProvider: {},
    };
  }

  const successful = sessions.filter((s) => s.status === "completed").length;
  const failed = sessions.filter((s) => s.status === "failed").length;
  const avgDuration =
    sessions.reduce((sum, s) => sum + (s.executionTimeMs ?? 0), 0) / sessions.length;
  const avgPromptSize =
    sessions.reduce((sum, s) => sum + (s.prompt?.metadata?.total ?? 0), 0) / sessions.length;
  const providers = [...new Set(sessions.map((s) => s.provider))].sort();
  const vaults = [...new Set(sessions.map((s) => s.nodeId))].sort();
  const commands = [...new Set(sessions.map((s) => s.command))].sort();

  // Count sessions by vault
  const sessionsByNode: Record<string, number> = {};
  for (const vault of vaults) {
    sessionsByNode[vault] = sessions.filter((s) => s.nodeId === vault).length;
  }

  // Count sessions by provider
  const sessionsByProvider: Record<string, number> = {};
  for (const provider of providers) {
    sessionsByProvider[provider] = sessions.filter((s) => s.provider === provider).length;
  }

  return {
    totalSessions: sessions.length,
    totalSuccessful: successful,
    totalFailed: failed,
    averageDuration: Math.round(avgDuration),
    averagePromptSize: Math.round(avgPromptSize),
    providersUsed: providers,
    nodesWithSessions: vaults,
    commandsExecuted: commands,
    sessionsByNode,
    sessionsByProvider,
  };
}

/**
 * Archive old sessions across all vaults
 *
 * @param globalSessionsPath - Path to ~/.bozly/sessions/
 * @param daysToKeep - Number of days to keep (default: 30)
 * @returns Number of sessions archived
 */
export async function cleanupOldSessionsGlobal(
  globalSessionsPath: string,
  daysToKeep: number = 30
): Promise<number> {
  const archiveDir = path.join(globalSessionsPath, "archive");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  let archived = 0;

  try {
    try {
      await fs.access(globalSessionsPath);
    } catch {
      return 0;
    }

    const findAndArchive = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && entry.name !== "archive") {
            await findAndArchive(fullPath);
          } else if (entry.name === "session.json") {
            const stats = await fs.stat(fullPath);
            if (stats.mtime < cutoffDate) {
              // Move entire session directory to archive
              const sessionDir = path.dirname(fullPath);
              const relPath = path.relative(globalSessionsPath, sessionDir);
              const archivePath = path.join(archiveDir, relPath);
              await fs.mkdir(path.dirname(archivePath), { recursive: true });
              await fs.rename(sessionDir, archivePath);
              archived++;
            }
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    await findAndArchive(globalSessionsPath);

    if (archived > 0) {
      await logger.info("Sessions archived globally", {
        count: archived,
        daysToKeep,
      });
    }
  } catch (error) {
    await logger.warn("Failed to cleanup old sessions globally", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return archived;
}

/**
 * Archive sessions by date range (across all vaults)
 *
 * @param globalSessionsPath - Path to ~/.bozly/sessions/
 * @param beforeDate - Archive sessions before this date
 * @returns Number of sessions archived
 */
export async function archiveSessionsByDate(
  globalSessionsPath: string,
  beforeDate: Date
): Promise<number> {
  const archiveDir = path.join(globalSessionsPath, "archive");
  let archived = 0;

  try {
    try {
      await fs.access(globalSessionsPath);
    } catch {
      return 0;
    }

    const findAndArchive = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && entry.name !== "archive") {
            await findAndArchive(fullPath);
          } else if (entry.name === "session.json") {
            try {
              const content = await fs.readFile(fullPath, "utf-8");
              const session = JSON.parse(content) as Session;

              if (new Date(session.timestamp) < beforeDate) {
                const sessionDir = path.dirname(fullPath);
                const relPath = path.relative(globalSessionsPath, sessionDir);
                const archivePath = path.join(archiveDir, relPath);
                await fs.mkdir(path.dirname(archivePath), { recursive: true });
                await fs.rename(sessionDir, archivePath);
                archived++;
              }
            } catch {
              // Skip invalid sessions
            }
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    await findAndArchive(globalSessionsPath);

    if (archived > 0) {
      await logger.info("Sessions archived by date", {
        count: archived,
        beforeDate: beforeDate.toISOString(),
      });
    }
  } catch (error) {
    await logger.warn("Failed to archive sessions by date", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return archived;
}

/**
 * Archive sessions by vault
 *
 * @param globalSessionsPath - Path to ~/.bozly/sessions/
 * @param nodeId - Vault ID to archive
 * @param beforeDate - Optional: only archive before this date
 * @returns Number of sessions archived
 */
export async function archiveSessionsByNode(
  globalSessionsPath: string,
  nodeId: string,
  beforeDate?: Date
): Promise<number> {
  const vaultSessionsPath = path.join(globalSessionsPath, nodeId);
  const archiveDir = path.join(globalSessionsPath, "archive", nodeId);
  let archived = 0;

  try {
    try {
      await fs.access(vaultSessionsPath);
    } catch {
      return 0;
    }

    const findAndArchive = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await findAndArchive(fullPath);
          } else if (entry.name === "session.json") {
            try {
              let shouldArchive = true;

              if (beforeDate) {
                const content = await fs.readFile(fullPath, "utf-8");
                const session = JSON.parse(content) as Session;
                shouldArchive = new Date(session.timestamp) < beforeDate;
              }

              if (shouldArchive) {
                const sessionDir = path.dirname(fullPath);
                const relPath = path.relative(vaultSessionsPath, sessionDir);
                const archivePath = path.join(archiveDir, relPath);
                await fs.mkdir(path.dirname(archivePath), { recursive: true });
                await fs.rename(sessionDir, archivePath);
                archived++;
              }
            } catch {
              // Skip invalid sessions
            }
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    await findAndArchive(vaultSessionsPath);

    if (archived > 0) {
      await logger.info("Sessions archived by vault", {
        vault: nodeId,
        count: archived,
        beforeDate: beforeDate?.toISOString(),
      });
    }
  } catch (error) {
    await logger.warn("Failed to archive sessions by vault", {
      vault: nodeId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return archived;
}

/**
 * Export sessions to CSV (for analysis)
 *
 * @param sessions - Sessions to export
 * @returns CSV string
 */
export function exportSessionsToCSV(sessions: Session[]): string {
  const headers =
    "Timestamp,Vault,Command,Provider,Status,Duration(ms),ContextSize,TotalPromptSize";
  const rows = sessions.map(
    (s) =>
      `${s.timestamp},${s.nodeId},${s.command},${s.provider},${s.status},${s.executionTimeMs ?? 0},${s.prompt?.metadata?.contextSize ?? 0},${s.prompt?.metadata?.total ?? 0}`
  );

  return [headers, ...rows].join("\n");
}

/**
 * Extract and save session memory
 *
 * Auto-extracts memory from a completed session and saves it alongside session files
 *
 * @param sessionPath - Full path to session directory
 * @param session - Session object
 * @param vaultContext - Vault context (.bozly/context.md content)
 * @param commandContent - Command content
 * @param executionOutput - AI response output
 * @returns SessionMemory object or null if extraction failed
 */
export async function extractAndSaveMemory(
  sessionPath: string,
  session: Session,
  vaultContext?: string,
  commandContent?: string,
  executionOutput?: string
): Promise<SessionMemory | null> {
  try {
    const extractionInput = {
      session,
      vaultContext,
      commandContent,
      executionOutput,
      executionTimeMs: session.executionTimeMs,
    };

    // Extract memory using MemoryExtractor
    const memory = MemoryExtractor.extract(extractionInput, "sessionEnd");
    const vaultType = vaultContext?.toLowerCase().includes("music")
      ? "music"
      : vaultContext?.toLowerCase().includes("project")
        ? "project"
        : vaultContext?.toLowerCase().includes("journal")
          ? "journal"
          : "generic";

    const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", vaultType);

    // Convert to markdown
    const memoryMarkdown = MemoryExtractor.toMarkdown(memory, metadata);

    // Save memory.md
    const memoryPath = path.join(sessionPath, "memory.md");
    await fs.writeFile(memoryPath, memoryMarkdown, "utf-8");

    // Save metadata.json
    const metadataPath = path.join(sessionPath, "metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

    logger.debug(`Extracted and saved memory for session ${session.id}`);
    return memory;
  } catch (error) {
    logger.warn(`Failed to extract memory for session ${session.id}: ${String(error)}`);
    return null;
  }
}

/**
 * Index a session's memory
 *
 * Adds memory entry to the global memory index for cross-vault querying
 *
 * @param bozlyBasePath - Base path to .bozly directory (~/.bozly)
 * @param memory - SessionMemory object
 * @param sessionPath - Full path to session directory
 */
export async function indexSessionMemory(
  bozlyBasePath: string,
  memory: SessionMemory,
  sessionPath: string
): Promise<void> {
  try {
    const indexPath = path.join(bozlyBasePath, "memory-index.json");
    const memoryIndex = new MemoryIndex(indexPath);

    await memoryIndex.load();

    const metadata: MemoryMetadata = {
      sessionId: memory.sessionId,
      nodeId: memory.nodeId,
      nodeName: memory.nodeName,
      timestamp: memory.timestamp,
      durationMinutes: memory.durationMinutes,
      tokenCount: memory.tokenCount,
      aiProvider: memory.aiProvider,
      command: memory.command,
      memoryAutoExtracted: true,
      extractionTrigger: "sessionEnd",
      tags: memory.tags,
      relevantPreviousSessions: memory.relevantSessions ?? [],
      summary: memory.summary,
    };

    const memoryPath = path.join(sessionPath, "memory.md");
    await memoryIndex.addEntry(metadata, memoryPath);

    logger.debug(`Indexed memory for session ${memory.sessionId}`);
  } catch (error) {
    logger.warn(`Failed to index memory for session ${memory.sessionId}: ${String(error)}`);
  }
}

/**
 * Load past memories for a vault
 *
 * Loads relevant past session memories for context injection
 *
 * @param bozlyBasePath - Base path to .bozly directory (~/.bozly)
 * @param nodeId - Node/vault ID
 * @param limit - Maximum number of memories to load (default: 3)
 * @returns Array of memory markdown content
 */
export async function loadPastMemories(
  bozlyBasePath: string,
  nodeId: string,
  limit = 3
): Promise<string[]> {
  try {
    const sessionsPath = path.join(bozlyBasePath, "sessions");
    return await MemoryLoader.loadRelevantMemories(sessionsPath, nodeId, {
      limit,
      maxAge: 30,
      sortBy: "recent",
    });
  } catch (error) {
    logger.debug(`Failed to load past memories: ${String(error)}`);
    return [];
  }
}

/**
 * Inject memories into prompt context
 *
 * Prepends past memories to the context for continuity
 *
 * @param baseContext - Original context text
 * @param memories - Array of memory markdown strings
 * @returns Enhanced context with memories injected
 */
export function injectMemoriesIntoContext(baseContext: string, memories: string[]): string {
  return MemoryLoader.injectMemoriesIntoContext(baseContext, memories);
}
