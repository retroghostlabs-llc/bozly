import figures from "figures";
import chalk from "chalk";
import { shouldUseColor } from "./theme.js";

/**
 * Cross-platform terminal symbols
 * Falls back gracefully on Windows/dumb terminals
 */
export const symbols = {
  // Status indicators
  success: figures.tick, // ✓ or √
  error: figures.cross, // ✗ or ×
  warning: figures.warning, // ⚠ or ‼
  info: figures.info, // ℹ or i

  // List markers
  bullet: figures.bullet, // • or *
  pointer: figures.pointer, // ❯ or >
  arrowRight: figures.arrowRight, // → or ->

  // Status dots
  active: figures.circleFilled, // ● or (*)
  inactive: figures.circle, // ○ or ( )

  // Misc
  ellipsis: figures.ellipsis, // … or ...
  line: figures.line, // ─ or -
};

/**
 * Get a colored symbol for status
 */
export function statusSymbol(
  status: "success" | "error" | "warning" | "info" | "active" | "inactive"
): string {
  if (!shouldUseColor()) {
    return symbols[status] || "";
  }

  switch (status) {
    case "success":
      return chalk.green(symbols.success);
    case "error":
      return chalk.red(symbols.error);
    case "warning":
      return chalk.yellow(symbols.warning);
    case "info":
      return chalk.cyan(symbols.info);
    case "active":
      return chalk.green(symbols.active);
    case "inactive":
      return chalk.gray(symbols.inactive);
  }
}
