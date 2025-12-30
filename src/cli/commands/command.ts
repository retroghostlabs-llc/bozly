/**
 * bozly command - Manage commands (list and create)
 */

import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";
import { getGlobalCommands, getAllCommands, createGlobalCommand } from "../../core/commands.js";
import { promptText, validateCommandName, validateDescription } from "../../utils/prompts.js";
import { infoBox, warningBox, errorBox, successBox, theme } from "../../cli/ui/index.js";
import { generateCommandContent } from "../../core/ai-generation.js";
import { getDefaultProvider } from "../../core/providers.js";
import * as fs from "fs/promises";
import * as path from "path";

export const commandCommand = new Command("command")
  .description("Manage commands (list and create)")
  .addCommand(createListCommand())
  .addCommand(createCreateCommand());

/**
 * Create 'list' subcommand
 */
function createListCommand(): Command {
  return new Command("list")
    .alias("ls")
    .description("List all available commands (vault + global + builtin)")
    .option("-g, --global", "Show only global commands")
    .option("-l, --long", "Show full descriptions")
    .action(async (options) => {
      try {
        await logger.debug("bozly command list started", { global: options.global });

        let commands;

        if (options.global) {
          // Show only global commands
          commands = await getGlobalCommands();
          if (commands.length === 0) {
            console.log(
              warningBox("No global commands found", {
                hint: "Create one with: bozly command create",
              })
            );
            return;
          }

          console.log(infoBox("Global Commands"));
        } else {
          // Show all commands (vault + global)
          const node = await getCurrentNode();

          if (node) {
            // We're in a node - show all commands
            commands = await getAllCommands(node.path);

            if (commands.length === 0) {
              console.log(warningBox("No commands found"));
              return;
            }

            console.log(infoBox(`Commands for '${node.name}'`));

            // Group by source
            const bySource = {
              vault: commands.filter((c) => c.source === "vault"),
              global: commands.filter((c) => c.source === "global"),
              builtin: commands.filter((c) => c.source === "builtin"),
            };

            // Show vault commands
            if (bySource.vault.length > 0) {
              console.log(theme.bold(theme.success("Vault Commands:")));
              const vaultItems = bySource.vault.map((cmd) => {
                const desc = options.long
                  ? (cmd.description ?? "No description")
                  : (cmd.description ?? "No description").substring(0, 50);
                return `${theme.info(`/${cmd.name}`)} — ${desc}`;
              });
              console.log(vaultItems.join("\n"));
            }

            // Show global commands
            if (bySource.global.length > 0) {
              console.log(theme.bold(theme.secondary("Global Commands:")));
              const globalItems = bySource.global.map((cmd) => {
                const desc = options.long
                  ? (cmd.description ?? "No description")
                  : (cmd.description ?? "No description").substring(0, 50);
                return `${theme.secondary(`/${cmd.name}`)} — ${desc}`;
              });
              console.log(globalItems.join("\n"));
            }

            // Show builtin commands
            if (bySource.builtin.length > 0) {
              console.log(theme.bold(theme.muted("Builtin Commands:")));
              const builtinItems = bySource.builtin.map((cmd) => {
                const desc = options.long
                  ? (cmd.description ?? "No description")
                  : (cmd.description ?? "No description").substring(0, 50);
                return `${theme.muted(`/${cmd.name}`)} — ${desc}`;
              });
              console.log(builtinItems.join("\n"));
            }
          } else {
            // Not in a node - show only global commands
            commands = await getGlobalCommands();

            if (commands.length === 0) {
              console.log(
                warningBox("No global commands found", {
                  hint: "Create one with: bozly command create",
                })
              );
              return;
            }

            console.log(infoBox("Global Commands"));
          }
        }

        // Display commands
        if (commands.length > 0) {
          const cmdItems = commands.map((cmd) => {
            const desc = options.long
              ? (cmd.description ?? "No description")
              : (cmd.description ?? "No description").substring(0, 50);
            const sourceColor =
              cmd.source === "vault"
                ? theme.success
                : cmd.source === "global"
                  ? theme.secondary
                  : theme.muted;
            return `${sourceColor(`/${cmd.name}`)} [${cmd.source}] — ${desc}`;
          });
          console.log(cmdItems.join("\n"));
        }

        console.log();
        console.log(
          theme.muted(
            `Found ${commands.length} command(s). Use 'bozly command create' to add more.`
          )
        );
      } catch (error) {
        await logger.error("Failed to list commands", {
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(
          errorBox("Failed to list commands", {
            error: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    });
}

/**
 * Create 'create' subcommand
 */
function createCreateCommand(): Command {
  return new Command("create")
    .description("Create a new command (global or local)")
    .option("-l, --local", "Create in current vault instead of global")
    .option("--ai", "Use AI to generate command prompt")
    .option("--provider <name>", "AI provider to use (claude, gpt, gemini, ollama)")
    .action(async (options) => {
      try {
        await logger.debug("bozly command create started", {
          local: options.local,
          ai: options.ai,
        });

        console.log(infoBox("Create New Command"));

        // Get command name
        const name = await promptText(
          "Command name (e.g., summarize):",
          undefined,
          validateCommandName
        );

        // Get description
        const description = await promptText("Brief description:", undefined, validateDescription);

        let content: string;

        if (options.ai) {
          // AI-assisted command creation
          content = await createCommandWithAI(description, options.provider);
        } else {
          // Manual command creation
          console.log();
          console.log(theme.muted("Enter command prompt (Press Ctrl+D or Ctrl+Z to finish):"));
          content = await promptText("> ", "");

          if (!content.trim()) {
            console.log(warningBox("Cancelled: No content provided"));
            return;
          }
        }

        // Determine where to create
        const isLocal = options.local;
        let targetPath: string;

        if (isLocal) {
          // Create in vault
          const node = await getCurrentNode();
          if (!node) {
            console.log(
              errorBox("Not in a vault directory", {
                hint: "Run 'bozly init' first or use without --local for global command",
              })
            );
            process.exit(1);
          }

          targetPath = path.join(node.path, ".bozly", "commands");
          await fs.mkdir(targetPath, { recursive: true });

          const filePath = path.join(targetPath, `${name}.md`);

          // Check if exists
          try {
            await fs.access(filePath);
            console.log(errorBox(`Command '${name}' already exists in this vault`));
            process.exit(1);
          } catch {
            // File doesn't exist, OK to create
          }

          // Create the command file
          const fileContent = `---
description: ${description}
---

${content}`;

          await fs.writeFile(filePath, fileContent, "utf-8");
          await logger.info("Command created in vault", {
            name,
            node: node.name,
            path: filePath,
          });

          console.log();
          console.log(
            successBox(`Command created: /${name}`, {
              Location: filePath,
              Description: description,
            })
          );
        } else {
          // Create global command
          await createGlobalCommand(name, description, content);
          await logger.info("Global command created", { name, description });

          console.log();
          console.log(
            successBox(`Global command created: /${name}`, {
              Description: description,
              Availability: "All nodes",
            })
          );
        }

        console.log();
        console.log(theme.muted(`Try it with: bozly run ${name}`));
      } catch (error) {
        await logger.error("Failed to create command", {
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(
          errorBox("Failed to create command", {
            error: error instanceof Error ? error.message : String(error),
          })
        );
        process.exit(1);
      }
    });
}

/**
 * Create command with AI assistance
 */
async function createCommandWithAI(
  description: string,
  providerOverride?: string
): Promise<string> {
  const provider = providerOverride ?? getDefaultProvider();

  console.log(infoBox(`Generating with ${provider}...`));

  // Get use cases/examples from user
  const examples = await promptText(
    "Any specific use cases or examples? (optional):",
    "",
    undefined
  );

  console.log(theme.muted("Generating command prompt..."));

  try {
    // Generate initial content
    let content = await generateCommandContent("", description, examples, provider);

    // Show generated content
    console.log();
    console.log(theme.bold("Generated Command Prompt:"));
    console.log("─".repeat(40));
    console.log(content);
    console.log("─".repeat(40));

    // Ask if user wants to refine
    const refineLoop = true;
    while (refineLoop) {
      const approve = await confirm({
        message: "Use this prompt?",
        default: true,
      });

      if (approve) {
        return content;
      }

      // Get refinement feedback
      const feedback = await promptText("What would you like to change?", undefined, undefined);

      if (!feedback.trim()) {
        console.log(warningBox("No feedback provided"));
        break;
      }

      console.log(theme.muted("Regenerating with feedback..."));

      try {
        const refinementPrompt = `Original purpose: ${description}

User feedback for improvement: ${feedback}

Generate an improved version of the command prompt that addresses this feedback. Return only the improved prompt.`;

        content = await generateCommandContent("", refinementPrompt, "", provider);

        console.log();
        console.log(theme.bold("Refined Command Prompt:"));
        console.log("─".repeat(40));
        console.log(content);
        console.log("─".repeat(40));
      } catch (error) {
        console.error(
          errorBox("Generation failed", {
            error: error instanceof Error ? error.message : String(error),
          })
        );
        throw error;
      }
    }

    return content;
  } catch (error) {
    console.error(
      errorBox("AI generation failed", {
        error: error instanceof Error ? error.message : String(error),
        hint: `Make sure ${provider} is installed and configured`,
      })
    );
    throw error;
  }
}
