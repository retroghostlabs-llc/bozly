import blessed from "blessed";
import { APIClient } from "./api-client.js";
import { Screen } from "./screen.js";
import { Modal } from "./modal.js";

export interface BozlyTUIConfig {
  apiUrl?: string;
  refreshInterval?: number;
}

/**
 * Main BozlyTUI Application
 * Manages blessed terminal UI, screen switching, modals, and keybindings
 */
export class BozlyTUI {
  private screen: blessed.Widgets.Screen;
  private apiClient: APIClient;
  private screens: Map<string, Screen> = new Map();
  private currentScreen: Screen | null = null;
  private currentModal: Modal | null = null;
  private menuItems: Map<number, string> = new Map();
  private updatePoller: NodeJS.Timeout | null = null;
  private refreshInterval: number = 5000;
  private isRunning: boolean = false;

  constructor(config: BozlyTUIConfig = {}) {
    this.screen = blessed.screen({
      mouse: true,
      title: "BOZLY TUI Dashboard",
      style: {
        bg: "default",
        fg: "default",
      },
    });

    this.apiClient = new APIClient(config.apiUrl);
    this.refreshInterval = config.refreshInterval ?? 5000;

    this.setupGlobalKeybindings();
  }

  /**
   * Initialize and start the TUI application
   */
  async init(): Promise<void> {
    try {
      // Check API availability
      const isHealthy = await this.apiClient.isHealthy();
      if (!isHealthy) {
        throw new Error("BOZLY API server (bozly serve) is not running at http://localhost:3000");
      }

      // Create menu
      this.createMenu();

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
      await this.init();
    }

    // Focus screen
    if (this.currentScreen) {
      this.currentScreen.activate();
    }

    // Start polling for updates
    this.startPolling();

    // Keep screen running
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
  registerScreen(screen: Screen): void {
    this.screens.set(screen.getId(), screen);

    // Set first screen as current
    if (!this.currentScreen) {
      this.currentScreen = screen;
    }
  }

  /**
   * Switch to a different screen
   */
  async switchScreen(screenId: string): Promise<void> {
    const screen = this.screens.get(screenId);
    if (!screen) {
      console.error(`Screen not found: ${screenId}`);
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
   * Create main menu
   */
  private createMenu(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const menu = (this.screen as any).box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: 12,
      bottom: 0,
      border: "line",
      style: {
        border: { fg: "cyan" },
      },
    });

    const items = [
      { num: 1, name: "Home", id: "home" },
      { num: 2, name: "Vaults", id: "vaults" },
      { num: 3, name: "Sessions", id: "sessions" },
      { num: 4, name: "Memory", id: "memory" },
      { num: 5, name: "Commands", id: "commands" },
      { num: 6, name: "Workflows", id: "workflows" },
      { num: 7, name: "Config", id: "config" },
      { num: 8, name: "Health", id: "health" },
    ];

    let content = "\n";
    for (const item of items) {
      this.menuItems.set(item.num, item.id);
      content += `  [{bold}${item.num}{/bold}] ${item.name}\n`;
    }

    content += "\n  [{bold}?{/bold}] Help\n";
    content += "  [{bold}Q{/bold}] Quit\n";

    menu.setContent(content);
  }

  /**
   * Setup global keybindings
   */
  private setupGlobalKeybindings(): void {
    this.screen.key(["escape", "q", "Q"], () => {
      if (this.currentModal) {
        this.closeModal();
      }
    });

    this.screen.key(["C-c"], () => {
      this.shutdown();
    });

    // Menu shortcuts (1-8)
    for (let i = 1; i <= 8; i++) {
      this.screen.key([String(i)], () => {
        const screenId = this.menuItems.get(i);
        if (screenId) {
          this.switchScreen(screenId).catch(console.error);
        }
      });
    }

    // Help
    this.screen.key(["?"], () => {
      this.showHelpModal();
    });

    // Quit
    this.screen.key(["Q"], () => {
      this.shutdown();
    });

    // Refresh
    this.screen.key(["C-l"], () => {
      this.refresh().catch(console.error);
    });

    // Pass other keys to current screen or modal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.screen.on("keypress", (ch: string, key: any) => {
      if (this.currentModal) {
        this.currentModal.handleKey(ch, key).catch(console.error);
      } else if (this.currentScreen) {
        this.currentScreen.handleKey(ch, key).catch(console.error);
      }
    });
  }

  /**
   * Show help modal
   */
  private showHelpModal(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const helpBox = (this.screen as any).box({
      parent: this.screen,
      top: "center",
      left: "center",
      width: 70,
      height: 25,
      border: "line",
      label: " Help ",
      style: {
        border: { fg: "cyan" },
      },
    });

    const helpText = `
Global Keybindings:
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

    helpBox.setContent(helpText);
    this.screen.render();

    this.screen.once("key", () => {
      if (!helpBox.destroyed) {
        helpBox.destroy();
      }
      this.screen.render();
    });
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
