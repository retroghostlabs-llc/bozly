/**
 * Workflow System Tests
 *
 * Tests for workflow discovery, loading, validation, execution, and context interpolation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  discoverWorkflows,
  loadWorkflow,
  validateWorkflow,
  interpolateStepContext,
  executeWorkflow,
  executeWorkflowStep,
} from "../src/core/workflows.js";
import {
  Workflow,
  WorkflowStep,
  WorkflowStepResult,
  Registry,
  NodeInfo,
} from "../src/core/types.js";

let testDir: string;
let nodeDir: string;
let workflowsDir: string;

// Sample registry for validation tests
const mockRegistry: Registry = {
  version: "1.0.0",
  nodes: [
    {
      id: "music",
      name: "Music Node",
      path: "/music",
      type: "music",
      active: true,
      created: "2025-12-20T00:00:00Z",
    },
    {
      id: "journal",
      name: "Journal Node",
      path: "/journal",
      type: "journal",
      active: true,
      created: "2025-12-20T00:00:00Z",
    },
  ],
  created: "2025-12-20T00:00:00Z",
  lastUpdated: "2025-12-20T00:00:00Z",
};

// Sample valid workflow
const validWorkflow: Workflow = {
  id: "daily",
  name: "Daily Routine",
  description: "Run daily tasks",
  version: "1.0.0",
  created: "2025-12-20T00:00:00Z",
  steps: [
    {
      id: "journal-entry",
      description: "Create journal entry",
      node: "journal",
      command: "morning",
      timeout: 300000,
      onError: "stop",
    },
    {
      id: "music-prep",
      description: "Prepare music notes",
      node: "music",
      command: "daily-notes",
      timeout: 300000,
      onError: "continue",
      context: {
        date: "{{ now | date:'YYYY-MM-DD' }}",
      },
    },
  ],
};

beforeEach(async () => {
  // Create temporary test directory
  testDir = await fs.mkdtemp(path.join(os.tmpdir(), "bozly-workflows-"));
  nodeDir = path.join(testDir, "test-node");
  workflowsDir = path.join(nodeDir, ".bozly", "workflows");

  await fs.mkdir(workflowsDir, { recursive: true });
});

afterEach(async () => {
  // Cleanup test directory
  if (testDir) {
    await fs.rm(testDir, { recursive: true, force: true });
  }
});

describe("Workflows Module", () => {
  describe("discoverWorkflows", () => {
    it("discovers workflows from node directory", async () => {
      // Create sample workflow files
      await fs.writeFile(
        path.join(workflowsDir, "daily.json"),
        JSON.stringify(validWorkflow)
      );

      const dailyWorkflow: Workflow = {
        ...validWorkflow,
        id: "weekly",
        name: "Weekly Review",
      };
      await fs.writeFile(
        path.join(workflowsDir, "weekly.json"),
        JSON.stringify(dailyWorkflow)
      );

      const workflows = await discoverWorkflows(nodeDir);

      expect(workflows).toHaveLength(2);
      expect(workflows.map((w) => w.id).sort()).toEqual(["daily", "weekly"]);
    });

    it("returns empty array if workflows directory doesn't exist", async () => {
      const workflows = await discoverWorkflows(testDir);
      expect(workflows).toEqual([]);
    });

    it("ignores invalid workflow files", async () => {
      // Valid workflow
      await fs.writeFile(
        path.join(workflowsDir, "daily.json"),
        JSON.stringify(validWorkflow)
      );

      // Invalid JSON
      await fs.writeFile(path.join(workflowsDir, "invalid.json"), "not json");

      // Invalid workflow structure (missing required fields)
      await fs.writeFile(
        path.join(workflowsDir, "broken.json"),
        JSON.stringify({ id: "broken" })
      );

      const workflows = await discoverWorkflows(nodeDir);

      expect(workflows).toHaveLength(1);
      expect(workflows[0].id).toBe("daily");
    });

    it("sorts workflows alphabetically", async () => {
      for (const id of ["z-last", "a-first", "m-middle"]) {
        const workflow: Workflow = {
          ...validWorkflow,
          id,
          name: id,
        };
        await fs.writeFile(
          path.join(workflowsDir, `${id}.json`),
          JSON.stringify(workflow)
        );
      }

      const workflows = await discoverWorkflows(nodeDir);

      expect(workflows.map((w) => w.id)).toEqual(["a-first", "m-middle", "z-last"]);
    });
  });

  describe("loadWorkflow", () => {
    it("loads a workflow from node directory", async () => {
      await fs.writeFile(
        path.join(workflowsDir, "daily.json"),
        JSON.stringify(validWorkflow)
      );

      const workflow = await loadWorkflow(nodeDir, "daily");

      expect(workflow).not.toBeNull();
      expect(workflow?.id).toBe("daily");
      expect(workflow?.steps).toHaveLength(2);
    });

    it("returns null if workflow not found", async () => {
      const workflow = await loadWorkflow(nodeDir, "nonexistent");
      expect(workflow).toBeNull();
    });

    it("handles invalid JSON gracefully", async () => {
      await fs.writeFile(path.join(workflowsDir, "broken.json"), "not json");

      const workflow = await loadWorkflow(nodeDir, "broken");
      expect(workflow).toBeNull();
    });
  });

  describe("validateWorkflow", () => {
    it("validates a correct workflow", async () => {
      const errors = await validateWorkflow(validWorkflow, mockRegistry);
      expect(errors).toHaveLength(0);
    });

    it("detects missing workflow ID", async () => {
      const workflow: any = { ...validWorkflow, id: undefined };
      const errors = await validateWorkflow(workflow, mockRegistry);

      expect(errors.some((e) => e.field === "id")).toBe(true);
    });

    it("detects missing workflow name", async () => {
      const workflow: any = { ...validWorkflow, name: undefined };
      const errors = await validateWorkflow(workflow, mockRegistry);

      expect(errors.some((e) => e.field === "name")).toBe(true);
    });

    it("detects missing workflow version", async () => {
      const workflow: any = { ...validWorkflow, version: undefined };
      const errors = await validateWorkflow(workflow, mockRegistry);

      expect(errors.some((e) => e.field === "version")).toBe(true);
    });

    it("detects empty steps array", async () => {
      const workflow: Workflow = { ...validWorkflow, steps: [] };
      const errors = await validateWorkflow(workflow, mockRegistry);

      expect(errors.some((e) => e.field === "steps")).toBe(true);
    });

    it("detects invalid node references", async () => {
      const workflow: Workflow = {
        ...validWorkflow,
        steps: [
          {
            ...validWorkflow.steps[0],
            node: "nonexistent-node",
          },
        ],
      };
      const errors = await validateWorkflow(workflow, mockRegistry);

      expect(errors.some((e) => e.field === "node")).toBe(true);
    });

    it("detects duplicate step IDs", async () => {
      const workflow: Workflow = {
        ...validWorkflow,
        steps: [
          validWorkflow.steps[0],
          { ...validWorkflow.steps[1], id: validWorkflow.steps[0].id },
        ],
      };
      const errors = await validateWorkflow(workflow, mockRegistry);

      expect(errors.some((e) => e.field === "id")).toBe(true);
    });

    it("detects invalid onError values", async () => {
      const workflow: Workflow = {
        ...validWorkflow,
        steps: [{ ...validWorkflow.steps[0], onError: "invalid" as any }],
      };
      const errors = await validateWorkflow(workflow, mockRegistry);

      expect(errors.some((e) => e.field === "onError")).toBe(true);
    });

    it("detects invalid timeout values", async () => {
      const workflow: Workflow = {
        ...validWorkflow,
        steps: [{ ...validWorkflow.steps[0], timeout: -1000 }],
      };
      const errors = await validateWorkflow(workflow, mockRegistry);

      expect(errors.some((e) => e.field === "timeout")).toBe(true);
    });
  });

  describe("interpolateStepContext", () => {
    it("interpolates date variables", () => {
      const step: WorkflowStep = {
        id: "test",
        node: "music",
        command: "daily",
        onError: "stop",
        context: {
          date: "{{ now | date:'YYYY-MM-DD' }}",
        },
      };

      const context = interpolateStepContext(step, new Map());

      expect(context.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("interpolates previous step outputs", () => {
      const completedSteps = new Map<string, WorkflowStepResult>();
      completedSteps.set("step1", {
        stepId: "step1",
        status: "completed",
        duration: 1000,
        output: "Hello from step 1",
      });

      const step: WorkflowStep = {
        id: "step2",
        node: "music",
        command: "daily",
        onError: "stop",
        context: {
          previousOutput: "{{ steps.step1.output }}",
        },
      };

      const context = interpolateStepContext(step, completedSteps);

      expect(context.previousOutput).toBe("Hello from step 1");
    });

    it("returns empty context if no step context", () => {
      const step: WorkflowStep = {
        id: "test",
        node: "music",
        command: "daily",
        onError: "stop",
      };

      const context = interpolateStepContext(step, new Map());

      expect(context).toEqual({});
    });

    it("handles nested context objects", () => {
      const step: WorkflowStep = {
        id: "test",
        node: "music",
        command: "daily",
        onError: "stop",
        context: {
          nested: {
            date: "{{ now | date:'YYYY-MM-DD' }}",
            value: "static",
          },
        },
      };

      const context = interpolateStepContext(step, new Map());

      expect(context.nested).toBeDefined();
      expect(context.nested.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(context.nested.value).toBe("static");
    });

    it("handles arrays in context", () => {
      const step: WorkflowStep = {
        id: "test",
        node: "music",
        command: "daily",
        onError: "stop",
        context: {
          items: ["one", "two", "three"],
        },
      };

      const context = interpolateStepContext(step, new Map());

      expect(context.items).toEqual(["one", "two", "three"]);
    });
  });

  describe("executeWorkflow", () => {
    it("executes a simple workflow", async () => {
      const result = await executeWorkflow(validWorkflow);

      expect(result.workflowId).toBe("daily");
      expect(result.status).toBe("completed");
      expect(result.stepsCompleted).toBe(2);
      expect(result.stepsFailed).toBe(0);
      expect(result.steps).toHaveLength(2);
    });

    it("handles dry-run mode", async () => {
      const result = await executeWorkflow(validWorkflow, {
        dryRun: true,
      });

      expect(result.status).toBe("completed");
      expect(result.stepsCompleted).toBe(2);
      expect(result.steps.every((s) => s.status === "completed")).toBe(true);
    });

    it("skips specified steps", async () => {
      const result = await executeWorkflow(validWorkflow, {
        skipSteps: ["journal-entry"],
      });

      const skipped = result.steps.find((s) => s.stepId === "journal-entry");
      expect(skipped?.status).toBe("skipped");

      const completed = result.steps.find((s) => s.stepId === "music-prep");
      expect(completed?.status).toBe("completed");
    });

    it("records execution timing", async () => {
      const result = await executeWorkflow(validWorkflow);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeDefined();
    });

    it("counts steps correctly", async () => {
      const result = await executeWorkflow(validWorkflow);

      expect(result.stepsCompleted + result.stepsFailed + result.stepsSkipped).toBe(
        validWorkflow.steps.length
      );
    });

    it("handles verbose logging", async () => {
      const result = await executeWorkflow(validWorkflow, {
        verbose: true,
      });

      expect(result.status).toBe("completed");
    });
  });

  describe("executeWorkflowStep", () => {
    it("executes a workflow step", async () => {
      const step = validWorkflow.steps[0];
      const result = await executeWorkflowStep(
        validWorkflow,
        step,
        new Map()
      );

      expect(result.stepId).toBe("journal-entry");
      expect(result.status).toBe("completed");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("interpolates step context before execution", async () => {
      const step = validWorkflow.steps[1];
      const completedSteps = new Map<string, WorkflowStepResult>();
      completedSteps.set("journal-entry", {
        stepId: "journal-entry",
        status: "completed",
        duration: 1000,
        output: "Journal written",
      });

      const result = await executeWorkflowStep(
        validWorkflow,
        step,
        completedSteps
      );

      expect(result.stepId).toBe("music-prep");
      expect(result.status).toBe("completed");
    });
  });

  describe("Edge Cases", () => {
    it("handles workflows with no context", async () => {
      const workflow: Workflow = {
        ...validWorkflow,
        steps: [
          {
            ...validWorkflow.steps[0],
            context: undefined,
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.status).toBe("completed");
    });

    it("handles workflows with metadata", async () => {
      const workflow: Workflow = {
        ...validWorkflow,
        metadata: {
          frequency: "daily",
          bestTime: "09:00",
          tags: ["routine", "planning"],
        },
      };

      const result = await executeWorkflow(workflow);
      expect(result.status).toBe("completed");
    });

    it("handles empty context object", () => {
      const step: WorkflowStep = {
        id: "test",
        node: "music",
        command: "daily",
        onError: "stop",
        context: {},
      };

      const context = interpolateStepContext(step, new Map());
      expect(context).toEqual({});
    });
  });
});
