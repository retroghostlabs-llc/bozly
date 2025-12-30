/**
 * Color utilities for TUI
 * Respects NO_COLOR environment variable and uses terminal-safe named colors
 * See: https://no-color.org/ and https://force-color.org/
 */

/**
 * Check if colors should be disabled
 * Respects NO_COLOR standard: https://no-color.org/
 */
export function shouldDisableColors(): boolean {
  // NO_COLOR is set and not empty
  return process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "";
}

/**
 * Check if colors should be forced
 * Respects FORCE_COLOR standard: https://force-color.org/
 */
export function shouldForceColors(): boolean {
  return process.env.FORCE_COLOR !== undefined && process.env.FORCE_COLOR !== "0";
}

/**
 * Determine if colors should be active
 */
export function shouldUseColors(): boolean {
  if (shouldDisableColors()) {
    return false;
  }
  if (shouldForceColors()) {
    return true;
  }
  // Default: use colors (terminals support them by default)
  return true;
}

/**
 * Terminal-safe color codes
 * Uses ANSI 256-color palette instead of hardcoded RGB
 * This allows terminal color schemes to be applied
 */
export const colors = {
  // Reset
  reset: "\x1b[0m",

  // Styles
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  // Standard ANSI colors (16-color palette) - respects terminal theme
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Bright colors (respects terminal theme)
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",
};

/**
 * Create colored text, respecting NO_COLOR
 */
export function colorize(text: string, colorCode: string): string {
  if (!shouldUseColors()) {
    return text;
  }
  return `${colorCode}${text}${colors.reset}`;
}

/**
 * Create styled text (bold), respecting NO_COLOR
 */
export function bold(text: string): string {
  if (!shouldUseColors()) {
    return text;
  }
  return `${colors.bold}${text}${colors.reset}`;
}

/**
 * Get render context for home screen
 * Returns either styled colors or empty strings based on NO_COLOR
 */
export function getColorContext() {
  if (!shouldUseColors()) {
    return {
      bold: "",
      tan: "",
      cyan: "",
      gray: "",
      green: "",
      yellow: "",
      red: "",
      reset: "",
    };
  }

  return {
    bold: colors.bold,
    tan: colors.cyan, // Use cyan as tan equivalent (respects terminal theme)
    cyan: colors.cyan,
    gray: colors.gray,
    green: colors.green,
    yellow: colors.yellow,
    red: colors.red,
    reset: colors.reset,
  };
}
