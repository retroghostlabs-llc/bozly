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
        fg: "white",
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
          fg: "green",
        },
      },
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
          content += "  {yellow-fg}EDIT MODE{/yellow-fg}\n";
          content += "  ↑/↓ to select, Enter to edit, 's' to save, Esc to cancel\n\n";

          // Display editable config entries
          this.configEntries.forEach(([key, value], index) => {
            const isSelected = index === this.selectedIndex;
            const displayValue = this.pendingChanges[key] ?? value;
            const marker = isSelected ? "{red-fg}→{/red-fg}" : " ";
            const highlight = isSelected ? "{blue-fg,bold}" : "";

            content += `  ${marker} ${highlight}${key}:{/} ${JSON.stringify(displayValue)}\n`;
          });
        } else {
          content += "  Press 'e' to edit, Ctrl+L to refresh\n\n";

          // Format configuration data (read-only)
          Object.entries(this.configData).forEach(([key, value]) => {
            content += `  {cyan-fg}${key}:{/} ${JSON.stringify(value)}\n`;
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

  async refresh(): Promise<void> {
    await this.render();
  }

  async handleKey(ch: string, key?: Record<string, unknown>): Promise<void> {
    if (!this.editMode) {
      // Non-edit mode commands
      if (ch === "e" || ch === "E") {
        this.editMode = true;
        this.selectedIndex = 0;
        this.pendingChanges = {};
        await this.render();
      }
      return;
    }

    // Edit mode commands
    if (key?.name === "escape") {
      this.editMode = false;
      this.pendingChanges = {};
      this.selectedIndex = 0;
      await this.render();
      return;
    }

    if (key?.name === "up") {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      await this.render();
      return;
    }

    if (key?.name === "down") {
      this.selectedIndex = Math.min(this.configEntries.length - 1, this.selectedIndex + 1);
      await this.render();
      return;
    }

    if (key?.name === "return") {
      // Edit the selected value
      await this.editConfigValue();
      return;
    }

    if (ch === "s" || ch === "S") {
      // Save all pending changes
      await this.saveConfig();
      return;
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
