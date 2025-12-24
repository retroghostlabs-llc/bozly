/**
 * Node Operations Module
 *
 * Provides core functionality for creating, managing, and accessing vaults.
 * Handles node initialization, file structure creation, registry updates,
 * and node discovery in the file system.
 *
 * Key features:
 * - Initialize new vaults with configurable types
 * - Automatic .bozly directory structure creation
 * - Node registration and metadata management
 * - Current node discovery (walking up directory tree)
 * - Default context template generation
 *
 * Usage:
 *   import { initNode, getCurrentNode } from './vault.js';
 *   const vault = await initNode({ path: '/home/user/my-vault' });
 *   const current = await getCurrentNode();
 *
 * @module core/node
 */

import fs from "fs/promises";
import path from "path";
import { addNodeToRegistry } from "./registry.js";
import { logger } from "./logger.js";
import { NodeConfig, NodeInfo, InitOptions } from "./types.js";
import {
  getTemplate,
  collectTemplateVariables,
  buildTemplateContext,
  applyTemplate,
} from "./templates.js";
import { getSystemTimezone } from "../utils/timezone.js";

const BOZLY_DIR = ".bozly";
const CONFIG_FILE = "config.json";
const CONTEXT_FILE = "context.md";
const BOZLY_VERSION = "0.3.0-rc.1";

/**
 * Get the current BOZLY framework version
 */
function getBozlyVersion(): string {
  return BOZLY_VERSION;
}

/**
 * Initialize a new node in the specified directory
 *
 * Creates a complete vault structure with configuration, context, and subdirectories.
 * Handles node registration and integration with the global registry.
 *
 * @param options - Node initialization options
 * @param options.path - Directory path for vault (required)
 * @param options.name - Human-readable vault name (optional, defaults to directory name)
 * @param options.type - Vault type (optional, defaults to 'default')
 * @param options.force - Overwrite existing vault (optional, default false)
 * @returns Vault information with ID and metadata
 * @throws {Error} If vault path is invalid or already exists (without force)
 *
 * @example
 *   const vault = await initNode({
 *     path: '/home/user/my-vault',
 *     name: 'my-vault',
 *     type: 'music'
 *   });
 *   console.log(`Created node: ${vault.id}`);
 */
