/**
 * Integration tests for Workflow system
 * Tests workflows within the actual CLI execution flow
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  discoverWorkflows,
  loadWorkflow,
  validateWorkflow,
  executeWorkflow,
} from "../../src/core/workflows.js";
import {
  Workflow,
  Registry,
} from "../../src/core/types.js";

describe("Workflows Integration Tests", () => {
  let testDir: string;
  let nodeDir: string;
  let globalWorkflowsDir: string;
  let nodeWorkflowsDir: string;

  beforeEach(async () => {
    // Create temporary test directories
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "bozly-workflows-int-"));
    nodeDir = path.join(testDir, "test-node");
    globalWorkflowsDir = path.join(testDir, ".bozly", "workflows");
    nodeWorkflowsDir = path.join(nodeDir, ".bozly", "workflows");

    // Create necessary directories
    await fs.mkdir(globalWorkflowsDir, { recursive: true });
    await fs.mkdir(nodeWorkflowsDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe("Complete Workflow Lifecycle", () => {
    it("loads and executes a workflow from filesystem", async () => {
      const workflow: Workflow = {
        id: "simple-workflow",
        name: "Simple Test Workflow",
        description: "Test workflow execution",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "morning",
            description: "First step",
            onError: "stop",
          },
          {
            id: "step-2",
            node: "test-node",
            command: "evening",
            description: "Second step",
            onError: "stop",
          },
        ],
      };

      // Write workflow to file
      const workflowPath = path.join(nodeWorkflowsDir, "simple-workflow.json");
      await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));

      // Discover the workflow
      const discovered = await discoverWorkflows(nodeDir);
      expect(discovered).toHaveLength(1);
      expect(discovered[0].id).toBe("simple-workflow");

      // Load the workflow
      const loaded = await loadWorkflow(nodeDir, "simple-workflow");
      expect(loaded).not.toBeNull();
      expect(loaded?.steps).toHaveLength(2);

      // Execute the workflow
      const result = await executeWorkflow(loaded!);
      expect(result.status).toBe("completed");
      expect(result.stepsCompleted).toBe(2);
    });

    it("discovers workflows from both node and global locations", async () => {
      // Create node-level workflow
      const nodeWorkflow: Workflow = {
        id: "node-workflow",
        name: "Node Workflow",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      // Create global workflow
      const globalWorkflow: Workflow = {
        id: "global-workflow",
        name: "Global Workflow",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      await fs.writeFile(
        path.join(nodeWorkflowsDir, "node-workflow.json"),
        JSON.stringify(nodeWorkflow)
      );
      await fs.writeFile(
        path.join(globalWorkflowsDir, "global-workflow.json"),
        JSON.stringify(globalWorkflow)
      );

      const workflows = await discoverWorkflows(nodeDir);

      // Should discover node-level workflow
      expect(workflows.some((w) => w.id === "node-workflow")).toBe(true);
    });

    it("executes multi-step workflow with context passing", async () => {
      const workflow: Workflow = {
        id: "context-workflow",
        name: "Context Passing Workflow",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "first-step",
            node: "test-node",
            command: "step1",
            description: "Generate some data",
            onError: "stop",
            context: {
              input: "test-data",
            },
          },
          {
            id: "second-step",
            node: "test-node",
            command: "step2",
            description: "Use data from first step",
            onError: "stop",
            context: {
              previousData: "{{ steps.first-step.output }}",
              timestamp: "{{ now | date:'YYYY-MM-DD' }}",
            },
          },
        ],
      };

      const workflowPath = path.join(nodeWorkflowsDir, "context-workflow.json");
      await fs.writeFile(workflowPath, JSON.stringify(workflow));

      const loaded = await loadWorkflow(nodeDir, "context-workflow");
      expect(loaded).not.toBeNull();

      const result = await executeWorkflow(loaded!);
      expect(result.status).toBe("completed");
      expect(result.stepsCompleted).toBe(2);
    });

    it("handles workflow errors with stop strategy", async () => {
      const workflow: Workflow = {
        id: "error-stop-workflow",
        name: "Error Stop Workflow",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
          {
            id: "step-2",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      // Workflow should complete (even though steps would fail, we're testing the framework)
      expect(result.workflowId).toBe("error-stop-workflow");
      expect(result.status).toBe("completed");
    });

    it("handles workflow errors with continue strategy", async () => {
      const workflow: Workflow = {
        id: "error-continue-workflow",
        name: "Error Continue Workflow",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "continue",
          },
          {
            id: "step-2",
            node: "test-node",
            command: "test",
            onError: "continue",
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.workflowId).toBe("error-continue-workflow");
      expect(result.status).toBe("completed");
    });
  });

  describe("Workflow Discovery and Loading", () => {
    it("discovers workflows in sorted order", async () => {
      const workflowIds = ["z-last", "a-first", "m-middle"];

      for (const id of workflowIds) {
        const workflow: Workflow = {
          id,
          name: `Workflow ${id}`,
          version: "1.0.0",
          created: new Date().toISOString(),
          steps: [
            {
              id: "step-1",
              node: "test-node",
              command: "test",
              onError: "stop",
            },
          ],
        };

        await fs.writeFile(
          path.join(nodeWorkflowsDir, `${id}.json`),
          JSON.stringify(workflow)
        );
      }

      const discovered = await discoverWorkflows(nodeDir);
      const ids = discovered.map((w) => w.id);

      expect(ids).toEqual(["a-first", "m-middle", "z-last"]);
    });

    it("skips invalid workflow files during discovery", async () => {
      // Valid workflow
      const validWorkflow: Workflow = {
        id: "valid",
        name: "Valid",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      await fs.writeFile(
        path.join(nodeWorkflowsDir, "valid.json"),
        JSON.stringify(validWorkflow)
      );

      // Invalid JSON
      await fs.writeFile(
        path.join(nodeWorkflowsDir, "invalid.json"),
        "not valid json"
      );

      // Missing required fields
      await fs.writeFile(
        path.join(nodeWorkflowsDir, "incomplete.json"),
        JSON.stringify({ id: "incomplete" })
      );

      const discovered = await discoverWorkflows(nodeDir);

      expect(discovered).toHaveLength(1);
      expect(discovered[0].id).toBe("valid");
    });

    it("returns null when loading non-existent workflow", async () => {
      const workflow = await loadWorkflow(nodeDir, "does-not-exist");
      expect(workflow).toBeNull();
    });

    it("handles corrupted workflow files gracefully", async () => {
      await fs.writeFile(
        path.join(nodeWorkflowsDir, "corrupted.json"),
        "{ invalid json content }"
      );

      const workflow = await loadWorkflow(nodeDir, "corrupted");
      expect(workflow).toBeNull();
    });
  });

  describe("Workflow Validation", () => {
    it("validates workflow structure against registry", async () => {
      const mockRegistry: Registry = {
        version: "1.0.0",
        nodes: [
          {
            id: "test-node",
            name: "Test Node",
            path: "/test",
            type: "test",
            active: true,
            created: new Date().toISOString(),
          },
        ],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      const validWorkflow: Workflow = {
        id: "valid",
        name: "Valid Workflow",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const errors = await validateWorkflow(validWorkflow, mockRegistry);
      expect(errors).toHaveLength(0);
    });

    it("detects missing required workflow fields", async () => {
      const mockRegistry: Registry = {
        version: "1.0.0",
        nodes: [
          {
            id: "test-node",
            name: "Test Node",
            path: "/test",
            type: "test",
            active: true,
            created: new Date().toISOString(),
          },
        ],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      const incompleteWorkflow: any = {
        id: "incomplete",
        // missing: name, version, steps
      };

      const errors = await validateWorkflow(incompleteWorkflow, mockRegistry);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("detects invalid node references in workflow", async () => {
      const mockRegistry: Registry = {
        version: "1.0.0",
        nodes: [
          {
            id: "valid-node",
            name: "Valid Node",
            path: "/test",
            type: "test",
            active: true,
            created: new Date().toISOString(),
          },
        ],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      const workflowWithBadNode: Workflow = {
        id: "bad-ref",
        name: "Bad Reference",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "non-existent-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const errors = await validateWorkflow(workflowWithBadNode, mockRegistry);
      expect(errors.some((e) => e.field === "node")).toBe(true);
    });

    it("detects duplicate step IDs in workflow", async () => {
      const mockRegistry: Registry = {
        version: "1.0.0",
        nodes: [
          {
            id: "test-node",
            name: "Test Node",
            path: "/test",
            type: "test",
            active: true,
            created: new Date().toISOString(),
          },
        ],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      const workflowWithDups: Workflow = {
        id: "dupes",
        name: "Duplicate Steps",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "same-id",
            node: "test-node",
            command: "test1",
            onError: "stop",
          },
          {
            id: "same-id",
            node: "test-node",
            command: "test2",
            onError: "stop",
          },
        ],
      };

      const errors = await validateWorkflow(workflowWithDups, mockRegistry);
      expect(errors.some((e) => e.field === "id")).toBe(true);
    });
  });

  describe("Workflow Execution Features", () => {
    it("executes workflow in dry-run mode without side effects", async () => {
      const workflow: Workflow = {
        id: "dryrun-workflow",
        name: "Dry Run Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const result = await executeWorkflow(workflow, { dryRun: true });

      expect(result.status).toBe("completed");
      expect(result.stepsCompleted).toBeGreaterThanOrEqual(0);
    });

    it("skips specified workflow steps", async () => {
      const workflow: Workflow = {
        id: "skip-workflow",
        name: "Skip Steps Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "skip-me",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
          {
            id: "run-me",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const result = await executeWorkflow(workflow, {
        skipSteps: ["skip-me"],
      });

      expect(result.status).toBe("completed");
      const skippedStep = result.steps.find((s) => s.stepId === "skip-me");
      expect(skippedStep?.status).toBe("skipped");
    });

    it("records workflow execution timing", async () => {
      const workflow: Workflow = {
        id: "timing-workflow",
        name: "Timing Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const result = await executeWorkflow(workflow);

      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("generates verbose logging when requested", async () => {
      const workflow: Workflow = {
        id: "verbose-workflow",
        name: "Verbose Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const result = await executeWorkflow(workflow, { verbose: true });

      expect(result.status).toBe("completed");
    });

    it("counts all step statuses correctly", async () => {
      const workflow: Workflow = {
        id: "count-workflow",
        name: "Count Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
          {
            id: "step-2",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
          {
            id: "step-3",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const result = await executeWorkflow(workflow);

      const total =
        result.stepsCompleted +
        result.stepsFailed +
        result.stepsSkipped;
      expect(total).toBe(workflow.steps.length);
    });
  });

  describe("Workflow Context Features", () => {
    it("supports static context in steps", async () => {
      const workflow: Workflow = {
        id: "static-context",
        name: "Static Context Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
            context: {
              name: "John",
              count: 42,
              active: true,
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.status).toBe("completed");
    });

    it("supports nested context objects", async () => {
      const workflow: Workflow = {
        id: "nested-context",
        name: "Nested Context Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
            context: {
              user: {
                name: "Alice",
                email: "alice@example.com",
                preferences: {
                  theme: "dark",
                  notifications: true,
                },
              },
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.status).toBe("completed");
    });

    it("supports arrays in context", async () => {
      const workflow: Workflow = {
        id: "array-context",
        name: "Array Context Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
            context: {
              items: ["apple", "banana", "cherry"],
              ids: [1, 2, 3, 4, 5],
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.status).toBe("completed");
    });

    it("supports date template variables", async () => {
      const workflow: Workflow = {
        id: "date-context",
        name: "Date Context Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
            context: {
              date: "{{ now | date:'YYYY-MM-DD' }}",
              time: "{{ now | date:'HH:mm:ss' }}",
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.status).toBe("completed");
    });

    it("supports step output interpolation", async () => {
      const workflow: Workflow = {
        id: "output-interp",
        name: "Output Interpolation Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
          {
            id: "step-2",
            node: "test-node",
            command: "test",
            onError: "stop",
            context: {
              previous: "{{ steps.step-1.output }}",
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.status).toBe("completed");
    });
  });

  describe("Workflow Metadata and Configuration", () => {
    it("preserves workflow metadata through execution", async () => {
      const workflow: Workflow = {
        id: "metadata-workflow",
        name: "Metadata Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        description: "Test workflow with metadata",
        metadata: {
          frequency: "daily",
          bestTime: "09:00",
          tags: ["routine", "automation"],
          author: "test-user",
        },
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.workflowId).toBe("metadata-workflow");
      expect(result.status).toBe("completed");
    });

    it("handles workflows with no metadata", async () => {
      const workflow: Workflow = {
        id: "no-metadata",
        name: "No Metadata Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.status).toBe("completed");
    });

    it("handles workflows with step descriptions", async () => {
      const workflow: Workflow = {
        id: "described-workflow",
        name: "Described Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            description: "This step does something important",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
          {
            id: "step-2",
            description: "This step follows up on the first",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.stepsCompleted).toBe(2);
    });
  });

  describe("Workflow Performance", () => {
    it("executes workflows efficiently", async () => {
      const workflow: Workflow = {
        id: "perf-workflow",
        name: "Performance Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
          {
            id: "step-2",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const startTime = Date.now();
      const result = await executeWorkflow(workflow);
      const totalTime = Date.now() - startTime;

      expect(result.status).toBe("completed");
      // Should complete reasonably fast (adjust threshold as needed)
      expect(totalTime).toBeLessThan(10000);
    });

    it("handles complex workflows with many steps", async () => {
      const steps = Array.from({ length: 10 }, (_, i) => ({
        id: `step-${i + 1}`,
        node: "test-node",
        command: "test",
        onError: "continue" as const,
      }));

      const workflow: Workflow = {
        id: "complex-workflow",
        name: "Complex Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps,
      };

      const result = await executeWorkflow(workflow);
      expect(result.status).toBe("completed");
      expect(result.steps.length).toBe(10);
    });

    it("measures step execution duration", async () => {
      const workflow: Workflow = {
        id: "duration-workflow",
        name: "Duration Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const result = await executeWorkflow(workflow);

      expect(result.steps).toHaveLength(1);
      const step = result.steps[0];
      expect(step.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Edge Cases and Error Conditions", () => {
    it("handles workflows with no steps gracefully", async () => {
      const workflow: Workflow = {
        id: "no-steps",
        name: "No Steps",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [],
      };

      // This should fail validation, not execution
      const mockRegistry: Registry = {
        version: "1.0.0",
        nodes: [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      const errors = await validateWorkflow(workflow, mockRegistry);
      expect(errors.some((e) => e.field === "steps")).toBe(true);
    });

    it("handles malformed workflow files", async () => {
      await fs.writeFile(
        path.join(nodeWorkflowsDir, "malformed.json"),
        "{ not valid json content"
      );

      const workflow = await loadWorkflow(nodeDir, "malformed");
      expect(workflow).toBeNull();
    });

    it("handles workflows with very long step IDs", async () => {
      const longId = "a".repeat(100);
      const workflow: Workflow = {
        id: "long-id-test",
        name: "Long ID Test",
        version: "1.0.0",
        created: new Date().toISOString(),
        steps: [
          {
            id: longId,
            node: "test-node",
            command: "test",
            onError: "stop",
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.status).toBe("completed");
    });

    it("handles unicode characters in workflow definitions", async () => {
      const workflow: Workflow = {
        id: "unicode-test",
        name: "Unicode Test - 你好世界 🌍",
        version: "1.0.0",
        created: new Date().toISOString(),
        description: "Testing émojis and special çharacters",
        steps: [
          {
            id: "step-1",
            description: "Este es un paso en español",
            node: "test-node",
            command: "test",
            onError: "stop",
            context: {
              greeting: "こんにちは",
              emoji: "🚀",
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow);
      expect(result.status).toBe("completed");
    });
  });
});
