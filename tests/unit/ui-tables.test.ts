/**
 * Unit tests for CLI table formatting utilities
 */

import { describe, it, expect } from "vitest";
import {
  formatNodeTable,
  formatSessionTable,
  formatStatsTable,
  formatSearchResultsTable,
  formatKeyValue,
} from "../../dist/cli/ui/tables.js";

describe("Table Formatting", () => {
  describe("formatNodeTable", () => {
    it("formats node list with status indicators", () => {
      const nodes = [
        { name: "music", path: "~/music", active: true },
        { name: "projects", path: "~/projects", active: false },
      ];

      const table = formatNodeTable(nodes);
      expect(table).toContain("●"); // active indicator
      expect(table).toContain("○"); // inactive indicator
      expect(table).toContain("music");
      expect(table).toContain("projects");
    });

    it("handles empty node list", () => {
      const table = formatNodeTable([]);
      expect(table).toBe("");
    });

    it("handles nodes without active status", () => {
      const nodes = [{ name: "test", path: "~/test" }];
      const table = formatNodeTable(nodes);
      expect(table).toContain("test");
      expect(table).toContain("~/test");
    });

    it("includes table borders", () => {
      const nodes = [{ name: "music", path: "~/music", active: true }];
      const table = formatNodeTable(nodes);
      expect(table).toContain("┌");
      expect(table).toContain("┐");
      expect(table).toContain("└");
      expect(table).toContain("┘");
    });
  });

  describe("formatSessionTable", () => {
    it("formats session list with timestamps and status", () => {
      const sessions = [
        {
          command: "daily",
          timestamp: "2025-12-25T10:30:00Z",
          status: "completed" as const,
          relevanceScore: 0.95,
        },
        {
          command: "weekly",
          timestamp: "2025-12-24T14:15:00Z",
          status: "failed" as const,
          relevanceScore: 0.72,
        },
      ];

      const table = formatSessionTable(sessions);
      expect(table).toContain("daily");
      expect(table).toContain("weekly");
      expect(table).toContain("25"); // date from 12-25
      expect(table).toContain("24"); // date from 12-24
      expect(table).toContain("AM"); // time indicator (locale-dependent)
      expect(table).toContain("completed");
      expect(table).toContain("failed");
    });

    it("handles sessions without relevance score", () => {
      const sessions = [
        {
          command: "test",
          timestamp: "2025-12-25T10:00:00Z",
          status: "dry_run" as const,
        },
      ];

      const table = formatSessionTable(sessions);
      expect(table).toContain("test");
      expect(table).toContain("—"); // score placeholder when missing
    });

    it("formats status with colors", () => {
      const sessions = [
        {
          command: "cmd1",
          timestamp: "2025-12-25T10:00:00Z",
          status: "completed" as const,
        },
      ];

      const table = formatSessionTable(sessions);
      expect(table).toContain("completed");
    });

    it("includes table borders", () => {
      const sessions = [
        {
          command: "test",
          timestamp: "2025-12-25T10:00:00Z",
          status: "completed" as const,
        },
      ];

      const table = formatSessionTable(sessions);
      expect(table).toContain("┌");
      expect(table).toContain("└");
    });
  });

  describe("formatStatsTable", () => {
    it("formats key-value statistics", () => {
      const stats = {
        "Total Sessions": 42,
        "Success Rate": "95.2%",
        "Avg Duration": "2.3s",
      };

      const table = formatStatsTable(stats);
      expect(table).toContain("Total Sessions");
      expect(table).toContain("42");
      expect(table).toContain("Success Rate");
      expect(table).toContain("95.2%");
    });

    it("handles empty stats", () => {
      const table = formatStatsTable({});
      expect(table).toBe("");
    });

    it("handles numeric values", () => {
      const stats = { Count: 123, Percentage: 45.6 };
      const table = formatStatsTable(stats);
      expect(table).toContain("123");
      expect(table).toContain("45.6");
    });
  });

  describe("formatSearchResultsTable", () => {
    it("formats mixed search results by type", () => {
      const results = [
        {
          type: "session" as const,
          command: "daily",
          node: "music",
          date: "12-25",
          time: "10:30",
          status: "completed",
          score: 0.95,
        },
        {
          type: "command" as const,
          name: "run",
          node: "global",
          source: "builtin",
          score: 0.87,
        },
      ];

      const table = formatSearchResultsTable(results);
      expect(table).toContain("Sessions");
      expect(table).toContain("daily");
      expect(table).toContain("Commands");
      expect(table).toContain("run");
    });

    it("formats memory search results", () => {
      const results = [
        {
          type: "memory" as const,
          summary: "Important memory",
          node: "music",
          score: 0.92,
        },
      ];

      const table = formatSearchResultsTable(results);
      expect(table).toContain("Memories");
      expect(table).toContain("Important memory");
    });

    it("respects limit parameter", () => {
      const results = Array.from({ length: 15 }, (_, i) => ({
        type: "session" as const,
        command: `cmd${i}`,
        node: "music",
        date: "12-25",
        time: "10:00",
        status: "completed",
        score: 0.9,
      }));

      const table = formatSearchResultsTable(results, 5);
      // Should contain max 5 results
      const cmdMatches = (table.match(/cmd\d/g) || []).length;
      expect(cmdMatches).toBeLessThanOrEqual(5);
    });

    it("handles empty results", () => {
      const table = formatSearchResultsTable([]);
      expect(table).toBe("");
    });

    it("handles results with missing optional fields", () => {
      const results = [
        {
          type: "session" as const,
          command: "test",
          node: "music",
          score: 0.9,
        },
      ];

      const table = formatSearchResultsTable(results);
      expect(table).toContain("test");
    });
  });

  describe("formatKeyValue", () => {
    it("formats key-value pairs in table", () => {
      const pairs = {
        Name: "test-node",
        Status: "active",
        Path: "/home/user/test",
      };

      const table = formatKeyValue(pairs);
      expect(table).toContain("Name");
      expect(table).toContain("test-node");
      expect(table).toContain("Status");
      expect(table).toContain("active");
    });

    it("handles numeric values", () => {
      const pairs = {
        Count: 42,
        Score: 95.5,
      };

      const table = formatKeyValue(pairs);
      expect(table).toContain("42");
      expect(table).toContain("95.5");
    });

    it("handles boolean values", () => {
      const pairs = {
        Active: true,
        Archived: false,
      };

      const table = formatKeyValue(pairs);
      expect(table).toContain("true");
      expect(table).toContain("false");
    });

    it("includes table borders", () => {
      const pairs = { Test: "value" };
      const table = formatKeyValue(pairs);
      expect(table).toContain("┌");
      expect(table).toContain("└");
    });
  });
});
