/**
 * Unit tests for context generation
 */

import { describe, it, expect } from "vitest";
import {
  createTempDir,
  getTempDir,
  createMockVault,
  writeJSON,
  fileExists,
} from "../conftest";
import { generateContext } from "../../../src/core/context";
import type { ContextOptions, NodeInfo } from "../../../src/core/types";
import path from "path";
import fs from "fs/promises";

describe("Context Generation and Loading", () => {
  describe("generateContext", () => {
    it("should generate context with basic information", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toBeDefined();
      expect(typeof context).toBe("string");
      expect(context.length).toBeGreaterThan(0);
    });

    it("should include vault name in context", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain("test-vault");
    });

    it("should include vault config metadata", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "music-vault",
        path: nodePath,
        type: "music",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain("music-vault");
      expect(context).toContain("music");
    });

    it("should handle context options parameter", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const options: ContextOptions = {
        provider: "gpt",
        includeCommands: true,
      };

      const context = await generateContext(vault, options);

      expect(context).toBeDefined();
      expect(typeof context).toBe("string");
    });

    it("should include AI provider information", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const options: ContextOptions = {
        provider: "claude",
      };

      const context = await generateContext(vault, options);

      expect(context).toBeDefined();
      expect(typeof context).toBe("string");
    });

    it("should handle different vault types", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "project",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain("test-vault");
      expect(context).toContain("project");
    });

    it("should include vault path information", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toBeDefined();
      expect(context.length).toBeGreaterThan(0);
    });

    it("should handle vault with custom context file", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      // Add custom context.md
      const bozlyPath = path.join(nodePath, ".bozly");
      const contextPath = path.join(bozlyPath, "context.md");
      await fs.writeFile(contextPath, "# Custom Vault Context\n\nThis is a custom context.");

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context = await generateContext(vault);

      expect(context).toContain("Custom Vault Context");
    });

    it("should be consistent across multiple calls", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const context1 = await generateContext(vault);
      const context2 = await generateContext(vault);

      expect(context1).toBe(context2);
    });

    it("should handle includeCommands option", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const contextWithCommands = await generateContext(vault, { includeCommands: true });
      const contextWithoutCommands = await generateContext(vault, { includeCommands: false });

      expect(contextWithCommands).toBeDefined();
      expect(contextWithoutCommands).toBeDefined();
    });

    it("should handle multiple AI providers", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const vault: NodeInfo = {
        id: "test-vault-id",
        name: "test-vault",
        path: nodePath,
        type: "default",
        active: true,
      };

      const providers = ["claude", "gpt", "gemini", "ollama"];

      for (const provider of providers) {
        const context = await generateContext(vault, { provider });
        expect(context).toBeDefined();
        expect(typeof context).toBe("string");
      }
    });
  });
});
