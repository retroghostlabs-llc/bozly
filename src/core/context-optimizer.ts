/**
 * Context Optimizer Module
 *
 * Analyzes context.md files and suggests optimizations to keep them under 25KB.
 * Extracts large sections (>2KB) to dedicated guide files in .bozly/guides/.
 *
 * Key features:
 * - Analyze context.md size and identify large sections
 * - Extract sections to .bozly/guides/ as separate markdown files
 * - Update context.md with references to extracted guides
 * - Keep context.md <25KB while preserving all information
 * - Generate suggestions without modifying files
 * - Apply optimizations with --apply flag
 *
 * Usage:
 *   import { analyzeContext, extractLargeSections } from './context-optimizer.js';
 *   const suggestions = await analyzeContext(vaultPath);
 *   console.log(suggestions);
 *   await extractLargeSections(vaultPath); // Apply optimizations
 *
 * @module core/context-optimizer
 */

import fs from "fs/promises";
import path from "path";
import { logger } from "./logger.js";

/**
 * A section identified for optimization
 */
export interface OptimizationSuggestion {
  /** Section title/heading */
  section: string;
  /** Size of section in bytes */
  size: number;
  /** Size in KB for display */
  sizeKb: string;
  /** Recommendation for extraction */
  recommendation: string;
  /** Estimated new context size after extraction */
  estimatedSizeAfter: number;
}

/**
 * Analysis results for context.md
 */
export interface ContextAnalysisResult {
  /** Current size of context.md in bytes */
  currentSize: number;
  /** Current size in KB */
  currentSizeKb: string;
  /** Whether context is within acceptable size (<25KB) */
  isOptimized: boolean;
  /** List of suggestions for optimization */
  suggestions: OptimizationSuggestion[];
  /** Total size that could be freed */
  potentialSavings: number;
  /** List of guide files that could be created */
  guideSuggestions: string[];
  /** Path to analyzed context.md */
  contextPath: string;
  /** Whether guides/ directory exists */
  guidesExist: boolean;
}

/**
 * Result of extracting sections to guides
 */
export interface ExtractionResult {
  /** Whether extraction was successful */
  success: boolean;
  /** Path to context.md after optimization */
  contextPath: string;
  /** List of guide files created */
  guidesCreated: string[];
  /** New context.md size */
  newSize: number;
  /** Size reduction in bytes */
  reduction: number;
  /** Number of references added to context.md */
  referencesAdded: number;
}

const CONTEXT_FILE = "context.md";
const GUIDES_DIR = "guides";
const SIZE_THRESHOLD_KB = 2; // Extract sections >2KB
const SIZE_THRESHOLD = SIZE_THRESHOLD_KB * 1024;
const OPTIMAL_SIZE_KB = 25;

/**
 * Parse markdown sections from content
 *
 * Identifies heading-delimited sections in markdown.
 * Returns array of {title, content, startLine, endLine}
 *
 * @param content - Markdown content to parse
 * @returns Array of section objects
 */
