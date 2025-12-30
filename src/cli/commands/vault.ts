/**
 * bozly vault - Vault management commands (alias group)
 *
 * This command provides a convenient alias for vault-related operations,
 * making the CLI more discoverable for Obsidian users who think in terms
 * of "vault" operations.
 *
 * Usage:
 *   bozly vault init           # Same as: bozly init
 *   bozly vault list           # Same as: bozly list
 *   bozly vault add <path>     # Same as: bozly add <path>
 *   bozly vault remove <name>  # Same as: bozly remove <name>
 *   bozly vault status         # Same as: bozly status
 *
 * Note: All vault subcommands delegate to their top-level equivalents.
 * The terminology "vault" and "node" are interchangeable in BOZLY.
 */

import { Command } from "commander";
import { spawn } from "child_process";
import { logger } from "../../core/logger.js";

/**
 * Execute a bozly command by spawning the CLI with the given arguments
 */
async function executeCommand(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [process.argv[1], ...args], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        // Don't reject - the spawned command already printed errors
        process.exit(code ?? 1);
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

export const vaultCommand = new Command("vault")
  .description(
    "Vault management commands (alias for init, list, add, remove, status)\n" +
      "  Note: 'vault' and 'node' are interchangeable terms in BOZLY."
  )
  .action(async () => {
    await logger.debug("bozly vault command invoked without subcommand");
    vaultCommand.help();
  });

/**
 * vault init - Initialize a new vault (alias for bozly init)
 */
const vaultInitCommand = new Command("init")
  .description("Initialize a new vault in the current directory")
  .option("-t, --type <type>", "Vault template type (default, music, journal, project)")
  .option("-n, --name <name>", "Vault name (defaults to directory name)")
  .option("-f, --force", "Overwrite existing .bozly directory")
  .allowUnknownOption(true)
  .action(async (options, cmd) => {
    await logger.debug("bozly vault init delegating to init command", { options });
    // Build args for the init command
    const args = ["init"];
    if (options.type) {
      args.push("-t", options.type);
    }
    if (options.name) {
      args.push("-n", options.name);
    }
    if (options.force) {
      args.push("-f");
    }
    // Pass through any unknown options
    args.push(...cmd.args);
    await executeCommand(args);
  });

/**
 * vault list - List all registered vaults (alias for bozly list)
 */
const vaultListCommand = new Command("list")
  .alias("ls")
  .description("List all registered vaults")
  .option("-v, --verbose", "Show detailed information")
  .option("--json", "Output as JSON")
  .allowUnknownOption(true)
  .action(async (options, cmd) => {
    await logger.debug("bozly vault list delegating to list command", { options });
    const args = ["list"];
    if (options.verbose) {
      args.push("-v");
    }
    if (options.json) {
      args.push("--json");
    }
    args.push(...cmd.args);
    await executeCommand(args);
  });

/**
 * vault add - Register an existing vault (alias for bozly add)
 */
const vaultAddCommand = new Command("add")
  .description("Register an existing vault with BOZLY")
  .argument("<path>", "Path to vault directory")
  .option("-n, --name <name>", "Vault name (defaults to directory name)")
  .allowUnknownOption(true)
  .action(async (pathArg: string, options, cmd) => {
    await logger.debug("bozly vault add delegating to add command", { path: pathArg, options });
    const args = ["add", pathArg];
    if (options.name) {
      args.push("-n", options.name);
    }
    args.push(...cmd.args.slice(1)); // Skip the path arg
    await executeCommand(args);
  });

/**
 * vault remove - Remove a vault from registry (alias for bozly remove)
 */
const vaultRemoveCommand = new Command("remove")
  .alias("rm")
  .description("Remove a vault from registry (does not delete files)")
  .argument("<name-or-path>", "Vault name or path to remove")
  .option("-f, --force", "Skip confirmation prompt")
  .option("--delete", "Also delete the .bozly directory (dangerous)")
  .allowUnknownOption(true)
  .action(async (nameOrPath: string, options, cmd) => {
    await logger.debug("bozly vault remove delegating to remove command", { nameOrPath, options });
    const args = ["remove", nameOrPath];
    if (options.force) {
      args.push("-f");
    }
    if (options.delete) {
      args.push("--delete");
    }
    args.push(...cmd.args.slice(1));
    await executeCommand(args);
  });

/**
 * vault status - Show current vault status (alias for bozly status)
 */
const vaultStatusCommand = new Command("status")
  .description("Show current vault status")
  .option("-v, --verbose", "Show detailed information")
  .option("--json", "Output as JSON")
  .allowUnknownOption(true)
  .action(async (options, cmd) => {
    await logger.debug("bozly vault status delegating to status command", { options });
    const args = ["status"];
    if (options.verbose) {
      args.push("-v");
    }
    if (options.json) {
      args.push("--json");
    }
    args.push(...cmd.args);
    await executeCommand(args);
  });

// Register subcommands
vaultCommand.addCommand(vaultInitCommand);
vaultCommand.addCommand(vaultListCommand);
vaultCommand.addCommand(vaultAddCommand);
vaultCommand.addCommand(vaultRemoveCommand);
vaultCommand.addCommand(vaultStatusCommand);
