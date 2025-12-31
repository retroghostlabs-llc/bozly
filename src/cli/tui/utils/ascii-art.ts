import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Load ASCII art from static files
 * Supports loading from both dist/ and src/ directories
 */
export function loadAsciiArt(filename: string): string | null {
  try {
    // Try multiple possible locations
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const possiblePaths = [
      // Built/dist location
      resolve(__dirname, "../../../server/static/images", filename),
      // Development location (src structure)
      resolve(__dirname, "../../../../server/static/images", filename),
      // Package installation location
      resolve(process.cwd(), "node_modules/bozly/dist/server/static/images", filename),
      // Global installation
      resolve(process.env.HOME || "", ".bozly/static/images", filename),
    ];

    for (const path of possiblePaths) {
      try {
        const content = readFileSync(path, "utf-8");
        return content.trimEnd();
      } catch {
        // Continue to next path
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get the BOZLY ASCII art logo
 * Falls back to hardcoded version if file cannot be loaded
 */
export function getBozlyAsciiArt(): string {
  const asciiArt = loadAsciiArt("ascii-art.txt");

  if (asciiArt) {
    return asciiArt;
  }

  // Fallback to hardcoded version (box-drawing characters)
  return `
        ██████╗  ██████╗  ███████╗ ██╗     ██╗   ██╗
        ██╔══██╗ ██╔═══██╗ ╚════██║ ██║     ╚██╗ ██╔╝
        ██████╔╝ ██║   ██║  ███╔═╝  ██║      ╚████╔╝
        ██╔══██╗ ██║   ██║ ██╔══╝   ██║       ╚██╔╝
        ██████╔╝ ╚██████╔╝ ███████╗ ███████╗   ██║
        ╚═════╝   ╚═════╝  ╚══════╝ ╚══════╝   ╚═╝   `;
}
