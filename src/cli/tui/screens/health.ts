import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";
import { ConfigManager } from "../../../core/config-manager.js";

interface HealthData {
  status: "ok" | "degraded" | "error";
  version?: string;
  uptime?: number; // in seconds
  startedAt?: string;
  responseTime?: number;
  requestCount?: number;
  errorCount?: number;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
  apiEndpoints?: number;
  timestamp?: string;
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
  private updateInterval: number;

  constructor(
    parent: blessed.Widgets.Screen,
    config: ScreenConfig,
    private apiClient: APIClient
  ) {
    super(parent, config);
    this.updateInterval = ConfigManager.getInstance().getClient().tuiRefreshIntervalMs;
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
        fg: "cyan",
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
          fg: "cyan",
        },
      },
    });

    this.createFooterBox();
  }

  async render(): Promise<void> {
    try {
      // Fetch health data with timeout
      const healthCheckTimeout = ConfigManager.getInstance().getServer().healthCheckTimeout;
      const health = await Promise.race([
        this.apiClient.getHealth(),
        new Promise<never>((_resolve, reject) =>
          setTimeout(() => reject(new Error("timeout")), healthCheckTimeout)
        ),
      ]);

      if (health?.data) {
        this.healthData = {
          status: health.data.status || "ok",
          version: health.data.version,
          uptime: health.data.uptime,
          startedAt: health.data.startedAt,
          responseTime: health.data.responseTime,
          requestCount: health.data.requestCount,
          errorCount: health.data.errorCount,
          memory: health.data.memory,
          apiEndpoints: health.data.apiEndpoints,
          timestamp: health.data.timestamp,
        };
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
    const statusColor = this.healthData.status === "ok" ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    const cyan = "\x1b[36m";
    const yellow = "\x1b[33m";

    content += `  ${statusColor}Status: ${statusIcon} ${this.healthData.status.toUpperCase()}${reset}\n`;
    content += `  ${cyan}Version:${reset} ${this.healthData.version ?? "unknown"}\n`;
    content += `  ${cyan}Uptime:${reset} ${this.formatUptime(this.healthData.uptime ?? 0)}\n`;
    content += `  ${cyan}Started:${reset} ${this.formatTimestamp(this.healthData.startedAt)}\n`;
    content += `  ${cyan}Response Time:${reset} ${this.healthData.responseTime ?? 0}ms\n\n`;

    // Request statistics
    content += `  ${cyan}Request Statistics${reset}\n`;
    content += `  ──────────────────\n`;
    content += `  Total Requests: ${this.healthData.requestCount ?? 0}\n`;
    const errorCount = this.healthData.errorCount ?? 0;
    const errorColor = errorCount > 0 ? "\x1b[31m" : "\x1b[32m";
    content += `  Errors: ${errorColor}${errorCount}${reset}\n\n`;

    // Memory usage
    if (this.healthData.memory) {
      content += `  ${cyan}Memory Usage${reset}\n`;
      content += `  ────────────\n`;
      const used = this.healthData.memory.used;
      const total = this.healthData.memory.total;
      const percent = this.healthData.memory.percentage;
      const memColor = percent > 80 ? "\x1b[31m" : percent > 50 ? "\x1b[33m" : "\x1b[32m";
      content += `  Used: ${memColor}${used.toFixed(2)}${reset} MB / ${total.toFixed(2)} MB (${memColor}${percent.toFixed(1)}%${reset})\n\n`;
    }

    content += `  ${cyan}API Endpoints:${reset} ${this.healthData.apiEndpoints ?? 0}\n\n`;
    content += `  ${yellow}Last Updated:${reset} ${this.formatTimestamp(this.healthData.timestamp)}\n\n`;
    content += "  Keys: r (refresh), ↑/↓ (scroll), Ctrl+L (auto-refresh)\n";

    this.healthBox.setContent(content);
  }

  private formatUptime(seconds: number): string {
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

  private formatTimestamp(timestamp?: string): string {
    if (!timestamp) {
      return "N/A";
    }
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
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
