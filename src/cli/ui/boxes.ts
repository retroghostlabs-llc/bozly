import boxen from "boxen";
import chalk from "chalk";
import { isFancyTerminal } from "./theme.js";

/**
 * Display a success message in a colored box
 */
export function successBox(message: string, details?: Record<string, string | number>): string {
  if (!isFancyTerminal()) {
    // Simple fallback for dumb terminals
    let output = "✓ " + message;
    if (details) {
      output += "\n";
      output += Object.entries(details)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join("\n");
    }
    return output;
  }

  const content = formatBoxContent(message, details, "success");
  return boxen(content, {
    borderColor: "green",
    borderStyle: "round",
    padding: 1,
    margin: 1,
  });
}

/**
 * Display an error message in a colored box
 */
export function errorBox(message: string, details?: Record<string, string | number>): string {
  if (!isFancyTerminal()) {
    // Simple fallback for dumb terminals
    let output = "✗ " + message;
    if (details) {
      output += "\n";
      output += Object.entries(details)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join("\n");
    }
    return output;
  }

  const content = formatBoxContent(message, details, "error");
  return boxen(content, {
    borderColor: "red",
    borderStyle: "round",
    padding: 1,
    margin: 1,
  });
}

/**
 * Display a warning message in a colored box
 */
export function warningBox(message: string, details?: Record<string, string | number>): string {
  if (!isFancyTerminal()) {
    // Simple fallback for dumb terminals
    let output = "⚠ " + message;
    if (details) {
      output += "\n";
      output += Object.entries(details)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join("\n");
    }
    return output;
  }

  const content = formatBoxContent(message, details, "warning");
  return boxen(content, {
    borderColor: "yellow",
    borderStyle: "round",
    padding: 1,
    margin: 1,
  });
}

/**
 * Display an info message in a colored box
 */
export function infoBox(message: string, details?: Record<string, string | number>): string {
  if (!isFancyTerminal()) {
    // Simple fallback for dumb terminals
    let output = "ℹ " + message;
    if (details) {
      output += "\n";
      output += Object.entries(details)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join("\n");
    }
    return output;
  }

  const content = formatBoxContent(message, details, "info");
  return boxen(content, {
    borderColor: "cyan",
    borderStyle: "round",
    padding: 1,
    margin: 1,
  });
}

/**
 * Format the content inside a box with message and optional details
 */
function formatBoxContent(
  message: string,
  details?: Record<string, string | number>,
  type: "success" | "error" | "warning" | "info" = "info"
): string {
  const lines: string[] = [];

  // Add main message with color
  switch (type) {
    case "success":
      lines.push(chalk.green.bold("✓ " + message));
      break;
    case "error":
      lines.push(chalk.red.bold("✗ " + message));
      break;
    case "warning":
      lines.push(chalk.yellow.bold("⚠ " + message));
      break;
    case "info":
      lines.push(chalk.cyan.bold("ℹ " + message));
      break;
  }

  // Add details if provided
  if (details && Object.keys(details).length > 0) {
    lines.push("");
    const maxKeyLength = Math.max(...Object.keys(details).map((k) => k.length));
    for (const [key, value] of Object.entries(details)) {
      const paddedKey = key.padEnd(maxKeyLength);
      lines.push(chalk.dim(`  ${paddedKey}  ${value}`));
    }
  }

  return lines.join("\n");
}

/**
 * Display a key-value pair box (useful for status, config displays)
 */
export function keyValueBox(title: string, pairs: Record<string, string | number>): string {
  if (!isFancyTerminal()) {
    // Simple fallback
    let output = title;
    output += "\n";
    output += Object.entries(pairs)
      .map(([key, value]) => `  ${key}: ${value}`)
      .join("\n");
    return output;
  }

  const lines = [chalk.cyan.bold(title)];
  const maxKeyLength = Math.max(...Object.keys(pairs).map((k) => k.length));
  for (const [key, value] of Object.entries(pairs)) {
    const paddedKey = key.padEnd(maxKeyLength);
    lines.push(chalk.dim(`  ${paddedKey}  ${value}`));
  }

  return boxen(lines.join("\n"), {
    borderColor: "cyan",
    borderStyle: "round",
    padding: 1,
    margin: 1,
  });
}

/**
 * Format a list of items with optional status indicators
 * Returns plain text list, suitable for piping or logging
 */
export function formatList(
  items: Array<{
    label: string;
    status?: "success" | "error" | "warning" | "info";
    details?: string;
  }>
): string {
  const lines = items.map((item) => {
    let line = "";
    if (item.status) {
      switch (item.status) {
        case "success":
          line = chalk.green("✓");
          break;
        case "error":
          line = chalk.red("✗");
          break;
        case "warning":
          line = chalk.yellow("⚠");
          break;
        case "info":
          line = chalk.cyan("ℹ");
          break;
      }
      line += " " + item.label;
    } else {
      line = "  " + item.label;
    }

    if (item.details) {
      line += chalk.dim(` (${item.details})`);
    }

    return line;
  });

  return lines.join("\n");
}

/**
 * Create a titled section with content
 * Returns a simple section format suitable for all terminals
 */
export function formatSection(title: string, content: string): string {
  const lines = [chalk.bold(title)];
  lines.push(chalk.dim("─".repeat(Math.min(title.length + 10, 80))));
  lines.push("");
  lines.push(content);
  lines.push("");
  return lines.join("\n");
}
