import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";

interface MemoryEntry {
  sessionId: string;
  nodeId: string;
  nodeName: string;
  timestamp: string;
  command: string;
  summary: string;
  tags: string[];
  filePath: string;
}

/**
 * Memory Screen - View extracted knowledge and learning
 * Shows memory entries organized by category
 * Allows searching and viewing detailed memory content
 */
export class MemoryScreen extends Screen {
  private memories: MemoryEntry[] = [];
  private listBox?: blessed.Widgets.ListElement;
  private contentBox?: blessed.Widgets.BoxElement;
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
      content: " Memory & Knowledge ",
      style: {
        fg: "cyan",
        bold: true,
      },
    });

    // List of memory entries
    this.listBox = blessed.list({
      parent: this.box,
      top: 1,
      left: 1,
      width: "40%",
      bottom: 1,
      keys: false,
      mouse: true,
      vi: false,
      style: {
        selected: {
          bg: "blue",
          fg: "white",
        },
      },
    });

    // Content viewer
    this.contentBox = blessed.box({
      parent: this.box,
      top: 1,
      right: 1,
      width: "60%-2",
      bottom: 1,
      scrollable: true,
      mouse: true,
      keys: false,
      tags: true,
      style: {
        border: {
          fg: "cyan",
        },
      },
    });

    this.createFooterBox();
    this.setupKeybindings();
  }

  async render(): Promise<void> {
    try {
      const result = await this.apiClient.getMemories();

      // Ensure result is an array
      this.memories = Array.isArray(result) ? result : [];

      if (this.listBox) {
        this.listBox.clearItems();

        if (this.memories.length === 0) {
          this.listBox.addItem("No memory entries");
        } else {
          this.memories.forEach((mem) => {
            const summary = mem.summary?.substring(0, 35) ?? "No summary";
            const label = `[${mem.command}] ${summary}...`;
            this.listBox?.addItem(label);
          });
        }

        this.updateContentBox(0);
        this.parent.render();
      }
    } catch (error) {
      this.showError(
        `Failed to load memory: ${error instanceof Error ? error.message : String(error)}`
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
      this.updateContentBox(this.selectedIndex);
    } else if (keyRecord.name === "down" || ch === "j") {
      this.selectedIndex = Math.min(this.memories.length - 1, this.selectedIndex + 1);
      this.updateContentBox(this.selectedIndex);
    }
  }

  private updateContentBox(index: number): void {
    if (!this.contentBox || !this.memories[index]) {
      return;
    }

    const mem = this.memories[index];
    let content = "";

    content += `\n  {cyan-fg}${mem.summary}{/}\n`;
    content += `  ${"=".repeat(60)}\n\n`;
    content += `  Command:      ${mem.command}\n`;
    content += `  Session ID:   ${mem.sessionId}\n`;
    content += `  Node:         ${mem.nodeName} (${mem.nodeId})\n`;
    content += `  Time:         ${new Date(mem.timestamp).toLocaleString()}\n`;
    if (mem.tags.length > 0) {
      content += `  Tags:         ${mem.tags.join(", ")}\n`;
    }
    content += `\n  File Path:\n  ${mem.filePath}\n`;

    this.contentBox.setContent(content);

    // Update list selection to match our selectedIndex
    if (this.listBox) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.listBox as any).select(index);
    }

    this.parent.render();
  }

  private setupKeybindings(): void {
    // Keys are handled via the app's global keypress event -> handleKey()
    // No need to set up bindings here
  }

  activate(): void {
    if (this.listBox) {
      this.listBox.focus();
    }
  }

  deactivate(): void {
    // Cleanup if needed
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
