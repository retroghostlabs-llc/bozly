import blessed from "blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { APIClient } from "../core/api-client.js";

interface SessionData {
  status: string;
  timestamp: string;
  command: string;
  vault: string;
  duration?: number;
}

interface DashboardStats {
  totalVaults: number;
  totalSessions: number;
  totalCommands: number;
  uptime: string;
  lastUpdate: string;
  recentSessions: SessionData[];
  successRate: number;
  totalDuration: string;
}

/**
 * Home/Dashboard screen showing system overview and quick stats
 */
export class HomeScreen extends Screen {
  private apiClient: APIClient;
  private stats: DashboardStats | null = null;

  constructor(parent: blessed.Widgets.Screen, apiClient: APIClient, config: ScreenConfig) {
    super(parent, config);
    this.apiClient = apiClient;
  }

  async init(): Promise<void> {
    this.box = this.createBox({
      scrollable: true,
      mouse: true,
      keys: true,
    });

    await this.loadStats();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async render(): Promise<void> {
    if (!this.box) {
      return;
    }

    let content = this.renderHeader();
    content += this.renderStats();
    content += this.renderRecentSessions();
    content += this.renderQuickActions();

    this.box.setContent(content);
    this.parent.render();
  }

  async refresh(): Promise<void> {
    await this.loadStats();
    this.render();
  }

  async handleKey(ch: string, key?: Record<string, unknown>): Promise<void> {
    if (!key) {
      return;
    }

    // Vim-style navigation
    if (ch === "j" || key.name === "down") {
      this.box?.scroll(1);
    } else if (ch === "k" || key.name === "up") {
      this.box?.scroll(-1);
    } else if (ch === "g" && key.shift) {
      // G - go to end
      this.box?.setScroll(this.box.getScrollHeight());
    } else if (ch === "g" && !key.shift) {
      // gg - go to top (requires double press)
      this.box?.setScroll(0);
    } else if (ch === "n") {
      // Quick action: New session
      // This would trigger a command launcher modal (Phase 2)
    } else if (ch === "r") {
      // Quick action: Refresh
      await this.refresh();
    }

    this.parent.render();
  }

  private renderHeader(): string {
    return `{bold}{cyan}BOZLY Dashboard{/cyan}{/bold}
{gray}═══════════════════════════════════════════════════════════{/gray}

`;
  }

  private renderStats(): string {
    if (!this.stats) {
      return "{yellow}Loading stats...{/yellow}\n\n";
    }

    return `{bold}System Overview{/bold}
{gray}───────────────────────────────────────────────────────────{/gray}
  Active Vaults:      {cyan}${this.stats.totalVaults}{/cyan}
  Total Sessions:     {cyan}${this.stats.totalSessions}{/cyan}
  Total Commands:     {cyan}${this.stats.totalCommands}{/cyan}
  Success Rate:       {green}${this.stats.successRate.toFixed(1)}%{/green}
  Total Duration:     {cyan}${this.stats.totalDuration}{/cyan}
  Last Updated:       {gray}${this.stats.lastUpdate}{/gray}

`;
  }

  private renderRecentSessions(): string {
    if (!this.stats || this.stats.recentSessions.length === 0) {
      return "";
    }

    let content = `{bold}Recent Sessions{/bold}
{gray}───────────────────────────────────────────────────────────{/gray}
`;

    for (const session of this.stats.recentSessions.slice(0, 5)) {
      const status = session.status === "completed" ? "{green}✓{/green}" : "{red}✗{/red}";
      const time = new Date(session.timestamp).toLocaleTimeString();
      content += `  ${status} ${session.command} (${session.vault}) @ ${time}\n`;
    }

    content += "\n";
    return content;
  }

  private renderQuickActions(): string {
    return `{bold}Quick Actions{/bold}
{gray}───────────────────────────────────────────────────────────{/gray}
  [N]ew command        Run a command from current vault
  [R]efresh            Update statistics
  [1-8]                Jump to other screens
  [?]                  Show help
  [Q]uit               Exit application

{gray}═══════════════════════════════════════════════════════════{/gray}
`;
  }

  private async loadStats(): Promise<void> {
    try {
      const vaults = await this.apiClient.getVaults();
      const sessions = await this.apiClient.getSessions();

      let totalCommands = 0;
      for (const vault of vaults) {
        const commands = await this.apiClient.getCommands(vault.id);
        totalCommands += commands.length;
      }

      const successfulSessions = sessions.filter(
        (s: SessionData) => s.status === "completed"
      ).length;
      const successRate = sessions.length > 0 ? (successfulSessions / sessions.length) * 100 : 0;

      const totalSeconds = sessions.reduce(
        (sum: number, s: SessionData) => sum + (s.duration ?? 0),
        0
      );
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const totalDuration = `${hours}h ${minutes}m`;

      const now = new Date();
      const lastUpdate = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      // Get last 5 sessions for display
      const recentSessions = sessions.slice(0, 5);

      this.stats = {
        totalVaults: vaults.length,
        totalSessions: sessions.length,
        totalCommands,
        uptime: "running",
        lastUpdate,
        recentSessions,
        successRate,
        totalDuration,
      };
    } catch (error) {
      console.error("Error loading stats:", error);
      this.stats = {
        totalVaults: 0,
        totalSessions: 0,
        totalCommands: 0,
        uptime: "error",
        lastUpdate: "N/A",
        recentSessions: [],
        successRate: 0,
        totalDuration: "0h 0m",
      };
    }
  }
}
