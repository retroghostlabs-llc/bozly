/**
 * Tests for Phase 2k: Command Suggestions & Learning
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "path";
import fs from "fs/promises";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { SuggestionEngine, loadSuggestionsHistory, saveSuggestionToHistory, applySuggestion } from "../src/core/suggestions.js";
import type { NodeConfig, Suggestion } from "../src/core/types.js";

describe("Phase 2k: Command Suggestions", () => {
  let testDir: string;
  let nodeConfig: NodeConfig;

  beforeAll(async () => {
    // Create temp directory for testing
    testDir = path.join(tmpdir(), `bozly-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, ".bozly"), { recursive: true });
    await fs.mkdir(path.join(testDir, ".bozly", "sessions"), { recursive: true });

    // Create node config
    nodeConfig = {
      name: "test-node",
      type: "test",
      version: "1.0.0",
      created: new Date().toISOString(),
      ai: {
        defaultProvider: "claude",
        providers: ["claude", "gpt", "gemini"],
      },
    };

    // Save node config
    const configPath = path.join(testDir, ".bozly", "config.json");
    await fs.writeFile(configPath, JSON.stringify(nodeConfig, null, 2));
  });

  afterAll(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("SuggestionEngine", () => {
    it("should initialize with node path and config", () => {
      const engine = new SuggestionEngine(testDir, nodeConfig);
      expect(engine).toBeDefined();
    });

    it("should return empty suggestions for command with no sessions", async () => {
      const engine = new SuggestionEngine(testDir, nodeConfig);
      const suggestions = await engine.analyzeSessions("nonexistent-command");
      expect(suggestions).toEqual([]);
    });

    it("should handle suggestion confidence filtering", async () => {
      const engine = new SuggestionEngine(testDir, nodeConfig);

      // Test with different confidence thresholds
      const suggestions1 = await engine.analyzeSessions("test-cmd", {
        minConfidence: 0.9,
      });

      const suggestions2 = await engine.analyzeSessions("test-cmd", {
        minConfidence: 0.1,
      });

      // Both should be empty since no sessions exist
      expect(suggestions1).toEqual([]);
      expect(suggestions2).toEqual([]);
    });
  });

  describe("Suggestion History", () => {
    it("should load empty history for new node", async () => {
      const history = await loadSuggestionsHistory(testDir);
      expect(history.suggestions).toEqual([]);
      expect(history.version).toBe("1.0");
    });

    it("should save suggestion to history", async () => {
      const suggestion: Suggestion = {
        id: randomUUID(),
        commandName: "test-cmd",
        type: "pattern",
        priority: "high",
        title: "Error Pattern Detected",
        description: "Command fails often with provider X",
        analysis: {
          samplesAnalyzed: 20,
          confidence: 0.85,
          data: { failureRate: 0.6 },
        },
        recommendation: {
          action: "Switch provider",
          rationale: "Provider X has low success rate",
        },
        impact: {
          expectedImprovement: "+30% success",
          riskLevel: "low",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      await saveSuggestionToHistory(testDir, suggestion);

      // Load and verify
      const history = await loadSuggestionsHistory(testDir);
      expect(history.suggestions.length).toBeGreaterThan(0);
      const saved = history.suggestions.find((s) => s.id === suggestion.id);
      expect(saved).toBeDefined();
      expect(saved?.type).toBe("pattern");
      expect(saved?.priority).toBe("high");
    });

    it("should save multiple suggestions to history", async () => {
      const suggestions: Suggestion[] = [];

      for (let i = 0; i < 3; i++) {
        const suggestion: Suggestion = {
          id: randomUUID(),
          commandName: `cmd-${i}`,
          type: "context",
          priority: i === 0 ? "high" : i === 1 ? "medium" : "low",
          title: `Suggestion ${i}`,
          description: `Test suggestion ${i}`,
          analysis: {
            samplesAnalyzed: 10 + i,
            confidence: 0.5 + i * 0.1,
            data: {},
          },
          recommendation: {
            action: "Test action",
            rationale: "Test rationale",
          },
          impact: {
            expectedImprovement: "Test improvement",
            riskLevel: "low",
            reversible: true,
          },
          createdAt: new Date().toISOString(),
        };
        suggestions.push(suggestion);
      }

      // Save all
      for (const suggestion of suggestions) {
        await saveSuggestionToHistory(testDir, suggestion);
      }

      // Verify all saved
      const history = await loadSuggestionsHistory(testDir);
      for (const suggestion of suggestions) {
        const found = history.suggestions.find((s) => s.id === suggestion.id);
        expect(found).toBeDefined();
      }
    });

    it("should mark suggestion as applied", async () => {
      const suggestion: Suggestion = {
        id: randomUUID(),
        commandName: "test-cmd",
        type: "context",
        priority: "medium",
        title: "Context Optimization",
        description: "Trim unused context",
        analysis: {
          samplesAnalyzed: 15,
          confidence: 0.7,
          data: { wastePercentage: 40 },
        },
        recommendation: {
          action: "Reduce context",
          rationale: "40% context unused",
        },
        impact: {
          expectedImprovement: "20% faster",
          riskLevel: "low",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      await saveSuggestionToHistory(testDir, suggestion);
      await applySuggestion(testDir, suggestion.id);

      // Verify applied timestamp
      const history = await loadSuggestionsHistory(testDir);
      const applied = history.suggestions.find((s) => s.id === suggestion.id);
      expect(applied?.appliedAt).toBeDefined();
      expect(applied?.appliedAt).not.toBeNull();
    });

    it("should not duplicate suggestions in history", async () => {
      const suggestionId = randomUUID();
      const suggestion: Suggestion = {
        id: suggestionId,
        commandName: "test-cmd",
        type: "provider",
        priority: "medium",
        title: "Provider Recommendation",
        description: "Use different provider",
        analysis: {
          samplesAnalyzed: 25,
          confidence: 0.75,
          data: {},
        },
        recommendation: {
          action: "Switch provider",
          rationale: "Better performance",
        },
        impact: {
          expectedImprovement: "+25%",
          riskLevel: "low",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      // Save twice
      await saveSuggestionToHistory(testDir, suggestion);
      await saveSuggestionToHistory(testDir, suggestion);

      // Should not have duplicates
      const history = await loadSuggestionsHistory(testDir);
      const duplicates = history.suggestions.filter((s) => s.id === suggestionId);
      expect(duplicates.length).toBe(1);
    });

    it("should preserve suggestion metadata correctly", async () => {
      const suggestionId = randomUUID();
      const now = new Date();
      const suggestion: Suggestion = {
        id: suggestionId,
        commandName: "metadata-test",
        type: "prompt",
        priority: "low",
        title: "Prompt Refinement",
        description: "Add keywords to improve responses",
        analysis: {
          samplesAnalyzed: 30,
          confidence: 0.65,
          data: {
            successKeywords: ["actionable", "concise"],
            occurrenceRate: 75,
          },
        },
        recommendation: {
          action: "Update prompt",
          example: "Add 'actionable' to context",
          rationale: "Keywords improve response quality",
        },
        impact: {
          expectedImprovement: "15-20% quality improvement",
          riskLevel: "low",
          reversible: true,
        },
        createdAt: now.toISOString(),
      };

      await saveSuggestionToHistory(testDir, suggestion);

      // Verify all metadata preserved
      const history = await loadSuggestionsHistory(testDir);
      const saved = history.suggestions.find((s) => s.id === suggestionId);
      expect(saved?.commandName).toBe("metadata-test");
      expect(saved?.type).toBe("prompt");
      expect(saved?.priority).toBe("low");
      expect(saved?.analysis.samplesAnalyzed).toBe(30);
      expect(saved?.analysis.confidence).toBe(0.65);
      expect(saved?.recommendation.example).toBe("Add 'actionable' to context");
      expect(saved?.impact.riskLevel).toBe("low");
    });
  });

  describe("Suggestion Types", () => {
    it("should support all suggestion types", async () => {
      const types: Array<"pattern" | "context" | "provider" | "prompt" | "splitting"> = [
        "pattern",
        "context",
        "provider",
        "prompt",
        "splitting",
      ];

      for (const type of types) {
        const suggestion: Suggestion = {
          id: randomUUID(),
          commandName: "type-test",
          type,
          priority: "medium",
          title: `${type} Suggestion`,
          description: `Testing ${type} suggestion type`,
          analysis: {
            samplesAnalyzed: 10,
            confidence: 0.7,
            data: {},
          },
          recommendation: {
            action: "Test",
            rationale: "Testing",
          },
          impact: {
            expectedImprovement: "Test",
            riskLevel: "low",
            reversible: true,
          },
          createdAt: new Date().toISOString(),
        };

        await saveSuggestionToHistory(testDir, suggestion);

        const history = await loadSuggestionsHistory(testDir);
        const found = history.suggestions.find((s) => s.type === type);
        expect(found?.type).toBe(type);
      }
    });

    it("should support all priority levels", async () => {
      const priorities: Array<"high" | "medium" | "low"> = ["high", "medium", "low"];

      for (const priority of priorities) {
        const suggestion: Suggestion = {
          id: randomUUID(),
          commandName: "priority-test",
          type: "pattern",
          priority,
          title: `${priority} Priority Suggestion`,
          description: `Testing ${priority} priority level`,
          analysis: {
            samplesAnalyzed: 10,
            confidence: 0.7,
            data: {},
          },
          recommendation: {
            action: "Test",
            rationale: "Testing",
          },
          impact: {
            expectedImprovement: "Test",
            riskLevel: "low",
            reversible: true,
          },
          createdAt: new Date().toISOString(),
        };

        await saveSuggestionToHistory(testDir, suggestion);

        const history = await loadSuggestionsHistory(testDir);
        const found = history.suggestions.find((s) => s.priority === priority);
        expect(found?.priority).toBe(priority);
      }
    });
  });
});