function parseMarkdownSections(
  content: string
): Array<{ title: string; content: string; startLine: number; endLine: number }> {
  const lines = content.split("\n");
  const sections: Array<{ title: string; content: string; startLine: number; endLine: number }> =
    [];
  let currentSection: { title: string; lines: string[]; startLine: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a heading (## or ###)
    if (line.startsWith("##") && !line.startsWith("###")) {
      // Save previous section
      if (currentSection) {
        sections.push({
          title: currentSection.title,
          content: currentSection.lines.join("\n"),
          startLine: currentSection.startLine,
          endLine: i - 1,
        });
      }

      // Start new section
      currentSection = {
        title: line.replace(/^#+\s*/, "").trim(),
        lines: [line],
        startLine: i,
      };
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections.push({
      title: currentSection.title,
      content: currentSection.lines.join("\n"),
      startLine: currentSection.startLine,
      endLine: lines.length - 1,
    });
  }

  return sections;
}

/**
 * Analyze context.md for optimization opportunities
 *
 * Checks file size and identifies sections larger than 2KB
 * that could be extracted to guide files.
 *
 * @param vaultPath - Path to vault root
 * @returns Analysis results with suggestions
 */
export async function analyzeContext(vaultPath: string): Promise<ContextAnalysisResult> {
  const bozlyPath = path.join(vaultPath, ".bozly");
  const contextPath = path.join(bozlyPath, CONTEXT_FILE);
  const guidesPath = path.join(bozlyPath, GUIDES_DIR);

  try {
    await logger.debug("Analyzing context.md", { contextPath });

    // Read context file
    const content = await fs.readFile(contextPath, "utf-8");
    const currentSize = Buffer.byteLength(content, "utf-8");

    // Parse sections
    const sections = parseMarkdownSections(content);
    const suggestions: OptimizationSuggestion[] = [];
    let potentialSavings = 0;

    // Analyze each section
    for (const section of sections) {
      const sectionSize = Buffer.byteLength(section.content, "utf-8");

      if (sectionSize > SIZE_THRESHOLD) {
        // Generate guide filename
        const guideName = section.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const estimatedAfter = currentSize - sectionSize + 150; // ~150 bytes for reference

        suggestions.push({
          section: section.title,
          size: sectionSize,
          sizeKb: `${(sectionSize / 1024).toFixed(1)} KB`,
          recommendation: `Extract "${section.title}" to guides/${guideName}.md`,
          estimatedSizeAfter: estimatedAfter,
        });

        potentialSavings += sectionSize - 150;
      }
    }

    // Check if guides directory exists
    let guidesExist = false;
    try {
      await fs.access(guidesPath);
      guidesExist = true;
    } catch {
      guidesExist = false;
    }

    const isOptimized = currentSize < OPTIMAL_SIZE_KB * 1024;

    const result: ContextAnalysisResult = {
      currentSize,
      currentSizeKb: `${(currentSize / 1024).toFixed(1)} KB`,
      isOptimized,
      suggestions,
      potentialSavings: Math.max(0, potentialSavings),
      guideSuggestions: suggestions.map((s) => s.recommendation),
      contextPath,
      guidesExist,
    };

    await logger.debug("Context analysis complete", {
      currentSize: result.currentSizeKb,
      isOptimized,
      suggestionsCount: suggestions.length,
    });

    return result;
  } catch (error) {
    await logger.error("Failed to analyze context", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Extract large sections from context.md to guide files
 *
 * Moves sections larger than 2KB to dedicated guide files in .bozly/guides/,
 * updating context.md with references.
 *
 * @param vaultPath - Path to vault root
 * @returns Extraction result with files created and size reduction
 */
export async function extractLargeSections(vaultPath: string): Promise<ExtractionResult> {
  const bozlyPath = path.join(vaultPath, ".bozly");
  const contextPath = path.join(bozlyPath, CONTEXT_FILE);
  const guidesPath = path.join(bozlyPath, GUIDES_DIR);

  try {
    await logger.debug("Starting context extraction", { vaultPath });

    // Create guides directory if it doesn't exist
    try {
      await fs.mkdir(guidesPath, { recursive: true });
    } catch (error) {
      await logger.debug("Guides directory already exists", { guidesPath });
    }

    // Read context
    const content = await fs.readFile(contextPath, "utf-8");
    const originalSize = Buffer.byteLength(content, "utf-8");
    const sections = parseMarkdownSections(content);

    // Extract sections
    const guidesCreated: string[] = [];
    const sectionsToKeep: string[] = [];
    let referencesAdded = 0;

    for (const section of sections) {
      const sectionSize = Buffer.byteLength(section.content, "utf-8");

      if (sectionSize > SIZE_THRESHOLD) {
        // Generate guide filename
        const guideName = section.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const guideFilePath = path.join(guidesPath, `${guideName}.md`);

        // Create guide file
        await fs.writeFile(guideFilePath, section.content, "utf-8");
        guidesCreated.push(`${guideName}.md`);

        // Add reference in context
        const reference = `See \`guides/${guideName}.md\` for detailed information.`;
        sectionsToKeep.push(`## ${section.title}\n\n${reference}`);
        referencesAdded++;

        await logger.debug("Extracted section to guide", {
          section: section.title,
          guide: `${guideName}.md`,
          size: sectionSize,
        });
      } else {
        // Keep section as-is
        sectionsToKeep.push(section.content);
      }
    }

    // Update context.md
    const newContent = sectionsToKeep.join("\n\n");
    await fs.writeFile(contextPath, newContent, "utf-8");

    const newSize = Buffer.byteLength(newContent, "utf-8");
    const reduction = originalSize - newSize;

    const result: ExtractionResult = {
      success: true,
      contextPath,
      guidesCreated,
      newSize,
      reduction,
      referencesAdded,
    };

    await logger.info("Context extraction complete", {
      originalSize: `${(originalSize / 1024).toFixed(1)} KB`,
      newSize: `${(newSize / 1024).toFixed(1)} KB`,
      reduction: `${(reduction / 1024).toFixed(1)} KB`,
      guidesCreated: guidesCreated.length,
      referencesAdded,
    });

    return result;
  } catch (error) {
    await logger.error("Failed to extract sections", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Format analysis results for display
 *
 * Returns human-readable output showing analysis and suggestions.
 *
 * @param analysis - Analysis result from analyzeContext()
 * @returns Formatted string for display
 */
export function formatAnalysisResults(analysis: ContextAnalysisResult): string {
  const lines: string[] = [];

  lines.push("\n📊 CONTEXT OPTIMIZATION ANALYSIS\n");
  lines.push(`Path: ${analysis.contextPath}`);
  lines.push(`Current Size: ${analysis.currentSizeKb}`);
  lines.push(`Status: ${analysis.isOptimized ? "✅ OPTIMIZED" : "⚠️ NEEDS OPTIMIZATION"}\n`);

  if (analysis.suggestions.length === 0) {
    lines.push("No sections found exceeding 2KB threshold.");
    lines.push("Your context.md is well-optimized! ✨\n");
  } else {
    lines.push(`Found ${analysis.suggestions.length} section(s) exceeding 2KB:\n`);

    for (const suggestion of analysis.suggestions) {
      lines.push(`📌 ${suggestion.section}`);
      lines.push(`   Size: ${suggestion.sizeKb}`);
      lines.push(`   → ${suggestion.recommendation}`);
      lines.push(`   Est. new size: ${(suggestion.estimatedSizeAfter / 1024).toFixed(1)} KB\n`);
    }

    lines.push("═".repeat(50));
    lines.push(`Total potential savings: ${(analysis.potentialSavings / 1024).toFixed(1)} KB\n`);
    lines.push("💡 Run with --apply to extract these sections to guides/\n");
  }

  lines.push("═".repeat(50) + "\n");

  return lines.join("\n");
}

/**
 * Format extraction results for display
 *
 * Returns human-readable output showing what was extracted.
 *
 * @param result - Extraction result from extractLargeSections()
 * @returns Formatted string for display
 */
export function formatExtractionResults(result: ExtractionResult): string {
  const lines: string[] = [];

  lines.push("\n✨ CONTEXT OPTIMIZATION COMPLETE\n");
  lines.push(`Guides created: ${result.guidesCreated.length}`);
  lines.push(`Size reduction: ${(result.reduction / 1024).toFixed(1)} KB`);
  lines.push(`New context size: ${(result.newSize / 1024).toFixed(1)} KB\n`);

  if (result.guidesCreated.length > 0) {
    lines.push("📁 Guides created in .bozly/guides/:");
    for (const guide of result.guidesCreated) {
      lines.push(`   • ${guide}`);
    }
    lines.push("");
  }

  lines.push("═".repeat(50));
  lines.push(`✅ ${result.referencesAdded} reference(s) added to context.md\n`);

  return lines.join("\n");
}
