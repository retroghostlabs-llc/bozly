import { Modal, ModalConfig } from "../core/modal.js";
import blessed from "@unblessed/blessed";

export interface ErrorModalConfig extends ModalConfig {
  message: string;
  details?: string;
}

/**
 * Error modal - Display error messages to user
 */
export class ErrorModal extends Modal {
  private message: string;
  private details?: string;
  private okButton: blessed.Widgets.ButtonElement | null = null;

  constructor(parent: blessed.Widgets.Screen, config: ErrorModalConfig) {
    super(parent, config);
    this.message = config.message;
    this.details = config.details;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async init(): Promise<void> {
    this.box = this.createBox({
      width: 70,
      height: this.details ? 15 : 12,
      style: {
        border: { fg: "red" },
        label: { fg: "red" },
      },
    });

    // Create message text
    const textContent = this.details
      ? `${this.message}\n\n{gray}${this.details}{/gray}`
      : this.message;

    (
      this.box as unknown as { box: (opts: Record<string, unknown>) => blessed.Widgets.BoxElement }
    ).box({
      parent: this.box,
      top: 1,
      left: 2,
      right: 2,
      height: this.details ? 8 : 5,
      content: textContent,
      style: {
        fg: "red",
      },
      scrollable: true,
    });

    // Create OK button
    const buttonTop = this.details ? 10 : 7;
    this.okButton = this.createButton(this.box, "OK", {
      top: buttonTop,
      left: "center",
      width: 12,
      height: 1,
      name: "ok",
      mouse: true,
      keys: true,
      style: {
        bg: "red",
        fg: "white",
        focus: {
          bg: "lightred",
          fg: "black",
        },
        hover: {
          bg: "lightred",
          fg: "black",
        },
      },
    });

    if (this.okButton) {
      this.okButton.on("press", () => {
        this.close();
      });
    }

    // Setup keybindings
    if (this.box) {
      this.box.key(["enter"], () => {
        this.close();
      });

      this.box.key(["escape"], () => {
        this.close();
      });
    }

    // Focus OK button
    if (this.okButton) {
      this.okButton.focus();
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async render(): Promise<void> {
    if (this.box) {
      this.box.show();
      this.parent.render();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleKey(_ch: string, _key?: any): Promise<void> {
    // Keys are handled by blessed widgets
  }
}
