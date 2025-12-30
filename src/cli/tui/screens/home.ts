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
  private scrollOffset: number = 0;
  private contentLines: string[] = [];

  constructor(parent: blessed.Widgets.Screen, apiClient: APIClient, config: ScreenConfig) {
    super(parent, config);
    this.apiClient = apiClient;
  }

  async init(): Promise<void> {
    this.box = this.createBox({
      scrollable: true,
      mouse: true,
    });

    this.createFooterBox();
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
    // Footer is now rendered as a separate box at screen bottom, not as content

    // Split content into lines for scroll management
    this.contentLines = content.split("\n");

    // Apply scroll offset - show lines from scrollOffset onward
    const visibleContent = this.contentLines.slice(this.scrollOffset).join("\n");
    this.box.setContent(visibleContent);
    this.parent.render();
  }

  async refresh(): Promise<void> {
    await this.loadStats();
    this.render();
  }

  async handleKey(ch: string, key?: Record<string, unknown>): Promise<void> {
    // Handle vim-style and character input
    const keyName = key?.name as string | undefined;

    // Calculate max scroll offset (enough to show at least some content)
    const boxHeight = this.box?.height ?? 20; // Default to 20 if height not available
    const maxScrollOffset = Math.max(0, this.contentLines.length - Math.floor(boxHeight / 2));

    // Vim-style navigation
    if (ch === "j" || keyName === "down") {
      this.scrollOffset = Math.min(maxScrollOffset, this.scrollOffset + 1);
      this.appRef?.showStatusMessage("Scrolling down...");
      await this.render();
    } else if (ch === "k" || keyName === "up") {
      this.scrollOffset = Math.max(0, this.scrollOffset - 1);
      this.appRef?.showStatusMessage("Scrolling up...");
      await this.render();
    } else if (ch === "G" || (ch === "g" && key?.shift)) {
      // G - go to end
      this.scrollOffset = maxScrollOffset;
      this.appRef?.showStatusMessage("Jumped to bottom");
      await this.render();
    } else if (ch === "g" && !key?.shift) {
      // gg - go to top (requires double press)
      this.scrollOffset = 0;
      this.appRef?.showStatusMessage("Jumped to top");
      await this.render();
    } else if (ch === "n" || ch === "N") {
      // Quick action: New session
      this.appRef?.showStatusMessage("New command (Phase 2)");
    } else if (ch === "r" || ch === "R") {
      // Quick action: Refresh
      this.appRef?.showStatusMessage("Refreshing statistics...");
      this.scrollOffset = 0; // Reset scroll on refresh
      await this.refresh();
    }
  }

  private renderHeader(): string {
    // Use ANSI color codes matching BOZLY web UI brand colors
    // Primary: Tan (#D4A574), Accent: Cyan (#00B4D8)
    const bold = "\x1b[1m";
    const tan = "\x1b[38;2;212;165;116m"; // True color tan (#D4A574)
    const cyan = "\x1b[38;2;0;180;216m"; // True color cyan (#00B4D8)
    const gray = "\x1b[90m";
    const reset = "\x1b[0m";

    // BOZLY ASCII art logo (B-O-Z-L-Y, each letter 4-5 chars wide)
    const logo = `
        ${bold}${tan} ██████╗  ██████╗  ███████╗ ██╗     ██╗   ██╗${reset}
        ${bold}${tan} ██╔══██╗ ██╔═══██╗ ╚════██║ ██║     ╚██╗ ██╔╝${reset}
        ${bold}${tan} ██████╔╝ ██║   ██║  ███╔═╝  ██║      ╚████╔╝ ${reset}
        ${bold}${tan} ██╔══██╗ ██║   ██║ ██╔══╝   ██║       ╚██╔╝  ${reset}
        ${bold}${tan} ██████╔╝ ╚██████╔╝ ███████╗ ███████╗   ██║   ${reset}
        ${bold}${tan} ╚═════╝   ╚═════╝  ╚══════╝ ╚══════╝   ╚═╝   ${reset}

             ${cyan}Build. Organize. Link. Yield.${reset}
             ${gray}v0.6.0-beta.1${reset}

`;

    return logo;
  }

  private renderStats(): string {
    const bold = "\x1b[1m";
    const tan = "\x1b[38;2;212;165;116m"; // True color tan (#D4A574)
    const cyan = "\x1b[38;2;0;180;216m"; // True color cyan (#00B4D8)
    const gray = "\x1b[90m";
    const green = "\x1b[32m";
    const yellow = "\x1b[33m";
    const reset = "\x1b[0m";

    if (!this.stats) {
      return `${yellow}Loading stats...${reset}\n\n`;
    }

    return `${bold}${tan}System Overview${reset}
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
    const tan = "\x1b[38;2;212;165;116m"; // True color tan (#D4A574)
    const gray = "\x1b[90m";
    const green = "\x1b[32m";
    const red = "\x1b[31m";
    const reset = "\x1b[0m";

    if (!this.stats || this.stats.recentSessions.length === 0) {
      return "";
    }

    let content = `${bold}${tan}Recent Sessions${reset}
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
    const tan = "\x1b[38;2;212;165;116m"; // True color tan (#D4A574)
    const cyan = "\x1b[38;2;0;180;216m"; // True color cyan (#00B4D8)
    const gray = "\x1b[90m";
    const reset = "\x1b[0m";

    return `${bold}${tan}>> Navigation${reset}
${gray}───────────────────────────────────────────────────────────${reset}
  ${cyan}[0]${reset} Home             Back to main dashboard
  ${cyan}[1]${reset} Vaults           Manage your AI workspaces
  ${cyan}[2]${reset} Sessions         View command history & results
  ${cyan}[3]${reset} Commands         Browse & run commands
  ${cyan}[4]${reset} Memory           Indexed knowledge & context
  ${cyan}[5]${reset} Workflows        Multi-step automation chains
  ${cyan}[6]${reset} Config           Settings & configuration
  ${cyan}[7]${reset} Health           System status & diagnostics
  ${cyan}[8]${reset} Help             Documentation & shortcuts

${bold}${tan}>> Quick Actions${reset}
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
