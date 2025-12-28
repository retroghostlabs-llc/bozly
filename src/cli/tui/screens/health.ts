import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";

interface HealthData {
  status: "ok" | "degraded" | "error";
  uptime?: number;
  version?: string;
  responseTime?: number;
  database?: {
    status: string;
    latency?: number;
  };
  memory?: {
    used: number;
    total: number;
  };
  apiEndpoints?: number;
}

/**
 * Health Screen - Monitor API server health
 * Shows API status, version, response times, database status
 * Displays performance metrics and system information
 */
export class HealthScreen extends Screen {
  private healthData: HealthData = { status: "ok" };
  private healthBox?: blessed.Widgets.BoxElement;
  private lastUpdate = 0;
  private updateInterval = 5000; // 5 seconds

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
      content: " API Health Status ",
      style: {
        fg: "white",
        bold: true,
      },
    });

    // Health info
    this.healthBox = blessed.box({
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
          fg: "green",
        },
      },
    });
  }

  async render(): Promise<void> {
    try {
      // Check health with timeout
      const isHealthy = await Promise.race([
        this.apiClient.isHealthy(),
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);

      if (isHealthy) {
        this.healthData.status = "ok";
      } else {
        this.healthData.status = "error";
      }

      this.updateHealthDisplay();
      this.parent.render();
    } catch (_error) {
      this.healthData.status = "error";
      this.updateHealthDisplay();
    }
  }

  async refresh(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdate >= this.updateInterval) {
      this.lastUpdate = now;
      await this.render();
    }
  }

  async handleKey(_ch: string, key?: Record<string, unknown>): Promise<void> {
    if (key && key.name === "r") {
      // Manual refresh
      this.lastUpdate = 0;
      await this.render();
    }
  }

  private updateHealthDisplay(): void {
    if (!this.healthBox) {
      return;
    }

    let content = "\n  API Server Health\n";
    content += "  " + "=".repeat(50) + "\n\n";

    // Status indicator
    const statusIcon = this.healthData.status === "ok" ? "✓" : "✗";
    content += `  Status: ${statusIcon} ${this.healthData.status.toUpperCase()}\n`;
    content += `  Version: ${this.healthData.version ?? "unknown"}\n`;
    content += `  Uptime: ${this.formatUptime(this.healthData.uptime ?? 0)}\n`;
    content += `  Response Time: ${this.healthData.responseTime ?? 0}ms\n\n`;

    if (this.healthData.database) {
      content += `  Database\n`;
      content += `  ────────\n`;
      content += `  Status: ${this.healthData.database.status}\n`;
      content += `  Latency: ${this.healthData.database.latency ?? 0}ms\n\n`;
    }

    if (this.healthData.memory) {
      content += `  Memory Usage\n`;
      content += `  ────────────\n`;
      const used = Math.round(this.healthData.memory.used / 1024 / 1024);
      const total = Math.round(this.healthData.memory.total / 1024 / 1024);
      const percent = Math.round(
        (this.healthData.memory.used / this.healthData.memory.total) * 100
      );
      content += `  Used: ${used} MB / ${total} MB (${percent}%)\n\n`;
    }

    content += `  API Endpoints: ${this.healthData.apiEndpoints ?? 0}\n\n`;
    content += "  Keys: r (refresh), ↑/↓ (scroll), Ctrl+L (auto-refresh)\n";

    this.healthBox.setContent(content);
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  activate(): void {
    if (this.healthBox) {
      this.healthBox.focus();
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
