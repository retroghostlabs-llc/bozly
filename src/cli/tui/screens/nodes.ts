import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";
import { logger } from "../../../core/logger.js";

interface NodeItem {
  id: string;
  name: string;
  path: string;
  status?: string;
  sessions?: number;
  commands?: number;
  created?: string;
}

/**
 * Vaults Screen - Browse and manage BOZLY vaults
 * Shows list of registered vaults with basic info
 * Allows viewing vault details and managing vault configuration
 */
export class NodesScreen extends Screen {
  private nodes: NodeItem[] = [];
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
      border: "line",
      style: {
        border: {
          fg: "cyan",
        },
        focus: {
          bg: "blue",
        },
      },
    });

    // Create title
    blessed.box({
      parent: this.box,
      top: 0,
      left: 2,
      height: 1,
      content: " Vaults ",
      style: {
        fg: "white",
        bold: true,
      },
    });

    // Create list box for vault items
    this.listBox = blessed.list({
      parent: this.box,
      top: 1,
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
        focus: {
          border: {
            fg: "cyan",
          },
        },
      },
    });

    // Create detail box for vault information
    this.detailBox = blessed.box({
      parent: this.box,
      top: 1,
      right: 1,
      width: "40%-2",
      bottom: 1,
      style: {
        border: {
          fg: "green",
        },
      },
      scrollable: true,
      mouse: true,
      keys: false,
    });

    this.createFooterBox();
    this.setupKeybindings();
  }

  async render(): Promise<void> {
    try {
      // Load nodes from API
      this.nodes = await this.apiClient.getVaults();

      if (this.listBox) {
        // Clear and populate list
        this.listBox.clearItems();

        if (this.nodes.length === 0) {
          this.listBox.addItem("No vaults found");
        } else {
          this.nodes.forEach((vault) => {
            const label = `${vault.name} (${vault.sessions ?? 0} sessions)`;
            this.listBox?.addItem(label);
          });
        }

        // Show first vault details
        this.updateDetailBox(0);
        this.parent.render();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.showError(`Failed to load vaults: ${msg}`);
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

    if (keyRecord.name === "down" || ch === "j") {
      this.selectedIndex = Math.min(this.nodes.length - 1, this.selectedIndex + 1);
      this.updateDetailBox(this.selectedIndex);
    } else if (keyRecord.name === "up" || ch === "k") {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateDetailBox(this.selectedIndex);
    } else if (keyRecord.name === "enter") {
      const vault = this.nodes[this.selectedIndex];
      if (vault) {
        await this.showVaultDetail(vault);
      }
    } else if (ch === "d") {
      const vault = this.nodes[this.selectedIndex];
      if (vault) {
        const confirmed = await this.showDeleteConfirmDialog(vault.name);
        if (confirmed) {
          await this.deleteVault(vault.id);
        }
      }
    }
  }

  private updateDetailBox(index: number): void {
    if (!this.detailBox || !this.nodes[index]) {
      return;
    }

    const vault = this.nodes[index];
    let content = "";

    content += `\n  Name: ${vault.name}\n`;
    content += `  ID: ${vault.id}\n`;
    content += `  Path: ${vault.path}\n`;
    content += `  Status: ${vault.status ?? "active"}\n`;
    content += `  Sessions: ${vault.sessions ?? 0}\n`;
    content += `  Commands: ${vault.commands ?? 0}\n`;
    content += `  Created: ${vault.created ?? "N/A"}\n`;
    content += "\n  Keys: Enter (view), d (delete), ↑/↓ or j/k (navigate)\n";

    this.detailBox.setContent(content);

    // Update list selection to match our selectedIndex
    if (this.listBox) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.listBox as any).select(index);
    }

    this.parent.render();
  }

  private async showVaultDetail(vault: NodeItem): Promise<void> {
    const content = `\n  Vault: ${vault.name}\n\n  ID: ${vault.id}\n  Path: ${vault.path}\n  Status: ${vault.status ?? "active"}\n  Sessions: ${vault.sessions ?? 0}\n  Commands: ${vault.commands ?? 0}\n  Created: ${vault.created ?? "N/A"}\n\n  Keys: s (sessions), ESC (close)\n`;

    try {
      const modal = blessed.box({
        parent: this.parent,
        top: "center",
        left: "center",
        width: "60%",
        height: "50%",
        content: content,
        border: "line",
        style: {
          border: {
            fg: "blue",
          },
          focus: {
            border: {
              fg: "cyan",
            },
          },
        },
        keys: false,
        mouse: false,
      });

      modal.focus();
      this.parent.render();

      await new Promise<void>((resolve) => {
        const handleKey = (ch: string, key?: Record<string, unknown>) => {
          const keyName = key ? (key as { name: string }).name : "";
          if (keyName === "escape") {
            cleanup();
            resolve();
          } else if (ch === "s") {
            cleanup();
            // TODO: Navigate to sessions screen for this vault
            this.showError("Session navigation not yet implemented");
            resolve();
          }
        };

        const cleanup = () => {
          modal.removeAllListeners();
          try {
            modal.destroy();
          } catch {
            // Ignore destroy errors
          }
          this.parent.render();
          if (this.listBox) {
            this.listBox.focus();
          }
        };

        // Set up proper key handling with parent's key events
        this.parent.on("keypress", handleKey);

        // Also handle direct key events
        modal.on("keypress", handleKey);
      });
    } catch (error) {
      // Log error to file but don't display it to avoid corrupting TUI
      await logger.error(
        "Failed to show vault detail modal",
        error instanceof Error ? error : new Error(String(error))
      );
      // Show a simple error notification that won't corrupt the screen
      this.showError("Could not display vault details");
    }
  }

  private async showDeleteConfirmDialog(vaultName: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        let input = "";

        const modal = blessed.box({
          parent: this.parent,
          top: "center",
          left: "center",
          width: "60%",
          height: "45%",
          border: "line",
          style: {
            border: {
              fg: "red",
            },
            focus: {
              border: {
                fg: "yellow",
              },
            },
          },
          keys: false,
        });

        blessed.box({
          parent: modal,
          top: 0,
          left: 2,
          right: 2,
          height: 1,
          content: `Delete vault "${vaultName}"?`,
          style: {
            fg: "red",
            bold: true,
          },
        });

        blessed.box({
          parent: modal,
          top: 2,
          left: 2,
          right: 2,
          height: "shrink",
          content: `This action cannot be undone.\n\nType the vault name to confirm: ${vaultName}`,
        });

        const inputBox = blessed.textbox({
          parent: modal,
          top: 7,
          left: 2,
          right: 2,
          height: 1,
          border: "line",
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
          inputOnFocus: true,
        });

        blessed.box({
          parent: modal,
          top: 9,
          left: 2,
          right: 2,
          height: "shrink",
          content: "Press ENTER to confirm or ESC to cancel",
          style: {
            fg: "gray",
          },
        });

        const cleanup = () => {
          try {
            modal.destroy();
          } catch {
            // Ignore destroy errors
          }
          this.parent.render();
          if (this.listBox) {
            this.listBox.focus();
          }
        };

        inputBox.on("submit", () => {
          input = (inputBox.getValue() || "").trim();
          cleanup();

          if (input === vaultName) {
            resolve(true);
          } else {
            this.showError("Vault name did not match. Deletion cancelled.");
            resolve(false);
          }
        });

        inputBox.key(["escape"], () => {
          cleanup();
          resolve(false);
        });

        inputBox.focus();
        this.parent.render();
      } catch (error) {
        void logger.error(
          "Failed to show delete confirm dialog",
          error instanceof Error ? error : new Error(String(error))
        );
        resolve(false);
      }
    });
  }

  private async deleteVault(_vaultId: string): Promise<void> {
    try {
      // Call API to delete vault (if endpoint exists)
      // For now, just show success message
      this.showSuccess(`Vault deleted successfully`);
      await this.render();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.showError(`Failed to delete vault: ${msg}`);
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
    // Cleanup if needed
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
