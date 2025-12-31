import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";

interface CommandItem {
  id: string;
  name: string;
  description: string;
  nodeId?: string;
  type?: "global" | "local" | "builtin";
  vaultName?: string;
  usage?: string;
}

/**
 * Commands Screen - Browse available commands
 * Shows all available commands organized by type
 * Allows viewing command details and usage information
 */
export class CommandsScreen extends Screen {
  private commands: CommandItem[] = [];
  private filteredCommands: CommandItem[] = [];
  private listBox?: blessed.Widgets.ListElement;
  private infoBox?: blessed.Widgets.BoxElement;
  private selectedIndex = 0;
  private searchQuery = "";
  private searchMode = false;
  private lastKeyTime = 0;
  private keyDebounceMs = 50;
  private scopeFilter: "all" | "global" | "local" = "all";
  private scopeFilterOptions: Array<"all" | "global" | "local"> = ["all", "global", "local"];

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
        fg: "cyan",
        bold: true,
      },
    });

    // List of commands
    // Note: keys: true so element receives key events, vi: false to disable auto navigation
    // We manually handle navigation in setupKeybindings via element's keypress event
    this.listBox = blessed.list({
      parent: this.box,
      top: 1,
      left: 1,
      width: "50%",
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

    // Command info
    this.infoBox = blessed.box({
      parent: this.box,
      top: 1,
      right: 1,
      width: "50%-2",
      bottom: 1,
      scrollable: true,
      mouse: true,
      keys: false,
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
      // Clear cache to get fresh data from API
      this.apiClient.clearCache("/commands");

      this.commands = await this.apiClient.getCommands();
      this.filterCommands();

      if (this.listBox) {
        this.listBox.clearItems();

        if (this.filteredCommands.length === 0) {
          this.listBox.addItem(
            this.searchQuery ? "No commands match your search" : "No commands available"
          );
        } else {
          this.filteredCommands.forEach((cmd) => {
            const typeLabel = this.getTypeLabel(cmd.type);
            const label = `${typeLabel} ${cmd.name}`;
            this.listBox?.addItem(label);
          });
        }

        // Preserve selected index during refresh (don't reset to 0)
        this.selectedIndex = Math.min(
          this.selectedIndex,
          Math.max(0, this.filteredCommands.length - 1)
        );
        this.updateInfoBox(this.selectedIndex);
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

    // Debounce navigation keys to prevent duplicate key repeat events
    const now = Date.now();
    const isNavKey =
      keyRecord.name === "up" || ch === "k" || keyRecord.name === "down" || ch === "j";

    if (isNavKey && now - this.lastKeyTime < this.keyDebounceMs) {
      return; // Ignore rapid repeated keys
    }

    if (isNavKey) {
      this.lastKeyTime = now;
    }

    if (keyRecord.name === "up" || ch === "k") {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateInfoBox(this.selectedIndex);
    } else if (keyRecord.name === "down" || ch === "j") {
      this.selectedIndex = Math.min(this.filteredCommands.length - 1, this.selectedIndex + 1);
      this.updateInfoBox(this.selectedIndex);
    } else if (ch === "f" || ch === "F") {
      // Cycle through scope filters
      const currentIndex = this.scopeFilterOptions.indexOf(this.scopeFilter);
      const nextIndex = (currentIndex + 1) % this.scopeFilterOptions.length;
      this.scopeFilter = this.scopeFilterOptions[nextIndex];
      this.selectedIndex = 0;
      await this.render();
    } else if (ch === "/" && !this.searchMode) {
      // Start search mode - "/" initiates search, subsequent characters filter
      this.searchMode = true;
      this.searchQuery = "";
      this.updateInfoBox(this.selectedIndex);
    } else if (keyRecord.name === "escape") {
      // Escape to exit search mode or clear search
      if (this.searchMode) {
        this.searchQuery = "";
        this.searchMode = false;
        this.selectedIndex = 0;
        await this.render();
      }
    } else if (this.searchMode) {
      // In search mode: accept characters
      if (keyRecord.name === "backspace") {
        this.searchQuery = this.searchQuery.slice(0, -1);
      } else if (keyRecord.name === "return" || keyRecord.name === "enter") {
        // Exit search mode on enter
        this.searchMode = false;
      } else if (ch && ch.length === 1 && /[a-zA-Z0-9\-_\s]/.test(ch)) {
        // Accept alphanumeric, dash, underscore, space
        this.searchQuery += ch;
      }
      this.selectedIndex = 0;
      await this.render();
    }
  }

  private getTypeLabel(type?: string): string {
    switch (type) {
      case "global":
        return "[G]";
      case "local":
        return "[V]";
      case "builtin":
        return "[B]";
      default:
        return "[?]";
    }
  }

  private getScopeDisplay(type?: string, vaultName?: string): string {
    switch (type) {
      case "global":
        return "Global";
      case "local":
        return vaultName ? `${vaultName} (local)` : "Local";
      case "builtin":
        return "Built-in";
      default:
        return "Unknown";
    }
  }

  private getFilterLabel(): string {
    switch (this.scopeFilter) {
      case "global":
        return "Global";
      case "local":
        return "Local";
      default:
        return "All";
    }
  }

  private updateInfoBox(index: number): void {
    if (!this.infoBox) {
      return;
    }

    // If in search mode, show search input
    if (this.searchMode) {
      const content = `\n  Search: ${this.searchQuery}_\n\n  Type characters to search by name or description.\n  Press Enter or Escape to exit search.\n`;
      this.infoBox.setContent(content);
      this.parent.render();
      return;
    }

    // Otherwise show command details
    if (!this.filteredCommands[index]) {
      return;
    }

    const cmd = this.filteredCommands[index];
    let content = "";

    content += `\n  ${cmd.name}\n`;
    content += `  ${"=".repeat(40)}\n\n`;
    content += `  Scope: ${this.getScopeDisplay(cmd.type, cmd.vaultName)}\n`;
    content += `\n  Description:\n`;

    // Wrap long descriptions to prevent layout issues
    const description = cmd.description || "(none)";
    const wrappedDesc = this.wrapText(description, 60);
    content += wrappedDesc
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n");
    content += "\n";

    if (cmd.usage) {
      content += `\n  Usage:\n`;
      const wrappedUsage = this.wrapText(cmd.usage, 60);
      content += wrappedUsage
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
      content += "\n";
    }

    const searchInfo = this.searchQuery
      ? `search: "${this.searchQuery}" (${this.filteredCommands.length}/${this.commands.length})`
      : `scope: ${this.getFilterLabel()}`;
    content += `\n  Keys: ↑/↓ or j/k (navigate)\n  F (filter), / (search), ESC (clear) — ${searchInfo}\n`;

    this.infoBox.setContent(content);

    // Update list selection to match our selectedIndex
    if (this.listBox) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.listBox as any).select(this.selectedIndex);
    }

    this.parent.render();
  }

  private wrapText(text: string, width: number): string {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + word).length > width) {
        if (currentLine) {
          lines.push(currentLine.trim());
        }
        currentLine = word;
      } else {
        currentLine += (currentLine ? " " : "") + word;
      }
    }

    if (currentLine) {
      lines.push(currentLine.trim());
    }

    return lines.join("\n");
  }

  private setupKeybindings(): void {
    // Keys are handled via the app's global keypress event -> handleKey()
    // No need to set up bindings here
  }

  private filterCommands(): void {
    let results = this.commands;

    // Apply scope filter
    if (this.scopeFilter === "global") {
      results = results.filter((cmd) => cmd.type === "global");
    } else if (this.scopeFilter === "local") {
      results = results.filter((cmd) => cmd.type === "local");
    }

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      results = results.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(query) || cmd.description?.toLowerCase().includes(query)
      );
    }

    this.filteredCommands = results;
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
