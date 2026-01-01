/**
 * Tests for Work Log Manager Module
 *
 * Tests WORK-LOG.md parsing, session context restoration, TASKS.md parsing,
 * and work session initialization.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseWorkLog,
  findLatestSession,
  extractSessionContext,
  parseTasksFile,
  initializeWorkSession,
  formatSessionStart,
  formatSessionStartVerbose,
  type SessionMetadata,
  type TaskItem,
} from "../../src/core/work-log-manager.js";
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Test fixtures
const sampleWorkLog = `# BOZLY - Work Log
Session continuity across Claude CLI, Claude Code, and claude.ai web.

---

## 2026-01-01 (SESSION 167) - Phase B Command 3: bozly provider-detection [COMPLETE] ✅

**Status:** Complete — \`bozly provider-detection\` command fully implemented and tested
**Session Focus:** Build third Phase B priority command (auto-detect AI provider CLI installations)
**Time:** ~1.5 hours
**Quality Rating:** 10/10 ⭐

### Completed Work:
- Created \`src/core/provider-detection.ts\` (360 lines)
- All tests passing ✅

---

## 2026-01-01 (SESSION 166) - Phase B Command 2: bozly validate [COMPLETE] ✅

**Status:** Complete — \`bozly validate\` command fully implemented and tested
**Session Focus:** Build second Phase B priority command (vault configuration validation)
**Time:** ~1.5 hours
**Quality Rating:** 9/10 ⭐

### Completed Work:
- Created \`src/core/validate.ts\` (660 lines)
- All tests passing ✅

---

## 2025-12-31 (SESSION 165) - Phase B Command 1: bozly diagnose [COMPLETE] ✅

**Status:** Complete — \`bozly diagnose\` command fully implemented
**Time:** ~2 hours
**Quality Rating:** 10/10 ⭐

### Completed Work:
- Created complete diagnostic system
`;

const sampleTasksFile = `# Active Tasks - BOZLY Framework

**Last updated:** 2025-12-31

## Phase B: Priority Commands (Sessions 165-170)

- [x] Session 165: Command 1 (bozly diagnose)
- [x] Session 166: Command 2 (bozly validate)
- [x] Session 167: Command 3 (bozly provider-detection)
- [ ] Session 168: Command 4 (bozly work-log-start)
- [ ] Session 169: Command 5 (bozly work-log-end)

## Other Tasks

- [x] Complete Phase 1 implementation
- [ ] Document API endpoints
- [ ] Write user guide
`;

describe("Work Log Manager", () => {
  let tempDir: string;
  let workLogPath: string;
  let tasksPath: string;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = join(tmpdir(), `bozly-test-${Date.now()}-${Math.random()}`);
    workLogPath = join(tempDir, "WORK-LOG.md");
    tasksPath = join(tempDir, "TASKS.md");
    // Create the temp directory if it doesn't exist
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    try {
      if (existsSync(workLogPath)) {
        unlinkSync(workLogPath);
      }
      if (existsSync(tasksPath)) {
        unlinkSync(tasksPath);
      }
      if (existsSync(tempDir)) {
        rmdirSync(tempDir, { force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("parseWorkLog", () => {
    it("should parse a valid WORK-LOG.md file", () => {
      writeFileSync(workLogPath, sampleWorkLog);

      const sessions = parseWorkLog(workLogPath);

      expect(sessions).toBeInstanceOf(Array);
      expect(sessions.length).toBeGreaterThan(0);
    });

    it("should extract session metadata correctly", () => {
      writeFileSync(workLogPath, sampleWorkLog);

      const sessions = parseWorkLog(workLogPath);
      const session167 = sessions.find((s) => s.sessionNumber === 167);

      expect(session167).toBeDefined();
      expect(session167!.date).toBe("2026-01-01");
      expect(session167!.sessionNumber).toBe(167);
      expect(session167!.title).toContain("bozly provider-detection");
      expect(session167!.status).toContain("Complete");
    });

    it("should extract session focus", () => {
      writeFileSync(workLogPath, sampleWorkLog);

      const sessions = parseWorkLog(workLogPath);
      const session167 = sessions.find((s) => s.sessionNumber === 167);

      expect(session167!.focus).toBe(
        "Build third Phase B priority command (auto-detect AI provider CLI installations)"
      );
    });

    it("should extract time spent", () => {
      writeFileSync(workLogPath, sampleWorkLog);

      const sessions = parseWorkLog(workLogPath);
      const session167 = sessions.find((s) => s.sessionNumber === 167);

      expect(session167!.time).toBe("~1.5 hours");
    });

    it("should extract quality rating", () => {
      writeFileSync(workLogPath, sampleWorkLog);

      const sessions = parseWorkLog(workLogPath);
      const session167 = sessions.find((s) => s.sessionNumber === 167);

      expect(session167!.qualityRating).toBe("10/10 ⭐");
    });

    it("should include raw content for each session", () => {
      writeFileSync(workLogPath, sampleWorkLog);

      const sessions = parseWorkLog(workLogPath);

      for (const session of sessions) {
        expect(session.rawContent).toBeDefined();
        expect(session.rawContent.length).toBeGreaterThan(0);
        expect(session.rawContent).toContain(`SESSION ${session.sessionNumber}`);
      }
    });

    it("should return empty array for non-existent file", () => {
      const sessions = parseWorkLog("/non/existent/path/WORK-LOG.md");

      expect(sessions).toEqual([]);
    });

    it("should parse multiple sessions in order", () => {
      writeFileSync(workLogPath, sampleWorkLog);

      const sessions = parseWorkLog(workLogPath);

      // Sessions should be in reverse chronological order (newest first)
      expect(sessions[0].sessionNumber).toBeGreaterThanOrEqual(
        sessions[1].sessionNumber
      );
    });

    it("should handle sessions without optional fields", () => {
      const minimalLog = `# Work Log

## 2026-01-01 (SESSION 1) - Simple Task [COMPLETE]

**Status:** Done

### Work:
- Completed task
`;

      writeFileSync(workLogPath, minimalLog);
      const sessions = parseWorkLog(workLogPath);

      expect(sessions.length).toBe(1);
      expect(sessions[0].sessionNumber).toBe(1);
      expect(sessions[0].focus).toBeUndefined();
      expect(sessions[0].time).toBeUndefined();
      expect(sessions[0].qualityRating).toBeUndefined();
    });
  });

  describe("findLatestSession", () => {
    it("should return null for empty array", () => {
      const result = findLatestSession([]);

      expect(result).toBeNull();
    });

    it("should return the first session (most recent)", () => {
      writeFileSync(workLogPath, sampleWorkLog);
      const sessions = parseWorkLog(workLogPath);

      const latest = findLatestSession(sessions);

      expect(latest).toBeDefined();
      expect(latest!.sessionNumber).toBe(167); // First session in file
    });

    it("should preserve all session properties", () => {
      writeFileSync(workLogPath, sampleWorkLog);
      const sessions = parseWorkLog(workLogPath);

      const latest = findLatestSession(sessions);

      expect(latest!.date).toBeDefined();
      expect(latest!.sessionNumber).toBeDefined();
      expect(latest!.title).toBeDefined();
      expect(latest!.status).toBeDefined();
      expect(latest!.rawContent).toBeDefined();
    });
  });

  describe("extractSessionContext", () => {
    it("should format session context as readable string", () => {
      const session: SessionMetadata = {
        date: "2026-01-01",
        sessionNumber: 167,
        title: "Phase B Command 3: bozly provider-detection",
        status: "Complete",
        focus: "Auto-detect AI provider CLI installations",
        time: "~1.5 hours",
        qualityRating: "10/10 ⭐",
        rawContent: "",
      };

      const context = extractSessionContext(session);

      expect(context).toContain("Session 167");
      expect(context).toContain("Phase B Command 3");
      expect(context).toContain("2026-01-01");
      expect(context).toContain("Complete");
      expect(context).toContain("Auto-detect AI provider CLI");
    });

    it("should include time if present", () => {
      const session: SessionMetadata = {
        date: "2026-01-01",
        sessionNumber: 1,
        title: "Test",
        status: "Complete",
        time: "~2 hours",
        rawContent: "",
      };

      const context = extractSessionContext(session);

      expect(context).toContain("~2 hours");
    });

    it("should omit optional fields if not present", () => {
      const session: SessionMetadata = {
        date: "2026-01-01",
        sessionNumber: 1,
        title: "Test",
        status: "Complete",
        rawContent: "",
      };

      const context = extractSessionContext(session);

      expect(context).not.toContain("Focus:");
      expect(context).not.toContain("Time:");
      expect(context).not.toContain("Quality:");
    });
  });

  describe("parseTasksFile", () => {
    it("should parse a valid TASKS.md file", () => {
      writeFileSync(tasksPath, sampleTasksFile);

      const tasks = parseTasksFile(tasksPath);

      expect(tasks).toBeInstanceOf(Array);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it("should correctly identify completed tasks", () => {
      writeFileSync(tasksPath, sampleTasksFile);

      const tasks = parseTasksFile(tasksPath);
      const completedTasks = tasks.filter((t) => t.completed);

      expect(completedTasks.length).toBeGreaterThan(0);
      expect(completedTasks.some((t) => t.text.includes("Session 165"))).toBe(true);
    });

    it("should correctly identify pending tasks", () => {
      writeFileSync(tasksPath, sampleTasksFile);

      const tasks = parseTasksFile(tasksPath);
      const pendingTasks = tasks.filter((t) => !t.completed);

      expect(pendingTasks.length).toBeGreaterThan(0);
      expect(pendingTasks.some((t) => t.text.includes("Session 168"))).toBe(true);
    });

    it("should extract task text correctly", () => {
      writeFileSync(tasksPath, sampleTasksFile);

      const tasks = parseTasksFile(tasksPath);
      const firstTask = tasks[0];

      expect(firstTask.text).toBeDefined();
      expect(firstTask.text.length).toBeGreaterThan(0);
      expect(typeof firstTask.text).toBe("string");
    });

    it("should generate unique task IDs", () => {
      writeFileSync(tasksPath, sampleTasksFile);

      const tasks = parseTasksFile(tasksPath);
      const ids = tasks.map((t) => t.id);

      // Check for uniqueness
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(tasks.length);
    });

    it("should return empty array for non-existent file", () => {
      const tasks = parseTasksFile("/non/existent/path/TASKS.md");

      expect(tasks).toEqual([]);
    });

    it("should handle various task formats", () => {
      const taskLog = `## Tasks

- [ ] Pending task one
- [x] Completed task one
- [ ] Another pending task
- [X] Another completed (uppercase X)
`;

      writeFileSync(tasksPath, taskLog);
      const tasks = parseTasksFile(tasksPath);

      expect(tasks.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle task items with special characters", () => {
      const taskLog = `# Tasks

- [ ] Task with \`code\` and **bold**
- [x] Task with emoji 🎉 and (parentheses)
- [ ] Task with [links](https://example.com)
`;

      writeFileSync(tasksPath, taskLog);
      const tasks = parseTasksFile(tasksPath);

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.some((t) => t.text.includes("emoji"))).toBe(true);
    });
  });

  describe("initializeWorkSession", () => {
    it("should return fresh start when no files exist", () => {
      const result = initializeWorkSession(
        join(tempDir, "non-existent-log.md"),
        join(tempDir, "non-existent-tasks.md")
      );

      expect(result.isFreshStart).toBe(true);
      expect(result.latestSession).toBeNull();
      expect(result.tasks).toEqual([]);
      expect(result.initializedAt).toBeDefined();
    });

    it("should restore session context when WORK-LOG exists", () => {
      writeFileSync(workLogPath, sampleWorkLog);

      const result = initializeWorkSession(workLogPath, tasksPath);

      expect(result.isFreshStart).toBe(false);
      expect(result.latestSession).toBeDefined();
      expect(result.latestSession!.sessionNumber).toBe(167);
    });

    it("should restore tasks when TASKS.md exists", () => {
      writeFileSync(workLogPath, sampleWorkLog);
      writeFileSync(tasksPath, sampleTasksFile);

      const result = initializeWorkSession(workLogPath, tasksPath);

      expect(result.tasks.length).toBeGreaterThan(0);
    });

    it("should return valid ISO timestamp", () => {
      const result = initializeWorkSession(
        join(tempDir, "non-existent.md"),
        join(tempDir, "non-existent.md")
      );

      expect(() => new Date(result.initializedAt)).not.toThrow();
      expect(result.initializedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("formatSessionStart", () => {
    it("should format output for fresh start", () => {
      const sessionInit = {
        latestSession: null,
        tasks: [],
        isFreshStart: true,
        initializedAt: new Date().toISOString(),
      };

      const output = formatSessionStart(sessionInit);

      expect(output).toContain("📝 WORK SESSION STARTED");
      expect(output).toContain("Fresh start");
      expect(output).toContain("🚀");
    });

    it("should format output with session context", () => {
      const sessionInit = {
        latestSession: {
          date: "2026-01-01",
          sessionNumber: 167,
          title: "Phase B Command 3",
          status: "Complete",
          focus: "Build provider detection",
          time: "~1.5 hours",
          qualityRating: "10/10 ⭐",
          rawContent: "",
        },
        tasks: [],
        isFreshStart: false,
        initializedAt: new Date().toISOString(),
      };

      const output = formatSessionStart(sessionInit);

      expect(output).toContain("Session Context Restored");
      expect(output).toContain("Session 167");
      expect(output).toContain("Phase B Command 3");
    });

    it("should format output with tasks", () => {
      const sessionInit = {
        latestSession: {
          date: "2026-01-01",
          sessionNumber: 167,
          title: "Test",
          status: "Complete",
          rawContent: "",
        },
        tasks: [
          { completed: false, text: "Task one", id: "t1" },
          { completed: false, text: "Task two", id: "t2" },
          { completed: true, text: "Task three", id: "t3" },
        ],
        isFreshStart: false,
        initializedAt: new Date().toISOString(),
      };

      const output = formatSessionStart(sessionInit);

      expect(output).toContain("📋 Active Tasks");
      expect(output).toContain("Task one");
      expect(output).toContain("Completed");
      expect(output).toContain("Task three");
    });

    it("should include all required sections", () => {
      const sessionInit = {
        latestSession: {
          date: "2026-01-01",
          sessionNumber: 1,
          title: "Test",
          status: "Complete",
          rawContent: "",
        },
        tasks: [],
        isFreshStart: false,
        initializedAt: new Date().toISOString(),
      };

      const output = formatSessionStart(sessionInit);

      expect(output).toContain("═══════════════════════════════════════════");
      expect(output).toContain("📝 WORK SESSION STARTED");
      expect(output).toContain("🚀");
    });
  });

  describe("formatSessionStartVerbose", () => {
    it("should include verbose session details", () => {
      const sessionInit = {
        latestSession: {
          date: "2026-01-01",
          sessionNumber: 167,
          title: "Phase B Command 3",
          status: "Complete",
          time: "~1.5 hours",
          qualityRating: "10/10 ⭐",
          rawContent: "",
        },
        tasks: [],
        isFreshStart: false,
        initializedAt: new Date().toISOString(),
      };

      const output = formatSessionStartVerbose(sessionInit);

      expect(output).toContain("Detailed Session Info");
      expect(output).toContain("~1.5 hours");
      expect(output).toContain("10/10 ⭐");
      expect(output).toContain("Session Number: 167");
    });

    it("should include initialized timestamp", () => {
      const sessionInit = {
        latestSession: null,
        tasks: [],
        isFreshStart: true,
        initializedAt: new Date().toISOString(),
      };

      const output = formatSessionStartVerbose(sessionInit);

      expect(output).toContain("Initialized:");
    });

    it("should handle missing optional fields gracefully", () => {
      const sessionInit = {
        latestSession: {
          date: "2026-01-01",
          sessionNumber: 1,
          title: "Test",
          status: "Complete",
          rawContent: "",
        },
        tasks: [],
        isFreshStart: false,
        initializedAt: new Date().toISOString(),
      };

      const output = formatSessionStartVerbose(sessionInit);

      expect(output).toContain("Session Number: 1");
      // Should not error even though time and qualityRating are missing
      expect(output).toBeDefined();
    });
  });

  describe("Integration Tests", () => {
    it("should parse real WORK-LOG.md and TASKS.md together", () => {
      writeFileSync(workLogPath, sampleWorkLog);
      writeFileSync(tasksPath, sampleTasksFile);

      const result = initializeWorkSession(workLogPath, tasksPath);

      expect(result.latestSession).toBeDefined();
      expect(result.latestSession!.sessionNumber).toBe(167);
      expect(result.tasks.length).toBeGreaterThan(0);

      const formatted = formatSessionStart(result);
      expect(formatted).toContain("Session 167");
      expect(formatted).toContain("Session 168");
    });

    it("should handle WORK-LOG without TASKS.md", () => {
      writeFileSync(workLogPath, sampleWorkLog);
      // Don't create TASKS.md

      const result = initializeWorkSession(workLogPath, tasksPath);

      expect(result.latestSession).toBeDefined();
      expect(result.tasks).toEqual([]);
    });

    it("should handle TASKS.md without WORK-LOG", () => {
      // Don't create WORK-LOG.md
      writeFileSync(tasksPath, sampleTasksFile);

      const result = initializeWorkSession(workLogPath, tasksPath);

      expect(result.isFreshStart).toBe(true);
      expect(result.latestSession).toBeNull();
      expect(result.tasks.length).toBeGreaterThan(0);
    });

    it("should complete full workflow: parse -> extract -> format", () => {
      writeFileSync(workLogPath, sampleWorkLog);
      writeFileSync(tasksPath, sampleTasksFile);

      const sessionInit = initializeWorkSession(workLogPath, tasksPath);
      const basicFormat = formatSessionStart(sessionInit);
      const verboseFormat = formatSessionStartVerbose(sessionInit);

      expect(basicFormat).toContain("Session 167");
      expect(verboseFormat).toContain("Session 167");
      expect(verboseFormat.length).toBeGreaterThan(basicFormat.length);
    });
  });
});