export async function initNode(options: InitOptions): Promise<NodeInfo> {
  const nodePath = path.resolve(options.path);
  const bozlyPath = path.join(nodePath, BOZLY_DIR);
  const templateType = options.type ?? "default";

  // Log function entry with parameters
  await logger.debug("Initializing node", {
    nodePath,
    name: options.name,
    type: templateType,
    force: options.force,
    useTemplate: true,
  });

  // Check if .bozly already exists
  try {
    await fs.access(bozlyPath);
    if (!options.force) {
      await logger.warn("Node already exists", {
        nodePath,
        action: "rejecting without --force",
      });
      throw new Error(`Node already exists at ${nodePath}. Use --force to overwrite.`);
    }
    await logger.info("Overwriting existing node", { nodePath });
  } catch (error) {
    // Directory doesn't exist, which is fine
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      await logger.error("Failed to check node existence", { nodePath }, error as Error);
      throw error;
    }
  }

  // Determine vault name
  const name = options.name || path.basename(nodePath);
  await logger.debug("Determined vault name", { name, isDefault: !options.name });

  // Try to use template system if available
  const template = await getTemplate(templateType);
  if (template && !options.skipTemplateVariables) {
    await logger.info("Using template system", {
      templateName: template.metadata.name,
      templateDisplay: template.metadata.displayName,
    });

    try {
      // Collect template variables
      let userVariables = options.variables || {};
      if (Object.keys(template.metadata.variables || {}).length > 0) {
        const collectedVars = await collectTemplateVariables(template.metadata);
        userVariables = { ...userVariables, ...collectedVars };
      }

      // Build template context with all variables
      const bozlyVersion = getBozlyVersion();
      const context = buildTemplateContext(name, userVariables, bozlyVersion);

      // Create .bozly directory in node
      await fs.mkdir(bozlyPath, { recursive: true });
      await logger.debug("Created main .bozly directory", { bozlyPath });

      // Apply template with variable substitution
      await applyTemplate(template.path, bozlyPath, context);
      await logger.debug("Template applied", { templateName: template.metadata.name });

      // Create core subdirectories (ensure they exist even if template doesn't include them)
      const subdirs = ["sessions", "tasks", "commands", "workflows", "hooks"];
      for (const dir of subdirs) {
        const dirPath = path.join(bozlyPath, dir);
        try {
          await fs.access(dirPath);
        } catch {
          // Directory doesn't exist, create it
          await fs.mkdir(dirPath, { recursive: true });
        }
      }
      await logger.debug("Ensured core subdirectories exist", { subdirs });

      // Create index.json if it doesn't exist
      const indexPath = path.join(bozlyPath, "index.json");
      try {
        await fs.access(indexPath);
      } catch {
        await fs.writeFile(
          indexPath,
          JSON.stringify({ tasks: [], lastUpdated: new Date().toISOString() }, null, 2)
        );
        await logger.debug("Created index.json");
      }

      // Register vault with template type
      try {
        const vault = await addNodeToRegistry({
          name,
          path: nodePath,
          type: templateType,
        });

        await logger.info("Vault initialized successfully with template", {
          nodeId: vault.id,
          nodeName: vault.name,
          nodePath: vault.path,
          templateName: template.metadata.name,
        });

        return vault;
      } catch (error) {
        await logger.error("Failed to register vault", { nodePath }, error as Error);
        throw error;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.warn("Failed to apply template, falling back to hardcoded context", {
        templateName: templateType,
        error: errorMsg,
      });
      // Fall through to hardcoded context
    }
  }

  // Fallback: Use hardcoded context if template not found or skipTemplateVariables is true
  try {
    await fs.mkdir(bozlyPath, { recursive: true });
    await logger.debug("Created main .bozly directory", { bozlyPath });

    const subdirs = ["sessions", "tasks", "commands", "workflows", "hooks"];
    for (const dir of subdirs) {
      const dirPath = path.join(bozlyPath, dir);
      await fs.mkdir(dirPath, { recursive: true });
    }
    await logger.debug("Created node subdirectories", {
      count: subdirs.length,
      directories: subdirs,
    });
  } catch (error) {
    await logger.error("Failed to create vault directories", { bozlyPath }, error as Error);
    throw error;
  }

  // Create config.json
  const config: NodeConfig = {
    name,
    type: templateType,
    version: "0.3.0",
    created: new Date().toISOString(),
    timezone: getSystemTimezone(),
    ai: {
      defaultProvider: "claude",
      providers: ["claude", "gpt", "gemini", "ollama"],
    },
  };

  try {
    await fs.writeFile(path.join(bozlyPath, CONFIG_FILE), JSON.stringify(config, null, 2));
    await logger.info("Vault configuration created", {
      nodeName: config.name,
      vaultType: config.type,
      defaultProvider: config.ai.defaultProvider,
    });
  } catch (error) {
    await logger.error("Failed to write vault configuration", { nodePath }, error as Error);
    throw error;
  }

  // Create context.md
  try {
    const contextContent = generateDefaultContext(name, templateType);
    await fs.writeFile(path.join(bozlyPath, CONTEXT_FILE), contextContent);
    await logger.debug("Created node context file", { type: templateType });
  } catch (error) {
    await logger.error("Failed to write vault context", { nodePath }, error as Error);
    throw error;
  }

  // Create index.json
  try {
    await fs.writeFile(
      path.join(bozlyPath, "index.json"),
      JSON.stringify({ tasks: [], lastUpdated: new Date().toISOString() }, null, 2)
    );
    await logger.debug("Created node index file");
  } catch (error) {
    await logger.error("Failed to write vault index", { nodePath }, error as Error);
    throw error;
  }

  // Register vault
  try {
    const vault = await addNodeToRegistry({
      name,
      path: nodePath,
      type: templateType,
    });

    await logger.info("Vault initialized successfully (fallback)", {
      nodeId: vault.id,
      nodeName: vault.name,
      nodePath: vault.path,
    });

    return vault;
  } catch (error) {
    await logger.error("Failed to register vault", { nodePath }, error as Error);
    throw error;
  }
}

