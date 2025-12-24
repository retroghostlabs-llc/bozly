/**
 * bozly command - Manage commands (list and create)
 */

import { Command } from "commander";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { getCurrentNode } from "../../core/node.js";
import { getGlobalCommands, getAllCommands, createGlobalCommand } from "../../core/commands.js";
import { promptText, validateCommandName, validateDescription } from "../../utils/prompts.js";
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
            console.log(chalk.yellow("No global commands found."));
            console.log();
            console.log("Create one with: bozly command create");
            return;
          }

          console.log(chalk.cyan("Global Commands:\n"));
        } else {
          // Show all commands (vault + global)
          const node = await getCurrentNode();

          if (node) {
            // We're in a node - show all commands
            commands = await getAllCommands(node.path);

            if (commands.length === 0) {
              console.log(chalk.yellow("No commands found."));
              return;
            }

            console.log(chalk.cyan(`Commands for '${node.name}':\n`));

            // Group by source
            const bySource = {
              vault: commands.filter((c) => c.source === "vault"),
              global: commands.filter((c) => c.source === "global"),
              builtin: commands.filter((c) => c.source === "builtin"),
            };

            // Show vault commands
            if (bySource.vault.length > 0) {
              console.log(chalk.bold(chalk.green("Vault Commands:")));
              for (const cmd of bySource.vault) {
                const desc = options.long
                  ? (cmd.description ?? "No description")
                  : (cmd.description ?? "No description").substring(0, 50);
                console.log(chalk.cyan(`  /${cmd.name}`) + ` — ${desc}`);
              }
              console.log();
            }

            // Show global commands
            if (bySource.global.length > 0) {
              console.log(chalk.bold(chalk.blue("Global Commands:")));
              for (const cmd of bySource.global) {
                const desc = options.long
                  ? (cmd.description ?? "No description")
                  : (cmd.description ?? "No description").substring(0, 50);
                console.log(chalk.blue(`  /${cmd.name}`) + ` — ${desc}`);
              }
              console.log();
            }

            // Show builtin commands
            if (bySource.builtin.length > 0) {
              console.log(chalk.bold(chalk.gray("Builtin Commands:")));
              for (const cmd of bySource.builtin) {
                const desc = options.long
                  ? (cmd.description ?? "No description")
                  : (cmd.description ?? "No description").substring(0, 50);
                console.log(chalk.gray(`  /${cmd.name}`) + ` — ${desc}`);
              }
              console.log();
            }
          } else {
            // Not in a node - show only global commands
            commands = await getGlobalCommands();

            if (commands.length === 0) {
              console.log(chalk.yellow("No global commands found."));
              console.log();
              console.log("Create one with: bozly command create");
              return;
            }

            console.log(chalk.cyan("Global Commands:\n"));
          }
        }

        // Display commands
        for (const cmd of commands) {
          const desc = options.long
            ? (cmd.description ?? "No description")
            : (cmd.description ?? "No description").substring(0, 50);
          const sourceIndicator =
            cmd.source === "vault"
              ? chalk.green("vault")
              : cmd.source === "global"
                ? chalk.blue("global")
                : chalk.gray("builtin");
          console.log(chalk.cyan(`  /${cmd.name}`) + ` [${sourceIndicator}] — ${desc}`);
        }

        console.log();
        console.log(
          chalk.gray(`Found ${commands.length} command(s). Use 'bozly command create' to add more.`)
        );
      } catch (error) {
        await logger.error("Failed to list commands", {
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
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
    .description("Create a new command (global)")
    .option("-l, --local", "Create in current node instead of global")
    .action(async (options) => {
      try {
        await logger.debug("bozly command create started", { local: options.local });

        console.log(chalk.cyan("\n📝 Create New Command\n"));

        // Get command name
        const name = await promptText(
          "Command name (e.g., summarize):",
          undefined,
          validateCommandName
        );

        // Get description
        const description = await promptText("Brief description:", undefined, validateDescription);

        // Get command content
        console.log();
        console.log(chalk.dim("Enter command prompt (Press Ctrl+D or Ctrl+Z to finish):"));
        const content = await promptText("> ", "");

        if (!content.trim()) {
          console.log(chalk.yellow("Cancelled: No content provided."));
          return;
        }

        // Determine where to create
        const isLocal = options.local;
        let targetPath: string;

        if (isLocal) {
          // Create in vault
          const node = await getCurrentNode();
          if (!node) {
            console.log(chalk.red("Error: Not in a node directory."));
            console.log("Run 'bozly init' first or use without --local for global command.");
            process.exit(1);
          }

          targetPath = path.join(node.path, ".bozly", "commands");
          await fs.mkdir(targetPath, { recursive: true });

          const filePath = path.join(targetPath, `${name}.md`);

          // Check if exists
          try {
            await fs.access(filePath);
            console.log(chalk.red(`Error: Command '${name}' already exists in this node.`));
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
          console.log(chalk.green(`✓ Command created: /${name}`));
          console.log(chalk.dim(`  Location: ${filePath}`));
          console.log(chalk.dim(`  Description: ${description}`));
        } else {
          // Create global command
          await createGlobalCommand(name, description, content);
          await logger.info("Global command created", { name, description });

          console.log();
          console.log(chalk.green(`✓ Global command created: /${name}`));
          console.log(chalk.dim(`  Description: ${description}`));
          console.log(chalk.gray(`  Available in all nodes`));
        }

        console.log();
        console.log(chalk.gray(`Try it with: bozly run ${name}`));
      } catch (error) {
        await logger.error("Failed to create command", {
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    });
}
