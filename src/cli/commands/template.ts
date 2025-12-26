/**
 * bozly template - Manage templates (list, create, and extract from vault)
 */

import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import { logger } from "../../core/logger.js";
import { errorBox, warningBox, successBox, infoBox, theme } from "../../cli/ui/index.js";
import { getTemplates, createTemplate } from "../../core/templates.js";
import { getCurrentNode } from "../../core/node.js";
import { getNodeConfig } from "../../core/config.js";
import {
  promptText,
  promptSelect,
  validateTemplateName,
  validateDescription,
} from "../../utils/prompts.js";
import { generateTemplateFromVault } from "../../core/ai-generation.js";
import { getDefaultProvider } from "../../core/providers.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export const templateCommand = new Command("template")
  .description("Manage templates (list, create, and extract from vault)")
  .addCommand(createListCommand())
  .addCommand(createCreateCommand())
  .addCommand(createFromVaultCommand());

/**
 * Create 'list' subcommand
 */
function createListCommand(): Command {
  return new Command("list")
    .alias("ls")
    .description("List available templates (builtin and user)")
    .option("-c, --category <category>", "Filter by category")
    .action(async (options) => {
      try {
        await logger.debug("bozly template list started", {
          category: options.category,
        });

        const templates = await getTemplates();

        if (templates.length === 0) {
          console.log(
            warningBox("No templates found", {
              hint: "Create one with: bozly template create",
            })
          );
          return;
        }

        // Filter by category if specified
        let filtered = templates;
        if (options.category) {
          filtered = templates.filter((t) => t.metadata.category === options.category);

          if (filtered.length === 0) {
            console.log(warningBox(`No templates found in category '${options.category}'`));
            return;
          }
        }

        console.log(infoBox("Available Templates", {}));

        // Group by source
        const bySource = {
          builtin: filtered.filter((t) => t.source === "builtin"),
          user: filtered.filter((t) => t.source === "user"),
        };

        // Show builtin templates
        if (bySource.builtin.length > 0) {
          console.log(theme.bold("Builtin Templates:"));
          for (const template of bySource.builtin) {
            const category = template.metadata.category ? ` [${template.metadata.category}]` : "";
            console.log(
              theme.primary(`  ${template.metadata.displayName}`) +
                theme.muted(category) +
                `\n    ${template.metadata.description}`
            );
            if (template.metadata.version) {
              console.log(theme.muted(`    Version: ${template.metadata.version}`));
            }
            console.log();
          }
        }

        // Show user templates
        if (bySource.user.length > 0) {
          console.log(theme.bold("User Templates:"));
          for (const template of bySource.user) {
            const category = template.metadata.category ? ` [${template.metadata.category}]` : "";
            console.log(
              theme.primary(`  ${template.metadata.displayName}`) +
                theme.muted(category) +
                `\n    ${template.metadata.description}`
            );
            if (template.metadata.version) {
              console.log(theme.muted(`    Version: ${template.metadata.version}`));
            }
            console.log();
          }
        }

        console.log();
        console.log(
          theme.muted(
            `Found ${filtered.length} template(s). ` +
              `Use 'bozly init --type <name>' to create a node from a template.`
          )
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await logger.error("Failed to list templates", {
          error: errorMsg,
        });
        console.error(
          errorBox("Failed to list templates", {
            error: errorMsg,
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
  return new Command("create").description("Create a new template").action(async () => {
    try {
      await logger.debug("bozly template create started");

      console.log(infoBox("Create New Template", {}));

      // Get template name
      const name = await promptText(
        "Template name (e.g., project-tracker):",
        undefined,
        validateTemplateName
      );

      // Get display name
      const displayName = await promptText("Display name (e.g., Project Tracker):", name);

      // Get description
      const description = await promptText("Brief description:", undefined, validateDescription);

      // Get category
      const categoryOptions = [
        { value: "personal", name: "Personal (journals, notes)" },
        { value: "productivity", name: "Productivity (projects, tasks)" },
        { value: "creative", name: "Creative (writing, music, art)" },
        { value: "professional", name: "Professional (work, teams)" },
        { value: "custom", name: "Custom (other)" },
      ];

      const category = await promptSelect<string>("Category:", categoryOptions);

      // Get author
      const author = await promptText("Author (optional):", "");

      // Create the template
      await createTemplate(name, displayName, description, author || undefined, [], category);

      await logger.info("Template created", {
        name,
        displayName,
        category,
      });

      console.log();
      console.log(
        successBox(`Template created: ${displayName}`, {
          Name: name,
          Category: category,
        })
      );
      console.log(theme.muted(`Create a node from this template with:`));
      console.log(theme.muted(`  bozly init --type ${name} ~/my-${name}-node`));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to create template", {
        error: errorMsg,
      });
      console.error(
        errorBox("Failed to create template", {
          error: errorMsg,
        })
      );
      process.exit(1);
    }
  });
}

/**
 * Create 'from-vault' subcommand
 * Extracts current vault structure and uses AI to generalize it into a template
 */
function createFromVaultCommand(): Command {
  return new Command("from-vault")
    .alias("extract")
    .description("Extract current vault as a reusable template")
    .option("--provider <name>", "AI provider to use (claude, gpt, gemini, ollama)")
    .action(async (options) => {
      try {
        await logger.debug("bozly template from-vault started");

        // Ensure we're in a vault
        const node = await getCurrentNode();
        if (!node) {
          console.log(
            errorBox("Not in a vault directory", {
              hint: "Run 'bozly init' first to initialize a vault",
            })
          );
          process.exit(1);
        }

        console.log(infoBox(`Extracting template from vault: ${node.name}`));

        const nodeConfig = await getNodeConfig();
        if (!nodeConfig) {
          throw new Error("Could not load vault configuration");
        }

        // Analyze vault structure
        console.log(theme.muted("Analyzing vault structure..."));
        const vaultStructure = await analyzeVaultStructure(node.path);

        // Get template name
        const templateName = await promptText(
          "Template name (e.g., music-vault):",
          node.name.toLowerCase().replace(/\s+/g, "-"),
          validateTemplateName
        );

        // Get AI provider
        const provider = options.provider || getDefaultProvider();

        console.log(theme.muted(`Generating template with ${provider}...`));

        // Generate template using AI
        const generatedJson = await generateTemplateFromVault(
          templateName,
          JSON.stringify(vaultStructure, null, 2),
          provider
        );

        // Parse and validate JSON
        let templateConfig: Record<string, unknown>;
        try {
          templateConfig = JSON.parse(generatedJson) as Record<string, unknown>;
        } catch (error) {
          throw new Error(
            `Invalid template JSON from AI: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        // Show preview
        console.log();
        console.log(theme.bold("Template Preview:"));
        console.log("─".repeat(50));
        console.log(JSON.stringify(templateConfig, null, 2));
        console.log("─".repeat(50));

        // Confirm before saving
        const approve = await confirm({
          message: "Save this template?",
          default: true,
        });

        if (!approve) {
          console.log(warningBox("Template not saved"));
          return;
        }

        // Save template
        const templatesPath = path.join(os.homedir(), ".bozly", "templates", templateName);
        await fs.mkdir(templatesPath, { recursive: true });

        // Save template.json
        const templateFilePath = path.join(templatesPath, "template.json");
        await fs.writeFile(templateFilePath, JSON.stringify(templateConfig, null, 2), "utf-8");

        // Save metadata
        const metadataFilePath = path.join(templatesPath, "metadata.json");
        const metadata = {
          name: templateName,
          displayName: templateConfig.displayName || templateName,
          description: templateConfig.description || `Template extracted from ${node.name}`,
          version: "1.0.0",
          created: new Date().toISOString(),
          source: "user",
          category: "custom",
        };
        await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2), "utf-8");

        await logger.info("Template extracted from vault", {
          name: templateName,
          source: node.name,
        });

        console.log();
        console.log(
          successBox(`Template created: ${templateName}`, {
            Location: templatesPath,
            "Create from it": `bozly init --type ${templateName} ~/my-vault`,
          })
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await logger.error("Failed to extract template", {
          error: errorMsg,
        });
        console.error(
          errorBox("Failed to extract template", {
            error: errorMsg,
          })
        );
        process.exit(1);
      }
    });
}

/**
 * Analyze vault structure for template extraction
 */
async function analyzeVaultStructure(vaultPath: string): Promise<Record<string, unknown>> {
  const structure: Record<string, unknown> = {
    directories: [],
    files: [],
    commands: [],
    workflows: [],
    hooks: [],
  };

  const bozlyPath = path.join(vaultPath, ".bozly");

  try {
    // Analyze .bozly structure
    const entries = await fs.readdir(bozlyPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        structure.directories.push(entry.name);

        // Analyze subdirectories
        if (entry.name === "commands") {
          const commands = await fs.readdir(path.join(bozlyPath, entry.name));
          structure.commands = commands
            .filter((f) => f.endsWith(".md"))
            .map((f) => f.replace(".md", ""));
        } else if (entry.name === "workflows") {
          const workflows = await fs.readdir(path.join(bozlyPath, entry.name));
          structure.workflows = workflows
            .filter((f) => f.endsWith(".json"))
            .map((f) => f.replace(".json", ""));
        } else if (entry.name === "hooks") {
          const hooks = await fs.readdir(path.join(bozlyPath, entry.name));
          structure.hooks = hooks.map((f) => f.replace(".js", ""));
        }
      } else if (entry.name === "context.md" || entry.name === "config.json") {
        structure.files.push(entry.name);
      }
    }
  } catch (error) {
    // If .bozly doesn't exist, that's fine
  }

  return structure;
}
