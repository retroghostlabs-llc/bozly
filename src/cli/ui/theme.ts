import chalk from "chalk";

/**
 * BOZLY CLI color theme
 * Consistent colors across all commands with graceful degradation
 */
export const theme = {
  // Brand colors
  primary: chalk.hex("#6366f1"), // Indigo - main brand color
  secondary: chalk.hex("#8b5cf6"), // Purple - secondary accent
  accent: chalk.hex("#06b6d4"), // Cyan - highlights

  // Semantic colors
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.cyan,

  // Text styles
  muted: chalk.dim,
  bold: chalk.bold,
  highlight: chalk.cyan.bold,

  // Gradient palette (for banner)
  bannerGradient: ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef"],

  // Table styles
  tableHead: chalk.bold.cyan,
  tableBorder: chalk.dim,
};

/**
 * Check if we should use colors
 * Respects --no-color flag and NO_COLOR env var
 */
export function shouldUseColor(): boolean {
  if (process.env.NO_COLOR) {
    return false;
  }
  if (process.env.FORCE_COLOR) {
    return true;
  }
  return process.stdout.isTTY ?? false;
}

/**
 * Check if we're in a "fancy" terminal (supports Unicode, gradients, colors)
 */
export function isFancyTerminal(): boolean {
  if (!shouldUseColor()) {
    return false;
  }
  if (process.env.TERM === "dumb") {
    return false;
  }
  if (process.env.CI) {
    return false;
  }
  return true;
}
