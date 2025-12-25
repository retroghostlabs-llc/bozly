/**
 * Unit tests for CLI box formatting utilities
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  successBox,
  errorBox,
  warningBox,
  infoBox,
  keyValueBox,
  formatList,
  formatSection,
} from "../../dist/cli/ui/boxes.js";

describe("Box Formatting", () => {
  const originalEnv = { ...process.env };
  const originalIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
  });

  describe("successBox", () => {
    it("creates success message in fancy terminal", () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = successBox("Operation successful");
      expect(box).toBeTruthy();
      expect(typeof box).toBe("string");
      expect(box).toContain("Operation successful");
      expect(box).toContain("✓");
    });

    it("creates success message with details in fancy terminal", () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = successBox("Node created", { Path: "~/music", ID: "abc123" });
      expect(box).toContain("Node created");
      expect(box).toContain("Path");
      expect(box).toContain("~/music");
    });

    it("creates simple success message in dumb terminal", () => {
      process.env.TERM = "dumb";
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = successBox("Operation successful");
      expect(box).toContain("✓");
      expect(box).toContain("Operation successful");
    });

    it("creates simple success message when NO_COLOR is set", () => {
      process.env.NO_COLOR = "1";
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = successBox("Operation successful");
      expect(box).toContain("✓");
      expect(box).toContain("Operation successful");
    });
  });

  describe("errorBox", () => {
    it("creates error message in fancy terminal", () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = errorBox("Operation failed");
      expect(box).toBeTruthy();
      expect(typeof box).toBe("string");
      expect(box).toContain("Operation failed");
      expect(box).toContain("✗");
    });

    it("creates error message with details", () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = errorBox("Node initialization failed", {
        Reason: "Invalid path",
        Code: "EINVAL",
      });
      expect(box).toContain("Node initialization failed");
      expect(box).toContain("Reason");
      expect(box).toContain("Invalid path");
    });

    it("creates simple error message in dumb terminal", () => {
      process.env.TERM = "dumb";
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = errorBox("Operation failed");
      expect(box).toContain("✗");
      expect(box).toContain("Operation failed");
    });
  });

  describe("warningBox", () => {
    it("creates warning message in fancy terminal", () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = warningBox("Deprecated command");
      expect(box).toBeTruthy();
      expect(typeof box).toBe("string");
      expect(box).toContain("Deprecated command");
      expect(box).toContain("⚠");
    });

    it("creates warning message with details", () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = warningBox("Update available", { Version: "v1.0.0" });
      expect(box).toContain("Update available");
      expect(box).toContain("Version");
    });
  });

  describe("infoBox", () => {
    it("creates info message in fancy terminal", () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = infoBox("Information message");
      expect(box).toBeTruthy();
      expect(typeof box).toBe("string");
      expect(box).toContain("Information message");
      expect(box).toContain("ℹ");
    });

    it("creates info message with details", () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = infoBox("Node created", { Type: "music", Status: "ready" });
      expect(box).toContain("Node created");
      expect(box).toContain("Type");
      expect(box).toContain("music");
    });
  });

  describe("keyValueBox", () => {
    it("creates titled key-value box in fancy terminal", () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = keyValueBox("Node Status", {
        Name: "music",
        Status: "active",
        Sessions: 42,
      });
      expect(box).toContain("Node Status");
      expect(box).toContain("Name");
      expect(box).toContain("music");
      expect(box).toContain("42");
    });

    it("creates simple key-value box in dumb terminal", () => {
      process.env.TERM = "dumb";
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      const box = keyValueBox("Status", { Count: 10 });
      expect(box).toContain("Status");
      expect(box).toContain("Count");
      expect(box).toContain("10");
    });
  });

  describe("formatList", () => {
    it("formats list with status indicators", () => {
      const items = [
        { label: "Task 1", status: "success" as const },
        { label: "Task 2", status: "error" as const },
        { label: "Task 3", status: "warning" as const },
        { label: "Task 4", status: "info" as const },
      ];

      const list = formatList(items);
      expect(list).toContain("Task 1");
      expect(list).toContain("Task 2");
      expect(list).toContain("Task 3");
      expect(list).toContain("Task 4");
      expect(list).toContain("✓"); // success
      expect(list).toContain("✗"); // error
      expect(list).toContain("⚠"); // warning
      expect(list).toContain("ℹ"); // info
    });

    it("formats list with details", () => {
      const items = [{ label: "Task", status: "success" as const, details: "Completed in 2.3s" }];

      const list = formatList(items);
      expect(list).toContain("Task");
      expect(list).toContain("Completed in 2.3s");
    });

    it("formats list items without status", () => {
      const items = [{ label: "Plain item" }];

      const list = formatList(items);
      expect(list).toContain("Plain item");
    });

    it("formats mixed items with and without status", () => {
      const items = [
        { label: "Success", status: "success" as const },
        { label: "No status" },
        { label: "Error", status: "error" as const },
      ];

      const list = formatList(items);
      expect(list).toContain("Success");
      expect(list).toContain("No status");
      expect(list).toContain("Error");
    });
  });

  describe("formatSection", () => {
    it("creates formatted section with title and content", () => {
      const section = formatSection("My Section", "This is the content");
      expect(section).toContain("My Section");
      expect(section).toContain("This is the content");
      expect(section).toContain("─"); // separator line
    });

    it("includes separator line matching title length", () => {
      const section = formatSection("Title", "Content");
      expect(section).toContain("─");
    });

    it("handles multiline content", () => {
      const content = "Line 1\nLine 2\nLine 3";
      const section = formatSection("Header", content);
      expect(section).toContain("Header");
      expect(section).toContain("Line 1");
      expect(section).toContain("Line 2");
      expect(section).toContain("Line 3");
    });

    it("handles empty content", () => {
      const section = formatSection("Title", "");
      expect(section).toContain("Title");
    });
  });
});
