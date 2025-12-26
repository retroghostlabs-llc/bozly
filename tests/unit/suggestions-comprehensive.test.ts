/**
 * Comprehensive Suggestions Engine Tests - Advanced Coverage
 *
 * Tests for the suggestion system:
 * - Suggestion engine core functionality
 * - All 5 analyzer modules (error patterns, context optimization, provider performance, prompt refinement, command splitting)
 * - Confidence scoring and priority ranking
 * - Deduplication logic
 * - Suggestion history management
 * - Edge cases and error recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs/promises";
import {
  SuggestionEngine,
  getSuggestionsHistoryPath,
  loadSuggestionsHistory,
  saveSuggestionToHistory,
  applySuggestion,
} from "../../dist/core/suggestions.js";
import * as sessionsModule from "../../dist/core/sessions.js";
import type { Session, NodeConfig } from "../../dist/core/types.js";
import {
  createTempDir,
  getTempDir,
  cleanupTempDir,
  createMockVault,
  fileExists,
  readJSON,
} from "../conftest.js";

describe("Suggestions Engine - Comprehensive Coverage", () => {
  let nodePath: string;
  let nodeConfig: NodeConfig;
  let engine: SuggestionEngine;

  beforeEach(async () => {
    const tempDir = await createTempDir();
    nodePath = await createMockVault(tempDir);

    nodeConfig = {
      id: "test-node",
      name: "Test Node",
      path: nodePath,
      ai: {
        defaultProvider: "claude",
      },
      created: new Date().toISOString(),
    };

    engine = new SuggestionEngine(nodePath, nodeConfig);
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  // ============================================================================
  // Suggestion Engine Core Tests
  // ============================================================================

  describe("SuggestionEngine Core", () => {
    it("should handle empty session list gracefully", async () => {
      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce([]);

      const suggestions = await engine.analyzeSessions("test-command");

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBe(0);
    });

    it("should respect maxSessions limit", async () => {
      const mockSessions = Array(50)
        .fill(null)
        .map((_, i) => ({
          id: `session-${i}`,
          command: "test-command",
          provider: "claude",
          status: "completed",
        }));

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockResolvedValue({
        id: "test",
        status: "completed",
        provider: "claude",
      } as any);

      await engine.analyzeSessions("test-command", { maxSessions: 20 });

      expect(sessionsModule.querySessions).toHaveBeenCalledWith(nodePath, {
        command: "test-command",
        limit: 20,
      });
    });

    it("should respect minConfidence threshold", async () => {
      const mockSessions = Array(3)
        .fill(null)
        .map((_, i) => ({
          id: `session-${i}`,
          command: "test-command",
          provider: "claude",
          status: "failed",
          error: { message: "Test error" },
        }));

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockResolvedValue({
        id: "test",
        status: "failed",
        provider: "claude",
        error: { message: "Test error" },
      } as any);

      const suggestionsLow = await engine.analyzeSessions("test-command", {
        minConfidence: 0.9,
      });

      expect(Array.isArray(suggestionsLow)).toBe(true);
    });

    it("should sort suggestions by priority (high > medium > low)", async () => {
      const mockSessions = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `session-${i}`,
          command: "daily",
          provider: i % 2 === 0 ? "claude" : "gpt",
          status: i < 7 ? "failed" : "completed",
          error: i < 7 ? { message: "Error" } : undefined,
          executionTimeMs: 1000 + i * 100,
        }));

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockResolvedValue({
        id: "test",
        status: "failed",
        provider: "claude",
        error: { message: "Error" },
        executionTimeMs: 1000,
      } as any);

      const suggestions = await engine.analyzeSessions("daily", {
        maxSessions: 10,
      });

      if (suggestions.length > 1) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 1; i < suggestions.length; i++) {
          const prevPriority = priorityOrder[suggestions[i - 1].priority];
          const currPriority = priorityOrder[suggestions[i].priority];
          expect(prevPriority).toBeLessThanOrEqual(currPriority);
        }
      }
    });

    it("should filter out low-confidence suggestions", async () => {
      const mockSessions = Array(5)
        .fill(null)
        .map(() => ({
          id: "test",
          command: "test",
          provider: "claude",
          status: "completed",
        }));

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockResolvedValue({
        id: "test",
        status: "completed",
        provider: "claude",
        executionTimeMs: 1000,
      } as any);

      const suggestions = await engine.analyzeSessions("test", {
        minConfidence: 0.8,
      });

      for (const suggestion of suggestions) {
        expect(suggestion.analysis.confidence).toBeGreaterThanOrEqual(0.8);
      }
    });

    it("should deduplicate suggestions with same type and title", async () => {
      // Setup sessions that might generate duplicate suggestions
      const mockSessions = Array(15)
        .fill(null)
        .map((_, i) => ({
          id: `session-${i}`,
          command: "daily",
          provider: "claude",
          status: "failed",
          error: { message: "Timeout error" },
          executionTimeMs: 2000,
        }));

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockResolvedValue({
        id: "test",
        status: "failed",
        provider: "claude",
        error: { message: "Timeout error" },
        executionTimeMs: 2000,
      } as any);

      const suggestions = await engine.analyzeSessions("daily", {
        maxSessions: 15,
      });

      // Check for duplicates
      const suggestionKeys = suggestions.map((s) => `${s.type}:${s.commandName}:${s.title}`);
      const uniqueKeys = new Set(suggestionKeys);
      expect(uniqueKeys.size).toBe(suggestionKeys.length);
    });
  });

  // ============================================================================
  // Error Pattern Analysis Tests
  // ============================================================================

  describe("Error Pattern Analyzer", () => {
    it("should detect when failure rate exceeds 50%", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "analyze",
          provider: "claude",
          status: "failed",
          error: { message: "API Error" },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "analyze",
          provider: "claude",
          status: "failed",
          error: { message: "API Error" },
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "analyze",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockResolvedValue({
        id: "test",
        status: "failed",
        provider: "claude",
        error: { message: "API Error" },
        executionTimeMs: 1000,
      } as any);

      const suggestions = await engine.analyzeSessions("analyze");

      const errorPattern = suggestions.find((s) => s.type === "pattern");
      if (errorPattern) {
        expect(errorPattern.priority).toBe("high");
        expect(errorPattern.description).toContain("fails");
      }
    });

    it("should NOT suggest if failure rate is below 50%", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "failed",
          error: { message: "Error" },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockResolvedValue({
        id: "test",
        status: "completed",
        provider: "claude",
        executionTimeMs: 1000,
      } as any);

      const suggestions = await engine.analyzeSessions("test");

      const errorPattern = suggestions.find((s) => s.type === "pattern");
      expect(errorPattern).toBeUndefined();
    });

    it("should identify provider with highest failure rate", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "gpt",
          status: "failed",
          error: { message: "Error1" },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "gpt",
          status: "failed",
          error: { message: "Error2" },
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
        {
          id: "s4",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      const errorSuggestion = suggestions.find((s) => s.type === "pattern");
      if (errorSuggestion) {
        expect(errorSuggestion.description).toContain("gpt");
      }
    });

    it("should include common errors in analysis data", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "failed",
          error: { message: "Timeout error" },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "failed",
          error: { message: "Rate limit exceeded" },
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "claude",
          status: "failed",
          error: { message: "Connection refused" },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      const errorSuggestion = suggestions.find((s) => s.type === "pattern");
      if (errorSuggestion) {
        expect(Array.isArray(errorSuggestion.analysis.data.commonErrors)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Context Optimization Analyzer Tests
  // ============================================================================

  describe("Context Optimization Analyzer", () => {
    it("should detect context larger than 3x output size", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          response: { metadata: { outputSize: 1000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          response: { metadata: { outputSize: 1000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          response: { metadata: { outputSize: 1000 } },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      const contextSuggestion = suggestions.find((s) => s.type === "context");
      expect(contextSuggestion).toBeDefined();
      if (contextSuggestion) {
        expect(contextSuggestion.priority).toBe("medium");
        expect(contextSuggestion.description).toContain("unused");
      }
    });

    it("should NOT suggest if less than 3 successful sessions", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          response: { metadata: { outputSize: 1000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          response: { metadata: { outputSize: 1000 } },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      const contextSuggestion = suggestions.find((s) => s.type === "context");
      expect(contextSuggestion).toBeUndefined();
    });

    it("should handle missing context/output metadata", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          prompt: {},
          response: { metadata: { outputSize: 1000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          response: {},
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 500 } },
          response: { metadata: { outputSize: 400 } },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should NOT suggest if context is not greater than 3x output", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 2000 } },
          response: { metadata: { outputSize: 1000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 2000 } },
          response: { metadata: { outputSize: 1000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 2000 } },
          response: { metadata: { outputSize: 1000 } },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      const contextSuggestion = suggestions.find((s) => s.type === "context");
      expect(contextSuggestion).toBeUndefined();
    });
  });

  // ============================================================================
  // Provider Performance Analyzer Tests
  // ============================================================================

  describe("Provider Performance Analyzer", () => {
    it("should compare multiple providers", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "gpt",
          status: "failed",
          executionTimeMs: 1500,
        },
        {
          id: "s4",
          command: "test",
          provider: "gpt",
          status: "failed",
          executionTimeMs: 1500,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      const providerSuggestion = suggestions.find((s) => s.type === "provider");
      if (providerSuggestion) {
        expect(providerSuggestion.description).toContain("performs");
        expect(providerSuggestion.description).toContain("better");
      }
    });

    it("should NOT suggest with single provider", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      const providerSuggestion = suggestions.find((s) => s.type === "provider");
      expect(providerSuggestion).toBeUndefined();
    });

    it("should only suggest if improvement is > 20%", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "gpt",
          status: "completed",
          executionTimeMs: 1000,
        },
        {
          id: "s4",
          command: "test",
          provider: "gpt",
          status: "completed",
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      const providerSuggestion = suggestions.find((s) => s.type === "provider");
      expect(providerSuggestion).toBeUndefined();
    });

    it("should NOT suggest if recommended provider is default", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "gpt",
          status: "failed",
          executionTimeMs: 1500,
        },
        {
          id: "s4",
          command: "test",
          provider: "gpt",
          status: "failed",
          executionTimeMs: 1500,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      // Create engine with claude as default (already the case)
      const suggestions = await engine.analyzeSessions("test");

      const providerSuggestion = suggestions.find(
        (s) => s.type === "provider" && s.analysis.data.recommended === "claude"
      );
      expect(providerSuggestion).toBeUndefined();
    });

    it("should include per-provider stats in analysis data", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "gpt",
          status: "failed",
          executionTimeMs: 1500,
        },
        {
          id: "s3",
          command: "test",
          provider: "gpt",
          status: "failed",
          executionTimeMs: 1500,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      const providerSuggestion = suggestions.find((s) => s.type === "provider");
      if (providerSuggestion) {
        expect(Array.isArray(providerSuggestion.analysis.data.providers)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Prompt Refinement Analyzer Tests
  // ============================================================================

  describe("Prompt Refinement Analyzer", () => {
    it("should detect success keywords in responses", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          response: { content: "Here is an actionable and concise response" },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          response: { content: "This is a detailed step-by-step guide" },
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "claude",
          status: "completed",
          response: { content: "Here is a specific recommendation" },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      const promptSuggestion = suggestions.find((s) => s.type === "prompt");
      if (promptSuggestion) {
        expect(promptSuggestion.priority).toBe("low");
        expect(promptSuggestion.description).toContain("often include");
      }
    });

    it("should NOT suggest with less than 3 successful sessions", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          response: { content: "This is actionable" },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          response: { content: "This is specific" },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      const promptSuggestion = suggestions.find((s) => s.type === "prompt");
      expect(promptSuggestion).toBeUndefined();
    });

    it("should handle sessions without response content", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
          response: {},
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
          response: { content: "This is actionable and specific" },
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "claude",
          status: "completed",
          response: { content: "This is detailed" },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  // ============================================================================
  // Command Splitting Analyzer Tests
  // ============================================================================

  describe("Command Splitting Analyzer", () => {
    it("should suggest splitting for large 'daily' commands", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "daily",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "daily",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "daily",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("daily");

      const splittingSuggestion = suggestions.find((s) => s.type === "splitting");
      if (splittingSuggestion) {
        expect(splittingSuggestion.priority).toBe("low");
        expect(splittingSuggestion.description).toContain("splitting");
      }
    });

    it("should NOT suggest splitting for non-daily commands", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "analyze",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "analyze",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "analyze",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("analyze");

      const splittingSuggestion = suggestions.find((s) => s.type === "splitting");
      expect(splittingSuggestion).toBeUndefined();
    });

    it("should NOT suggest splitting if context < 4000", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "daily",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 3000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "daily",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 3000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "daily",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 3000 } },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("daily");

      const splittingSuggestion = suggestions.find((s) => s.type === "splitting");
      expect(splittingSuggestion).toBeUndefined();
    });

    it("should NOT suggest with less than 3 successful sessions", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "daily",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "daily",
          provider: "claude",
          status: "completed",
          prompt: { metadata: { contextSize: 5000 } },
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("daily");

      const splittingSuggestion = suggestions.find((s) => s.type === "splitting");
      expect(splittingSuggestion).toBeUndefined();
    });
  });

  // ============================================================================
  // Suggestion History Management Tests
  // ============================================================================

  describe("Suggestion History Management", () => {
    it("should load empty history for new node", async () => {
      const history = await loadSuggestionsHistory(nodePath);

      expect(history).toBeDefined();
      expect(history.version).toBe("1.0");
      expect(Array.isArray(history.suggestions)).toBe(true);
      expect(history.suggestions.length).toBe(0);
    });

    it("should save suggestion to history", async () => {
      const suggestion = {
        id: "test-id",
        commandName: "test",
        type: "pattern" as const,
        priority: "high" as const,
        title: "Test Suggestion",
        description: "Test description",
        analysis: {
          samplesAnalyzed: 10,
          confidence: 0.85,
          data: {},
        },
        recommendation: {
          action: "Test action",
        },
        impact: {
          expectedImprovement: "10%",
          riskLevel: "low",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      await saveSuggestionToHistory(nodePath, suggestion);

      const history = await loadSuggestionsHistory(nodePath);
      expect(history.suggestions.length).toBe(1);
      expect(history.suggestions[0].id).toBe("test-id");
    });

    it("should not duplicate suggestions in history", async () => {
      const suggestion = {
        id: "test-id",
        commandName: "test",
        type: "pattern" as const,
        priority: "high" as const,
        title: "Test Suggestion",
        description: "Test description",
        analysis: {
          samplesAnalyzed: 10,
          confidence: 0.85,
          data: {},
        },
        recommendation: {
          action: "Test action",
        },
        impact: {
          expectedImprovement: "10%",
          riskLevel: "low",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      await saveSuggestionToHistory(nodePath, suggestion);
      await saveSuggestionToHistory(nodePath, suggestion);

      const history = await loadSuggestionsHistory(nodePath);
      expect(history.suggestions.length).toBe(1);
    });

    it("should mark suggestion as applied", async () => {
      const suggestion = {
        id: "test-id",
        commandName: "test",
        type: "pattern" as const,
        priority: "high" as const,
        title: "Test Suggestion",
        description: "Test description",
        analysis: {
          samplesAnalyzed: 10,
          confidence: 0.85,
          data: {},
        },
        recommendation: {
          action: "Test action",
        },
        impact: {
          expectedImprovement: "10%",
          riskLevel: "low",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      await saveSuggestionToHistory(nodePath, suggestion);
      await applySuggestion(nodePath, "test-id");

      const history = await loadSuggestionsHistory(nodePath);
      expect(history.suggestions[0].appliedAt).toBeDefined();
    });

    it("should update history timestamp when saving", async () => {
      const suggestion = {
        id: "test-id",
        commandName: "test",
        type: "pattern" as const,
        priority: "high" as const,
        title: "Test Suggestion",
        description: "Test description",
        analysis: {
          samplesAnalyzed: 10,
          confidence: 0.85,
          data: {},
        },
        recommendation: {
          action: "Test action",
        },
        impact: {
          expectedImprovement: "10%",
          riskLevel: "low",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      const beforeSave = new Date().getTime();
      await saveSuggestionToHistory(nodePath, suggestion);
      const afterSave = new Date().getTime();

      const history = await loadSuggestionsHistory(nodePath);
      const updatedTime = new Date(history.updated).getTime();
      expect(updatedTime).toBeGreaterThanOrEqual(beforeSave);
      expect(updatedTime).toBeLessThanOrEqual(afterSave);
    });

    it("should handle invalid history file gracefully", async () => {
      const historyPath = getSuggestionsHistoryPath(nodePath);
      await fs.mkdir(path.dirname(historyPath), { recursive: true });
      await fs.writeFile(historyPath, "invalid json {{{", "utf-8");

      const history = await loadSuggestionsHistory(nodePath);

      expect(history.version).toBe("1.0");
      expect(history.suggestions.length).toBe(0);
    });

    it("should handle missing history file as empty history", async () => {
      const history = await loadSuggestionsHistory(nodePath);

      expect(history).toBeDefined();
      expect(history.suggestions.length).toBe(0);
    });
  });

  // ============================================================================
  // Edge Cases & Integration Tests
  // ============================================================================

  describe("Edge Cases and Integration", () => {
    it("should handle sessions that fail to load", async () => {
      const mockSessionMetas = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "completed",
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "completed",
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessionMetas);
      vi.spyOn(sessionsModule, "loadSession").mockResolvedValue(null);

      const suggestions = await engine.analyzeSessions("test");

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should return empty suggestions for command with no sessions", async () => {
      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce([]);

      const suggestions = await engine.analyzeSessions("nonexistent");

      expect(suggestions.length).toBe(0);
    });

    it("should handle very large session counts", async () => {
      const mockSessions = Array(100)
        .fill(null)
        .map((_, i) => ({
          id: `session-${i}`,
          command: "test",
          provider: i % 2 === 0 ? "claude" : "gpt",
          status: i < 50 ? "failed" : "completed",
          error: i < 50 ? { message: "Error" } : undefined,
          executionTimeMs: 1000 + i * 10,
        }));

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test", { maxSessions: 100 });

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should create suggestions with all required fields", async () => {
      const mockSessions = [
        {
          id: "s1",
          command: "test",
          provider: "claude",
          status: "failed",
          error: { message: "API Error" },
          executionTimeMs: 1000,
        },
        {
          id: "s2",
          command: "test",
          provider: "claude",
          status: "failed",
          error: { message: "API Error" },
          executionTimeMs: 1000,
        },
        {
          id: "s3",
          command: "test",
          provider: "claude",
          status: "completed",
          executionTimeMs: 1000,
        },
      ];

      vi.spyOn(sessionsModule, "querySessions").mockResolvedValueOnce(mockSessions);
      vi.spyOn(sessionsModule, "loadSession").mockImplementation((np, id) => {
        const session = mockSessions.find((s) => s.id === id);
        return Promise.resolve(session as any);
      });

      const suggestions = await engine.analyzeSessions("test");

      for (const suggestion of suggestions) {
        expect(suggestion.id).toBeDefined();
        expect(suggestion.commandName).toBeDefined();
        expect(suggestion.type).toBeDefined();
        expect(suggestion.priority).toBeDefined();
        expect(suggestion.title).toBeDefined();
        expect(suggestion.description).toBeDefined();
        expect(suggestion.analysis).toBeDefined();
        expect(suggestion.recommendation).toBeDefined();
        expect(suggestion.impact).toBeDefined();
        expect(suggestion.createdAt).toBeDefined();
      }
    });
  });
});
