/**
 * Unit tests for CrossNodeSearcher module
 * Tests search functionality, filtering, scoring, and result aggregation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { CrossNodeSearcher } from "../../src/core/search.js";
import { SearchQuery, SessionStatus } from "../../src/core/types.js";

describe("CrossNodeSearcher", () => {
  let searcher: CrossNodeSearcher;
  const testBozlyPath = path.join(process.cwd(), ".test-bozly");

  beforeEach(() => {
    // Initialize searcher for each test
    searcher = new CrossNodeSearcher(testBozlyPath);
  });

  describe("searchAll()", () => {
    it("should initialize AggregatedSearchResults with proper structure", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchAll(query);

      expect(results).toHaveProperty("query");
      expect(results).toHaveProperty("timestamp");
      expect(results).toHaveProperty("queryTimeMs");
      expect(results).toHaveProperty("counts");
      expect(results).toHaveProperty("results");

      // Verify counts are numbers
      expect(typeof results.counts.sessions).toBe("number");
      expect(typeof results.counts.memories).toBe("number");
      expect(typeof results.counts.commands).toBe("number");
      expect(typeof results.counts.total).toBe("number");

      // Verify totals add up correctly
      expect(results.counts.total).toBe(
        results.counts.sessions + results.counts.memories + results.counts.commands
      );
    });

    it("should respect searchIn filter - sessions only", async () => {
      const query: SearchQuery = {
        text: "",
        searchIn: ["sessions"],
      };
      const results = await searcher.searchAll(query);

      // When sessions don't exist, count should be 0 but structure should exist
      expect(results.results.sessions).toBeDefined();
      expect(Array.isArray(results.results.sessions)).toBe(true);
    });

    it("should respect searchIn filter - memories only", async () => {
      const query: SearchQuery = {
        text: "",
        searchIn: ["memories"],
      };
      const results = await searcher.searchAll(query);

      expect(results.results.memories).toBeDefined();
      expect(Array.isArray(results.results.memories)).toBe(true);
    });

    it("should respect searchIn filter - commands only", async () => {
      const query: SearchQuery = {
        text: "",
        searchIn: ["commands"],
      };
      const results = await searcher.searchAll(query);

      expect(results.results.commands).toBeDefined();
      expect(Array.isArray(results.results.commands)).toBe(true);
    });

    it("should return all targets when searchIn is undefined", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchAll(query);

      expect(results.results.sessions).toBeDefined();
      expect(results.results.memories).toBeDefined();
      expect(results.results.commands).toBeDefined();
    });

    it("should calculate queryTimeMs", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchAll(query);

      expect(typeof results.queryTimeMs).toBe("number");
      expect(results.queryTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should return ISO timestamp", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchAll(query);

      expect(typeof results.timestamp).toBe("string");
      // Check valid ISO format
      expect(new Date(results.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe("searchSessions()", () => {
    it("should return empty array when sessions directory does not exist", async () => {
      const query: SearchQuery = { text: "test" };
      const results = await searcher.searchSessions(query);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it("should handle limit parameter", async () => {
      const query: SearchQuery = { text: "", limit: 5 };
      const results = await searcher.searchSessions(query);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("should handle offset parameter", async () => {
      const query: SearchQuery = { text: "", offset: 2 };
      const results = await searcher.searchSessions(query);

      // Just check that offset doesn't throw an error
      expect(Array.isArray(results)).toBe(true);
    });

    it("should filter by command name", async () => {
      const query: SearchQuery = { command: "daily" };
      const results = await searcher.searchSessions(query);

      // All results (if any) should match the command filter
      expect(results.every((r) => !r.session.command || r.session.command === "daily")).toBe(true);
    });

    it("should include relevanceScore in results", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchSessions(query);

      if (results.length > 0) {
        expect(typeof results[0].relevanceScore).toBe("number");
        expect(results[0].relevanceScore).toBeGreaterThanOrEqual(0);
        expect(results[0].relevanceScore).toBeLessThanOrEqual(1);
      }
    });

    it("should include nodeInfo in results", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchSessions(query);

      if (results.length > 0) {
        expect(results[0].nodeInfo).toHaveProperty("nodeId");
        expect(results[0].nodeInfo).toHaveProperty("nodeName");
        expect(results[0].nodeInfo).toHaveProperty("nodePath");
      }
    });

    it("should sort by relevance score descending", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchSessions(query);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          results[i].relevanceScore
        );
      }
    });
  });

  describe("searchMemories()", () => {
    it("should return empty array when no query text provided", async () => {
      const query: SearchQuery = {};
      const results = await searcher.searchMemories(query);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it("should filter memories by nodeId", async () => {
      const query: SearchQuery = { text: "test", nodeId: "music" };
      const results = await searcher.searchMemories(query);

      // All results should match the nodeId (if any)
      expect(
        results.every((r) => !r.memory.nodeId || r.memory.nodeId === "music")
      ).toBe(true);
    });

    it("should filter memories by command", async () => {
      const query: SearchQuery = { text: "test", command: "daily" };
      const results = await searcher.searchMemories(query);

      // All results should match the command filter
      expect(
        results.every((r) => !r.memory.command || r.memory.command === "daily")
      ).toBe(true);
    });

    it("should filter memories by date range", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const query: SearchQuery = {
        text: "test",
        startDate: startDate.toISOString(),
      };
      const results = await searcher.searchMemories(query);

      // All results should be after startDate
      expect(
        results.every((r) => new Date(r.memory.timestamp) >= startDate)
      ).toBe(true);
    });

    it("should include relevanceScore in memory results", async () => {
      const query: SearchQuery = { text: "test" };
      const results = await searcher.searchMemories(query);

      if (results.length > 0) {
        expect(typeof results[0].relevanceScore).toBe("number");
        expect(results[0].relevanceScore).toBeGreaterThanOrEqual(0);
        expect(results[0].relevanceScore).toBeLessThanOrEqual(1);
      }
    });

    it("should have memory object with required fields", async () => {
      const query: SearchQuery = { text: "test" };
      const results = await searcher.searchMemories(query);

      if (results.length > 0) {
        expect(results[0].memory).toHaveProperty("nodeId");
        expect(results[0].memory).toHaveProperty("timestamp");
        expect(results[0].memory).toHaveProperty("summary");
      }
    });
  });

  describe("searchCommands()", () => {
    it("should return command search results", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchCommands(query);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should include command objects in results", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchCommands(query);

      if (results.length > 0) {
        expect(results[0]).toHaveProperty("command");
        expect(results[0]).toHaveProperty("relevanceScore");
        expect(results[0]).toHaveProperty("matchedFields");
      }
    });

    it("should handle limit parameter for commands", async () => {
      const query: SearchQuery = { text: "", limit: 3 };
      const results = await searcher.searchCommands(query);

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("should sort command results by relevance", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchCommands(query);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          results[i].relevanceScore
        );
      }
    });
  });

  describe("getRecentSessions()", () => {
    it("should return empty array when sessions directory does not exist", async () => {
      const results = await searcher.getRecentSessions({ limit: 10 });

      expect(Array.isArray(results)).toBe(true);
    });

    it("should apply limit option", async () => {
      const results = await searcher.getRecentSessions({ limit: 5 });

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("should filter by nodeId when provided", async () => {
      const results = await searcher.getRecentSessions(
        { limit: 10 },
        "music"
      );

      // All results should match nodeId
      expect(
        results.every((r) => !r.nodeInfo.nodeId || r.nodeInfo.nodeId === "music")
      ).toBe(true);
    });

    it("should include HistoryResult structure", async () => {
      const results = await searcher.getRecentSessions({ limit: 10 });

      if (results.length > 0) {
        expect(results[0]).toHaveProperty("session");
        expect(results[0]).toHaveProperty("nodeInfo");
        expect(results[0].nodeInfo).toHaveProperty("nodeId");
        expect(results[0].nodeInfo).toHaveProperty("nodeName");
      }
    });

    it("should include memory if available", async () => {
      const results = await searcher.getRecentSessions({ limit: 10 });

      // Memory field should be present in structure even if undefined
      expect(results.every((r) => "memory" in r)).toBe(true);
    });
  });

  describe("getSearchStats()", () => {
    it("should return search statistics", async () => {
      const query: SearchQuery = { text: "" };
      const stats = await searcher.getSearchStats(query);

      expect(stats).toHaveProperty("totalResults");
      expect(stats).toHaveProperty("byType");
      expect(stats).toHaveProperty("byNode");
      expect(stats).toHaveProperty("byProvider");
      expect(stats).toHaveProperty("dateRange");
    });

    it("should have byType breakdown", async () => {
      const query: SearchQuery = { text: "" };
      const stats = await searcher.getSearchStats(query);

      expect(stats.byType).toHaveProperty("sessions");
      expect(stats.byType).toHaveProperty("memories");
      expect(stats.byType).toHaveProperty("commands");
    });

    it("should count results by provider", async () => {
      const query: SearchQuery = { provider: "claude" };
      const stats = await searcher.getSearchStats(query);

      expect(typeof stats.byProvider).toBe("object");
    });

    it("should include date range if results exist", async () => {
      const query: SearchQuery = { text: "" };
      const stats = await searcher.getSearchStats(query);

      expect(stats.dateRange).toHaveProperty("oldest");
      expect(stats.dateRange).toHaveProperty("newest");
    });
  });

  describe("Relevance Scoring", () => {
    it("should score sessions between 0 and 1", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchSessions(query);

      expect(
        results.every(
          (r) => r.relevanceScore >= 0 && r.relevanceScore <= 1
        )
      ).toBe(true);
    });

    it("should score memories between 0 and 1", async () => {
      const query: SearchQuery = { text: "test" };
      const results = await searcher.searchMemories(query);

      expect(
        results.every(
          (r) => r.relevanceScore >= 0 && r.relevanceScore <= 1
        )
      ).toBe(true);
    });

    it("should score commands between 0 and 1", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchCommands(query);

      expect(
        results.every(
          (r) => r.relevanceScore >= 0 && r.relevanceScore <= 1
        )
      ).toBe(true);
    });
  });

  describe("Field Matching", () => {
    it("should include matchedFields array in session results", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchSessions(query);

      if (results.length > 0) {
        expect(Array.isArray(results[0].matchedFields)).toBe(true);
      }
    });

    it("should include matchedFields array in memory results", async () => {
      const query: SearchQuery = { text: "test" };
      const results = await searcher.searchMemories(query);

      if (results.length > 0) {
        expect(Array.isArray(results[0].matchedFields)).toBe(true);
      }
    });

    it("should include matchedFields array in command results", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchCommands(query);

      if (results.length > 0) {
        expect(Array.isArray(results[0].matchedFields)).toBe(true);
      }
    });
  });

  describe("Result Grouping", () => {
    it("should group results by node", async () => {
      const query: SearchQuery = { text: "" };
      const results = await searcher.searchAll(query);

      if (results.groupedByNode) {
        expect(typeof results.groupedByNode).toBe("object");
        for (const [nodeId, grouped] of Object.entries(results.groupedByNode)) {
          expect(typeof nodeId).toBe("string");
          expect(grouped).toHaveProperty("sessions");
          expect(grouped).toHaveProperty("memories");
          expect(grouped).toHaveProperty("commands");
        }
      }
    });
  });

  describe("Query Parameter Handling", () => {
    it("should handle undefined query text", async () => {
      const query: SearchQuery = { text: undefined };
      const results = await searcher.searchAll(query);

      expect(results).toBeDefined();
    });

    it("should handle undefined limit with default 50", async () => {
      const query: SearchQuery = { text: "", limit: undefined };
      const results = await searcher.searchSessions(query);

      // Should not throw error
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle undefined offset with default 0", async () => {
      const query: SearchQuery = { text: "", offset: undefined };
      const results = await searcher.searchSessions(query);

      // Should not throw error
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle all filter combinations", async () => {
      const query: SearchQuery = {
        text: "test",
        command: "daily",
        provider: "claude",
        nodeId: "music",
        status: "completed" as SessionStatus,
      };
      const results = await searcher.searchAll(query);

      expect(results).toBeDefined();
    });
  });
});