/**
 * Get the current vault (based on cwd)
 *
 * Searches up the directory tree from the current working directory to find
 * a vault (indicated by the presence of a .bozly directory). Returns null if
 * no vault is found.
 *
 * @returns Vault information if found, null otherwise
 * @throws {Error} If vault config is malformed or unreadable
 *
 * @example
 *   const vault = await getCurrentNode();
 *   if (vault) {
 *     console.log(`Found vault: ${vault.name}`);
 *   } else {
 *     console.log("Not in a vault directory");
 *   }
 */
export async function getCurrentNode(): Promise<NodeInfo | null> {
  let currentPath = process.cwd();
  let searchDepth = 0;

  await logger.debug("Searching for current vault", { startPath: currentPath });

  // Walk up the directory tree looking for .bozly
  while (currentPath !== path.dirname(currentPath)) {
    const bozlyPath = path.join(currentPath, BOZLY_DIR);
    searchDepth += 1;
    await logger.debug("Checking directory for .bozly", {
      path: currentPath,
      depth: searchDepth,
    });

    try {
      await fs.access(bozlyPath);
      // Found a .bozly directory
      const configPath = path.join(bozlyPath, CONFIG_FILE);
      const configContent = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(configContent) as NodeConfig;

      const vault: NodeInfo = {
        id: generateId(currentPath),
        name: config.name,
        path: currentPath,
        type: config.type,
        active: true,
        created: config.created,
      };

      await logger.info("Found current vault", {
        nodeName: vault.name,
        nodePath: vault.path,
        searchDepth,
      });

      return vault;
    } catch (error) {
      // No .bozly here, continue up
      if (error instanceof SyntaxError) {
        await logger.warn("Malformed vault config", {
          path: currentPath,
          error: error.message,
        });
      }
    }
    currentPath = path.dirname(currentPath);
  }

  await logger.debug("No vault found in directory tree", {
    startPath: process.cwd(),
    searchDepth,
  });

  return null;
}

/**
 * Generate default context content
 */
function generateDefaultContext(name: string, type: string): string {
  const templates: Record<string, string> = {
    default: `# ${name}

## Overview
This is a BOZLY-managed vault.

## Purpose
[Describe the purpose of this vault]

## Key Files
- \`.bozly/config.json\` — Vault configuration
- \`.bozly/commands/\` — Custom commands
- \`.bozly/sessions/\` — Session history

## Commands
Run \`bozly status\` to see available commands.
`,
    music: `# ${name} — Music Discovery Vault

## Overview
Album discovery and review system with triple-scoring methodology.

## Purpose
Track album listening, reviews, and discovery using the TRIPLE search strategy.

## Methodology
- **Shaun Score:** Personal enjoyment (1-10)
- **Objective Score:** Technical quality (1-10)
- **Emotional Score:** Emotional impact (1-10)

## Commands
- \`/daily\` — Log daily listening notes
- \`/weekly-roll\` — Select album for the week
- \`/complete-album\` — Finalize album review
`,
    journal: `# ${name} — Journal Vault

## Overview
Daily journaling with mood tracking and weekly reviews.

## Purpose
Capture daily reflections, track mood patterns, and maintain consistency.

## Structure
- Daily entries with date-based naming
- Weekly review summaries
- Mood tracking system

## Commands
- \`/daily-entry\` — Create today's entry
- \`/log-mood\` — Record current mood
- \`/weekly-review\` — Weekly reflection
`,
    content: `# ${name} — Content Production Vault

## Overview
Video production workflow from ideation to publishing.

## Purpose
Manage content pipeline: ideas → scripts → production → publishing.

## Workflow
1. Capture ideas
2. Develop outlines
3. Write scripts
4. Production checklist
5. Post-production
6. Publishing

## Commands
- \`/new-idea\` — Capture content idea
- \`/new-outline\` — Create video outline
- \`/prep-production\` — Production checklist
`,
  };

  return templates[type] || templates.default;
}

/**
 * Generate a simple ID from path
 */
function generateId(nodePath: string): string {
  return Buffer.from(nodePath).toString("base64url").slice(0, 16);
}
