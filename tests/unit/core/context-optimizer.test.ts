import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs/promises";
import path from "path";
import os from "os";
import {
  analyzeContext,
  extractLargeSections,
  formatAnalysisResults,
  formatExtractionResults,
} from "../../../src/core/context-optimizer.js";

describe("Context Optimizer", () => {
  let tempDir: string;
  let vaultPath: string;
  let bozlyPath: string;

  beforeEach(async () => {
    // Create temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bozly-test-"));
    vaultPath = tempDir;
    bozlyPath = path.join(vaultPath, ".bozly");
    await fs.mkdir(bozlyPath);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("analyzeContext", () => {
    it("should analyze context.md with no large sections", async () => {
      const contextContent = `# My Vault

## Introduction
This is a small section.

## Another Section
Just a few lines here.`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await analyzeContext(vaultPath);

      expect(result.contextPath).toBe(contextPath);
      expect(result.isOptimized).toBe(true);
      expect(result.suggestions.length).toBe(0);
      expect(result.potentialSavings).toBe(0);
    });

    it("should identify sections larger than 2KB", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## Large Section
${largeContent}

## Small Section
Short text`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await analyzeContext(vaultPath);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].section).toBe("Large Section");
      expect(result.suggestions[0].size).toBeGreaterThan(2000);
      expect(result.potentialSavings).toBeGreaterThan(0);
    });

    it("should report context size correctly", async () => {
      const contextContent = `# My Vault

## Section
Some content here.`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await analyzeContext(vaultPath);

      expect(result.currentSize).toBeGreaterThan(0);
      expect(result.currentSizeKb).toMatch(/\d+\.\d KB/);
    });

    it("should handle missing context.md file", async () => {
      try {
        await analyzeContext(vaultPath);
        expect.fail("Should throw error");
      } catch (error) {
        expect(error instanceof Error).toBe(true);
      }
    });

    it("should generate correct guide suggestions", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## My Custom Section
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await analyzeContext(vaultPath);

      expect(result.guideSuggestions.length).toBeGreaterThan(0);
      expect(result.guideSuggestions[0]).toContain("guides/");
      expect(result.guideSuggestions[0]).toContain("my-custom-section.md");
    });

    it("should detect guides directory existence", async () => {
      const contextContent = "# My Vault\n\n## Section\nSmall section.";
      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      // Test without guides directory
      let result = await analyzeContext(vaultPath);
      expect(result.guidesExist).toBe(false);

      // Create guides directory
      await fs.mkdir(path.join(bozlyPath, "guides"));

      // Test with guides directory
      result = await analyzeContext(vaultPath);
      expect(result.guidesExist).toBe(true);
    });

    it("should estimate size after extraction", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## Large Section
${largeContent}

## Small
Short`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await analyzeContext(vaultPath);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].estimatedSizeAfter).toBeLessThan(
        result.currentSize
      );
    });

    it("should handle multiple large sections", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## Section One
${largeContent}

## Section Two
${largeContent}

## Small
Short`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await analyzeContext(vaultPath);

      expect(result.suggestions.length).toBe(2);
      expect(result.potentialSavings).toBeGreaterThan(3000);
    });

    it("should calculate potential savings correctly", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## Large
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await analyzeContext(vaultPath);

      // Savings should be size of section minus ~150 bytes for reference
      expect(result.potentialSavings).toBeGreaterThan(2500);
      expect(result.potentialSavings).toBeLessThan(3000);
    });
  });

  describe("extractLargeSections", () => {
    it("should extract large sections to guide files", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## Large Content
${largeContent}

## Small
Short`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await extractLargeSections(vaultPath);

      expect(result.success).toBe(true);
      expect(result.guidesCreated.length).toBeGreaterThan(0);
      expect(result.guidesCreated[0]).toContain(".md");
    });

    it("should create guides directory if not exists", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## Content
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const guidesPath = path.join(bozlyPath, "guides");

      // Verify guides directory doesn't exist
      try {
        await fs.access(guidesPath);
        expect.fail("Guides directory should not exist yet");
      } catch {
        // Expected
      }

      await extractLargeSections(vaultPath);

      // Verify guides directory was created
      try {
        await fs.access(guidesPath);
      } catch {
        expect.fail("Guides directory should have been created");
      }
    });

    it("should add references to context.md", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## My Large Section
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      await extractLargeSections(vaultPath);

      const newContent = await fs.readFile(contextPath, "utf-8");

      expect(newContent).toContain("guides/");
      expect(newContent).toContain("See");
      expect(newContent).toContain("detailed");
    });

    it("should reduce context.md size", async () => {
      const largeContent = "x".repeat(5000); // 5KB section
      const contextContent = `# My Vault

## Large Section
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const originalSize = Buffer.byteLength(contextContent, "utf-8");

      const result = await extractLargeSections(vaultPath);

      expect(result.newSize).toBeLessThan(originalSize);
      expect(result.reduction).toBeGreaterThan(0);
    });

    it("should preserve small sections", async () => {
      const contextContent = `# My Vault

## Section One
This is small.

## Section Two
Also small.`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await extractLargeSections(vaultPath);

      expect(result.guidesCreated.length).toBe(0);
      expect(result.referencesAdded).toBe(0);

      const newContent = await fs.readFile(contextPath, "utf-8");
      expect(newContent).toContain("Section One");
      expect(newContent).toContain("Section Two");
    });

    it("should track references added correctly", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## Large A
${largeContent}

## Large B
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await extractLargeSections(vaultPath);

      expect(result.referencesAdded).toBe(2);
    });

    it("should create valid guide files with content", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## Large Content
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await extractLargeSections(vaultPath);

      expect(result.guidesCreated.length).toBeGreaterThan(0);

      const guidePath = path.join(bozlyPath, "guides", result.guidesCreated[0]);
      const guideContent = await fs.readFile(guidePath, "utf-8");

      expect(guideContent).toContain("Large Content");
      expect(guideContent).toContain(largeContent);
    });

    it("should generate proper filenames from section titles", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## My Complex Section Name
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await extractLargeSections(vaultPath);

      expect(result.guidesCreated.length).toBeGreaterThan(0);
      expect(result.guidesCreated[0]).toContain("my-complex-section-name");
    });

    it("should handle extraction with mixed section sizes", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## Small One
Short

## Large
${largeContent}

## Small Two
Short`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await extractLargeSections(vaultPath);

      expect(result.guidesCreated.length).toBe(1);

      const newContent = await fs.readFile(contextPath, "utf-8");
      expect(newContent).toContain("Small One");
      expect(newContent).toContain("Small Two");
      expect(newContent).not.toContain("x".repeat(100));
    });
  });

  describe("formatAnalysisResults", () => {
    it("should format analysis results correctly", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# My Vault

## Large
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const analysis = await analyzeContext(vaultPath);
      const formatted = formatAnalysisResults(analysis);

      expect(formatted).toContain("CONTEXT OPTIMIZATION ANALYSIS");
      expect(formatted).toContain("Current Size");
      expect(formatted).toContain("Status");
    });

    it("should show optimized status", async () => {
      const contextContent = "# Vault\n\n## Section\nSmall";
      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const analysis = await analyzeContext(vaultPath);
      const formatted = formatAnalysisResults(analysis);

      expect(formatted).toContain("✅ OPTIMIZED");
    });

    it("should show suggestions for large sections", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# Vault

## Large
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const analysis = await analyzeContext(vaultPath);
      const formatted = formatAnalysisResults(analysis);

      expect(formatted).toContain("Found");
      expect(formatted).toContain("section");
      expect(formatted).toContain("guides/");
    });

    it("should include apply instructions", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# Vault

## Large
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const analysis = await analyzeContext(vaultPath);
      const formatted = formatAnalysisResults(analysis);

      expect(formatted).toContain("--apply");
    });
  });

  describe("formatExtractionResults", () => {
    it("should format extraction results correctly", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# Vault

## Large
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await extractLargeSections(vaultPath);
      const formatted = formatExtractionResults(result);

      expect(formatted).toContain("CONTEXT OPTIMIZATION COMPLETE");
      expect(formatted).toContain("Guides created");
      expect(formatted).toContain("Size reduction");
    });

    it("should list created guides", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# Vault

## My Guide
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await extractLargeSections(vaultPath);
      const formatted = formatExtractionResults(result);

      expect(formatted).toContain(".md");
      expect(formatted).toContain("guides");
    });

    it("should show references added count", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# Vault

## Large
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await extractLargeSections(vaultPath);
      const formatted = formatExtractionResults(result);

      expect(formatted).toContain("reference");
    });
  });

  describe("edge cases", () => {
    it("should handle heading variations (### is not extracted)", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# Vault

## Main Section
Some content

### Subsection
${largeContent}

Small text`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await analyzeContext(vaultPath);

      // Subsections are not split independently, so should have 1 large main section
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("should handle empty sections", async () => {
      const contextContent = `# Vault

## Empty Section

## Another Empty

## With Text
Some text here`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await analyzeContext(vaultPath);

      expect(result.suggestions.length).toBe(0);
      expect(result.isOptimized).toBe(true);
    });

    it("should handle special characters in section titles", async () => {
      const largeContent = "x".repeat(3000); // 3KB section
      const contextContent = `# Vault

## Section: With / Special & Characters!
${largeContent}`;

      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, contextContent, "utf-8");

      const result = await extractLargeSections(vaultPath);

      expect(result.success).toBe(true);
      expect(result.guidesCreated.length).toBeGreaterThan(0);
      // Should generate safe filename
      expect(result.guidesCreated[0]).toMatch(/^[a-z0-9\-\.]+\.md$/);
    });
  });
});
