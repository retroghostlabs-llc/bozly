/**
 * Context Generation Module
 *
 * Generates AI-consumable context by combining vault metadata, configuration,
 * and available commands into a single markdown document. This context is then
 * provided to AI assistants (Claude, GPT, etc.) to give them vault-specific knowledge.
 *
 * Key features:
 * - Load vault context from .bozly/context.md
 * - Add vault metadata (name, type, path, provider)
 * - Include available commands with descriptions
 * - Configurable context options (include/exclude commands)
 * - Automatic command discovery from vault
 * - Description extraction from command files
 *
 * Usage:
 *   import { generateContext } from './context.js';
 *   const vault = await getCurrentVault();
 *   const context = await generateContext(vault, { provider: 'gpt' });
 *   console.log(context);
 *
 * @module core/context
 */

import fs from "fs/promises";
import path from "path";
import { logger } from "./logger.js";
import { trackFileVersion } from "./versions.js";
import { VaultInfo, ContextOptions } from "./types.js";

const CONTEXT_FILE = "context.md";

/**
 * Generate context for AI consumption
 *
 * Creates a complete context document for an AI provider by combining:
 * 1. Vault metadata (name, type, path, provider)
 * 2. Vault context content from .bozly/context.md
 * 3. Available commands (if includeCommands option is true)
 *
 * @param vault - Vault information object
 * @param options - Context generation options
 * @param options.provider - AI provider name (default: 'claude')
 * @param options.includeCommands - Include commands list (default: true)
 * @returns Complete context as markdown string for AI consumption
 */
export async function generateContext(
  vault: VaultInfo,
  options: ContextOptions = {}
): Promise<string> {
  const bozlyPath = path.join(vault.path, ".bozly");
  const contextPath = path.join(bozlyPath, CONTEXT_FILE);

  await logger.debug("Generating context for vault", {
    vaultName: vault.name,
    vaultType: vault.type,
    provider: options.provider ?? "claude",
    includeCommands: options.includeCommands !== false,
  });

  // Read base context
  let context: string;
  try {
    context = await fs.readFile(contextPath, "utf-8");
    await logger.debug("Loaded vault context file", {
      contextPath,
      contentLength: context.length,
    });

    // Track context.md version
    try {
      await trackFileVersion(vault.path, "context.md", context);
    } catch (versionError) {
      await logger.debug("Failed to track context version", {
        error: versionError instanceof Error ? versionError.message : String(versionError),
      });
      // Don't fail the entire operation if version tracking fails
    }
  } catch (error) {
    await logger.warn("Vault context file not found", { contextPath });
    context = `# ${vault.name}\n\nNo context file found.`;
  }

  // Add vault metadata
  const metadata = `
---
vault: ${vault.name}
type: ${vault.type}
path: ${vault.path}
provider: ${options.provider ?? "claude"}
---

`;

  // Combine context
  let fullContext = metadata + context;

  // Add commands if requested
  if (options.includeCommands !== false) {
    const commands = await getCommandList(bozlyPath);
    if (commands.length > 0) {
      await logger.debug("Adding commands to context", { count: commands.length });
      fullContext += `

## Available Commands

${commands.map((c) => `- \`/${c.name}\` — ${c.description ?? "No description"}`).join("\n")}
`;
    } else {
      await logger.debug("No commands found in vault");
    }
  }

  await logger.info("Context generated successfully", {
    vaultName: vault.name,
    totalLength: fullContext.length,
    provider: options.provider ?? "claude",
  });

  return fullContext;
}

/**
 * Get list of commands in vault
 *
 * Discovers all command markdown files in the vault's .bozly/commands directory
 * and extracts their descriptions.
 *
 * @param bozlyPath - Path to vault's .bozly directory
 * @returns Array of command objects with name and description
 */
async function getCommandList(
  bozlyPath: string
): Promise<Array<{ name: string; description: string }>> {
  const commandsPath = path.join(bozlyPath, "commands");
  const commands: Array<{ name: string; description: string }> = [];

  try {
    await logger.debug("Reading commands directory", { commandsPath });
    const files = await fs.readdir(commandsPath);
    const markdownFiles = files.filter((f) => f.endsWith(".md"));

    await logger.debug("Found command files", {
      count: markdownFiles.length,
      files: markdownFiles,
    });

    for (const file of markdownFiles) {
      const name = file.replace(".md", "");
      try {
        const content = await fs.readFile(path.join(commandsPath, file), "utf-8");
        // Extract description from first line or YAML frontmatter
        const description = extractDescription(content);
        commands.push({ name, description });
        await logger.debug("Loaded command", {
          command: name,
          descriptionLength: description.length,
        });
      } catch (error) {
        await logger.warn("Failed to read command file", { file });
      }
    }
  } catch (error) {
    await logger.debug("Commands directory not found or empty", { commandsPath });
    // No commands directory or couldn't read it - this is normal
  }

  if (commands.length > 0) {
    await logger.debug("Command list retrieved", { count: commands.length });
  }

  return commands;
}

/**
 * Extract description from command file
 */
function extractDescription(content: string): string {
  const lines = content.split("\n");

  // Check for YAML frontmatter
  if (lines[0] === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === "---") {
        break;
      }
      const match = lines[i].match(/^description:\s*(.+)$/);
      if (match) {
        return match[1];
      }
    }
  }

  // Use first non-empty, non-heading line
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---")) {
      return trimmed.slice(0, 100);
    }
  }

  return "No description";
}
