/**
 * Global keybindings manager
 * Handles vim-style navigation and global shortcuts
 */
export class KeybindingManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bindings: Map<string, (ch: string, key: any) => Promise<void>> = new Map();

  constructor() {
    this.setupDefaultBindings();
  }

  /**
   * Setup default global keybindings
   */
  private setupDefaultBindings(): void {
    // Global keys are registered by parent app
  }

  /**
   * Register a key handler
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerKey(key: string, handler: (ch: string, key: any) => Promise<void>): void {
    this.bindings.set(key, handler);
  }

  /**
   * Handle a key press
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleKey(ch: string, key: any): Promise<void> {
    const keyName = this.getKeyName(ch, key);
    const handler = this.bindings.get(keyName);

    if (handler) {
      await handler(ch, key);
    }
  }

  /**
   * Get normalized key name from character and key object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getKeyName(ch: string, key: any): string {
    if (!key) {
      return ch;
    }

    // Handle special keys
    if (key.ctrl && key.name === "c") {
      return "ctrl-c";
    }
    if (key.ctrl && key.name === "l") {
      return "ctrl-l";
    }
    if (key.ctrl && key.name === "s") {
      return "ctrl-s";
    }
    if (key.name === "escape") {
      return "escape";
    }
    if (key.name === "enter") {
      return "enter";
    }
    if (key.name === "tab") {
      return "tab";
    }
    if (key.shift && key.name === "tab") {
      return "shift-tab";
    }
    if (key.name === "up") {
      return "up";
    }
    if (key.name === "down") {
      return "down";
    }
    if (key.name === "left") {
      return "left";
    }
    if (key.name === "right") {
      return "right";
    }
    if (key.name === "home") {
      return "home";
    }
    if (key.name === "end") {
      return "end";
    }
    if (key.name === "pageup") {
      return "pageup";
    }
    if (key.name === "pagedown") {
      return "pagedown";
    }

    return ch;
  }

  /**
   * Get global keybindings map for help display
   */
  getGlobalBindings(): Map<string, string> {
    const bindings = new Map<string, string>();
    bindings.set("[1-8]", "Jump to menu");
    bindings.set("[?]", "Help screen");
    bindings.set("[Q]", "Quit");
    bindings.set("[Ctrl+C]", "Force quit");
    bindings.set("[Ctrl+L]", "Refresh");
    bindings.set("[Ctrl+S]", "Save");
    bindings.set("[Tab]", "Next field");
    bindings.set("[Shift+Tab]", "Previous field");
    bindings.set("[Esc]", "Close modal");
    return bindings;
  }

  /**
   * Get list navigation keybindings
   */
  getListNavBindings(): Map<string, string> {
    const bindings = new Map<string, string>();
    bindings.set("[↑↓] or [jk]", "Navigate");
    bindings.set("[gg]", "Go to top");
    bindings.set("[G]", "Go to bottom");
    bindings.set("[/]", "Search/filter");
    bindings.set("[n]", "Next result");
    bindings.set("[N]", "Previous result");
    bindings.set("[Enter]", "Select");
    bindings.set("[d]", "Delete");
    return bindings;
  }

  /**
   * Resolve vim-style navigation keys
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveNavKey(ch: string, key: any): string | null {
    const keyName = this.getKeyName(ch, key);

    // Vim-style navigation
    if (ch === "j" || keyName === "down") {
      return "down";
    }
    if (ch === "k" || keyName === "up") {
      return "up";
    }
    if (ch === "h" || keyName === "left") {
      return "left";
    }
    if (ch === "l" || keyName === "right") {
      return "right";
    }

    // Start of line / end of line
    if (ch === "g") {
      return "gg-pending";
    }
    if (ch === "G") {
      return "end";
    }

    // Line start/end (in some contexts)
    if (keyName === "home") {
      return "home";
    }
    if (keyName === "end") {
      return "end";
    }

    // Page navigation
    if (keyName === "pageup") {
      return "pageup";
    }
    if (keyName === "pagedown") {
      return "pagedown";
    }

    return null;
  }

  /**
   * Check if key is for form submission
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isSubmitKey(ch: string, key: any): boolean {
    const keyName = this.getKeyName(ch, key);
    return keyName === "enter";
  }

  /**
   * Check if key is for cancellation
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isCancelKey(ch: string, key: any): boolean {
    const keyName = this.getKeyName(ch, key);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return keyName === "escape" || (key?.ctrl && key?.name === "c");
  }

  /**
   * Check if key is a menu shortcut (1-8)
   */
  getMenuShortcut(ch: string): number | null {
    const num = parseInt(ch, 10);
    if (num >= 1 && num <= 8) {
      return num;
    }
    return null;
  }

  /**
   * Parse double-key sequences (like 'gg' for go to top)
   */
  private doubleKeyBuffer: string = "";

  parseDoubleKey(ch: string): string | null {
    if (ch === "g") {
      if (this.doubleKeyBuffer === "g") {
        this.doubleKeyBuffer = "";
        return "gg";
      }
      this.doubleKeyBuffer = "g";
      return null;
    }

    this.doubleKeyBuffer = "";
    return null;
  }

  resetDoubleKeyBuffer(): void {
    this.doubleKeyBuffer = "";
  }
}
