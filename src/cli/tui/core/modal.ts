import blessed, { Widgets } from "blessed";

export interface ModalConfig {
  id: string;
  title: string;
  width?: number | string;
  height?: number | string;
}

/**
 * Base class for all TUI modal dialogs
 * Modals are overlay windows that appear on top of screens
 */
export abstract class Modal {
  protected id: string;
  protected title: string;
  protected parent: blessed.Widgets.Screen;
  protected box: blessed.Widgets.BoxElement | null = null;
  protected width: number | string;
  protected height: number | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolve: ((value: any) => void) | null = null;
  private isVisible: boolean = false;

  constructor(parent: blessed.Widgets.Screen, config: ModalConfig) {
    this.parent = parent;
    this.id = config.id;
    this.title = config.title;
    this.width = config.width ?? 60;
    this.height = config.height ?? 20;
  }

  /**
   * Initialize the modal (called once)
   */
  abstract init(): Promise<void>;

  /**
   * Render the modal
   */
  abstract render(): Promise<void>;

  /**
   * Handle keyboard input
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract handleKey(ch: string, key?: any): Promise<void>;

  /**
   * Show modal and wait for result
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async show(): Promise<any> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.isVisible = true;
      if (this.box) {
        this.box.show();
        this.box.focus();
        this.parent.render();
      }
    });
  }

  /**
   * Close modal with optional result
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  close(result?: any): void {
    this.isVisible = false;
    if (this.box) {
      try {
        this.box.hide();
      } catch {
        // Ignore hide errors
      }
    }
    if (this.resolve) {
      this.resolve(result);
      this.resolve = null;
    }
    this.parent.render();
  }

  /**
   * Destroy modal (cleanup)
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
   * Check if modal is visible
   */
  isCurrentlyVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get modal ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get modal title
   */
  getTitle(): string {
    return this.title;
  }

  /**
   * Create main modal box with border and title
   */
  protected createBox(options: Partial<Widgets.BoxOptions> = {}): blessed.Widgets.BoxElement {
    const boxElement = (
      this.parent as unknown as {
        box: (opts: Record<string, unknown>) => blessed.Widgets.BoxElement;
      }
    ).box({
      parent: this.parent,
      top: "center",
      left: "center",
      width: this.width,
      height: this.height,
      border: "line",
      label: ` ${this.title} `,
      style: {
        border: { fg: "cyan" },
        label: { fg: "white" },
      },
      hidden: true,
      ...options,
    });
    return boxElement;
  }

  /**
   * Create a text input field
   */
  protected createTextInput(
    parent: blessed.Widgets.BoxElement,
    options: Partial<Widgets.TextboxOptions> = {}
  ): blessed.Widgets.TextboxElement {
    const textboxElement = (
      this.parent as unknown as {
        textbox: (opts: Record<string, unknown>) => blessed.Widgets.TextboxElement;
      }
    ).textbox({
      parent,
      mouse: true,
      keys: true,
      vi: true,
      inputOnFocus: true,
      style: {
        fg: "white",
        bg: "blue",
        focus: {
          bg: "lightblue",
          fg: "black",
        },
      },
      ...options,
    });
    return textboxElement;
  }

  /**
   * Create a button
   */
  protected createButton(
    parent: blessed.Widgets.BoxElement,
    text: string,
    options: Partial<Widgets.ButtonOptions> = {}
  ): blessed.Widgets.ButtonElement {
    const buttonElement = (
      this.parent as unknown as {
        button: (opts: Record<string, unknown>) => blessed.Widgets.ButtonElement;
      }
    ).button({
      parent,
      mouse: true,
      keys: true,
      style: {
        bg: "blue",
        fg: "white",
        focus: {
          bg: "lightblue",
          fg: "black",
        },
        hover: {
          bg: "lightblue",
          fg: "black",
        },
      },
      name: text,
      ...options,
    });
    return buttonElement;
  }

  /**
   * Create a list
   */
  protected createList(
    parent: blessed.Widgets.BoxElement,
    options?: Record<string, unknown>
  ): blessed.Widgets.ListElement {
    const listElement = (
      this.parent as unknown as {
        list: (opts: Record<string, unknown>) => blessed.Widgets.ListElement;
      }
    ).list({
      parent,
      style: {
        fg: "white",
        bg: "blue",
        selected: {
          bg: "white",
          fg: "blue",
        },
        focus: {
          bg: "white",
          fg: "blue",
        },
      },
      mouse: true,
      keys: true,
      vi: true,
      ...(options ?? {}),
    });
    return listElement;
  }

  /**
   * Set focus to element
   */
  protected setFocus(element: { focus: () => void; destroyed: boolean }): void {
    if (element && !element.destroyed) {
      element.focus();
      this.parent.render();
    }
  }
}
