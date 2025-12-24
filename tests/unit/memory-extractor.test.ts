/**
 * Memory Extractor Unit Tests
 *
 * Comprehensive tests for MemoryExtractor class covering:
 * - Memory extraction from session data
 * - Metadata generation
 * - Markdown conversion
 * - Vault-type detection
 * - Tag generation
 * - Token estimation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryExtractor, ExtractionInput } from "../../dist/memory/extractor.js";
import { Session } from "../../dist/core/types.js";

describe("MemoryExtractor", () => {
  let mockSession: Session;

  beforeEach(() => {
    mockSession = {
      schema_version: "1.0",
      id: "test-session-1",
      nodeId: "music-vault",
      nodeName: "Music Vault",
      timestamp: new Date().toISOString(),
      command: "rate-album",
      provider: "claude",
      status: "completed",
      executionTimeMs: 5000,
    };
  });

  describe("extract", () => {
    it("should extract basic session memory", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.sessionId).toBe("test-session-1");
      expect(memory.nodeId).toBe("music-vault");
      expect(memory.nodeName).toBe("Music Vault");
      expect(memory.command).toBe("rate-album");
      expect(memory.aiProvider).toBe("claude");
    });

    it("should generate title from command and summary", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.title).toContain("rate-album");
      expect(memory.title).toContain("Music Vault");
    });

    it("should calculate duration in minutes", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 120000, // 2 minutes
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.durationMinutes).toBe(2);
    });

    it("should handle music vault type", () => {
      const input: ExtractionInput = {
        session: mockSession,
        vaultContext: "# Music Vault\n\nRate and organize music",
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.currentState).toContain("music");
      expect(memory.tags).toContain("music");
    });

    it("should handle project vault type", () => {
      const projectSession = {
        ...mockSession,
        nodeName: "Project Vault",
        command: "plan-sprint",
      };

      const input: ExtractionInput = {
        session: projectSession,
        vaultContext: "# Project Planning\n\nSprint and task management",
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.currentState).toContain("project");
      expect(memory.tags.some((t) => t.includes("project"))).toBe(true);
    });

    it("should handle journal vault type", () => {
      const journalSession = {
        ...mockSession,
        nodeName: "Daily Journal",
        command: "write-entry",
      };

      const input: ExtractionInput = {
        session: journalSession,
        vaultContext: "# Journal\n\nDaily reflections and mood tracking",
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.tags.some((t) => t.includes("journal"))).toBe(true);
    });

    it("should fallback to generic vault type", () => {
      const input: ExtractionInput = {
        session: { ...mockSession, nodeName: "Unknown Vault" },
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.tags).toContain("generic");
    });

    it("should include error information when present", () => {
      const errorSession: Session = {
        ...mockSession,
        status: "failed",
        error: {
          message: "API rate limit exceeded",
          code: "RATE_LIMIT",
        },
      };

      const input: ExtractionInput = {
        session: errorSession,
        executionTimeMs: 1000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.errors).toContain("rate limit");
    });

    it("should estimate tokens when not provided", () => {
      const input: ExtractionInput = {
        session: mockSession,
        vaultContext: "A".repeat(4000), // ~1000 tokens
        commandContent: "B".repeat(4000),
        executionOutput: "C".repeat(4000),
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.tokenCount).toBeGreaterThan(0);
    });

    it("should use provided token count", () => {
      const input: ExtractionInput = {
        session: mockSession,
        tokensUsed: 8500,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.tokenCount).toBe(8500);
    });

    it("should generate tags for different vault types", () => {
      const input: ExtractionInput = {
        session: mockSession,
        vaultContext: "# Music Vault",
        executionTimeMs: 3000, // Quick execution
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.tags).toContain("music");
      expect(memory.tags).toContain("rate-album");
      expect(memory.tags).toContain("claude");
      expect(memory.tags).toContain("completed");
      expect(memory.tags).toContain("quick");
    });

    it("should tag execution time appropriately", () => {
      const quickInput: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 2000, // Quick
      };
      const quickMemory = MemoryExtractor.extract(quickInput, "sessionEnd");

      const normalInput: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 15000, // Normal
      };
      const normalMemory = MemoryExtractor.extract(normalInput, "sessionEnd");

      const longInput: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 60000, // Long
      };
      const longMemory = MemoryExtractor.extract(longInput, "sessionEnd");

      expect(quickMemory.tags).toContain("quick");
      expect(normalMemory.tags).toContain("normal");
      expect(longMemory.tags).toContain("long-running");
    });

    it("should avoid duplicate tags", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      const tagSet = new Set(memory.tags);
      expect(tagSet.size).toBe(memory.tags.length);
    });

    it("should include command from vault context tags", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");

      expect(memory.tags).toContain("rate-album");
    });
  });

  describe("generateMetadata", () => {
    it("should generate metadata from memory", () => {
      const input: ExtractionInput = {
        session: mockSession,
        vaultContext: "# Music Vault",
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", "music");

      expect(metadata.sessionId).toBe(memory.sessionId);
      expect(metadata.nodeId).toBe(memory.nodeId);
      expect(metadata.memoryAutoExtracted).toBe(true);
      expect(metadata.extractionTrigger).toBe("sessionEnd");
      expect(metadata.vaultType).toBe("music");
    });

    it("should include all required fields", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "tokenThreshold");
      const metadata = MemoryExtractor.generateMetadata(memory, "tokenThreshold", "generic");

      expect(metadata.sessionId).toBeDefined();
      expect(metadata.nodeId).toBeDefined();
      expect(metadata.nodeName).toBeDefined();
      expect(metadata.timestamp).toBeDefined();
      expect(metadata.durationMinutes).toBeDefined();
      expect(metadata.tokenCount).toBeDefined();
      expect(metadata.aiProvider).toBeDefined();
      expect(metadata.command).toBeDefined();
      expect(metadata.tags).toBeDefined();
      expect(metadata.summary).toBeDefined();
    });

    it("should preserve extraction trigger", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "timeThreshold");
      const metadata = MemoryExtractor.generateMetadata(memory, "timeThreshold", "music");

      expect(metadata.extractionTrigger).toBe("timeThreshold");
    });

    it("should include relevant previous sessions", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      memory.relevantSessions = ["session-1", "session-2"];

      const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", "music");

      expect(metadata.relevantPreviousSessions).toContain("session-1");
      expect(metadata.relevantPreviousSessions).toContain("session-2");
    });
  });

  describe("toMarkdown", () => {
    it("should convert memory to markdown", () => {
      const input: ExtractionInput = {
        session: mockSession,
        vaultContext: "# Music Vault",
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", "music");
      const markdown = MemoryExtractor.toMarkdown(memory, metadata);

      expect(markdown).toContain("# Session:");
      expect(markdown).toContain(memory.nodeName);
      expect(markdown).toContain(memory.title);
    });

    it("should include all sections", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", "music");
      const markdown = MemoryExtractor.toMarkdown(memory, metadata);

      expect(markdown).toContain("## Current State");
      expect(markdown).toContain("## Task Specification");
      expect(markdown).toContain("## Workflow");
      expect(markdown).toContain("## Errors & Corrections");
      expect(markdown).toContain("## Learnings");
      expect(markdown).toContain("## Key Results");
      expect(markdown).toContain("## Metadata");
    });

    it("should include metadata details", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", "music");
      const markdown = MemoryExtractor.toMarkdown(memory, metadata);

      expect(markdown).toContain(`- Session ID: ${metadata.sessionId}`);
      expect(markdown).toContain(`- Duration: ${metadata.durationMinutes} minutes`);
      expect(markdown).toContain(`- AI Provider: ${metadata.aiProvider}`);
      expect(markdown).toContain(`- Command: ${metadata.command}`);
      expect(markdown).toContain(`- Vault Type: ${metadata.vaultType}`);
    });

    it("should format tags as comma-separated", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", "music");
      const markdown = MemoryExtractor.toMarkdown(memory, metadata);

      expect(markdown).toContain("- Tags:");
    });

    it("should include extraction trigger", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", "music");
      const markdown = MemoryExtractor.toMarkdown(memory, metadata);

      expect(markdown).toContain("- Extraction Trigger: sessionEnd");
    });

    it("should end with footer", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      const metadata = MemoryExtractor.generateMetadata(memory, "sessionEnd", "music");
      const markdown = MemoryExtractor.toMarkdown(memory, metadata);

      expect(markdown).toContain("*Memory auto-extracted by BOZLY from session context*");
    });

    it("should handle missing optional fields", () => {
      const memory = {
        sessionId: "test-session",
        nodeId: "test-vault",
        nodeName: "Test Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 5,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "test-command",
        title: "Test Title",
        currentState: undefined,
        taskSpec: undefined,
        workflow: undefined,
        errors: undefined,
        learnings: undefined,
        keyResults: undefined,
        tags: ["test"],
        summary: "Test summary",
      };

      const metadata = {
        sessionId: "test-session",
        nodeId: "test-vault",
        nodeName: "Test Vault",
        timestamp: new Date().toISOString(),
        durationMinutes: 5,
        tokenCount: 5000,
        aiProvider: "claude",
        command: "test-command",
        memoryAutoExtracted: true,
        extractionTrigger: "sessionEnd",
        tags: ["test"],
        relevantPreviousSessions: [],
        summary: "Test summary",
        vaultType: "generic",
      };

      const markdown = MemoryExtractor.toMarkdown(memory, metadata);

      expect(markdown).toContain("## Current State");
      expect(markdown).toContain("No state information");
    });
  });

  describe("Tag Generation", () => {
    it("should generate correct tags for different vault types", () => {
      const testCases = [
        { nodeName: "Music Vault", context: "# Music Rating Vault", expectedType: "music" },
        { nodeName: "Project Planning", context: "# Sprint Planning Vault", expectedType: "project" },
        { nodeName: "Daily Journal", context: "# Journal with mood tracking", expectedType: "journal" },
        { nodeName: "Generic Workspace", context: "# Generic Vault", expectedType: "generic" },
      ];

      for (const testCase of testCases) {
        const input: ExtractionInput = {
          session: { ...mockSession, nodeName: testCase.nodeName },
          vaultContext: testCase.context,
          executionTimeMs: 5000,
        };

        const memory = MemoryExtractor.extract(input, "sessionEnd");
        expect(memory.tags).toContain(testCase.expectedType);
      }
    });

    it("should include provider as tag", () => {
      const input: ExtractionInput = {
        session: { ...mockSession, provider: "gpt" },
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      expect(memory.tags).toContain("gpt");
    });

    it("should include status as tag", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      expect(memory.tags).toContain("completed");
    });

    it("should sanitize node name for tag", () => {
      const input: ExtractionInput = {
        session: { ...mockSession, nodeName: "My Music Vault" },
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      expect(memory.tags.some((t) => t.includes("music-vault"))).toBe(true);
    });
  });

  describe("Token Estimation", () => {
    it("should estimate tokens from context content", () => {
      const input: ExtractionInput = {
        session: mockSession,
        vaultContext: "A".repeat(4000), // Roughly 1000 tokens
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      expect(memory.tokenCount).toBeGreaterThan(0);
    });

    it("should combine tokens from all sources", () => {
      const input: ExtractionInput = {
        session: mockSession,
        vaultContext: "A".repeat(4000),
        commandContent: "B".repeat(4000),
        executionOutput: "C".repeat(4000),
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      // Should be roughly 3000 tokens (12000 chars / 4)
      expect(memory.tokenCount).toBeGreaterThan(2000);
    });

    it("should handle zero tokens gracefully", () => {
      const input: ExtractionInput = {
        session: mockSession,
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      expect(memory.tokenCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Duration Calculation", () => {
    it("should convert milliseconds to minutes", () => {
      const testCases = [
        { ms: 60000, expected: 1 },
        { ms: 120000, expected: 2 },
        { ms: 90000, expected: 2 }, // Rounds to 2
        { ms: 45000, expected: 1 }, // Rounds to 1
        { ms: 5000, expected: 0 },
      ];

      for (const testCase of testCases) {
        const input: ExtractionInput = {
          session: mockSession,
          executionTimeMs: testCase.ms,
        };

        const memory = MemoryExtractor.extract(input, "sessionEnd");
        expect(memory.durationMinutes).toBe(testCase.expected);
      }
    });
  });

  describe("Vault Type Detection", () => {
    it("should detect music vault from name", () => {
      const input: ExtractionInput = {
        session: { ...mockSession, nodeName: "Music Analysis" },
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      expect(memory.tags).toContain("music");
    });

    it("should detect vault type from context", () => {
      const input: ExtractionInput = {
        session: { ...mockSession, nodeName: "Personal Journal" },
        vaultContext: "# Journal Entry\n\nMood tracking and reflection",
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      expect(memory.tags).toContain("journal");
    });

    it("should fallback to generic for unknown types", () => {
      const input: ExtractionInput = {
        session: { ...mockSession, nodeName: "Random Workspace" },
        vaultContext: "# Random Context\n\nNo specific vault markers",
        executionTimeMs: 5000,
      };

      const memory = MemoryExtractor.extract(input, "sessionEnd");
      expect(memory.tags).toContain("generic");
    });
  });
});
