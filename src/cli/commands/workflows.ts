/**
 * bozly workflows - List, show, and manage workflows
 *
 * Usage:
 *   bozly workflows list                    # List all workflows
 *   bozly workflows list --all              # List all (node + global)
 *   bozly workflows show <id>               # Show workflow details
 *   bozly workflows validate <id>           # Validate workflow structure
 */

import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { discoverWorkflows, loadWorkflow, validateWorkflow } from "../../core/workflows.js";
import { getCurrentNode } from "../../core/node.js";
import { getRegistry } from "../../core/registry.js";
import { Workflow } from "../../core/types.js";

export const workflowsCommand = new Command("workflows").description(
  "List, show, and manage workflows"
);

/**
 * workflows list - Show all available workflows
 */
workflowsCommand
  .command("list")
  .description("List all available workflows")
  .option("-a, --all", "Show all workflows (node + global)")
  .action(async (options) => {
    try {
      await logger.debug("bozly workflows list command started", {
        all: options.all,
      });

      const node = await getCurrentNode();
      if (!node) {
        console.error(chalk.red("❌ Error: No node found. Run 'bozly init' first."));
        process.exit(1);
      }

      const workflows = await discoverWorkflows(node.path);

      if (workflows.length === 0) {
        console.log(chalk.yellow("⚠️  No workflows found in this node or globally."));
        console.log(chalk.dim("Create a workflow: mkdir -p " + node.path + "/.bozly/workflows"));
        return;
      }

      console.log("");
      console.log(chalk.bold("📋 Available Workflows:"));
      console.log("");

      workflows.forEach((workflow) => {
        console.log(chalk.cyan(`  ${workflow.id}`));
        console.log(chalk.dim(`    ${workflow.name}`));
        if (workflow.description) {
          console.log(chalk.dim(`    ${workflow.description}`));
        }
        console.log(chalk.dim(`    v${workflow.version} • ${workflow.steps.length} steps`));
        console.log("");
      });

      console.log(chalk.dim(`Total: ${workflows.length} workflow(s)`));
    } catch (error) {
      await logger.error("Failed to list workflows", {
        error: (error as Error).message,
      });
      console.error(chalk.red("❌ Error listing workflows:"), (error as Error).message);
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
        console.error(chalk.red("❌ Error: No node found. Run 'bozly init' first."));
        process.exit(1);
      }

      const workflow = await loadWorkflow(node.path, id);
      if (!workflow) {
        console.error(chalk.red(`❌ Workflow not found: ${id}`));
        process.exit(1);
      }

      displayWorkflowDetails(workflow);
    } catch (error) {
      await logger.error("Failed to show workflow", {
        id,
        error: (error as Error).message,
      });
      console.error(chalk.red("❌ Error showing workflow:"), (error as Error).message);
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
        console.error(chalk.red("❌ Error: No node found. Run 'bozly init' first."));
        process.exit(1);
      }

      const workflow = await loadWorkflow(node.path, id);
      if (!workflow) {
        console.error(chalk.red(`❌ Workflow not found: ${id}`));
        process.exit(1);
      }

      const registry = await getRegistry();
      const errors = validateWorkflow(workflow, registry);

      if (errors.length === 0) {
        console.log(chalk.green(`✅ Workflow '${id}' is valid`));
        console.log(chalk.dim(`${workflow.steps.length} steps, v${workflow.version}`));
        return;
      }

      console.error(chalk.red(`❌ Workflow '${id}' has ${errors.length} error(s):`));
      console.log("");

      errors.forEach((error) => {
        console.log(chalk.red(`  [${error.step}] ${error.field}: ${error.message}`));
      });

      process.exit(1);
    } catch (error) {
      await logger.error("Failed to validate workflow", {
        id,
        error: (error as Error).message,
      });
      console.error(chalk.red("❌ Error validating workflow:"), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Helper: Display workflow details
 */
function displayWorkflowDetails(workflow: Workflow): void {
  console.log("");
  console.log(chalk.bold.cyan(`📋 ${workflow.name}`));
  console.log(chalk.dim(`ID: ${workflow.id}`));
  console.log(chalk.dim(`Version: ${workflow.version}`));

  if (workflow.description) {
    console.log("");
    console.log(workflow.description);
  }

  if (workflow.metadata) {
    console.log("");
    if (workflow.metadata.frequency) {
      console.log(chalk.dim(`Frequency: ${workflow.metadata.frequency}`));
    }
    if (workflow.metadata.bestTime) {
      console.log(chalk.dim(`Best time: ${workflow.metadata.bestTime}`));
    }
    if (workflow.metadata.tags && workflow.metadata.tags.length > 0) {
      console.log(chalk.dim(`Tags: ${workflow.metadata.tags.join(", ")}`));
    }
  }

  console.log("");
  console.log(chalk.bold("Steps:"));
  workflow.steps.forEach((step, index) => {
    console.log(chalk.cyan(`  ${index + 1}. ${step.id}`));
    if (step.description) {
      console.log(chalk.dim(`     ${step.description}`));
    }
    console.log(chalk.dim(`     → Run '${step.command}' on node '${step.node}'`));
    console.log(chalk.dim(`     On error: ${step.onError} (timeout: ${step.timeout ?? 300000}ms)`));
  });

  console.log("");
  console.log(chalk.dim(`Created: ${new Date(workflow.created).toLocaleString()}`));

  console.log("");
}
