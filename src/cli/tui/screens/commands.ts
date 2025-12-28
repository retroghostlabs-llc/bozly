import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";

interface CommandItem {
  id: string;
  name: string;
  description: string;
  nodeId?: string;
  type?: "global" | "local" | "builtin";
  usage?: string;
}

/**
 * Commands Screen - Browse available commands
 * Shows all available commands organized by type
 * Allows viewing command details and usage information
 */
export class CommandsScreen extends Screen {
  private commands: CommandItem[] = [];
  private listBox?: blessed.Widgets.ListElement;
  private infoBox?: blessed.Widgets.BoxElement;
  private selectedIndex = 0;

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
      content: " Commands ",
      style: {
        fg: "white",
        bold: true,
      },
    });

    // List of commands
    this.listBox = blessed.list({
      parent: this.box,
      top: 1,
      left: 1,
      width: "50%",
      bottom: 1,
      keys: true,
      mouse: true,
      vi: true,
      style: {
        selected: {
          bg: "blue",
          fg: "white",
        },
      },
    });

    // Command info
    this.infoBox = blessed.box({
      parent: this.box,
      top: 1,
      right: 1,
      width: "50%-2",
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

    this.setupKeybindings();
  }

  async render(): Promise<void> {
    try {
      this.commands = await this.apiClient.getCommands();

      if (this.listBox) {
        this.listBox.clearItems();

        if (this.commands.length === 0) {
          this.listBox.addItem("No commands available");
        } else {
          this.commands.forEach((cmd) => {
            const typeLabel = this.getTypeLabel(cmd.type);
            const label = `${typeLabel} ${cmd.name}`;
            this.listBox?.addItem(label);
          });
        }

        this.updateInfoBox(0);
        this.parent.render();
      }
    } catch (error) {
      this.showError(
        `Failed to load commands: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async refresh(): Promise<void> {
    await this.render();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async handleKey(ch: string, key?: Record<string, unknown>): Promise<void> {
    if (!key) {
      return;
    }
    const keyRecord = key;
    if (keyRecord.name === "up" || ch === "k") {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateInfoBox(this.selectedIndex);
    } else if (keyRecord.name === "down" || ch === "j") {
      this.selectedIndex = Math.min(this.commands.length - 1, this.selectedIndex + 1);
      this.updateInfoBox(this.selectedIndex);
    }
  }

  private getTypeLabel(type?: string): string {
    switch (type) {
      case "global":
        return "[G]";
      case "local":
        return "[L]";
      case "builtin":
        return "[B]";
      default:
        return "[?]";
    }
  }

  private updateInfoBox(index: number): void {
    if (!this.infoBox || !this.commands[index]) {
      return;
    }

    const cmd = this.commands[index];
    let content = "";

    content += `\n  ${cmd.name}\n`;
    content += `  ${"=".repeat(40)}\n\n`;
    content += `  Type: ${cmd.type ?? "unknown"}\n`;
    content += `  Node: ${cmd.nodeId ?? "global"}\n`;
    content += `\n  Description:\n  ${cmd.description || "(none)"}\n`;

    if (cmd.usage) {
      content += `\n  Usage:\n  ${cmd.usage}\n`;
    }

    content += `\n  Keys: ↑/↓ (navigate), / (search)\n`;

    this.infoBox.setContent(content);
    this.parent.render();
  }

  private setupKeybindings(): void {
    if (this.listBox) {
      this.listBox.key(["j", "down"], () => {
        this.selectedIndex = Math.min(this.commands.length - 1, this.selectedIndex + 1);
        this.updateInfoBox(this.selectedIndex);
      });

      this.listBox.key(["k", "up"], () => {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateInfoBox(this.selectedIndex);
      });
    }
  }

  activate(): void {
    if (this.listBox) {
      this.listBox.focus();
    }
  }

  deactivate(): void {
    // Cleanup
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
