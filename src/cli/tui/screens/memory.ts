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
  fileSizeBytes?: number;
  lastAccessedTime?: string;
  isArchived?: boolean;
  archiveMetadata?: {
    archivedAt: string;
    archivedFromNode: string;
    monthKey: string;
  };
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
  private detailModal?: blessed.Widgets.BoxElement;

  constructor(
    parent: blessed.Widgets.Screen,
    config: ScreenConfig,
    private apiClient: APIClient
  ) {
    super(parent, config);
  }

  /**
   * Format bytes to human-readable size
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) {
      return "0 B";
    }
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Format memory entry for list display with size and archive info
   */
  private formatMemoryLabel(mem: MemoryEntry): string {
    let label = `[${mem.command}] ${mem.summary?.substring(0, 30) ?? "No summary"}...`;

    // Add size if available
    if (mem.fileSizeBytes !== undefined) {
      label += ` (${this.formatSize(mem.fileSizeBytes)})`;
    }

    // Add archive indicator if archived
    if (mem.isArchived) {
      label += " [ARCHIVED]";
    }

    return label;
  }

  /**
   * Format last-accessed time relative to now
   */
  private formatAccessTime(isoTime?: string): string {
    if (!isoTime) {
      return "Unknown";
    }

    const lastAccessed = new Date(isoTime);
    const now = new Date();
    const diffMs = now.getTime() - lastAccessed.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    }
    if (diffDays === 1) {
      return "Yesterday";
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    }
    return lastAccessed.toLocaleDateString();
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
            const label = this.formatMemoryLabel(mem);
            this.listBox?.addItem(label);
          });
        }

        // Preserve selected index across renders, but clamp to valid range
        this.selectedIndex = Math.min(
          Math.max(0, this.selectedIndex),
          Math.max(0, this.memories.length - 1)
        );
        this.updateContentBox(this.selectedIndex);
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
    } else if (keyRecord.name === "return") {
      await this.openMemoryDetail(this.selectedIndex);
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

    // Add file size if available
    if (mem.fileSizeBytes !== undefined) {
      content += `  File Size:    ${this.formatSize(mem.fileSizeBytes)}\n`;
    }

    // Add last-accessed time if available
    if (mem.lastAccessedTime) {
      content += `  Last Accessed: ${this.formatAccessTime(mem.lastAccessedTime)}\n`;
    }

    // Add archive status if archived
    if (mem.isArchived && mem.archiveMetadata) {
      content += `  {yellow-fg}Status:       ARCHIVED (${mem.archiveMetadata.monthKey}){/}\n`;
    }

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

  private async openMemoryDetail(index: number): Promise<void> {
    const mem = this.memories[index];
    if (!mem) {
      return;
    }

    // Load full memory content
    try {
      const fullMemory = await this.apiClient.getMemoryDetail(mem.sessionId, mem.nodeId);

      // Create modal
      this.detailModal = blessed.box({
        parent: this.parent,
        top: 2,
        left: 4,
        right: 4,
        height: "90%",
        border: "line",
        scrollable: true,
        mouse: true,
        keys: true,
        vi: false,
        tags: true,
        style: {
          border: {
            fg: "green",
          },
          focus: {
            border: {
              fg: "cyan",
            },
          },
        },
      });

      // Build content with full memory details
      let content = `\n {green-fg}${mem.summary}{/}\n`;
      content += `{gray-fg}${" ".repeat(mem.summary.length)}{/}\n\n`;
      content += `{cyan-fg}Command:{/} ${mem.command}\n`;
      content += `{cyan-fg}Session ID:{/} ${mem.sessionId}\n`;
      content += `{cyan-fg}Node:{/} ${mem.nodeName} (${mem.nodeId})\n`;
      content += `{cyan-fg}Time:{/} ${new Date(mem.timestamp).toLocaleString()}\n`;

      if (mem.tags.length > 0) {
        content += `{cyan-fg}Tags:{/} ${mem.tags.join(", ")}\n`;
      }

      content += "\n{green-fg}=== Memory Content ==={/}\n\n";

      // Add full memory content from API response
      if (fullMemory) {
        content += `${fullMemory}\n`;
      } else {
        content += "(No detailed content available)\n";
      }

      content += "\n{gray-fg}(Press 'q' or 'ESC' to close){/}";

      this.detailModal.setContent(content);
      this.detailModal.focus();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.detailModal as any).key(["q", "escape"], () => {
        this.closeMemoryDetail();
      });

      this.parent.render();
    } catch (error) {
      this.showError(
        `Failed to load memory details: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private closeMemoryDetail(): void {
    if (this.detailModal) {
      try {
        this.detailModal.destroy();
      } catch {
        // Ignore
      }
      this.detailModal = undefined;
    }
    if (this.listBox) {
      this.listBox.focus();
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
