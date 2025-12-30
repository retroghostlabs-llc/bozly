import blessed from "@unblessed/blessed";
import type { Widgets } from "@unblessed/blessed";
import { homedir } from "os";
import { FULL_VERSION } from "../../../core/version.js";

export interface ScreenConfig {
  id: string;
  name: string;
}

/**
 * Base class for all TUI screens
 * Each screen represents a main view in the navigation menu
 */
/**
 * Interface for app reference (allows screens to access app methods)
 */
export interface IAppReference {
  showStatusMessage(message: string): void;
}

export abstract class Screen {
  protected id: string;
  protected name: string;
  protected parent: blessed.Widgets.Screen;
  protected box: blessed.Widgets.BoxElement | null = null;
  protected footerBox: blessed.Widgets.BoxElement | null = null;
  protected isActive: boolean = false;
  protected appRef: IAppReference | null = null;

  constructor(parent: blessed.Widgets.Screen, config: ScreenConfig) {
    this.parent = parent;
    this.id = config.id;
    this.name = config.name;
  }

  /**
   * Set app reference for status messages and other app-level interactions
   */
  setAppReference(app: IAppReference): void {
    this.appRef = app;
  }

  /**
   * Initialize the screen (called once when TUI starts)
   */
  abstract init(): Promise<void>;

  /**
   * Render the screen (called when screen becomes active)
   */
  abstract render(): Promise<void>;

  /**
   * Handle keyboard input (key name and key object)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract handleKey(ch: string, key?: any): Promise<void>;

  /**
   * Refresh screen data from API
   */
  async refresh(): Promise<void> {
    // Override in subclasses to refresh data
  }

  /**
   * Cleanup screen (called when screen becomes inactive)
   */
  destroy(): void {
    if (this.box) {
      try {
        this.box.destroy();
      } catch {
        // Ignore destroy errors
      }
    }
    if (this.footerBox) {
      try {
        this.footerBox.destroy();
      } catch {
        // Ignore destroy errors
      }
    }
  }

  /**
   * Get screen ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get screen name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Check if screen is currently active
   */
  isCurrentlyActive(): boolean {
    return this.isActive;
  }

  /**
   * Activate screen
   */
  activate(): void {
    this.isActive = true;
    if (this.box) {
      this.box.show();
      this.parent.render();
    }
  }

  /**
   * Deactivate screen
   */
  deactivate(): void {
    this.isActive = false;
    if (this.box) {
      this.box.hide();
    }
  }

  /**
   * Create a simple text box for content display
   * Accounts for status bar at the bottom (1 line height)
   */
  protected createBox(
    options: Partial<Widgets.BoxOptions> = {}
  ): blessed.Widgets.BoxElement | null {
    try {
      // Use blessed.box() with the parent screen
      // bottom: 3 to account for status bar (1 line) and padding (2 lines)
      const boxElement = blessed.box({
        parent: this.parent,
        top: 2,
        left: 12,
        right: 0,
        bottom: 3,
        border: "line",
        tags: true,
        style: {
          border: { fg: "cyan" },
        },
        ...options,
      });
      return boxElement;
    } catch (error) {
      // If box creation fails, return null (degraded mode)
      return null;
    }
  }

  /**
   * Display error message to user
   */
  protected showError(message: string): void {
    const errorBox = blessed.box({
      parent: this.parent,
      top: "center",
      left: "center",
      width: 60,
      height: 10,
      border: "line",
      tags: true,
      style: {
        border: { fg: "red" },
        fg: "red",
      },
    });

    errorBox.setContent(` Error\n ${message}`);
    this.parent.render();

    setTimeout(() => {
      try {
        errorBox.destroy();
      } catch {
        // Ignore destroy errors
      }
      this.parent.render();
    }, 3000);
  }

  /**
   * Display success message to user
   */
  protected showSuccess(message: string): void {
    const successBox = blessed.box({
      parent: this.parent,
      top: "center",
      left: "center",
      width: 60,
      height: 10,
      border: "line",
      tags: true,
      style: {
        border: { fg: "green" },
        fg: "green",
      },
    });

    successBox.setContent(` Success\n ${message}`);
    this.parent.render();

    setTimeout(() => {
      try {
        successBox.destroy();
      } catch {
        // Ignore destroy errors
      }
      this.parent.render();
    }, 2000);
  }

