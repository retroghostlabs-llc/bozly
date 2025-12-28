import blessed from "@unblessed/blessed";
import { homedir } from "os";
import { APIClient } from "./api-client.js";
import { Screen, IAppReference } from "./screen.js";
import { Modal } from "./modal.js";
import { logger } from "../../../core/logger.js";
import { ConfigManager } from "../../../core/config-manager.js";

export interface BozlyTUIConfig {
  apiUrl?: string;
  refreshInterval?: number;
}

/**
 * Main BozlyTUI Application
 * Manages blessed terminal UI, screen switching, modals, and keybindings
 */
export class BozlyTUI implements IAppReference {
  private screen: blessed.Widgets.Screen;
  private apiClient: APIClient;
  private screens: Map<string, Screen> = new Map();
  private currentScreen: Screen | null = null;
  private currentModal: Modal | null = null;
  private menuItems: Map<number, string> = new Map();
  private updatePoller: NodeJS.Timeout | null = null;
  private refreshInterval: number;
  private isRunning: boolean = false;
  private statusBar: blessed.Widgets.BoxElement | null = null;

  constructor(config: BozlyTUIConfig = {}) {
    // Initialize blessed screen with terminal capabilities fallback
    // This handles xterm-256color terminfo parsing issues on some systems
    try {
      const termValue = process.env.BOZLY_TERM ?? process.env.TERM ?? "xterm-256color";
      this.screen = blessed.screen({
        mouse: true,
        title: "BOZLY TUI Dashboard",
        smartCSR: true,
        style: {
          bg: "default",
          fg: "default",
        },
        term: termValue,
        ignoreDockConflict: true,
      });
    } catch (error) {
      // Fallback to simpler terminal if blessed fails to parse terminfo
      if (error instanceof Error && error.message.includes("Setulc")) {
        process.env.TERM = "screen";
        this.screen = blessed.screen({
          mouse: true,
          title: "BOZLY TUI Dashboard",
          smartCSR: true,
          style: {
            bg: "default",
            fg: "default",
          },
          term: "screen",
          ignoreDockConflict: true,
        });
      } else {
        throw error;
      }
    }

    this.apiClient = new APIClient(config.apiUrl);
    this.refreshInterval =
      config.refreshInterval ?? ConfigManager.getInstance().getClient().tuiRefreshIntervalMs;

    this.setupGlobalKeybindings();
  }

  /**
   * Initialize and start the TUI application
   */
  init(): void {
    try {
      // Note: API health already checked in index.ts before creating this instance
      // Temporarily skip menu and status bar - focus on keyboard input first
      // this.createMenu();
      // this.createStatusBar();

      // Initialize screens (will be created in subclasses)
      // For now, just setup the structure

      this.isRunning = true;
    } catch (error) {
      this.shutdown(); // Now synchronous
      throw error;
    }
  }

  /**
   * Start the TUI application
   */
  async start(): Promise<void> {
    if (!this.isRunning) {
      this.init();
    }

    // Initialize and render the current screen
    if (this.currentScreen) {
      await this.currentScreen.init();
      await this.currentScreen.render();
      this.currentScreen.activate();
    }

    // Start polling for updates
    this.startPolling();

    this.screen.render();
  }

  /**
   * Shutdown the TUI application
   */
  shutdown(): void {
    this.isRunning = false;

    if (this.updatePoller) {
      clearInterval(this.updatePoller);
    }

    if (this.currentModal) {
      this.currentModal.destroy();
    }

    if (this.currentScreen) {
      this.currentScreen.destroy();
    }

    for (const screen of this.screens.values()) {
      screen.destroy();
    }

    this.screen.destroy();
    process.exit(0);
  }

  /**
   * Register a screen
   */
  registerScreen(screen: Screen, menuNumber?: number): void {
    this.screens.set(screen.getId(), screen);
    screen.setAppReference(this);

    // Set first screen as current
    if (!this.currentScreen) {
      this.currentScreen = screen;
    }

    // Register menu shortcut if provided
    if (menuNumber !== undefined && menuNumber >= 1 && menuNumber <= 8) {
      this.menuItems.set(menuNumber, screen.getId());
    }
  }

  /**
   * Switch to a different screen
   */
  async switchScreen(screenId: string): Promise<void> {
    const screen = this.screens.get(screenId);
    if (!screen) {
      await logger.error("Screen not found", { screenId });
      return;
    }

    // Deactivate current screen
    if (this.currentScreen && this.currentScreen.getId() !== screenId) {
      this.currentScreen.deactivate();
      this.currentScreen.destroy();
    }

    // Activate new screen
    this.currentScreen = screen;
    await screen.init();
    await screen.render();
    screen.activate();
    this.screen.render();
  }

  /**
   * Show a modal
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async showModal(modal: Modal): Promise<any> {
    this.currentModal = modal;
    await modal.init();
    await modal.render();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return modal.show();
  }

  /**
   * Close current modal
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  closeModal(result?: any): void {
    if (this.currentModal) {
      this.currentModal.close(result);
      this.currentModal.destroy();
      this.currentModal = null;
      this.screen.render();
    }
  }

  /**
   * Refresh current screen
   */
  async refresh(): Promise<void> {
    if (this.currentScreen) {
      await this.currentScreen.refresh();
      this.screen.render();
    }
  }

  /**
   * Get APIClient instance
   */
  getAPIClient(): APIClient {
    return this.apiClient;
  }

  /**
   * Get blessed screen instance
   */
  getScreen(): blessed.Widgets.Screen {
    return this.screen;
  }

