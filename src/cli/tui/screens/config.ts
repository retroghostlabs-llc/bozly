import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";

/**
 * Config Screen - View system configuration
 * Shows BOZLY version, API location, cache settings, vault locations
 * Displays global and node-specific configuration
 */
export class ConfigScreen extends Screen {
  private configData: Record<string, unknown> = {};
  private contentBox?: blessed.Widgets.BoxElement;

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

      if (this.contentBox) {
        let content = "\n  System Configuration\n";
        content += "  " + "=".repeat(50) + "\n\n";

        // Format configuration data
        Object.entries(this.configData).forEach(([key, value]) => {
          content += `  ${key}: ${JSON.stringify(value)}\n`;
        });

        content += "\n  Navigation: ↑/↓ (scroll), Ctrl+L (refresh)\n";

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

  async handleKey(_ch: string, _key?: Record<string, unknown>): Promise<void> {
    // Scrollable content, no special handling needed
  }

  activate(): void {
    if (this.contentBox) {
      this.contentBox.focus();
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
