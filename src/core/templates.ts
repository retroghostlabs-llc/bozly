/**
 * BOZLY Template System
 * Handles template discovery, loading, variable substitution, and initialization
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { logger } from "./logger.js";
import { Template, TemplateMetadata, TemplateContext } from "./types.js";
import { promptText, promptConfirm } from "../utils/prompts.js";

/**
 * Get the builtin templates directory (shipped with BOZLY)
 */
export function getBuiltinTemplatesPath(): string {
  return path.join(__dirname, "..", "..", "templates");
}

/**
 * Get the user templates directory
 */
export function getUserTemplatesPath(): string {
  return path.join(os.homedir(), ".bozly", "templates");
}

/**
 * Discover all available templates (builtin + user)
 */
export async function getTemplates(): Promise<Template[]> {
  const templates: Template[] = [];

  // Load builtin templates
  const builtinPath = getBuiltinTemplatesPath();
  try {
    const builtinDirs = await fs.readdir(builtinPath);
    for (const dir of builtinDirs) {
      const templatePath = path.join(builtinPath, dir);
      const stat = await fs.stat(templatePath);
      if (!stat.isDirectory()) {
        continue;
      }

      const metadata = await loadTemplateMetadata(templatePath);
      if (metadata) {
        templates.push({
          metadata,
          path: templatePath,
          source: "builtin",
        });
      }
    }
  } catch (error) {
    logger.debug("No builtin templates found");
  }

  // Load user templates
  const userPath = getUserTemplatesPath();
  try {
    const userDirs = await fs.readdir(userPath);
    for (const dir of userDirs) {
      const templatePath = path.join(userPath, dir);
      const stat = await fs.stat(templatePath);
      if (!stat.isDirectory()) {
        continue;
      }

      const metadata = await loadTemplateMetadata(templatePath);
      if (metadata) {
        templates.push({
          metadata,
          path: templatePath,
          source: "user",
        });
      }
    }
  } catch (error) {
    logger.debug("No user templates found");
  }

  return templates;
}

/**
 * Get a specific template by name
 */
export async function getTemplate(name: string): Promise<Template | null> {
  const templates = await getTemplates();
  return templates.find((t) => t.metadata.name === name) || null;
}

/**
 * Load and parse template metadata from template.json
 * Returns null if not found (uses defaults)
 */
export async function loadTemplateMetadata(templatePath: string): Promise<TemplateMetadata | null> {
  const metadataPath = path.join(templatePath, "template.json");

  try {
    const content = await fs.readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(content) as TemplateMetadata;

    // Validate required fields
    if (!metadata.name || !metadata.displayName || !metadata.description) {
      logger.warn(`Template ${templatePath} missing required fields`);
      return null;
    }

    return metadata;
  } catch (error) {
    // Generate default metadata from directory name
    const dirName = path.basename(templatePath);
    return {
      name: dirName,
      displayName: dirName.charAt(0).toUpperCase() + dirName.slice(1),
      description: "Custom template",
      version: "1.0.0",
    };
  }
}

/**
 * Substitute variables in template content
 * Replaces {{VARIABLE}} placeholders with values from context
 */
export function substituteVariables(content: string, context: TemplateContext): string {
  let result = content;

  // Replace all {{VARIABLE}} placeholders
  for (const [key, value] of Object.entries(context)) {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    result = result.replace(pattern, String(value));
  }

  return result;
}

/**
 * Collect template variable values from user interactively
 */
export async function collectTemplateVariables(
  metadata: TemplateMetadata
): Promise<Record<string, any>> {
  const context: Record<string, any> = {};

  if (!metadata.variables) {
    return context;
  }

  for (const [key, variable] of Object.entries(metadata.variables)) {
    const v = variable as { type?: string; prompt: string; default?: string | boolean };
    if (v.type === "boolean") {
      context[key] = await promptConfirm(v.prompt, v.default as boolean);
    } else {
      context[key] = await promptText(v.prompt, v.default as string);
    }
  }

  return context;
}

/**
 * Build template context with all variables
 */
export function buildTemplateContext(
  vaultName: string,
  userVariables: Record<string, any>,
  bozlyVersion: string
): TemplateContext {
  const now = new Date();
  return {
    VAULT_NAME: vaultName,
    CREATED_DATE: now.toISOString().split("T")[0], // YYYY-MM-DD format
    CREATED_DATETIME: now.toISOString(), // Full ISO datetime format
    BOZLY_VERSION: bozlyVersion,
    USER_NAME: process.env.USER || "User",
    ...userVariables,
  };
}

/**
 * Copy template directory to target location with variable substitution
 */
export async function applyTemplate(
  templatePath: string,
  targetPath: string,
  context: TemplateContext
): Promise<void> {
  const bozlySourcePath = path.join(templatePath, ".bozly");

  // Copy .bozly directory and all subdirectories
  await copyDirectoryWithSubstitution(bozlySourcePath, targetPath, context);
}

