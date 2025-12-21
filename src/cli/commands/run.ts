/**
 * bozly run - Execute a vault command
 *
 * Runs a command in the current vault with optional AI provider integration.
 *
 * Usage:
 *   bozly run <command>                    # Use default provider
 *   bozly run <command> --ai claude        # Use specific provider
 *   bozly run <command> --dry              # Preview prompt without execution
 *   bozly run <command> --list-providers   # Show available AI providers
 */

import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { getCurrentVault } from "../../core/vault.js";
import { runVaultCommand } from "../../core/commands.js";
import { recordSession } from "../../core/sessions.js";
import { getDefaultProvider, formatProvidersList, validateProvider } from "../../core/providers.js";

export const runCommand = new Command("run")
  .description("Execute a vault command with optional AI provider integration")
  .argument("[command]", "Command to run (e.g., daily, weekly)")
  .option("--ai <provider>", "AI provider (claude, gpt, gemini, ollama)")
  .option("--dry", "Show what would be sent without executing")
  .option("--no-context", "Run without vault context")
  .option("--list-providers", "Show available AI providers and installation status")
  .option("--verbose", "Include full prompt/response in session logs")
  .action(async (commandArg, options) => {
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
        process.exit(1);
      }

      await logger.debug("bozly run command started", {
        command: commandArg,
        provider: options.ai,
        dryRun: options.dry,
        includeContext: options.context,
        listProviders: options.listProviders,
      });

      const vault = await getCurrentVault();

      if (!vault) {
        await logger.warn("Not in a vault directory");
        console.log(chalk.yellow("✗ Not in a vault directory"));
        console.log("  Run 'bozly init' to initialize a vault here.");
        process.exit(1);
      }

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

      await logger.info("Running vault command", {
        vaultName: vault.name,
        command: commandArg,
        provider,
        dryRun: options.dry,
      });

      if (options.dry) {
        console.log(chalk.cyan("▶ Dry run mode — showing what would be executed\n"));
      }

      const result = await runVaultCommand(vault, commandArg, {
        provider,
        dryRun: options.dry,
        includeContext: options.context,
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
          await recordSession(
            vault.path,
            vault.id,
            vault.name,
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
            }
          );

          await logger.debug("Session recorded", {
            command: commandArg,
            vaultId: vault.id,
          });
        } catch (recordError) {
          // Log but don't fail the command if session recording fails
          await logger.warn("Failed to record session", {
            error: recordError instanceof Error ? recordError.message : String(recordError),
          });
        }

        console.log();
        console.log(chalk.green("✓ Command completed successfully"));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Command execution failed", {
        command: commandArg,
        error: errorMsg,
      });

      console.error();
      console.error(chalk.red("✗ Command execution failed:"));
      if (error instanceof Error) {
        console.error(chalk.red(`  ${error.message}`));
      }
      process.exit(1);
    }
  });
