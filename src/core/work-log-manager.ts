/**
 * Work Log Management and Session Context Restoration
 *
 * Parses WORK-LOG.md to restore session context and TASKS.md for task restoration.
 * Enables work continuity across sessions with automatic context injection.
 *
 * Used by `bozly work-log-start` to initialize new sessions with previous context.
 *
 * @module core/work-log-manager
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Metadata extracted from a work log session entry
 */
export interface SessionMetadata {
  /** Session date (e.g., '2026-01-01') */
  date: string;
  /** Session number (e.g., 167) */
  sessionNumber: number;
  /** Session title (e.g., 'Phase B Command 3: bozly provider-detection') */
  title: string;
  /** Completion status (e.g., 'COMPLETE', 'IN PROGRESS') */
  status: string;
  /** Session focus description */
  focus?: string;
  /** Estimated time spent (e.g., '~1.5 hours') */
  time?: string;
  /** Quality rating (e.g., '10/10') */
  qualityRating?: string;
  /** Raw session section content */
  rawContent: string;
}

/**
 * Task item extracted from TASKS.md
 */
export interface TaskItem {
  /** Task checkbox status (true = completed, false = pending) */
  completed: boolean;
  /** Task description text */
  text: string;
  /** Task ID (derived from text hash for uniqueness) */
  id: string;
}

/**
 * Work session initialization result
 */
export interface WorkSessionInit {
  /** Latest session metadata */
  latestSession: SessionMetadata | null;
  /** Tasks restored from TASKS.md (if any) */
  tasks: TaskItem[];
  /** Whether this is a fresh start (no work log found) */
  isFreshStart: boolean;
  /** Timestamp of initialization */
  initializedAt: string;
}

/**
 * Parse WORK-LOG.md file and extract session entries
 *
 * Looks for patterns like:
 * `## 2026-01-01 (SESSION 167) - Title [STATUS] ✅`
 *
 * @param filePath - Path to WORK-LOG.md
 * @returns Array of session metadata, sorted by date (newest first)
 */
export function parseWorkLog(filePath: string): SessionMetadata[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const sessions: SessionMetadata[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Match session headers: ## 2026-01-01 (SESSION 167) - Title [STATUS] ✅
    const sessionMatch = line.match(
      /^## (\d{4}-\d{2}-\d{2}) \(SESSION (\d+)\) - (.+?)(?: \[([^\]]+)\])?\s*(✅|❌)?$/
    );

    if (sessionMatch) {
      const date = sessionMatch[1];
      const sessionNumber = parseInt(sessionMatch[2], 10);
      const title = sessionMatch[3].trim();
      const status = sessionMatch[4] || "IN PROGRESS";

      // Collect the session section until next ## or end of file
      let rawContent = `${line}\n`;
      i++;

      while (i < lines.length && !lines[i].startsWith("##")) {
        rawContent += `${lines[i]}\n`;
        i++;
      }

      // Extract focus from Status field if available
      const statusMatch = rawContent.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/);
      const statusDescription = statusMatch ? statusMatch[1].trim() : "";

      const focusMatch = rawContent.match(/\*\*Session Focus:\*\*\s*(.+?)(?:\n|$)/);
      const focus = focusMatch ? focusMatch[1].trim() : undefined;

      const timeMatch = rawContent.match(/\*\*Time:\*\*\s*(.+?)(?:\n|$)/);
      const time = timeMatch ? timeMatch[1].trim() : undefined;

      const qualityMatch = rawContent.match(/\*\*Quality Rating:\*\*\s*(.+?)(?:\n|$)/);
      const qualityRating = qualityMatch ? qualityMatch[1].trim() : undefined;

      sessions.push({
        date,
        sessionNumber,
        title,
        status: statusDescription || status,
        focus,
        time,
        qualityRating,
        rawContent,
      });
    } else {
      i++;
    }
  }

  return sessions;
}

/**
 * Find the latest session from parsed work log
 *
 * @param sessions - Array of sessions from parseWorkLog()
 * @returns Latest session or null if no sessions found
 */
export function findLatestSession(sessions: SessionMetadata[]): SessionMetadata | null {
  if (sessions.length === 0) {
    return null;
  }

  // Sessions are already in order from parseWorkLog, newest first
  return sessions[0];
}

/**
 * Extract session context metadata
 *
 * @param session - Session metadata to extract from
 * @returns Formatted context description
 */
export function extractSessionContext(session: SessionMetadata): string {
  let context = `Session ${session.sessionNumber}: ${session.title}\n`;
  context += `Date: ${session.date}\n`;
  context += `Status: ${session.status}\n`;

  if (session.focus) {
    context += `Focus: ${session.focus}\n`;
  }
  if (session.time) {
    context += `Time: ${session.time}\n`;
  }
  if (session.qualityRating) {
    context += `Quality: ${session.qualityRating}\n`;
  }

  return context;
}

