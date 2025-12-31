import blessed from "@unblessed/blessed";
import { Screen, ScreenConfig } from "../core/screen.js";
import { getColorContext } from "../utils/colors.js";
import fs from "fs/promises";
import path from "path";
import { homedir } from "os";

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  error?: string;
  file?: string;
  function?: string;
  line?: number;
}

type FilterLevel = "ALL" | "INFO" | "DEBUG" | "ERROR";

/**
 * Logs Screen - View and filter BOZLY system logs
 * Shows recent logs with filtering capabilities
 * Displays file location and log entries
 */
export class LogsScreen extends Screen {
  private logs: LogEntry[] = [];
  private filteredLogs: LogEntry[] = [];
  private logBoxContent: blessed.Widgets.BoxElement | null = null;
  private filterLevel: FilterLevel = "ALL";
  private scrollOffset: number = 0;
  private maxLines: number = 100;
  private logDir: string = path.join(homedir(), ".bozly", "logs");
  private contentLines: string[] = [];

  constructor(parent: blessed.Widgets.Screen, config: ScreenConfig) {
    super(parent, config);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async init(): Promise<void> {
    this.box = this.createBox({
      scrollable: true,
      mouse: true,
    });

    // Title box
    blessed.box({
      parent: this.box,
      top: 0,
      left: 2,
      height: 1,
      content: " System Logs ",
      style: {
        fg: "cyan",
        bold: true,
      },
    });

    // Log content box
    this.logBoxContent = blessed.box({
      parent: this.box,
      top: 2,
      left: 1,
      right: 1,
      bottom: 8,
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

    // Load logs on init
    await this.loadLogs();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async render(): Promise<void> {
    if (!this.logBoxContent) {
      return;
    }

    let content = this.renderHeader();
    content += this.renderFilterStatus();
    content += this.renderLogs();

    // Split content into lines for scroll management
    this.contentLines = content.split("\n");

    // Apply scroll offset
    const visibleContent = this.contentLines.slice(this.scrollOffset).join("\n");
    this.logBoxContent.setContent(visibleContent);
    this.parent.render();
  }

  async refresh(): Promise<void> {
    await this.loadLogs();
    await this.render();
  }

  async handleKey(ch: string, key?: Record<string, unknown>): Promise<void> {
    const keyName = key?.name as string | undefined;

    // Calculate max scroll offset
    const boxHeight = this.logBoxContent?.height ?? 20;
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
      // gg - go to top
      this.scrollOffset = 0;
      this.appRef?.showStatusMessage("Jumped to top");
      await this.render();
    }

    // Filter keys: a=ALL, i=INFO, t=TRACE/DEBUG, x=eXceptions/ERROR
    // Using completely non-conflicting keys: A and I are free, T and X avoid conflicts with CONFIG (e=edit), NODES (d=delete)
    if (ch === "a" || ch === "A") {
      this.filterLevel = "ALL";
      this.scrollOffset = 0;
      this.appRef?.showStatusMessage("Filter: ALL");
      this.applyFilter();
      await this.render();
    } else if (ch === "i" || ch === "I") {
      this.filterLevel = "INFO";
      this.scrollOffset = 0;
      this.appRef?.showStatusMessage("Filter: INFO");
      this.applyFilter();
      await this.render();
    } else if (ch === "t" || ch === "T") {
      // T for Trace (DEBUG level)
      this.filterLevel = "DEBUG";
      this.scrollOffset = 0;
      this.appRef?.showStatusMessage("Filter: DEBUG (Trace)");
      this.applyFilter();
      await this.render();
    } else if (ch === "x" || ch === "X") {
      // X for eXceptions (ERROR level)
      this.filterLevel = "ERROR";
      this.scrollOffset = 0;
      this.appRef?.showStatusMessage("Filter: ERROR (Exceptions)");
      this.applyFilter();
      await this.render();
    } else if (ch === "r" || ch === "R") {
      // Refresh
      this.appRef?.showStatusMessage("Refreshing logs...");
      this.scrollOffset = 0;
      await this.refresh();
    }
  }

  private async loadLogs(): Promise<void> {
    try {
      // Check if log directory exists
      try {
        await fs.access(this.logDir);
      } catch {
        this.logs = [];
        this.applyFilter();
        return;
      }

      // Get all log files
      const files = await fs.readdir(this.logDir);
      const logFiles = files
        .filter((f) => f.startsWith("bozly-") && f.endsWith(".log"))
        .sort()
        .reverse(); // Most recent first

      // Load logs from the most recent file (if available)
      this.logs = [];

      if (logFiles.length > 0) {
        const mostRecentFile = logFiles[0];
        const filePath = path.join(this.logDir, mostRecentFile);

        try {
          const content = await fs.readFile(filePath, "utf-8");
          const lines = content.split("\n");

          // Parse JSON log entries
          for (const line of lines) {
            if (
              !line.trim() ||
              line.includes("BOZLY Session Log") ||
              line.includes("Started:") ||
              line.includes("═══════")
            ) {
              continue;
            }

            try {
              const entry = JSON.parse(line) as LogEntry;
              this.logs.push(entry);
            } catch {
              // Skip non-JSON lines
            }
          }

          // Keep only last ~100 lines
          this.logs = this.logs.slice(-this.maxLines);
        } catch {
          this.logs = [];
        }
      }

      this.applyFilter();
    } catch (error) {
      this.logs = [];
      this.applyFilter();
    }
  }

  private applyFilter(): void {
    if (this.filterLevel === "ALL") {
      this.filteredLogs = [...this.logs];
    } else {
      this.filteredLogs = this.logs.filter((log) => log.level === this.filterLevel);
    }
  }

  private renderHeader(): string {
    const { bold, cyan, gray, reset } = getColorContext();
    return `
${bold}${cyan}Recent Logs${reset}
${cyan}───────────────────────────────────────────────────────────${reset}
${gray}Location: ${this.logDir}${reset}
${gray}Total Logs: ${this.logs.length} | Filtered: ${this.filteredLogs.length}${reset}

`;
  }

  private renderFilterStatus(): string {
    const { bold, cyan, green, gray, reset } = getColorContext();

    const filterButtons = [
      { label: "a", text: "ALL", active: this.filterLevel === "ALL" },
      { label: "i", text: "INFO", active: this.filterLevel === "INFO" },
      { label: "t", text: "TRACE", active: this.filterLevel === "DEBUG" },
      { label: "x", text: "ERROR", active: this.filterLevel === "ERROR" },
    ];

    let filterLine = `${bold}${cyan}Filters:${reset} `;
    for (const btn of filterButtons) {
      const color = btn.active ? green : gray;
      filterLine += `${color}[${btn.label}]${btn.text}${reset} `;
    }

    return `${filterLine}
${cyan}───────────────────────────────────────────────────────────${reset}
`;
  }

  private renderLogs(): string {
    const { cyan, green, yellow, red, gray, reset } = getColorContext();

    if (this.filteredLogs.length === 0) {
      return `${yellow}No logs found for filter: ${this.filterLevel}${reset}\n`;
    }

    let content = "";

    for (const log of this.filteredLogs) {
      // Color by level
      let levelColor = cyan;
      if (log.level === "ERROR") {
        levelColor = red;
      } else if (log.level === "WARN") {
        levelColor = yellow;
      } else if (log.level === "INFO") {
        levelColor = green;
      } else if (log.level === "DEBUG") {
        levelColor = gray;
      }

      // Format timestamp
      const timestamp = new Date(log.timestamp).toLocaleTimeString();

      // Format log entry
      content += `${levelColor}[${log.level}]${reset} ${gray}${timestamp}${reset} ${log.message}\n`;

      // Add file/line info if available
      if (log.file ?? log.function) {
        content += `  ${gray}at ${log.file ?? "?"}${log.function ? `:${log.function}` : ""}${log.line ? `:${log.line}` : ""}${reset}\n`;
      }

      // Add context if available
      if (log.context && Object.keys(log.context).length > 0) {
        content += `  ${gray}${JSON.stringify(log.context)}${reset}\n`;
      }

      // Add error if present
      if (log.error) {
        content += `  ${red}Error: ${log.error}${reset}\n`;
      }

      content += "\n";
    }

    return content;
  }
}