/**
 * Recursively copy directory with variable substitution
 */
async function copyDirectoryWithSubstitution(
  source: string,
  target: string,
  context: TemplateContext
): Promise<void> {
  try {
    await fs.mkdir(target, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);

      if (entry.isDirectory()) {
        await copyDirectoryWithSubstitution(sourcePath, targetPath, context);
      } else if (entry.isFile()) {
        // Copy file with variable substitution for markdown files
        if (entry.name.endsWith(".md") || entry.name.endsWith(".json")) {
          const content = await fs.readFile(sourcePath, "utf-8");
          const substituted = substituteVariables(content, context);
          await fs.writeFile(targetPath, substituted, "utf-8");
        } else {
          // Binary files: copy as-is
          await fs.copyFile(sourcePath, targetPath);
        }
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to copy template: ${errorMsg}`);
    throw error;
  }
}

/**
 * Initialize node from template
 * Called by initNode() to create a new node using a template
 */
export async function initFromTemplate(
  templateName: string,
  nodePath: string,
  nodeName: string,
  bozlyVersion: string
): Promise<void> {
  const template = await getTemplate(templateName);
  if (!template) {
    throw new Error(`Template '${templateName}' not found`);
  }

  logger.info(`Using template: ${template.metadata.displayName}`);

  // Collect template variables from user
  const userVariables = await collectTemplateVariables(template.metadata);

  // Build template context with all variables
  const context = buildTemplateContext(nodeName, userVariables, bozlyVersion);

  // Create .bozly directory in node
  const bozlyPath = path.join(nodePath, ".bozly");
  await fs.mkdir(bozlyPath, { recursive: true });

  // Apply template (copy with substitution)
  await applyTemplate(template.path, bozlyPath, context);

  logger.debug(`Template applied to ${nodePath}`);
}

/**
 * Create a new template directory
 */
export async function createTemplate(
  name: string,
  displayName: string,
  description: string,
  author?: string,
  tags?: string[],
  category?: string
): Promise<void> {
  const userPath = getUserTemplatesPath();
  const templatePath = path.join(userPath, name);

  // Check if template already exists
  try {
    await fs.access(templatePath);
    throw new Error(`Template '${name}' already exists at ${templatePath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  // Create template directory structure
  await fs.mkdir(templatePath, { recursive: true });
  await fs.mkdir(path.join(templatePath, ".bozly", "commands"), { recursive: true });
  await fs.mkdir(path.join(templatePath, ".bozly", "models"), { recursive: true });
  await fs.mkdir(path.join(templatePath, ".bozly", "workflows"), { recursive: true });

  // Create template.json
  const metadata: TemplateMetadata = {
    name,
    displayName,
    description,
    version: "1.0.0",
    author: author ? { name: author } : undefined,
    tags,
    category,
  };

  await fs.writeFile(
    path.join(templatePath, "template.json"),
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );

  // Create default config.json
  const config = {
    name: "{{VAULT_NAME}}",
    type: name,
    version: "0.3.0",
    created: "{{CREATED_DATE}}",
    ai: {
      defaultProvider: "claude",
      providers: ["claude", "gpt", "gemini", "ollama"],
    },
  };

  await fs.writeFile(
    path.join(templatePath, ".bozly", "config.json"),
    JSON.stringify(config, null, 2),
    "utf-8"
  );

  // Create default context.md
  const context = `# {{VAULT_NAME}}

Created: {{CREATED_DATE}}
Version: {{BOZLY_VERSION}}

## Domain

This is a ${category || "custom"} vault for managing ${description.toLowerCase()}.

## Commands

Add commands to \`.bozly/commands/\` to extend this vault.

## Models

Add domain models to \`.bozly/models/\` to define data structures.

## Workflows

Add workflows to \`.bozly/workflows/\` to automate multi-step processes.
`;

  await fs.writeFile(path.join(templatePath, ".bozly", "context.md"), context, "utf-8");

  // Create empty index.json
  await fs.writeFile(
    path.join(templatePath, ".bozly", "index.json"),
    JSON.stringify({ tasks: [] }, null, 2),
    "utf-8"
  );

  // Create README.md
  const readme = `# ${displayName}

${description}

## Getting Started

\`\`\`bash
bozly init --type ${name} ~/my-${name}-vault
\`\`\`

## Features

- Custom domain configuration
- Pre-configured commands
- Domain-specific models

## Customization

Edit files in \`.bozly/\` to customize this template:
- \`.bozly/context.md\` - AI context
- \`.bozly/commands/\` - Commands
- \`.bozly/models/\` - Domain models
- \`.bozly/workflows/\` - Workflows
`;

  await fs.writeFile(path.join(templatePath, "README.md"), readme, "utf-8");

  logger.info(`✓ Created template at ${templatePath}`);
}
