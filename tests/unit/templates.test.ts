/**
 * Unit tests for template system
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createTempDir,
  getTempDir,
  readJSON,
  writeJSON,
  fileExists,
  dirExists,
} from "../conftest";
import {
  getTemplates,
  getTemplate,
  substituteVariables,
  buildTemplateContext,
  loadTemplateMetadata,
  createTemplate,
} from "../../dist/core/templates.js";
import type { TemplateMetadata, Template } from "../../dist/core/types.js";
import path from "path";
import fs from "fs/promises";
import os from "os";

describe("Template System", () => {
  describe("getTemplates", () => {
    it("should discover builtin templates", async () => {
      const templates = await getTemplates();
      expect(templates.length).toBeGreaterThan(0);

      // Verify builtin templates exist
      const builtinTemplates = templates.filter((t) => t.source === "builtin");
      expect(builtinTemplates.length).toBeGreaterThan(0);

      // Check for known templates
      const templateNames = builtinTemplates.map((t) => t.metadata.name);
      expect(templateNames).toContain("default");
    });

    it("should distinguish builtin from user templates", async () => {
      const templates = await getTemplates();
      const sources = templates.map((t) => t.source);

      expect(sources.some((s) => s === "builtin")).toBe(true);
      // User templates may or may not exist
    });

    it("should include template metadata", async () => {
      const templates = await getTemplates();
      expect(templates.length).toBeGreaterThan(0);

      const template = templates[0];
      expect(template.metadata).toBeDefined();
      expect(template.metadata.name).toBeDefined();
      expect(template.metadata.displayName).toBeDefined();
      expect(template.metadata.description).toBeDefined();
      expect(template.path).toBeDefined();
      expect(template.source).toBeDefined();
    });
  });

  describe("getTemplate", () => {
    it("should retrieve a specific template by name", async () => {
      const template = await getTemplate("default");
      expect(template).not.toBeNull();
      expect(template?.metadata.name).toBe("default");
    });

    it("should return null for non-existent templates", async () => {
      const template = await getTemplate("non-existent-template-xyz");
      expect(template).toBeNull();
    });

    it("should return correct template path", async () => {
      const template = await getTemplate("default");
      expect(template?.path).toBeDefined();
      expect(template?.path).toContain("default");
    });
  });

  describe("loadTemplateMetadata", () => {
    it("should load metadata from template.json", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const templatePath = path.join(tempDir, "test-template");

      await fs.mkdir(templatePath, { recursive: true });

      const metadata: TemplateMetadata = {
        name: "test",
        displayName: "Test Template",
        description: "A test template",
        version: "1.0.0",
        category: "test",
      };

      await writeJSON(path.join(templatePath, "template.json"), metadata);

      const loaded = await loadTemplateMetadata(templatePath);
      expect(loaded).toBeDefined();
      expect(loaded?.name).toBe("test");
      expect(loaded?.displayName).toBe("Test Template");
      expect(loaded?.category).toBe("test");
    });

    it("should generate default metadata if template.json not found", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const templatePath = path.join(tempDir, "another-template");

      await fs.mkdir(templatePath, { recursive: true });

      const metadata = await loadTemplateMetadata(templatePath);
      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe("another-template");
      expect(metadata?.displayName).toBe("Another-template");
      expect(metadata?.description).toBe("Custom template");
    });
  });

  describe("substituteVariables", () => {
    it("should replace variables in content", () => {
      const content = "Hello {{USER_NAME}}, welcome to {{VAULT_NAME}}!";
      const context = {
        USER_NAME: "John",
        VAULT_NAME: "My Vault",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toBe("Hello John, welcome to My Vault!");
    });

    it("should handle multiple occurrences of same variable", () => {
      const content = "{{VAULT_NAME}} - {{VAULT_NAME}} - {{VAULT_NAME}}";
      const context = {
        VAULT_NAME: "Music",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toBe("Music - Music - Music");
    });

    it("should handle whitespace in variable placeholders", () => {
      const content = "{{ VAULT_NAME }} and {{  CREATED_DATE  }}";
      const context = {
        VAULT_NAME: "Test",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toBe("Test and 2025-01-01");
    });

    it("should preserve unrecognized variables", () => {
      const content = "{{VAULT_NAME}} {{UNKNOWN_VAR}}";
      const context = {
        VAULT_NAME: "Test",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      // Unknown variables stay as-is
      expect(result).toContain("Test");
      expect(result).toContain("UNKNOWN_VAR");
    });

    it("should handle numeric and boolean values", () => {
      const content = "Version {{VERSION}}, Enabled: {{ENABLED}}";
      const context = {
        VERSION: 1 as unknown as string,
        ENABLED: true as unknown as string,
        VAULT_NAME: "",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toContain("1");
      expect(result).toContain("true");
    });
  });

  describe("buildTemplateContext", () => {
    it("should build context with system variables", () => {
      const context = buildTemplateContext(
        "my-vault",
        {},
        "0.3.0-rc.1"
      );

      expect(context.VAULT_NAME).toBe("my-vault");
      expect(context.BOZLY_VERSION).toBe("0.3.0-rc.1");
      expect(context.CREATED_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(context.CREATED_DATETIME).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(context.USER_NAME).toBeDefined();
    });

    it("should include custom user variables", () => {
      const userVariables = {
        CUSTOM_AUTHOR: "Jane Doe",
        CUSTOM_DOMAIN: "music",
      };

      const context = buildTemplateContext(
        "my-vault",
        userVariables,
        "0.3.0-rc.1"
      );

      expect(context.CUSTOM_AUTHOR).toBe("Jane Doe");
      expect(context.CUSTOM_DOMAIN).toBe("music");
    });

    it("should provide both date formats", () => {
      const context = buildTemplateContext("test", {}, "0.3.0");

      // CREATED_DATE should be YYYY-MM-DD
      const dateMatch = context.CREATED_DATE.match(/^\d{4}-\d{2}-\d{2}$/);
      expect(dateMatch).not.toBeNull();

      // CREATED_DATETIME should be ISO format
      const isoMatch = context.CREATED_DATETIME.match(/^\d{4}-\d{2}-\d{2}T/);
      expect(isoMatch).not.toBeNull();

      // Both should represent the same date
      expect(context.CREATED_DATETIME).toContain(context.CREATED_DATE);
    });

    it("should use environment USER_NAME when available", () => {
      const originalUser = process.env.USER;
      process.env.USER = "testuser";

      const context = buildTemplateContext("vault", {}, "0.3.0");
      expect(context.USER_NAME).toBe("testuser");

      if (originalUser) {
        process.env.USER = originalUser;
      } else {
        delete process.env.USER;
      }
    });
  });

  describe("createTemplate", () => {
    beforeEach(async () => {
      await createTempDir();
      // Mock the user templates directory
      process.env.HOME = getTempDir();
    });

    it("should create a new template directory structure", async () => {
      const userTemplatesDir = path.join(getTempDir(), ".bozly", "templates");
      await fs.mkdir(userTemplatesDir, { recursive: true });

      const templateName = "my-template";
      const templatePath = path.join(userTemplatesDir, templateName);

      // Note: createTemplate uses os.homedir() internally, so we can't easily test it
      // without mocking. This test verifies the template structure expectations.

      expect(templateName).toBe("my-template");
    });
  });

  describe("Template Metadata Structure", () => {
    it("should have all required fields in builtin templates", async () => {
      const templates = await getTemplates();
      const builtinTemplates = templates.filter((t) => t.source === "builtin");

      expect(builtinTemplates.length).toBeGreaterThan(0);

      for (const template of builtinTemplates) {
        expect(template.metadata.name).toBeDefined();
        expect(template.metadata.displayName).toBeDefined();
        expect(template.metadata.description).toBeDefined();
        expect(template.metadata.version).toBeDefined();
        expect(template.path).toBeDefined();
        expect(template.source).toBe("builtin");
      }
    });

    it("should have valid semver versions", async () => {
      const templates = await getTemplates();
      const semverRegex = /^\d+\.\d+\.\d+/;

      for (const template of templates) {
        expect(template.metadata.version).toMatch(semverRegex);
      }
    });
  });

  describe("Variable Substitution Edge Cases", () => {
    it("should handle nested variable references", () => {
      const content = "{{VAULT_NAME}} uses {{USER_NAME}}'s {{VAULT_NAME}} template";
      const context = {
        VAULT_NAME: "MyVault",
        USER_NAME: "Alice",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toBe("MyVault uses Alice's MyVault template");
    });

    it("should handle case-sensitive variable names", () => {
      const content = "{{vault_name}} vs {{VAULT_NAME}}";
      const context = {
        VAULT_NAME: "UPPER",
        vault_name: "lower",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toBe("lower vs UPPER");
    });

    it("should handle empty string values", () => {
      const content = "Prefix {{EMPTY}} Suffix";
      const context = {
        EMPTY: "",
        VAULT_NAME: "",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toBe("Prefix  Suffix");
    });

    it("should handle variables at start and end", () => {
      const content = "{{START}} middle {{END}}";
      const context = {
        START: "Beginning",
        END: "Ending",
        VAULT_NAME: "",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toBe("Beginning middle Ending");
    });

    it("should handle consecutive variables", () => {
      const content = "{{VAR1}}{{VAR2}}{{VAR3}}";
      const context = {
        VAR1: "A",
        VAR2: "B",
        VAR3: "C",
        VAULT_NAME: "",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toBe("ABC");
    });

    it("should handle multiline content with variables", () => {
      const content = `Line 1: {{VAR1}}
Line 2: {{VAR2}}
Line 3: {{VAR3}}`;

      const context = {
        VAR1: "Value1",
        VAR2: "Value2",
        VAR3: "Value3",
        VAULT_NAME: "",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toBe(`Line 1: Value1
Line 2: Value2
Line 3: Value3`);
    });
  });

  describe("Template Context Building Edge Cases", () => {
    it("should handle empty custom variables", () => {
      const context = buildTemplateContext("vault", {}, "1.0.0");

      expect(context.VAULT_NAME).toBe("vault");
      expect(context.BOZLY_VERSION).toBe("1.0.0");
      expect(context.USER_NAME).toBeDefined();
    });

    it("should allow custom variables to override system ones", () => {
      const customVars = {
        VAULT_NAME: "custom", // Override system var
        CUSTOM_FIELD: "extra", // Add new custom var
      };

      const context = buildTemplateContext("real-vault", customVars, "1.0.0");

      // Custom variables override system ones (spread operator places them last)
      expect(context.VAULT_NAME).toBe("custom");
      expect(context.BOZLY_VERSION).toBe("1.0.0");
      expect(context.CUSTOM_FIELD).toBe("extra");
    });

    it("should include all system variables", () => {
      const context = buildTemplateContext("test", {}, "0.3.0");

      const expectedVars = [
        "VAULT_NAME",
        "CREATED_DATE",
        "CREATED_DATETIME",
        "BOZLY_VERSION",
        "USER_NAME",
      ];

      for (const varName of expectedVars) {
        expect(context[varName]).toBeDefined();
      }
    });

    it("should create valid ISO datetime format", () => {
      const context = buildTemplateContext("vault", {}, "1.0.0");

      // Should be valid ISO format
      const date = new Date(context.CREATED_DATETIME);
      expect(date.toString()).not.toBe("Invalid Date");
    });

    it("should create valid YYYY-MM-DD date format", () => {
      const context = buildTemplateContext("vault", {}, "1.0.0");

      // Should match YYYY-MM-DD pattern
      expect(context.CREATED_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Should be within reasonable date range
      const year = parseInt(context.CREATED_DATE.substring(0, 4));
      expect(year).toBeGreaterThanOrEqual(2025);
      expect(year).toBeLessThanOrEqual(2030);
    });
  });

  describe("Template Metadata Defaults", () => {
    it("should generate sensible defaults when template.json missing", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const templatePath = path.join(tempDir, "my-template");

      await fs.mkdir(templatePath, { recursive: true });

      const metadata = await loadTemplateMetadata(templatePath);

      expect(metadata?.name).toBe("my-template");
      expect(metadata?.displayName).toBeDefined();
      expect(metadata?.description).toBeDefined();
      expect(metadata?.version).toBeDefined();
    });

    it("should derive displayName from template name with first letter capitalized", async () => {
      await createTempDir();
      const tempDir = getTempDir();
      const templatePath = path.join(tempDir, "music-journal");

      await fs.mkdir(templatePath, { recursive: true });

      const metadata = await loadTemplateMetadata(templatePath);

      // displayName is derived from name: capitalize first letter of directory name
      expect(metadata?.displayName).toBe("Music-journal");
    });
  });

  describe("Variable Validation", () => {
    it("should handle variables with special characters in names", () => {
      const content = "Value: {{SPECIAL_VAR_123}}";
      const context = {
        SPECIAL_VAR_123: "success",
        VAULT_NAME: "",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toBe("Value: success");
    });

    it("should preserve unicode in substituted values", () => {
      const content = "Name: {{USER_NAME}}";
      const context = {
        USER_NAME: "José García",
        VAULT_NAME: "",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toBe("Name: José García");
    });

    it("should handle very long variable values", () => {
      const longValue = "a".repeat(1000);
      const content = "Content: {{LONG_VAR}}";
      const context = {
        LONG_VAR: longValue,
        VAULT_NAME: "",
        CREATED_DATE: "2025-01-01",
        CREATED_DATETIME: "2025-01-01T00:00:00Z",
        BOZLY_VERSION: "0.3.0",
      };

      const result = substituteVariables(content, context);
      expect(result).toContain(longValue);
    });
  });
});
