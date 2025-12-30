import chalk from "chalk";

/**
 * BOZLY CLI color theme
 * Consistent colors across all commands with graceful degradation
 *
 * Brand colors match the web UI:
 * - Tan (#D4A574) - Primary brand color for headings/text
 * - Cyan (#00B4D8) - Accent color for highlights/actions
 * - Background (#1a1d23) - Dark background
 * - Charcoal (#2a2d35) - Card/element backgrounds
 */
export const theme = {
  // Brand colors (matching web UI CSS variables)
  primary: chalk.hex("#D4A574"), // Tan - main brand color (--bozly-tan)
  secondary: chalk.hex("#E8C99B"), // Tan-light - secondary accent (--bozly-tan-light)
  accent: chalk.hex("#00B4D8"), // Cyan - highlights (--bozly-cyan)
  accentLight: chalk.hex("#4DC3E8"), // Cyan-light (--bozly-cyan-light)

  // Semantic colors
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.hex("#00B4D8"), // Use brand cyan for info

  // Text styles
  muted: chalk.dim,
  bold: chalk.bold,
  highlight: chalk.hex("#00B4D8").bold, // Cyan bold for highlights

  // Gradient palette (for banner) - Tan to Cyan
  bannerGradient: ["#D4A574", "#E8C99B", "#4DC3E8", "#00B4D8"],

  // Table styles
  tableHead: chalk.bold.hex("#00B4D8"),
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
