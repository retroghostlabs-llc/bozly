import Table from "cli-table3";
import chalk from "chalk";

/**
 * Render a simple ASCII table with automatic column width calculation
 */
function renderSimpleTable(headers: string[], rows: Record<string, string | number>[]): string {
  if (rows.length === 0) {
    return "";
  }

  const colWidths = headers.map((h) =>
    Math.max(h.length, ...rows.map((r) => String((r as Record<string, unknown>)[h]).length))
  );

  const lines: string[] = [];

  // Top border
  lines.push("┌" + colWidths.map((w) => "─".repeat(w)).join("─┬─") + "┐");

  // Header row
  lines.push("│ " + headers.map((h, i) => h.padEnd(colWidths[i])).join(" │ ") + " │");

  // Middle separator
  lines.push("├" + colWidths.map((w) => "─".repeat(w)).join("─┼─") + "┤");

  // Data rows
  for (const row of rows) {
    const values = headers.map((h) => String((row as Record<string, unknown>)[h]));
    lines.push("│ " + values.map((v, i) => v.padEnd(colWidths[i])).join(" │ ") + " │");
  }

  // Bottom border
  lines.push("└" + colWidths.map((w) => "─".repeat(w)).join("─┴─") + "┘");

  return lines.join("\n");
}

/**
 * Format a list of nodes for display
 * Displays: Status (●/○) Name Path
 * Optional details: ID, Created, LastAccessed
 */
export function formatNodeTable(
  nodes: Array<{
    name: string;
    path: string;
    active?: boolean;
    id?: string;
    type?: string;
    created?: string;
    lastAccessed?: string;
  }>,
  options?: { showDetails?: boolean }
): string {
  const headers = ["Status", "Name", "Path"];
  const rows = nodes.map((node) => ({
    Status: node.active ? "●" : "○",
    Name: node.name,
    Path: node.path,
  }));

  if (options?.showDetails) {
    // Add detail columns
    headers.push("Type", "Created");
    rows.forEach((row, i) => {
      (row as Record<string, string>)["Type"] = nodes[i].type ?? "default";
      (row as Record<string, string>)["Created"] = nodes[i].created
        ? nodes[i].created.split("T")[0]
        : "—";
    });
  }

  return renderSimpleTable(headers, rows);
}

/**
 * Format session history for display
 * Displays: Date Time Command Status Score
 */
export function formatSessionTable(
  sessions: Array<{
    command: string;
    timestamp: string;
    status: "completed" | "failed" | "dry_run";
    relevanceScore?: number;
  }>
): string {
  const rows = sessions.map((session) => {
    const timestamp = new Date(session.timestamp);
    const dateStr = timestamp.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
    });
    const timeStr = timestamp.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      Date: dateStr,
      Time: timeStr,
      Command: session.command || "?",
      Status: formatStatusBadge(session.status),
      Score: session.relevanceScore ? (session.relevanceScore * 100).toFixed(0) + "%" : "—",
    };
  });

  const headers = ["Date", "Time", "Command", "Status", "Score"];
  return renderSimpleTable(headers, rows);
}

/**
 * Format statistics key-value pairs for display
 * Used for session stats, command counts, etc.
 */
export function formatStatsTable(stats: Record<string, string | number>): string {
  const rows = Object.entries(stats).map(([key, value]) => ({
    Key: key,
    Value: String(value),
  }));

  const headers = ["Key", "Value"];
  return renderSimpleTable(headers, rows);
}

/**
 * Format search results table
 * Displays session/command search results with columns and scores
 */
