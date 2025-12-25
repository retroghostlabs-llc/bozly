/**
 * bozly template - Manage templates (list and create)
 */

import { Command } from "commander";
import { logger } from "../../core/logger.js";
import { errorBox, warningBox, successBox, infoBox, theme } from "../../cli/ui/index.js";
import { getTemplates, createTemplate } from "../../core/templates.js";
import {
  promptText,
  promptSelect,
  validateTemplateName,
  validateDescription,
} from "../../utils/prompts.js";

export const templateCommand = new Command("template")
  .description("Manage templates (list and create)")
  .addCommand(createListCommand())
  .addCommand(createCreateCommand());

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
