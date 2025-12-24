/**
 * bozly run - Execute a node command
 *
 * Runs a command in the current node with optional AI provider integration.
 *
 * Usage:
 *   bozly run <command>                    # Use default provider
 *   bozly run <command> --ai claude        # Use specific provider
 *   bozly run <command> --dry              # Preview prompt without execution
 *   bozly run <command> --list-providers   # Show available AI providers
 */

import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";
import { runNodeCommand } from "../../core/commands.js";
import { recordSession, loadPastMemories } from "../../core/sessions.js";
import { executeHooks, HookContext } from "../../core/hooks.js";
import { getDefaultProvider, formatProvidersList, validateProvider } from "../../core/providers.js";
import { loadWorkflow, executeWorkflow } from "../../core/workflows.js";
import { getNodeConfig, getGlobalConfig } from "../../core/config.js";
import { NodeInfo } from "../../core/types.js";

export const runCommand = new Command("run")
  .description("Execute a node command with optional AI provider integration")
  .argument("[command]", "Command to run (e.g., daily, weekly)")
  .option("--ai <provider>", "AI provider (claude, gpt, gemini, ollama)")
  .option("--dry", "Show what would be sent without executing")
  .option("--no-context", "Run without node context")
  .option("--list-providers", "Show available AI providers and installation status")
  .option("--verbose", "Include full prompt/response in session logs")
  .option("--workflow", "Execute as a workflow instead of a command")
  .action(async (commandArg, options) => {
    let node: NodeInfo | null = null; // Will be set after validation
    let cancelRequested = false;

    // Handle Ctrl+C and termination signals for on-cancel hooks
    const handleCancel = async (signal: string) => {
      if (cancelRequested || !node) {
        return;
      }
      cancelRequested = true;

      const cancelContext: HookContext = {
        nodeId: node.id,
        nodeName: node.name,
        nodePath: node.path,
        command: commandArg,
        provider: options.ai || getDefaultProvider(),
        timestamp: new Date().toISOString(),
        cancellationReason: signal,
      };

      try {
        await executeHooks(node.path, "on-cancel", cancelContext);
      } catch (error) {
        await logger.warn("Failed to execute on-cancel hooks", {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      process.exit(130); // Standard exit code for Ctrl+C
    };

    process.on("SIGINT", () => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handleCancel("SIGINT");
    });
    process.on("SIGTERM", () => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handleCancel("SIGTERM");
    });

    try {
      // Handle --list-providers flag
      if (options.listProviders) {
        const list = formatProvidersList();
        console.log(list);
        return;
      }

      // Require command argument
      if (!commandArg) {
        console.error(chalk.red("Error: command argument is required"));
        console.log("\nUsage: bozly run <command> [options]");
        console.log("       bozly run --list-providers");
        console.log("       bozly run --workflow <id> [options]");
        process.exit(1);
      }

      await logger.debug("bozly run command started", {
        command: commandArg,
        provider: options.ai,
        dryRun: options.dry,
        includeContext: options.context,
        listProviders: options.listProviders,
        workflow: options.workflow,
      });

      node = await getCurrentNode();

      if (!node) {
        await logger.warn("Not in a node directory");
        console.log(chalk.yellow("✗ Not in a node directory"));
        console.log("  Run 'bozly init' to initialize a node here.");
        process.exit(1);
      }

      // Handle workflow execution
      if (options.workflow) {
        try {
          const workflow = await loadWorkflow(node.path, commandArg);
          if (!workflow) {
            console.error(chalk.red(`Workflow not found: ${commandArg}`));
            process.exit(1);
          }

          await logger.info("Executing workflow", {
            id: workflow.id,
            steps: workflow.steps.length,
            dryRun: options.dry,
          });

          const result = await executeWorkflow(workflow, {
            dryRun: options.dry,
            verbose: options.verbose,
          });

          // Display results
          console.log("");
          console.log(chalk.bold(`Workflow '${workflow.id}' completed`));
          console.log(
            chalk.dim(
              `${result.stepsCompleted}/${workflow.steps.length} steps completed in ${result.duration}ms`
            )
          );

          if (result.stepsFailed > 0) {
            console.log(chalk.yellow(`⚠️  ${result.stepsFailed} step(s) failed`));
            result.steps
              .filter((s) => s.status === "failed")
              .forEach((s) => {
                console.log(chalk.dim(`  - ${s.stepId}: ${s.error}`));
              });
          }

          process.exit(result.stepsFailed > 0 ? 1 : 0);
        } catch (error) {
          await logger.error("Workflow execution failed", {
            workflow: commandArg,
            error: (error as Error).message,
          });
          console.error(chalk.red("Workflow execution failed:"), (error as Error).message);
          process.exit(1);
        }
      } else {
        // Handle normal command execution
        // Determine provider
        let provider = options.ai;
        if (!provider) {
          provider = getDefaultProvider();
          await logger.info("Using default provider", { provider });
        }

        // Validate provider if not doing dry run
        if (!options.dry) {
          try {
            await validateProvider(provider);
          } catch (error) {
            if (error instanceof Error) {
              console.error(chalk.red(error.message));
            }
            process.exit(1);
          }
        }

        await logger.info("Running node command", {
          vaultName: node.name,
          command: commandArg,
          provider,
          dryRun: options.dry,
        });

        if (options.dry) {
          console.log(chalk.cyan("▶ Dry run mode — showing what would be executed\n"));
        }

        // Execute session-start hooks
        const startContext: HookContext = {
          nodeId: node.id,
          nodeName: node.name,
          nodePath: node.path,
          command: commandArg,
          provider,
          timestamp: new Date().toISOString(),
        };

        await executeHooks(node.path, "session-start", startContext);

        // Load past memories for context injection
        let pastMemories: string[] = [];
        try {
          const bozlyPath = path.join(node.path, ".bozly");
          pastMemories = await loadPastMemories(bozlyPath, node.id, 3);
          if (pastMemories.length > 0) {
            await logger.debug("Loaded past memories for context", {
              count: pastMemories.length,
              vault: node.id,
            });
          }
        } catch (error) {
          await logger.debug("Failed to load past memories", {
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue without memories if loading fails
        }

        const result = await runNodeCommand(node, commandArg, {
          provider,
          dryRun: options.dry,
          includeContext: options.context,
          pastMemories,
        });

        await logger.info("Command execution completed", {
          command: commandArg,
          contextSize: result.contextSize,
          provider: result.provider,
          dryRun: options.dry,
        });

        if (options.dry) {
          // Display dry-run preview
          console.log(chalk.bold("Command:"), commandArg);
          console.log(chalk.bold("Provider:"), result.provider);
          console.log(chalk.bold("Context size:"), `${result.contextSize} characters`);
          console.log();
          console.log(chalk.bold("─ Full Prompt (will be sent to AI)"));
          console.log(chalk.gray("─────────────────────────────────"));
          console.log(result.prompt);
          console.log(chalk.gray("─────────────────────────────────"));
          console.log();
          console.log(chalk.dim(`To execute: bozly run ${commandArg} --ai ${result.provider}`));
        } else {
          // Output was streamed during execution
          // Record session for audit trail
          try {
            // Get timezone from node config, fall back to global config
            let timezone: string | undefined;
            try {
              const nodeConfig = await getNodeConfig();
              timezone = nodeConfig.timezone;
            } catch {
              // If node config fails, try global config
            }
            if (!timezone) {
              const globalConfig = await getGlobalConfig();
              timezone = globalConfig.timezone;
            }

            await recordSession(
              node.path,
              node.id,
              node.name,
              commandArg,
              result.provider,
              {
                contextText: result.contextText ?? "",
                commandText: result.commandText ?? "",
                modelsUsed: result.modelsUsed,
              },
              {
                text: result.output ?? "",
                duration: result.duration ?? 0,
              },
              [],
              [],
              timezone
            );

            await logger.debug("Session recorded", {
              command: commandArg,
              vaultId: node.id,
            });

            // Execute session-end hooks (after session is recorded)
            const endContext: HookContext = {
              nodeId: node.id,
              nodeName: node.name,
              nodePath: node.path,
              command: commandArg,
              provider: result.provider,
              timestamp: new Date().toISOString(),
              prompt: result.prompt,
              promptSize: result.prompt?.length ?? 0,
              session: {
                id: "recorded", // Real session ID would come from recordSession response
                sessionPath: node.path,
                status: "completed",
                duration: result.duration ?? 0,
                output: result.output,
              },
            };

            await executeHooks(node.path, "session-end", endContext);
          } catch (recordError) {
            // Log but don't fail the command if session recording fails
            await logger.warn("Failed to record session", {
              error: recordError instanceof Error ? recordError.message : String(recordError),
            });
          }

          console.log();
          console.log(chalk.green("✓ Command completed successfully"));
        }
      } // End else for normal command execution
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Command execution failed", {
        command: commandArg,
        error: errorMsg,
      });

      // Execute on-error hooks when execution fails
      if (node) {
        const errorContext: HookContext = {
          nodeId: node.id,
          nodeName: node.name,
          nodePath: node.path,
          command: commandArg,
          provider: options.ai || getDefaultProvider(),
          timestamp: new Date().toISOString(),
          error: {
            message: errorMsg,
            code: "EXECUTION_FAILED",
            stack: error instanceof Error ? error.stack : undefined,
          },
        };

        try {
          await executeHooks(node.path, "on-error", errorContext);
        } catch (hookError) {
          await logger.warn("Failed to execute on-error hooks", {
            error: hookError instanceof Error ? hookError.message : String(hookError),
          });
        }
      }

      console.error();
      console.error(chalk.red("✗ Command execution failed:"));
      if (error instanceof Error) {
        console.error(chalk.red(`  ${error.message}`));
      }
      process.exit(1);
    }
  });
