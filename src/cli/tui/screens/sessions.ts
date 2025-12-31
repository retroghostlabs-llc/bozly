import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";
import { logger } from "../../../core/logger.js";

interface SessionItem {
  id: string;
  nodeId: string;
  command: string;
  status: "success" | "failed" | "pending";
  timestamp?: string;
  duration?: number;
  provider?: string;
  error?: string;
}

/**
 * Sessions Screen - Browse command execution history
 * Shows recent sessions with status, duration, and provider info
 * Allows filtering and viewing detailed session output
 */
export class SessionsScreen extends Screen {
  private sessions: SessionItem[] = [];
  private listBox?: blessed.Widgets.ListElement;
  private detailBox?: blessed.Widgets.BoxElement;
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

    // Create title
    blessed.box({
      parent: this.box,
      top: 0,
      left: 2,
      height: 1,
      content: " Sessions ",
      style: {
        fg: "cyan",
        bold: true,
      },
    });

    // Create search input line
    blessed.box({
      parent: this.box,
      top: 1,
      left: 1,
      right: 1,
      height: 1,
      content: "Search: (type / to search, Esc to cancel)",
      style: {
        fg: "gray",
      },
    });

    // Create list box
    // Note: keys: false to disable blessed's key handling
    // We handle all navigation via the app's global keypress event -> screen.handleKey()
    this.listBox = blessed.list({
      parent: this.box,
      top: 3,
      left: 1,
      width: "60%",
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

    // Create detail box
    this.detailBox = blessed.box({
      parent: this.box,
      top: 3,
      right: 1,
      width: "40%-2",
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

    this.createFooterBox();

    // Setup key handling on the parent box to catch all keys
    this.setupKeybindings();
  }

  async render(): Promise<void> {
    try {
      // Load sessions from API
      this.sessions = await this.apiClient.getSessions();

      if (this.listBox) {
        this.listBox.clearItems();

        if (this.sessions.length === 0) {
          this.listBox.addItem("No sessions found");
        } else {
          this.sessions.forEach((session) => {
            const status = this.getStatusIcon(session.status);
            const label = `${status} ${session.command} (${session.nodeId})`;
            this.listBox?.addItem(label);
          });
        }

        this.updateDetailBox(0);
        this.parent.render();
      }
    } catch (error) {
      this.showError(
        `Failed to load sessions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async refresh(): Promise<void> {
    await this.render();
  }

  async handleKey(ch: string, key?: Record<string, unknown>): Promise<void> {
    if (!key) {
      return;
    }
    const keyRecord = key;

    if (keyRecord.name === "enter") {
      const session = this.sessions[this.selectedIndex];
      if (session) {
        await this.showSessionDetail(session);
      }
    } else if (ch === "/") {
      // TODO: Implement search interaction
    } else if (keyRecord.name === "up" || ch === "k") {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateDetailBox(this.selectedIndex);
    } else if (keyRecord.name === "down" || ch === "j") {
      this.selectedIndex = Math.min(this.sessions.length - 1, this.selectedIndex + 1);
      this.updateDetailBox(this.selectedIndex);
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case "success":
        return "✓";
      case "failed":
        return "✗";
      case "pending":
        return "◐";
      default:
        return "·";
    }
  }

  private updateDetailBox(index: number): void {
    if (!this.detailBox || !this.sessions[index]) {
      return;
    }

    const session = this.sessions[index];
    let content = "";

    content += `\n  Session Details\n`;
    content += `  ──────────────\n\n`;
    content += `  ID: ${session.id}\n`;
    content += `  Command: ${session.command}\n`;
    content += `  Status: ${session.status}\n`;
    content += `  Node: ${session.nodeId}\n`;
    content += `  Provider: ${session.provider ?? "default"}\n`;
    content += `  Time: ${session.timestamp ?? "N/A"}\n`;
    content += `  Duration: ${session.duration ?? 0}ms\n`;

    if (session.error) {
      content += `\n  Error: ${session.error}\n`;
    }

    content += `\n  Keys: Enter (view output), ↑/↓ or j/k (navigate)\n`;

    this.detailBox.setContent(content);

    // Update list selection to match our selectedIndex
    if (this.listBox) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.listBox as any).select(index);
    }

    this.parent.render();
  }

  private async showSessionDetail(session: SessionItem): Promise<void> {
    const content = `\n  Session Output: ${session.id}\n\n  Command: ${session.command}\n  Status: ${session.status}\n  Duration: ${session.duration}ms\n  Provider: ${session.provider}\n\n  [Press any key to close]\n`;

    try {
      const modal = blessed.box({
        parent: this.parent,
        top: "center",
        left: "center",
        width: "70%",
        height: "60%",
        content: content,
        border: "line",
        style: {
          border: {
            fg: "blue",
          },
        },
        keys: true,
        mouse: true,
        scrollable: true,
      });

      modal.focus();
      await new Promise<void>((resolve) => {
        modal.on("keypress", () => {
          try {
            modal.destroy();
          } catch {
            // Ignore destroy errors
          }
          this.parent.render();
          if (this.listBox) {
            this.listBox.focus();
          }
          resolve();
        });
      });
    } catch (error) {
      // Log error to file but don't display it to avoid corrupting TUI
      await logger.error(
        "Failed to show session detail modal",
        error instanceof Error ? error : new Error(String(error))
      );
      // Show a simple error notification that won't corrupt the screen
      this.showError("Could not display session details");
    }
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
    // Cleanup
  }

  destroy(): void {
    if (this.box) {
      try {
        this.box.destroy();
      } catch {
        // Ignore destroy errors
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