  /**
   * Get current screen
   */
  getCurrentScreen(): Screen | null {
    return this.currentScreen;
  }

  /**
   * Update status bar with current vault info and directory
   */
  private updateStatusBar(): void {
    if (!this.statusBar) {
      return;
    }

    const cwd = process.cwd();
    const homeDir = homedir();
    const displayPath = cwd.replace(homeDir, "~");

    // Extract vault name from path (simple heuristic: folder after .bozly)
    let vaultInfo = "none";
    const bozlyMatch = cwd.match(/\/([^/]+)\/\.bozly/);
    if (bozlyMatch?.[1]) {
      vaultInfo = bozlyMatch[1];
    }

    const cyan = "\x1b[36m";
    const gray = "\x1b[90m";
    const reset = "\x1b[0m";

    const status = `${cyan}[${this.currentScreen?.getName().toUpperCase() ?? "APP"}]${reset}  ${gray}Vault:${reset} ${vaultInfo}  ${gray}|${reset}  ${displayPath}`;
    this.statusBar.setContent(status);
  }

  /**
   * Show temporary status message (auto-dismisses after 2 seconds)
   */
  showStatusMessage(message: string): void {
    if (!this.statusBar) {
      return;
    }

    const cyan = "\x1b[36m";
    const reset = "\x1b[0m";

    this.statusBar.setContent(`${cyan}→${reset} ${message}`);

    // Reset after 2 seconds
    setTimeout(() => {
      this.updateStatusBar();
    }, 2000);
  }

  /**
   * Log error from async operation
   */
  private logAsyncError(operation: string, error: unknown): void {
    void logger.error(
      `Error in ${operation}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }

  /**
   * Setup global keybindings
   */
  private setupGlobalKeybindings(): void {
    // Escape to close modals
    this.screen.key(["escape"], () => {
      if (this.currentModal) {
        this.closeModal();
      }
    });

    // Quit on Ctrl+C or Q
    this.screen.key(["C-c"], () => {
      this.shutdown();
    });

    this.screen.key(["q", "Q"], () => {
      if (this.currentModal) {
        this.closeModal();
      } else {
        this.shutdown();
      }
    });

    // Menu shortcuts (1-8)
    for (let i = 1; i <= 8; i++) {
      this.screen.key([String(i)], () => {
        const screenId = this.menuItems.get(i);
        if (screenId) {
          this.switchScreen(screenId).catch((err) => {
            this.logAsyncError(`Screen switch to menu ${i}`, err);
          });
        }
      });
    }

    // Home shortcut (0)
    this.screen.key(["0"], () => {
      this.switchScreen("home").catch((err) => {
        this.logAsyncError("Screen switch to home", err);
      });
    });

    // Help
    this.screen.key(["?"], () => {
      this.showHelpModal().catch((err) => {
        this.logAsyncError("Show help modal", err);
      });
    });

    // Refresh
    this.screen.key(["C-l"], () => {
      this.refresh().catch((err) => {
        this.logAsyncError("Refresh screen", err);
      });
    });

    // Pass other keys to current screen or modal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.screen.on("keypress", (ch: string, key: any) => {
      if (this.currentModal) {
        this.currentModal.handleKey(ch, key).catch((err) => {
          this.logAsyncError(`Modal key handling (${ch})`, err);
        });
      } else if (this.currentScreen) {
        this.currentScreen.handleKey(ch, key).catch((err) => {
          this.logAsyncError(`Screen key handling (${ch})`, err);
        });
      }
    });
  }

  /**
   * Show help modal
   */
  private async showHelpModal(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const helpBox = (this.screen as any).box as ((options: any) => any) | undefined;
      if (!helpBox) {
        await logger.warn("blessed screen.box() not available for help modal");
        return;
      }

      const modal = helpBox({
        parent: this.screen,
        top: "center",
        left: "center",
        width: 70,
        height: 25,
        border: "line",
        label: " Help ",
        tags: true,
        style: {
          border: { fg: "cyan" },
        },
      });

      const helpText = `
Global Keybindings:
  [0]        Go to Home
  [1-8]      Jump to menu item
  [?]        This help screen
  [Q]        Quit application
  [Ctrl+C]   Force quit
  [Ctrl+L]   Refresh current screen
  [Ctrl+S]   Save changes
  [Tab]      Next field (in forms)
  [Shift+Tab] Previous field (in forms)
  [Esc]      Close modal or cancel

List Navigation:
  [↑↓] or [jk]  Move up/down
  [gg]          Go to top
  [G]           Go to bottom
  [/]           Search/filter
  [Enter]       Select item
  [d]           Delete item

Form Input:
  [Tab]         Next field
  [Shift+Tab]   Previous field
  [Enter]       Submit
  [Esc]         Cancel
    `;

      modal.setContent(helpText);
      this.screen.render();

      this.screen.once("key", () => {
        if (!modal.destroyed) {
          modal.destroy();
        }
        this.screen.render();
      });
    } catch (error) {
      if (error instanceof Error) {
        await logger.error("Failed to show help modal", error);
      } else {
        await logger.error("Failed to show help modal (unknown error)", { error: String(error) });
      }
    }
  }

  /**
   * Start API polling for updates
   */
  private startPolling(): void {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.updatePoller = setInterval(async () => {
      if (this.isRunning && this.currentScreen) {
        await this.currentScreen.refresh();
        this.screen.render();
      }
    }, this.refreshInterval);
  }
}
