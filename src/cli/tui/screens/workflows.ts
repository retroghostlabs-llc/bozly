import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  steps: number;
  status?: "active" | "disabled";
  lastRun?: string;
  nodeId?: string;
}

/**
 * Workflows Screen - View and manage workflows
 * Shows available workflows with step counts and status
 * Allows viewing workflow details and execution status
 */
export class WorkflowsScreen extends Screen {
  private workflows: WorkflowItem[] = [];
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
      content: " Workflows ",
      style: {
        fg: "cyan",
        bold: true,
      },
    });

    // List
    this.listBox = blessed.list({
      parent: this.box,
      top: 1,
      left: 1,
      width: "50%",
      bottom: 1,
      keys: false,
      mouse: true,
      vi: false,
      style: {
        selected: {
          bg: "blue",
          fg: "white",
        },
      },
    });

    // Detail
    this.detailBox = blessed.box({
      parent: this.box,
      top: 1,
      right: 1,
      width: "50%-2",
      bottom: 1,
      scrollable: true,
      mouse: true,
      keys: false,
      style: {
        border: {
          fg: "cyan",
        },
      },
    });

    this.createFooterBox();
    this.setupKeybindings();
  }

  async render(): Promise<void> {
    try {
      this.workflows = await this.apiClient.getWorkflows();

      if (this.listBox) {
        this.listBox.clearItems();

        if (this.workflows.length === 0) {
          this.listBox.addItem("No workflows available");
        } else {
          this.workflows.forEach((wf) => {
            const status = wf.status === "disabled" ? "[✗]" : "[✓]";
            const label = `${status} ${wf.name} (${wf.steps} steps)`;
            this.listBox?.addItem(label);
          });
        }

        this.updateDetailBox(0);
        this.parent.render();
      }
    } catch (error) {
      this.showError(
        `Failed to load workflows: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async refresh(): Promise<void> {
    await this.render();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async handleKey(ch: string, key?: Record<string, unknown>): Promise<void> {
    if (!key) {
      return;
    }

    if (key.name === "up" || ch === "k") {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateDetailBox(this.selectedIndex);
    } else if (key.name === "down" || ch === "j") {
      this.selectedIndex = Math.min(this.workflows.length - 1, this.selectedIndex + 1);
      this.updateDetailBox(this.selectedIndex);
    }
  }

  private updateDetailBox(index: number): void {
    if (!this.detailBox || !this.workflows[index]) {
      return;
    }

    const wf = this.workflows[index];
    let content = "";

    content += `\n  ${wf.name}\n`;
    content += `  ${"=".repeat(40)}\n\n`;
    content += `  Status: ${wf.status ?? "active"}\n`;
    content += `  Steps: ${wf.steps}\n`;
    content += `  Node: ${wf.nodeId ?? "global"}\n`;
    content += `  Last Run: ${wf.lastRun ?? "never"}\n`;
    content += `\n  Description:\n  ${wf.description ?? "(none)"}\n`;

    this.detailBox.setContent(content);

    // Update list selection to match our selectedIndex
    if (this.listBox) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.listBox as any).select(index);
    }

    this.parent.render();
  }

  private setupKeybindings(): void {
    // Keys are handled via the app's global keypress event -> handleKey()
    // No need to set up bindings here
  }

  activate(): void {
    if (this.listBox) {
      this.listBox.focus();
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
