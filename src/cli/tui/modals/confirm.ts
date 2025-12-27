import { Modal, ModalConfig } from "../core/modal.js";
import blessed from "blessed";

export interface ConfirmModalConfig extends ModalConfig {
  message: string;
  yesLabel?: string;
  noLabel?: string;
  dangerous?: boolean;
}

/**
 * Confirmation modal - Yes/No confirmation dialog
 */
export class ConfirmModal extends Modal {
  private message: string;
  private yesLabel: string;
  private noLabel: string;
  private dangerous: boolean;
  private yesButton: blessed.Widgets.ButtonElement | null = null;
  private noButton: blessed.Widgets.ButtonElement | null = null;

  constructor(parent: blessed.Widgets.Screen, config: ConfirmModalConfig) {
    super(parent, config);
    this.message = config.message;
    this.yesLabel = config.yesLabel ?? "Yes";
    this.noLabel = config.noLabel ?? "No";
    this.dangerous = config.dangerous ?? false;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async init(): Promise<void> {
    this.box = this.createBox({
      width: 60,
      height: 12,
    });

    // Create message text
    (
      this.box as unknown as { box: (opts: Record<string, unknown>) => blessed.Widgets.BoxElement }
    ).box({
      parent: this.box,
      top: 1,
      left: 2,
      right: 2,
      height: "shrink",
      content: this.message,
      style: {
        fg: this.dangerous ? "red" : "white",
      },
    });

    // Create Yes button
    this.yesButton = this.createButton(this.box, this.yesLabel, {
      top: 6,
      left: 10,
      width: 12,
      height: 1,
      name: "yes",
      mouse: true,
      keys: true,
      style: {
        bg: this.dangerous ? "red" : "blue",
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
    });

    if (this.yesButton) {
      this.yesButton.on("press", () => {
        this.close(true);
      });
    }

    // Create No button
    this.noButton = this.createButton(this.box, this.noLabel, {
      top: 6,
      left: 28,
      width: 12,
      height: 1,
      name: "no",
      mouse: true,
      keys: true,
    });

    if (this.noButton) {
      this.noButton.on("press", () => {
        this.close(false);
      });
    }

    // Setup keybindings
    if (this.box) {
      this.box.key(["tab"], () => {
        if (this.parent.focused === this.yesButton) {
          this.noButton?.focus();
        } else {
          this.yesButton?.focus();
        }
      });

      this.box.key(["shift-tab"], () => {
        if (this.parent.focused === this.noButton) {
          this.yesButton?.focus();
        } else {
          this.noButton?.focus();
        }
      });

      this.box.key(["y", "Y"], () => {
        this.close(true);
      });

      this.box.key(["n", "N"], () => {
        this.close(false);
      });

      this.box.key(["escape"], () => {
        this.close(false);
      });
    }

    // Focus yes button by default
    if (this.yesButton) {
      this.yesButton.focus();
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
