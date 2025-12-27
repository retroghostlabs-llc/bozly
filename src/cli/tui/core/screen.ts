import blessed from "blessed";
import type { Widgets } from "blessed";

export interface ScreenConfig {
  id: string;
  name: string;
}

/**
 * Base class for all TUI screens
 * Each screen represents a main view in the navigation menu
 */
export abstract class Screen {
  protected id: string;
  protected name: string;
  protected parent: blessed.Widgets.Screen;
  protected box: blessed.Widgets.BoxElement | null = null;
  protected isActive: boolean = false;

  constructor(parent: blessed.Widgets.Screen, config: ScreenConfig) {
    this.parent = parent;
    this.id = config.id;
    this.name = config.name;
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
   */
  protected createBox(
    options: Partial<Widgets.BoxOptions> = {}
  ): blessed.Widgets.BoxElement | null {
    try {
      // Use blessed.box() with the parent screen
      const boxElement = blessed.box({
        parent: this.parent,
        top: 2,
        left: 12,
        right: 0,
        bottom: 2,
        border: "line",
        style: {
          border: { fg: "cyan" },
        },
        ...options,
      });
      return boxElement;
    } catch (error) {
      // If box creation fails, return null (degraded mode)
      console.log("[DEBUG] Failed to create box:", error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Display error message to user
   */
  protected showError(message: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorBox = (this.parent as any).box({
      parent: this.parent,
      top: "center",
      left: "center",
      width: 60,
      height: 10,
      border: "line",
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const successBox = (this.parent as any).box({
      parent: this.parent,
      top: "center",
      left: "center",
      width: 60,
      height: 10,
      border: "line",
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const infoBox = (this.parent as any).box({
      parent: this.parent,
      top: "center",
      left: "center",
      width: 60,
      height: 10,
      border: "line",
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
}
