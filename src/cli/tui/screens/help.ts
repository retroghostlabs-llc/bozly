import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";

/**
 * Help Screen - Display BOZLY information and keyboard shortcuts
 * Shows overview, keyboard shortcuts, and tips for using the TUI
 */
export class HelpScreen extends Screen {
  private contentBox?: blessed.Widgets.BoxElement;

  constructor(parent: blessed.Widgets.Screen, config: ScreenConfig) {
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
      style: {
        border: {
          fg: "cyan",
        },
      },
    });

    // Title
    blessed.box({
      parent: this.box,
      top: 0,
      left: 2,
      height: 1,
      content: " Help ",
      style: {
        fg: "cyan",
        bold: true,
      },
    });

    // Content area
    this.contentBox = blessed.box({
      parent: this.box,
      top: 1,
      left: 1,
      right: 1,
      bottom: 1,
      scrollable: true,
      mouse: true,
      keys: true,
      style: {
        border: {
          fg: "cyan",
        },
      },
    });

    this.createFooterBox();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async render(): Promise<void> {
    if (!this.contentBox) {
      return;
    }

    const cyan = "\x1b[36m";
    const yellow = "\x1b[33m";
    const green = "\x1b[32m";
    const reset = "\x1b[0m";

    let content = "\n";
    content += `  ${cyan}═══════════════════════════════════════════════════════${reset}\n`;
    content += `  ${cyan}BOZLY${reset} - Build. Organize. Link. Yield.\n`;
    content += `  ${cyan}═══════════════════════════════════════════════════════${reset}\n\n`;

    // Overview
    content += `  ${yellow}Overview${reset}\n`;
    content += `  ────────\n`;
    content += `  BOZLY is an AI-agnostic framework for deploying domain-specific\n`;
    content += `  workspaces. It helps you organize commands, workflows, and context\n`;
    content += `  for any AI assistant (Claude, GPT, Gemini, Ollama, etc.).\n\n`;

    // Screen Navigation
    content += `  ${yellow}Screen Navigation${reset}\n`;
    content += `  ──────────────────\n`;
    content += `  ${green}H${reset} - Home              ${green}V${reset} - Vaults\n`;
    content += `  ${green}S${reset} - Sessions          ${green}C${reset} - Commands\n`;
    content += `  ${green}W${reset} - Workflows         ${green}M${reset} - Memory\n`;
    content += `  ${green}X${reset} - Config            ${green}?${reset} - Health\n`;
    content += `  ${green}Q${reset} - Quit TUI\n\n`;

    // Common Keyboard Shortcuts
    content += `  ${yellow}Global Keyboard Shortcuts${reset}\n`;
    content += `  ─────────────────────────\n`;
    content += `  ${green}↑/↓${reset}       Navigate between items\n`;
    content += `  ${green}←/→${reset}       Navigate between screens (when available)\n`;
    content += `  ${green}Enter${reset}     Select/Open item\n`;
    content += `  ${green}E${reset}        Edit mode (in applicable screens)\n`;
    content += `  ${green}S${reset}        Save changes (in edit mode)\n`;
    content += `  ${green}Esc${reset}      Exit edit mode / Cancel\n`;
    content += `  ${green}B${reset}        Back / Exit (in some screens)\n`;
    content += `  ${green}R${reset}        Refresh current screen\n`;
    content += `  ${green}Ctrl+L${reset}   Toggle auto-refresh\n\n`;

    // Tips
    content += `  ${yellow}Tips${reset}\n`;
    content += `  ────\n`;
    content += `  • Use mouse to click on items in the TUI\n`;
    content += `  • Scrollable areas show ↑/↓ arrows when there's more content\n`;
    content += `  • Press 'r' to manually refresh any screen\n`;
    content += `  • Memory search helps you find related commands and workflows\n`;
    content += `  • Watch the Health screen to monitor API performance\n\n`;

    // More Coming Soon
    content += `  ${cyan}More Documentation Coming Soon${reset}\n`;
    content += `  ───────────────────────────────\n`;
    content += `  Full user guide, command reference, and workflow examples\n`;
    content += `  will be available at https://bozly.dev\n\n`;

    this.contentBox.setContent(content);
    this.parent.render();
  }

  async refresh(): Promise<void> {
    await this.render();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleKey(_ch: string, _key?: Record<string, unknown>): Promise<void> {
    // Help screen doesn't handle special keys
  }

  activate(): void {
    if (this.contentBox) {
      this.contentBox.focus();
    }
  }

  deactivate(): void {
    // Cleanup
  }

  destroy(): void {
    if (this.box) {
      try {
        this.box.destroy();
      } catch {
        // Ignore
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
