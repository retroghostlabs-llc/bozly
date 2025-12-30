/**
 * bozly workflows - List, show, and manage workflows
 *
 * Usage:
 *   bozly workflows list                    # List all workflows
 *   bozly workflows list --all              # List all (vault + global)
 *   bozly workflows show <id>               # Show workflow details
 *   bozly workflows validate <id>           # Validate workflow structure
 */

import { Command } from "commander";
import { logger } from "../../core/logger.js";
import { discoverWorkflows, loadWorkflow, validateWorkflow } from "../../core/workflows.js";
import { getCurrentNode } from "../../core/node.js";
import { getRegistry } from "../../core/registry.js";
import { Workflow } from "../../core/types.js";
import { infoBox, errorBox, successBox, warningBox, theme, symbols } from "../../cli/ui/index.js";

export const workflowsCommand = new Command("workflows").description(
  "List, show, and manage workflows"
);

/**
 * workflows list - Show all available workflows
 */
workflowsCommand
  .command("list")
  .description("List all available workflows")
  .option("-a, --all", "Show all workflows (vault + global)")
  .action(async (options) => {
    try {
      await logger.debug("bozly workflows list command started", {
        all: options.all,
      });

      const node = await getCurrentNode();
      if (!node) {
        console.error(
          errorBox("No vault found", {
            hint: "Run 'bozly init' first",
          })
        );
        process.exit(1);
      }

      const workflows = await discoverWorkflows(node.path);

      if (workflows.length === 0) {
        console.log(
          warningBox("No workflows found in this vault or globally", {
            hint: `Create a workflow: mkdir -p ${node.path}/.bozly/workflows`,
          })
        );
        return;
      }

      console.log(infoBox("Available Workflows"));

      workflows.forEach((workflow) => {
        console.log(theme.info(`  ${workflow.id}`));
        console.log(theme.muted(`    ${workflow.name}`));
        if (workflow.description) {
          console.log(theme.muted(`    ${workflow.description}`));
        }
        console.log(
          theme.muted(`    v${workflow.version} ${symbols.bullet} ${workflow.steps.length} steps`)
        );
        console.log("");
      });

      console.log(theme.muted(`Total: ${workflows.length} workflow(s)`));
    } catch (error) {
      await logger.error("Failed to list workflows", {
        error: (error as Error).message,
      });
      console.error(
        errorBox("Failed to list workflows", {
          error: (error as Error).message,
        })
      );
      process.exit(1);
    }
  });

/**
 * workflows show - Show details about a specific workflow
 */
workflowsCommand
  .command("show <id>")
  .description("Show workflow details")
  .action(async (id) => {
    try {
      await logger.debug("bozly workflows show command started", { id });

      const node = await getCurrentNode();
      if (!node) {
        console.error(
          errorBox("No vault found", {
            hint: "Run 'bozly init' first",
          })
        );
        process.exit(1);
      }

      const workflow = await loadWorkflow(node.path, id);
      if (!workflow) {
        console.error(errorBox(`Workflow not found: ${id}`));
        process.exit(1);
      }

      displayWorkflowDetails(workflow);
    } catch (error) {
      await logger.error("Failed to show workflow", {
        id,
        error: (error as Error).message,
      });
      console.error(
        errorBox("Failed to show workflow", {
          error: (error as Error).message,
        })
      );
      process.exit(1);
    }
  });

/**
 * workflows validate - Validate workflow structure
 */
workflowsCommand
  .command("validate <id>")
  .description("Validate workflow structure")
  .action(async (id) => {
    try {
      await logger.debug("bozly workflows validate command started", { id });

      const node = await getCurrentNode();
      if (!node) {
        console.error(
          errorBox("No vault found", {
            hint: "Run 'bozly init' first",
          })
        );
        process.exit(1);
      }

      const workflow = await loadWorkflow(node.path, id);
      if (!workflow) {
        console.error(errorBox(`Workflow not found: ${id}`));
        process.exit(1);
      }

      const registry = await getRegistry();
      const errors = validateWorkflow(workflow, registry);

      if (errors.length === 0) {
        console.log(
          successBox(`Workflow '${id}' is valid`, {
            Steps: workflow.steps.length,
            Version: workflow.version,
          })
        );
        return;
      }

      console.error(errorBox(`Workflow '${id}' has ${errors.length} error(s)`));
      console.log("");

      errors.forEach((error) => {
        console.log(theme.error(`  [${error.step}] ${error.field}: ${error.message}`));
      });

      process.exit(1);
    } catch (error) {
      await logger.error("Failed to validate workflow", {
        id,
        error: (error as Error).message,
      });
      console.error(
        errorBox("Failed to validate workflow", {
          error: (error as Error).message,
        })
      );
      process.exit(1);
    }
  });

/**
 * Helper: Display workflow details
 */
function displayWorkflowDetails(workflow: Workflow): void {
  console.log("");
  console.log(theme.bold(theme.info(`${workflow.name}`)));
  console.log(theme.muted(`ID: ${workflow.id}`));
  console.log(theme.muted(`Version: ${workflow.version}`));

  if (workflow.description) {
    console.log("");
    console.log(workflow.description);
  }

  if (workflow.metadata) {
    console.log("");
    if (workflow.metadata.frequency) {
      console.log(theme.muted(`Frequency: ${workflow.metadata.frequency}`));
    }
    if (workflow.metadata.bestTime) {
      console.log(theme.muted(`Best time: ${workflow.metadata.bestTime}`));
    }
    if (workflow.metadata.tags && workflow.metadata.tags.length > 0) {
      console.log(theme.muted(`Tags: ${workflow.metadata.tags.join(", ")}`));
    }
  }

  console.log("");
  console.log(theme.bold("Steps:"));
  workflow.steps.forEach((step, index) => {
    console.log(theme.info(`  ${index + 1}. ${step.id}`));
    if (step.description) {
      console.log(theme.muted(`     ${step.description}`));
    }
    console.log(theme.muted(`     → Run '${step.command}' on node '${step.node}'`));
    console.log(
      theme.muted(`     On error: ${step.onError} (timeout: ${step.timeout ?? 300000}ms)`)
    );
  });

  console.log("");
  console.log(theme.muted(`Created: ${new Date(workflow.created).toLocaleString()}`));

  console.log("");
}