export function formatSearchResultsTable(
  results: Array<{
    type: "session" | "command" | "memory";
    command?: string;
    node: string;
    date?: string;
    time?: string;
    status?: string;
    name?: string;
    source?: string;
    summary?: string;
    score: number;
  }>,
  limit: number = 10
): string {
  const sessionResults = results.filter((r) => r.type === "session").slice(0, limit);
  const commandResults = results.filter((r) => r.type === "command").slice(0, limit);
  const memoryResults = results.filter((r) => r.type === "memory").slice(0, limit);

  const output: string[] = [];

  // Display sessions
  if (sessionResults.length > 0) {
    const sessionRows = sessionResults.map((r) => ({
      Command: r.command ?? "?",
      Node: r.node,
      Date: r.date ?? "?",
      Time: r.time ?? "?",
      Status: r.status ?? "?",
      Score: (r.score * 100).toFixed(0) + "%",
    }));

    output.push(chalk.bold(`Sessions (${sessionResults.length})`));
    output.push(
      renderSimpleTable(["Command", "Node", "Date", "Time", "Status", "Score"], sessionRows)
    );
    output.push("");
  }

  // Display commands
  if (commandResults.length > 0) {
    const commandRows = commandResults.map((r) => ({
      Name: r.name ?? "?",
      Source: r.source ?? "builtin",
      Node: r.node,
      Score: (r.score * 100).toFixed(0) + "%",
    }));

    output.push(chalk.bold(`Commands (${commandResults.length})`));
    output.push(renderSimpleTable(["Name", "Source", "Node", "Score"], commandRows));
    output.push("");
  }

  // Display memories
  if (memoryResults.length > 0) {
    const memoryRows = memoryResults.map((r) => ({
      Summary: (r.summary ?? "").substring(0, 60),
      Node: r.node,
      Score: (r.score * 100).toFixed(0) + "%",
    }));

    output.push(chalk.bold(`Memories (${memoryResults.length})`));
    output.push(renderSimpleTable(["Summary", "Node", "Score"], memoryRows));
    output.push("");
  }

  return output.join("\n");
}

/**
 * Format a key-value pairs table (useful for status displays)
 */
export function formatKeyValue(pairs: Record<string, string | number | boolean>): string {
  const rows = Object.entries(pairs).map(([key, value]) => ({
    Key: key,
    Value: String(value),
  }));

  const headers = ["Key", "Value"];
  return renderSimpleTable(headers, rows);
}

/**
 * Format session status with color and symbol
 */
function formatStatusBadge(status: string): string {
  switch (status) {
    case "completed":
      return chalk.green("✓ completed");
    case "failed":
      return chalk.red("✗ failed");
    case "dry_run":
      return chalk.yellow("• dry_run");
    default:
      return status;
  }
}

/**
 * Create a cli-table3 instance with standard styling
 * Useful for more complex table formatting when needed
 */
export function createTable(options?: {
  headers?: string[];
  colWidths?: number[];
  style?: "compact" | "default" | "markdown";
}): Table.Table {
  const style = options?.style ?? "default";

  const styleConfig: Record<string, Record<string, string>> = {
    compact: {
      top: "─",
      "top-mid": "┬",
      "top-left": "┌",
      "top-right": "┐",
      bottom: "─",
      "bottom-mid": "┴",
      "bottom-left": "└",
      "bottom-right": "┘",
      left: "│",
      "left-mid": "├",
      mid: "─",
      "mid-mid": "┼",
      right: "│",
      "right-mid": "┤",
      middle: "│",
    },
    default: {
      top: "─",
      "top-mid": "┬",
      "top-left": "┌",
      "top-right": "┐",
      bottom: "─",
      "bottom-mid": "┴",
      "bottom-left": "└",
      "bottom-right": "┘",
      left: "│",
      "left-mid": "├",
      mid: "─",
      "mid-mid": "┼",
      right: "│",
      "right-mid": "┤",
      middle: "│",
    },
    markdown: {
      top: "",
      "top-mid": "",
      "top-left": "",
      "top-right": "",
      bottom: "",
      "bottom-mid": "",
      "bottom-left": "",
      "bottom-right": "",
      left: "|",
      "left-mid": "|",
      mid: "-",
      "mid-mid": "|",
      right: "|",
      "right-mid": "|",
      middle: "|",
    },
  };

  return new Table({
    head: options?.headers?.map((h) => chalk.cyan.bold(h)) ?? [],
    colWidths: options?.colWidths,
    style: styleConfig[style],
    wordWrap: true,
  });
}
