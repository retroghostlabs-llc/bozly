import chalk from "chalk";
import { isFancyTerminal } from "./theme.js";

/**
 * Display a success message in a colored box
 */
export function successBox(message: string, details?: Record<string, string | number>): string {
  const green = "\x1b[32m";
  const gray = "\x1b[90m";
  const reset = "\x1b[0m";

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

  // Build modern-style box with ANSI codes
  const lines: string[] = [];
  const width = 56;
  const border = "─".repeat(width);

  lines.push(`${green}╭${border}╮${reset}`);
  lines.push(`${green}│${reset}${" ".repeat(width)}${green}│${reset}`);
  lines.push(
    `${green}│${reset}  ${chalk.green("✓")} ${message}${" ".repeat(Math.max(0, width - 4 - message.length))}${green}│${reset}`
  );

  if (details && Object.keys(details).length > 0) {
    lines.push(`${green}│${reset}${" ".repeat(width)}${green}│${reset}`);
    for (const [key, value] of Object.entries(details)) {
      const hint = `${key}  ${value}`;
      const padding = width - hint.length - 4;
      lines.push(
        `${green}│${reset}  ${gray}${hint}${reset}${" ".repeat(Math.max(0, padding))}${green}│${reset}`
      );
    }
  }

  lines.push(`${green}│${reset}${" ".repeat(width)}${green}│${reset}`);
  lines.push(`${green}╰${border}╯${reset}`);

  return "\n" + lines.join("\n") + "\n";
}

/**
 * Display an error message in a colored box
 */
export function errorBox(message: string, details?: Record<string, string | number>): string {
  const red = "\x1b[31m";
  const gray = "\x1b[90m";
  const reset = "\x1b[0m";

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

  // Build modern-style box with ANSI codes
  const lines: string[] = [];
  const width = 56;
  const border = "─".repeat(width);

  lines.push(`${red}╭${border}╮${reset}`);
  lines.push(`${red}│${reset}${" ".repeat(width)}${red}│${reset}`);
  lines.push(
    `${red}│${reset}  ${chalk.red("✗")} ${message}${" ".repeat(Math.max(0, width - 4 - message.length))}${red}│${reset}`
  );

  if (details && Object.keys(details).length > 0) {
    lines.push(`${red}│${reset}${" ".repeat(width)}${red}│${reset}`);
    for (const [key, value] of Object.entries(details)) {
      const hint = `${key}  ${value}`;
      const padding = width - hint.length - 4;
      lines.push(
        `${red}│${reset}  ${gray}${hint}${reset}${" ".repeat(Math.max(0, padding))}${red}│${reset}`
      );
    }
  }

  lines.push(`${red}│${reset}${" ".repeat(width)}${red}│${reset}`);
  lines.push(`${red}╰${border}╯${reset}`);

  return "\n" + lines.join("\n") + "\n";
}

/**
 * Display a warning message in a colored box
 */
export function warningBox(message: string, details?: Record<string, string | number>): string {
  const yellow = "\x1b[33m";
  const gray = "\x1b[90m";
  const reset = "\x1b[0m";

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

  // Build modern-style box with ANSI codes
  const lines: string[] = [];
  const width = 56;
  const border = "─".repeat(width);

  lines.push(`${yellow}╭${border}╮${reset}`);
  lines.push(`${yellow}│${reset}${" ".repeat(width)}${yellow}│${reset}`);
  lines.push(
    `${yellow}│${reset}  ${chalk.yellow("⚠")} ${message}${" ".repeat(Math.max(0, width - 4 - message.length))}${yellow}│${reset}`
  );

  if (details && Object.keys(details).length > 0) {
    lines.push(`${yellow}│${reset}${" ".repeat(width)}${yellow}│${reset}`);
    for (const [key, value] of Object.entries(details)) {
      const hint = `${key}  ${value}`;
      const padding = width - hint.length - 4;
      lines.push(
        `${yellow}│${reset}  ${gray}${hint}${reset}${" ".repeat(Math.max(0, padding))}${yellow}│${reset}`
      );
    }
  }

  lines.push(`${yellow}│${reset}${" ".repeat(width)}${yellow}│${reset}`);
  lines.push(`${yellow}╰${border}╯${reset}`);

  return "\n" + lines.join("\n") + "\n";
}

/**
 * Display an info message in a colored box
 */
export function infoBox(message: string, details?: Record<string, string | number>): string {
  const cyan = "\x1b[36m";
  const gray = "\x1b[90m";
  const reset = "\x1b[0m";

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

  // Build modern-style box with ANSI codes
  const lines: string[] = [];
  const width = 56;
  const border = "─".repeat(width);

  lines.push(`${cyan}╭${border}╮${reset}`);
  lines.push(`${cyan}│${reset}${" ".repeat(width)}${cyan}│${reset}`);
  lines.push(
    `${cyan}│${reset}  ${chalk.cyan("ℹ")} ${message}${" ".repeat(Math.max(0, width - 4 - message.length))}${cyan}│${reset}`
  );

  if (details && Object.keys(details).length > 0) {
    lines.push(`${cyan}│${reset}${" ".repeat(width)}${cyan}│${reset}`);
    for (const [key, value] of Object.entries(details)) {
      const hint = `${key}  ${value}`;
      const padding = width - hint.length - 4;
      lines.push(
        `${cyan}│${reset}  ${gray}${hint}${reset}${" ".repeat(Math.max(0, padding))}${cyan}│${reset}`
      );
    }
  }

  lines.push(`${cyan}│${reset}${" ".repeat(width)}${cyan}│${reset}`);
  lines.push(`${cyan}╰${border}╯${reset}`);

  return "\n" + lines.join("\n") + "\n";
}

/**
 * Display a key-value pair box (useful for status, config displays)
 */
export function keyValueBox(title: string, pairs: Record<string, string | number>): string {
  const cyan = "\x1b[36m";
  const gray = "\x1b[90m";
  const reset = "\x1b[0m";

  if (!isFancyTerminal()) {
    // Simple fallback
    let output = title;
    output += "\n";
    output += Object.entries(pairs)
      .map(([key, value]) => `  ${key}: ${value}`)
      .join("\n");
    return output;
  }

  // Build modern-style box with ANSI codes
  const lines: string[] = [];
  const width = 56;
  const border = "─".repeat(width);

  lines.push(`${cyan}╭${border}╮${reset}`);
  lines.push(`${cyan}│${reset}${" ".repeat(width)}${cyan}│${reset}`);
  lines.push(
    `${cyan}│${reset}  ${chalk.cyan.bold(title)}${" ".repeat(Math.max(0, width - 4 - title.length))}${cyan}│${reset}`
  );

  const maxKeyLength = Math.max(...Object.keys(pairs).map((k) => k.length));
  for (const [key, value] of Object.entries(pairs)) {
    const paddedKey = key.padEnd(maxKeyLength);
    const content = `${paddedKey}  ${value}`;
    const padding = width - content.length - 4;
    lines.push(
      `${cyan}│${reset}  ${gray}${content}${reset}${" ".repeat(Math.max(0, padding))}${cyan}│${reset}`
    );
  }

  lines.push(`${cyan}│${reset}${" ".repeat(width)}${cyan}│${reset}`);
  lines.push(`${cyan}╰${border}╯${reset}`);

  return "\n" + lines.join("\n") + "\n";
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
