import gradient from "gradient-string";
import chalk from "chalk";
import { theme, isFancyTerminal } from "./theme.js";

/**
 * ASCII art banner for BOZLY
 * Displayed on `bozly` (no args) and `bozly --help`
 */
const BANNER_ASCII = `
 ____   ___ ________   __
| __ ) / _ \\__  / | \\ / /
|  _ \\| | | |/ /| |  V /
| |_) | |_| / /_| |__| |
|____/ \\___/____|____|_|
`;

const BANNER_SIMPLE = `
╔═════════════════════════════════════════╗
║   BOZLY — Build. Organize. Link. Yield. ║
╚═════════════════════════════════════════╝
`;

/**
 * Render the BOZLY banner with gradient colors
 */
export function renderBanner(): string {
  if (!isFancyTerminal()) {
    // Simple fallback for dumb terminals
    return BANNER_SIMPLE;
  }

  // Create gradient from theme colors
  const bozlyGradient = gradient(theme.bannerGradient);

  const banner = bozlyGradient(BANNER_ASCII);
  const tagline = chalk.dim("  Build. Organize. Link. Yield.\n");

  return banner + tagline;
}

/**
 * Render banner with version info
 */
export function renderBannerWithVersion(version: string): string {
  const banner = renderBanner();
  const versionLine = chalk.dim(`  v${version}\n`);
  return banner + versionLine;
}
