import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";

/**
 * Config Screen - View and edit system configuration
 * Shows BOZLY version, API location, cache settings, vault locations
 * Displays global and node-specific configuration
 * Press 'e' to enter edit mode, 's' to save changes
 */
export class ConfigScreen extends Screen {
  private configData: Record<string, unknown> = {};
  private contentBox?: blessed.Widgets.BoxElement;
  private editMode = false;
  private pendingChanges: Record<string, unknown> = {};
  private selectedIndex = 0;
  private configEntries: Array<[string, unknown]> = [];

  constructor(
    parent: blessed.Widgets.Screen,
    config: ScreenConfig,
    private apiClient: APIClient
  ) {
    super(parent, config);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async init(): Promise<void> {
    this.box = blessed.box({
      parent: this.parent,
      top: 1,
      left: 0,
      right: 0,
      bottom: 0,
      style: {
        border: {
          fg: "cyan",
        },
      },
    });

    // Title
    blessed.box({
      parent: this.box,
      top: 0,
      left: 2,
      height: 1,
      content: " Configuration ",
      style: {
        fg: "cyan",
        bold: true,
      },
    });

    // Content area
    this.contentBox = blessed.box({
      parent: this.box,
      top: 1,
      left: 1,
      right: 1,
      bottom: 1,
      scrollable: true,
      mouse: true,
      keys: true,
      style: {
        border: {
          fg: "cyan",
        },
      },
    });

    // Set up key handlers for edit mode navigation
    this.contentBox.key(["up"], () => {
      if (this.editMode) {
        let newIndex = this.selectedIndex - 1;
        // Skip over object entries - only allow selecting primitive values
        while (newIndex >= 0) {
          const [, value] = this.configEntries[newIndex];
          if (typeof value !== "object" || value === null) {
            break;
          }
          newIndex--;
        }
        if (newIndex >= 0) {
          this.selectedIndex = newIndex;
          void this.render();
        }
      }
    });

    this.contentBox.key(["down"], () => {
      if (this.editMode) {
        let newIndex = this.selectedIndex + 1;
        // Skip over object entries - only allow selecting primitive values
        while (newIndex < this.configEntries.length) {
          const [, value] = this.configEntries[newIndex];
          if (typeof value !== "object" || value === null) {
            break;
          }
          newIndex++;
        }
        if (newIndex < this.configEntries.length) {
          this.selectedIndex = newIndex;
          void this.render();
        }
      }
    });

    this.contentBox.key(["return"], () => {
      if (this.editMode && this.configEntries.length > 0) {
        void this.editConfigValue();
      }
    });

    this.contentBox.key(["s", "S"], () => {
      if (this.editMode) {
        void this.saveConfig();
      }
    });

    this.contentBox.key(["escape"], () => {
      if (this.editMode) {
        this.editMode = false;
        this.pendingChanges = {};
        this.selectedIndex = 0;
        void this.render();
      }
    });

    this.contentBox.key(["e", "E"], () => {
      if (!this.editMode) {
        this.editMode = true;
        this.pendingChanges = {};
        // Find first primitive value to select (or 0 if all are objects)
        const editableIndex = this.configEntries.findIndex(
          ([, value]) => typeof value !== "object" || value === null
        );
        this.selectedIndex = editableIndex >= 0 ? editableIndex : 0;
        void this.render();
      }
    });

    // B key - exit edit mode if in edit mode, otherwise do nothing (don't navigate away)
    this.contentBox.key(["b", "B"], () => {
      if (this.editMode) {
        this.editMode = false;
        this.pendingChanges = {};
        this.selectedIndex = 0;
        void this.render();
      }
    });

    this.createFooterBox();
  }

  async render(): Promise<void> {
    try {
      // Try to load config from API
      this.configData = await this.apiClient.getConfig();
      this.configEntries = Object.entries(this.configData);

      if (this.contentBox) {
        let content = "\n  System Configuration\n";
        content += "  " + "=".repeat(50) + "\n\n";

        if (this.editMode) {
          const yellow = "\x1b[33m";
          const red = "\x1b[31m";
          const blue = "\x1b[34m";
          const bold = "\x1b[1m";
          const gray = "\x1b[90m";
          const cyan = "\x1b[36m";
          const reset = "\x1b[0m";

          content += `  ${yellow}EDIT MODE${reset}\n`;
          content += "  ↑/↓ to select, Enter to edit, 's' to save, Esc to cancel\n\n";

          // Display all config entries (objects grayed out, primitives editable)
          let hasEditableValues = false;
          this.configEntries.forEach(([key, value], index) => {
            const isObject = typeof value === "object" && value !== null;

            if (isObject) {
              // Show objects grayed out - not editable
              content += `  ${gray}  ${key}: [object]${reset}\n`;
            } else {
              // Show primitive values - editable and selectable
              hasEditableValues = true;
              const isSelected = index === this.selectedIndex;
              const displayValue = this.pendingChanges[key] ?? value;
              const marker = isSelected ? `${red}→${reset}` : " ";
              const highlight = isSelected ? `${blue}${bold}` : "";
              const formatted = this.formatValue(displayValue);
              content += `  ${marker} ${highlight}${key}:${reset} ${formatted}\n`;
            }
          });

          // Show message about nested object editing
          if (!hasEditableValues) {
            content += `\n  ${cyan}Nested object editing coming soon (not implemented yet)${reset}\n`;
          }
        } else {
          content += "  Press 'e' to edit, Ctrl+L to refresh\n\n";

          // Format configuration data (read-only)
          Object.entries(this.configData).forEach(([key, value]) => {
            content += this.formatConfigEntry(key, value);
          });
        }

        this.contentBox.setContent(content);
        this.parent.render();
      }
    } catch (error) {
      this.showError(
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private formatConfigEntry(key: string, value: unknown, indent = 0): string {
    const cyan = "\x1b[36m";
    const green = "\x1b[32m";
    const reset = "\x1b[0m";
    const baseIndent = "  ";
    const currentIndent = baseIndent.repeat(indent);
    const nextIndent = baseIndent.repeat(indent + 1);

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      let result = `${currentIndent}${cyan}${key}:${reset}\n`;
      const obj = value as Record<string, unknown>;
      const entries = Object.entries(obj);

      entries.forEach(([subKey, subValue], index) => {
        const isLast = index === entries.length - 1;
        const prefix = isLast ? "└─ " : "├─ ";
        const formatted = this.formatValue(subValue);

        result += `${nextIndent}${prefix}${green}${subKey}:${reset} ${formatted}\n`;
      });

      return result;
    }

    const formatted = this.formatValue(value);
    return `${currentIndent}${cyan}${key}:${reset} ${formatted}\n`;
  }

  private formatValue(value: unknown): string {
    const yellow = "\x1b[33m";
    const green = "\x1b[32m";
    const red = "\x1b[31m";
    const gray = "\x1b[90m";
    const reset = "\x1b[0m";

    if (value === null) {
      return `${gray}null${reset}`;
    }

    if (typeof value === "boolean") {
      return value ? `${green}true${reset}` : `${red}false${reset}`;
    }

    if (typeof value === "number") {
      return `${yellow}${value.toString()}${reset}`;
    }

    if (typeof value === "string") {
      // Truncate long strings for readability
      if (value.length > 80) {
        return `"${value.substring(0, 77)}...${gray}"${reset}`;
      }
      return `"${value}"`;
    }

    if (Array.isArray(value)) {
      return `${gray}[${value.length} items]${reset}`;
    }

    if (typeof value === "object") {
      return `${gray}[object]${reset}`;
    }

    return JSON.stringify(value);
  }

  async refresh(): Promise<void> {
    await this.render();
  }

  async handleKey(ch: string): Promise<void> {
    // This method is kept for compatibility but key handling is done in init()
    // via contentBox.key() bindings
    if (!this.editMode) {
      if (ch === "e" || ch === "E") {
        this.editMode = true;
        this.selectedIndex = 0;
        this.pendingChanges = {};
        await this.render();
      }
    }
  }

  private async editConfigValue(): Promise<void> {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.configEntries.length) {
      return;
    }

    const [key] = this.configEntries[this.selectedIndex];
    const currentValue = this.pendingChanges[key] ?? this.configData[key];

    // Simple prompt for new value
    const userInput = await this.promptForInput(`Edit ${key}`, JSON.stringify(currentValue));

    if (userInput !== null) {
      try {
        // Try to parse as JSON if it looks like JSON, otherwise treat as string
        const newValue =
          userInput.trim().startsWith("{") || userInput.trim().startsWith("[")
            ? JSON.parse(userInput)
            : isNaN(Number(userInput))
              ? userInput
              : Number(userInput);

        this.pendingChanges[key] = newValue;
        await this.render();
      } catch {
        this.showError("Invalid JSON format. Please enter valid JSON or a string.");
      }
    }
  }

  private async promptForInput(title: string, defaultValue: string): Promise<string | null> {
    return new Promise((resolve) => {
      // Create a simple input dialog using blessed
      const inputBox = blessed.box({
        parent: this.parent,
        top: "center",
        left: "center",
        width: 60,
        height: 10,
        style: {
          border: { fg: "cyan" },
          bg: "blue",
        },
        border: "line",
      });

      blessed.box({
        parent: inputBox,
        top: 0,
        left: 2,
        content: title,
        style: { fg: "white", bold: true },
      });

      const input = blessed.textbox({
        parent: inputBox,
        mouse: true,
        keys: true,
        inputOnFocus: true,
        top: 2,
        left: 2,
        right: 2,
        height: 3,
        border: "line",
        style: {
          border: { fg: "green" },
          focus: { bg: "green", fg: "black" },
        },
      });

      input.setValue(defaultValue);
      input.focus();

      const cleanup = (): void => {
        try {
          inputBox.destroy();
        } catch {
          // Ignore
        }
        this.parent.render();
      };

      input.key(["enter"], () => {
        const value = input.getValue();
        cleanup();
        resolve(value);
      });

      input.key(["escape"], () => {
        cleanup();
        resolve(null);
      });

      this.parent.render();
    });
  }

  private async saveConfig(): Promise<void> {
    if (Object.keys(this.pendingChanges).length === 0) {
      this.showInfo("No changes to save.");
      return;
    }

    try {
      const response = await this.apiClient.updateConfig(this.pendingChanges);

      // Check if update was successful
      if (response.success) {
        this.showSuccess(`Configuration updated: ${response.message}`);
        this.editMode = false;
        this.pendingChanges = {};
        this.selectedIndex = 0;
        // Reload config from API
        await this.render();
      } else {
        const errorMsg = response.error ?? "Unknown error occurred";
        this.showError(`Failed to save configuration: ${errorMsg}`);
      }
    } catch (error) {
      this.showError(
        `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  activate(): void {
    // Reset edit mode when activating screen
    this.editMode = false;
    this.pendingChanges = {};
    this.selectedIndex = 0;

    if (this.contentBox) {
      this.contentBox.focus();
    }
  }

  deactivate(): void {
    // Cleanup - reset edit mode if leaving screen
    this.editMode = false;
    this.pendingChanges = {};
  }

  destroy(): void {
    if (this.box) {
      try {
        this.box.destroy();
      } catch {
        // Ignore
      }
    }
  }

  getId(): string {
    return this.id;
  }

  protected createBox(): blessed.Widgets.BoxElement {
    const boxElement = (
      this.parent as unknown as {
        box: (opts: Record<string, unknown>) => blessed.Widgets.BoxElement;
      }
    ).box({
      parent: this.parent,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    });
    return boxElement;
  }
}