  /**
   * Display info message to user
   */
  protected showInfo(message: string): void {
    const infoBox = blessed.box({
      parent: this.parent,
      top: "center",
      left: "center",
      width: 60,
      height: 10,
      border: "line",
      tags: true,
      style: {
        border: { fg: "blue" },
        fg: "blue",
      },
    });

    infoBox.setContent(` Info\n ${message}`);
    this.parent.render();

    setTimeout(() => {
      try {
        infoBox.destroy();
      } catch {
        // Ignore destroy errors
      }
      this.parent.render();
    }, 2000);
  }

  /**
   * Render a context header showing current directory (for all screens)
   */
  protected renderContextHeader(): string {
    const gray = "\x1b[90m";
    const cyan = "\x1b[36m";
    const reset = "\x1b[0m";

    const cwd = process.cwd();
    const homeDir = homedir();
    const displayPath = cwd.replace(homeDir, "~");
    const screenTitle = this.name.toUpperCase();

    return `${cyan}[${screenTitle}]${reset}  ${gray}📍 ${displayPath}${reset}\n\n`;
  }

  /**
   * Render a status bar at the bottom showing vault info and working directory
   * Appears on all screens with consistent styling
   */
  protected renderStatusBar(): string {
    const bgDark = "\x1b[40m";
    const cyan = "\x1b[36m";
    const gray = "\x1b[90m";
    const white = "\x1b[37m";
    const reset = "\x1b[0m";

    const cwd = process.cwd();
    const homeDir = homedir();
    const displayPath = cwd.replace(homeDir, "~");

    // Extract potential vault from path (simple heuristic: folder after .bozly)
    let vaultInfo = "none";
    const bozlyMatch = cwd.match(/\/([^/]+)\/\.bozly/);
    if (bozlyMatch && bozlyMatch[1]) {
      vaultInfo = bozlyMatch[1];
    }

    const statusBar = `
${bgDark}${cyan}┌──────────────────────────────────────────────────────────┐${reset}
${bgDark}${cyan}│${reset}${bgDark} Vault: ${white}${vaultInfo}${reset}${bgDark}  │  Directory: ${gray}${displayPath}${reset}${bgDark}  ${cyan}│${reset}
${bgDark}${cyan}└──────────────────────────────────────────────────────────┘${reset}`;

    return statusBar;
  }

  /**
   * Render a simple footer bar showing current page and navigation hints
   * Consistent across all screens (for text-based rendering)
   */
  protected renderFooter(): string {
    const gray = "\x1b[90m";
    const cyan = "\x1b[36m";
    const reset = "\x1b[0m";

    const pageName = this.name.charAt(0).toUpperCase() + this.name.slice(1);
    const footer = `
${gray}${cyan}[${pageName}]${reset}${gray}  │  ${cyan}[0]${reset}${gray} Main Menu  │  ${cyan}[?]${reset}${gray} Help  │  ${cyan}[Q]${reset}${gray} Quit${reset}`;

    return footer;
  }

  /**
   * Create a footer box showing current page and navigation hints
   * Positioned at absolute bottom of screen (always visible, not scrollable)
   * Uses bright colors that work on both light and dark terminal backgrounds
   */
  protected createFooterBox(): blessed.Widgets.BoxElement | null {
    try {
      const pageName = this.name.charAt(0).toUpperCase() + this.name.slice(1);

      // Extract vault name from current working directory
      const cwd = process.cwd();
      let vaultInfo = "none";
      const bozlyMatch = cwd.match(/\/([^/]+)\/\.bozly/);
      if (bozlyMatch?.[1]) {
        vaultInfo = bozlyMatch[1];
      }

      // Show version with dev indicator if applicable
      const versionInfo = FULL_VERSION.includes("-dev")
        ? `v${FULL_VERSION} (dev)`
        : `v${FULL_VERSION}`;

      // Build simple footer text (no ANSI codes - let blessed handle styling)
      // Format: [Page]  Vault: name  │  version  │  [0] Menu [?] Help [Q] Quit
      const footerText = `[${pageName}]  Vault: ${vaultInfo}  │  ${versionInfo}  │  [0] Menu  │  [?] Help  │  [Q] Quit`;

      // Create footer as child of parent screen (not main content box)
      // This ensures it stays visible even when content scrolls
      this.footerBox = blessed.box({
        parent: this.parent,
        bottom: 0,
        left: 0,
        right: 0,
        height: 1,
        content: footerText,
        // Use blessed's native styling instead of ANSI codes for better compatibility
        style: {
          fg: "white",
          bg: "blue",
        },
      });

      return this.footerBox;
    } catch (error) {
      console.log(
        "[DEBUG] Failed to create footer box:",
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }
}