/**
 * Parse TASKS.md file to extract task items
 *
 * Looks for patterns like:
 * - [ ] Task description
 * - [x] Completed task description
 *
 * @param filePath - Path to TASKS.md
 * @returns Array of task items
 */
export function parseTasksFile(filePath: string): TaskItem[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const tasks: TaskItem[] = [];

  for (const line of lines) {
    // Match task items: - [x] or - [ ] followed by text
    const taskMatch = line.match(/^\s*-\s+\[([x\s])\]\s+(.+)$/i);

    if (taskMatch) {
      const completed = taskMatch[1].toLowerCase() === "x";
      const text = taskMatch[2].trim();

      // Generate a simple task ID from text hash
      const id = `task_${Math.abs(hashCode(text)).toString(16)}`;

      tasks.push({
        completed,
        text,
        id,
      });
    }
  }

  return tasks;
}

/**
 * Simple hash function for generating task IDs
 * @internal
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Initialize a work session with context restoration
 *
 * Loads WORK-LOG.md from the current working directory and optional TASKS.md
 * for task restoration. Returns session metadata and task list.
 *
 * @param workLogPath - Path to WORK-LOG.md (default: ./WORK-LOG.md)
 * @param tasksPath - Path to TASKS.md (default: ./TASKS.md)
 * @returns Work session initialization result with restored context
 */
export function initializeWorkSession(
  workLogPath: string = "./WORK-LOG.md",
  tasksPath: string = "./TASKS.md"
): WorkSessionInit {
  const resolvedWorkLogPath = resolve(workLogPath);
  const resolvedTasksPath = resolve(tasksPath);

  // Parse work log
  const sessions = parseWorkLog(resolvedWorkLogPath);
  const latestSession = findLatestSession(sessions);

  // Parse tasks if file exists
  const tasks = parseTasksFile(resolvedTasksPath);

  const isFreshStart = sessions.length === 0;

  return {
    latestSession,
    tasks,
    isFreshStart,
    initializedAt: new Date().toISOString(),
  };
}

/**
 * Format session context for display
 *
 * @param sessionInit - Work session initialization result
 * @returns Formatted output string
 */
export function formatSessionStart(sessionInit: WorkSessionInit): string {
  let output = "📝 WORK SESSION STARTED\n";
  output += "═══════════════════════════════════════════\n\n";

  if (sessionInit.isFreshStart) {
    output += "🆕 Fresh start — No previous session context found.\n";
  } else if (sessionInit.latestSession) {
    output += "📖 Session Context Restored:\n";
    output += `  Previous: Session ${sessionInit.latestSession.sessionNumber} - ${sessionInit.latestSession.title}\n`;
    output += `  Status: ${sessionInit.latestSession.status}\n`;

    if (sessionInit.latestSession.focus) {
      output += `  Focus: ${sessionInit.latestSession.focus}\n`;
    }
  }

  if (sessionInit.tasks.length > 0) {
    output += "\n📋 Active Tasks:\n";

    const pendingTasks = sessionInit.tasks.filter((t) => !t.completed);
    const completedTasks = sessionInit.tasks.filter((t) => t.completed);

    if (pendingTasks.length > 0) {
      for (const task of pendingTasks) {
        output += `  ☐ ${task.text}\n`;
      }
    }

    if (completedTasks.length > 0) {
      output += "\n  Completed:\n";
      for (const task of completedTasks) {
        output += `  ✓ ${task.text}\n`;
      }
    }
  } else if (!sessionInit.isFreshStart) {
    output += "\n📋 No active tasks found.\n";
  }

  output += "\n═══════════════════════════════════════════\n";
  output += "🚀 Ready to continue work!\n";

  return output;
}

/**
 * Format session context with verbose details
 *
 * @param sessionInit - Work session initialization result
 * @returns Detailed formatted output string
 */
export function formatSessionStartVerbose(sessionInit: WorkSessionInit): string {
  let output = formatSessionStart(sessionInit);

  if (!sessionInit.isFreshStart && sessionInit.latestSession) {
    output += "\n📊 Detailed Session Info:\n";
    output += "───────────────────────────────────────────\n";

    if (sessionInit.latestSession.time) {
      output += `  ⏱️  Time Spent: ${sessionInit.latestSession.time}\n`;
    }
    if (sessionInit.latestSession.qualityRating) {
      output += `  ⭐ Quality Rating: ${sessionInit.latestSession.qualityRating}\n`;
    }

    output += `  📅 Date: ${sessionInit.latestSession.date}\n`;
    output += `  🔢 Session Number: ${sessionInit.latestSession.sessionNumber}\n`;
  }

  output += `  ⏰ Initialized: ${new Date(sessionInit.initializedAt).toLocaleString()}\n`;

  return output;
}
