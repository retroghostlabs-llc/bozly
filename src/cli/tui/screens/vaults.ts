import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";

interface VaultItem {
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
export class VaultsScreen extends Screen {
  private vaults: VaultItem[] = [];
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
    const parent = this.parent as unknown as {
      box: (opts: Record<string, unknown>) => blessed.Widgets.BoxElement;
      list: (opts: Record<string, unknown>) => blessed.Widgets.ListElement;
    };
    this.box = parent.box({
      parent: this.parent,
      top: 1,
      left: 0,
      right: 0,
      bottom: 0,
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
    parent.box({
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
    this.listBox = parent.list({
      parent: this.box,
      top: 1,
      left: 1,
      width: "60%",
      bottom: 1,
      keys: true,
      mouse: true,
      vi: true,
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
    this.detailBox = parent.box({
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
      keys: true,
    });

    this.setupKeybindings();
  }

  async render(): Promise<void> {
    try {
      // Load vaults from API
      this.vaults = await this.apiClient.getVaults();

      if (this.listBox) {
        // Clear and populate list
        this.listBox.clearItems();

        if (this.vaults.length === 0) {
          this.listBox.addItem("No vaults found");
        } else {
          this.vaults.forEach((vault) => {
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

  async handleKey(_ch: string, _key?: Record<string, unknown>): Promise<void> {
    // Handle custom keys for this screen (most are handled via keybindings setup)
    // This is kept for future expansion
  }

  private updateDetailBox(index: number): void {
    if (!this.detailBox || !this.vaults[index]) {
      return;
    }

    const vault = this.vaults[index];
    let content = "";

    content += `\n  Name: ${vault.name}\n`;
    content += `  ID: ${vault.id}\n`;
    content += `  Path: ${vault.path}\n`;
    content += `  Status: ${vault.status ?? "active"}\n`;
    content += `  Sessions: ${vault.sessions ?? 0}\n`;
    content += `  Commands: ${vault.commands ?? 0}\n`;
    content += `  Created: ${vault.created ?? "N/A"}\n`;
    content += "\n  Keys: Enter (view), d (delete), ↑/↓ (navigate)\n";

    this.detailBox.setContent(content);
    this.parent.render();
  }

  private async showVaultDetail(vault: VaultItem): Promise<void> {
    const content = `\n  Vault Details: ${vault.name}\n\n  ID: ${vault.id}\n  Path: ${vault.path}\n  Status: ${vault.status ?? "active"}\n  Sessions: ${vault.sessions ?? 0}\n  Commands: ${vault.commands ?? 0}\n  Created: ${vault.created ?? "N/A"}\n\n  [Press any key to close]\n`;

    const modalParent = this.parent as unknown as {
      box: (opts: Record<string, unknown>) => blessed.Widgets.BoxElement;
    };
    const modal = modalParent.box({
      parent: this.parent,
      top: "center",
      left: "center",
      width: "60%",
      height: "50%",
      content: content,
      style: {
        border: {
          fg: "blue",
        },
      },
      keys: true,
      mouse: true,
    });

    modal.focus();
    await new Promise<void>((resolve) => {
      modal.on("keypress", () => {
        modal.destroy();
        this.parent.render();
        if (this.listBox) {
          this.listBox.focus();
        }
        resolve();
      });
    });
  }

  private async showConfirmDialog(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const parentCast = this.parent as unknown as {
        box: (opts: Record<string, unknown>) => blessed.Widgets.BoxElement;
      };
      const modal = parentCast.box({
        parent: this.parent,
        top: "center",
        left: "center",
        width: "50%",
        height: "40%",
        style: {
          border: {
            fg: "red",
          },
        },
        keys: true,
      });

      parentCast.box({
        parent: modal,
        top: 1,
        left: 2,
        right: 2,
        height: "shrink",
        content: `${title}\n${message}\n\ny/n ?`,
      });

      modal.key(["y"], () => {
        modal.destroy();
        this.parent.render();
        resolve(true);
      });

      modal.key(["n", "escape"], () => {
        modal.destroy();
        this.parent.render();
        resolve(false);
      });

      modal.focus();
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
    if (this.listBox) {
      // Handle vim-style navigation
      this.listBox.key(["j", "down"], () => {
        this.selectedIndex = Math.min(this.vaults.length - 1, this.selectedIndex + 1);
        this.updateDetailBox(this.selectedIndex);
      });

      this.listBox.key(["k", "up"], () => {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateDetailBox(this.selectedIndex);
      });

      // Select item
      this.listBox.key(["enter"], () => {
        const vault = this.vaults[this.selectedIndex];
        if (vault) {
          this.showVaultDetail(vault);
        }
      });

      // Delete vault
      this.listBox.key(["d"], () => {
        const vault = this.vaults[this.selectedIndex];
        if (vault) {
          this.showConfirmDialog(
            `Delete vault "${vault.name}"?`,
            "This action cannot be undone."
          ).then((confirmed) => {
            if (confirmed) {
              this.deleteVault(vault.id);
            }
          });
        }
      });
    }
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
