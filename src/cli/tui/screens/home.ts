import blessed from "@unblessed/blessed";
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
    // Handle vim-style and character input
    const keyName = key?.name as string | undefined;

    // Vim-style navigation
    if (ch === "j" || keyName === "down") {
      this.box?.scroll(1);
      this.appRef?.showStatusMessage("Scrolling down...");
    } else if (ch === "k" || keyName === "up") {
      this.box?.scroll(-1);
      this.appRef?.showStatusMessage("Scrolling up...");
    } else if (ch === "G" || (ch === "g" && key?.shift)) {
      // G - go to end
      this.box?.setScroll(this.box?.getScrollHeight() ?? 0);
      this.appRef?.showStatusMessage("Jumped to bottom");
    } else if (ch === "g" && !key?.shift) {
      // gg - go to top (requires double press)
      this.box?.setScroll(0);
      this.appRef?.showStatusMessage("Jumped to top");
    } else if (ch === "n" || ch === "N") {
      // Quick action: New session
      this.appRef?.showStatusMessage("New command (Phase 2)");
    } else if (ch === "r" || ch === "R") {
      // Quick action: Refresh
      this.appRef?.showStatusMessage("Refreshing statistics...");
      await this.refresh();
    }

    this.parent.render();
  }

  private renderHeader(): string {
    // Use ANSI color codes matching BOZLY CLI theme colors
    // Primary: Indigo (#6366f1 ≈ bright blue), Secondary: Purple (#8b5cf6 ≈ magenta)
    const bold = "\x1b[1m";
    const purple = "\x1b[35m"; // Magenta (closest to purple #8b5cf6)
    const cyan = "\x1b[36m";
    const reset = "\x1b[0m";

    // BOZLY ASCII art logo (simple, no decorative box)
    const logo = `
        ${bold}${purple}██████╗  ██████╗ ███████╗██╗  ██╗   ██╗${reset}
        ${bold}${purple}██╔══██╗██╔═══██╗██╔════╝██║  ╚██╗ ██╔╝${reset}
        ${bold}${purple}██████╔╝██║   ██║███████╗██║   ╚████╔╝${reset}
        ${bold}${purple}██╔══██╗██║   ██║╚════██║██║    ╚██╔╝${reset}
        ${bold}${purple}██████╔╝╚██████╔╝███████║███████╗██║${reset}
        ${bold}${purple}╚═════╝  ╚═════╝ ╚══════╝╚══════╝╚═╝${reset}

             ${cyan}Build. Organize. Link. Yield.${reset}

`;

    return logo;
  }

  private renderStats(): string {
    const bold = "\x1b[1m";
    const cyan = "\x1b[36m";
    const gray = "\x1b[90m";
    const green = "\x1b[32m";
    const yellow = "\x1b[33m";
    const reset = "\x1b[0m";

    if (!this.stats) {
      return `${yellow}Loading stats...${reset}\n\n`;
    }

    return `${bold}System Overview${reset}
${gray}───────────────────────────────────────────────────────────${reset}
  Active Vaults:      ${cyan}${this.stats.totalVaults}${reset}
  Total Sessions:     ${cyan}${this.stats.totalSessions}${reset}
  Total Commands:     ${cyan}${this.stats.totalCommands}${reset}
  Success Rate:       ${green}${this.stats.successRate.toFixed(1)}%${reset}
  Total Duration:     ${cyan}${this.stats.totalDuration}${reset}
  Last Updated:       ${gray}${this.stats.lastUpdate}${reset}

`;
  }

  private renderRecentSessions(): string {
    const bold = "\x1b[1m";
    const gray = "\x1b[90m";
    const green = "\x1b[32m";
    const red = "\x1b[31m";
    const reset = "\x1b[0m";

    if (!this.stats || this.stats.recentSessions.length === 0) {
      return "";
    }

    let content = `${bold}Recent Sessions${reset}
${gray}───────────────────────────────────────────────────────────${reset}
`;

    for (const session of this.stats.recentSessions.slice(0, 5)) {
      const status = session.status === "completed" ? `${green}✓${reset}` : `${red}✗${reset}`;
      const time = new Date(session.timestamp).toLocaleTimeString();
      content += `  ${status} ${session.command} (${session.vault}) @ ${time}\n`;
    }

    content += "\n";
    return content;
  }

  private renderQuickActions(): string {
    const bold = "\x1b[1m";
    const cyan = "\x1b[36m";
    const gray = "\x1b[90m";
    const reset = "\x1b[0m";

    return `${bold}>> Navigation${reset}
${gray}───────────────────────────────────────────────────────────${reset}
  ${cyan}[1]${reset} Vaults           Manage your AI workspaces
  ${cyan}[2]${reset} Sessions         View command history & results
  ${cyan}[3]${reset} Commands         Browse & run commands
  ${cyan}[4]${reset} Memory           Indexed knowledge & context
  ${cyan}[5]${reset} Workflows        Multi-step automation chains
  ${cyan}[6]${reset} Config           Settings & configuration
  ${cyan}[7]${reset} Health           System status & diagnostics
  ${cyan}[8]${reset} Help             Documentation & shortcuts

${bold}>> Quick Actions${reset}
${gray}───────────────────────────────────────────────────────────${reset}
  ${cyan}[N]${reset}ew              Run a command from current vault
  ${cyan}[R]${reset}efresh           Update statistics
  ${cyan}[?]${reset}                Show full help
  ${cyan}[Q]${reset}uit              Exit application

${gray}═══════════════════════════════════════════════════════════${reset}
`;
  }

  private async loadStats(): Promise<void> {
    try {
      const nodes = await this.apiClient.getVaults();
      const sessions = await this.apiClient.getSessions();

      let totalCommands = 0;
      for (const vault of nodes) {
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
        totalVaults: nodes.length,
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
