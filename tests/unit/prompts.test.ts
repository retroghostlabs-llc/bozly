/**
 * Unit tests for prompt utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  promptText,
  promptConfirm,
  promptSelect,
  promptMultiSelect,
  validateCommandName,
  validateTemplateName,
  validateVaultName,
  validateDescription,
  validateRequired,
} from "../../dist/utils/prompts.js";

// Mock @inquirer/prompts
vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
  checkbox: vi.fn(),
}));

import * as inquirer from "@inquirer/prompts";

describe("Prompt Validators", () => {
  describe("validateCommandName", () => {
    it("should accept valid command names", () => {
      expect(validateCommandName("my-command")).toBe(true);
      expect(validateCommandName("my_command")).toBe(true);
      expect(validateCommandName("MyCommand123")).toBe(true);
      expect(validateCommandName("a")).toBe(true);
      expect(validateCommandName("command-name_123")).toBe(true);
    });

    it("should reject empty names", () => {
      const result = validateCommandName("");
      expect(result).not.toBe(true);
      expect(result).toContain("required");
    });

    it("should reject names with invalid characters", () => {
      const result = validateCommandName("my command");
      expect(result).not.toBe(true);
      expect(result).toContain("alphanumeric");
    });

    it("should reject names with special characters", () => {
      const result = validateCommandName("my@command");
      expect(result).not.toBe(true);
    });

    it("should reject names with periods", () => {
      const result = validateCommandName("my.command");
      expect(result).not.toBe(true);
    });

    it("should reject names exceeding 50 characters", () => {
      const longName = "a".repeat(51);
      const result = validateCommandName(longName);
      expect(result).not.toBe(true);
      expect(result).toContain("50 characters");
    });

    it("should accept names exactly 50 characters", () => {
      const name = "a".repeat(50);
      expect(validateCommandName(name)).toBe(true);
    });
  });

  describe("validateTemplateName", () => {
    it("should use same rules as command name", () => {
      expect(validateTemplateName("my-template")).toBe(true);
      expect(validateTemplateName("my_template")).toBe(true);
      expect(validateTemplateName("MyTemplate123")).toBe(true);
    });

    it("should reject invalid template names same as command names", () => {
      const result = validateTemplateName("my template");
      expect(result).not.toBe(true);
    });

    it("should reject names exceeding 50 characters", () => {
      const longName = "a".repeat(51);
      const result = validateTemplateName(longName);
      expect(result).not.toBe(true);
    });
  });

  describe("validateVaultName", () => {
    it("should accept valid vault names", () => {
      expect(validateVaultName("My Vault")).toBe(true);
      expect(validateVaultName("my-vault")).toBe(true);
      expect(validateVaultName("my_vault")).toBe(true);
      expect(validateVaultName("My Vault 123")).toBe(true);
      expect(validateVaultName("Music Journey")).toBe(true);
    });

    it("should allow spaces in vault names", () => {
      expect(validateVaultName("My Music Vault")).toBe(true);
    });

    it("should reject empty names", () => {
      const result = validateVaultName("");
      expect(result).not.toBe(true);
      expect(result).toContain("required");
    });

    it("should reject names with invalid characters", () => {
      const result = validateVaultName("my@vault");
      expect(result).not.toBe(true);
    });

    it("should reject names with special characters", () => {
      const result = validateVaultName("my#vault");
      expect(result).not.toBe(true);
    });

    it("should reject names exceeding 100 characters", () => {
      const longName = "a".repeat(101);
      const result = validateVaultName(longName);
      expect(result).not.toBe(true);
      expect(result).toContain("100 characters");
    });

    it("should accept names exactly 100 characters", () => {
      const name = "a".repeat(100);
      expect(validateVaultName(name)).toBe(true);
    });
  });

  describe("validateDescription", () => {
    it("should accept valid descriptions", () => {
      expect(validateDescription("A short description")).toBe(true);
      expect(validateDescription("A longer description with more details about what this template does")).toBe(true);
    });

    it("should reject empty descriptions", () => {
      const result = validateDescription("");
      expect(result).not.toBe(true);
      expect(result).toContain("required");
    });

    it("should accept whitespace-only descriptions (uses length check only)", () => {
      // validateDescription only checks for empty string or length > 500
      // It does NOT trim whitespace like validateRequired does
      const result = validateDescription("   ");
      expect(result).toBe(true);
    });

    it("should reject descriptions exceeding 500 characters", () => {
      const longDesc = "a".repeat(501);
      const result = validateDescription(longDesc);
      expect(result).not.toBe(true);
      expect(result).toContain("500 characters");
    });

    it("should accept descriptions exactly 500 characters", () => {
      const desc = "a".repeat(500);
      expect(validateDescription(desc)).toBe(true);
    });

    it("should allow special characters in descriptions", () => {
      expect(validateDescription("This is a description with special chars: @#$%!")).toBe(true);
    });
  });

  describe("validateRequired", () => {
    it("should accept non-empty values", () => {
      expect(validateRequired("some value", "Field")).toBe(true);
    });

    it("should reject empty values", () => {
      const result = validateRequired("", "FieldName");
      expect(result).not.toBe(true);
      expect(result).toContain("FieldName");
      expect(result).toContain("required");
    });

    it("should reject whitespace-only values", () => {
      const result = validateRequired("   ", "MyField");
      expect(result).not.toBe(true);
      expect(result).toContain("MyField");
    });

    it("should include custom field name in error message", () => {
      const result = validateRequired("", "CustomFieldName");
      expect(result).toContain("CustomFieldName");
    });
  });
});

describe("Prompt Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("promptText", () => {
    it("should call input with message", async () => {
      const mockInput = vi.mocked(inquirer.input);
      mockInput.mockResolvedValue("user input");

      const result = await promptText("Enter name:");
      expect(result).toBe("user input");
      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Enter name:",
        })
      );
    });

    it("should pass default value to input", async () => {
      const mockInput = vi.mocked(inquirer.input);
      mockInput.mockResolvedValue("default");

      await promptText("Enter name:", "default value");
      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          default: "default value",
        })
      );
    });

    it("should handle custom validation function", async () => {
      const mockInput = vi.mocked(inquirer.input);
      const mockValidator = vi.fn().mockReturnValue(true);

      mockInput.mockResolvedValue("test");

      const result = await promptText("Enter:", undefined, mockValidator);
      expect(result).toBe("test");
    });

    it("should pass validation function to input when provided", async () => {
      const mockInput = vi.mocked(inquirer.input);
      const validator = (v: string) => v.length > 0;

      mockInput.mockResolvedValue("value");

      await promptText("Message", undefined, validator);

      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          validate: expect.any(Function),
        })
      );
    });

    it("should not pass validation when not provided", async () => {
      const mockInput = vi.mocked(inquirer.input);
      mockInput.mockResolvedValue("value");

      await promptText("Message");

      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          validate: undefined,
        })
      );
    });
  });

  describe("promptConfirm", () => {
    it("should call confirm with message", async () => {
      const mockConfirm = vi.mocked(inquirer.confirm);
      mockConfirm.mockResolvedValue(true);

      const result = await promptConfirm("Continue?");
      expect(result).toBe(true);
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Continue?",
        })
      );
    });

    it("should use false as default when not specified", async () => {
      const mockConfirm = vi.mocked(inquirer.confirm);
      mockConfirm.mockResolvedValue(false);

      await promptConfirm("Continue?");
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          default: false,
        })
      );
    });

    it("should use provided default value", async () => {
      const mockConfirm = vi.mocked(inquirer.confirm);
      mockConfirm.mockResolvedValue(true);

      await promptConfirm("Continue?", true);
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          default: true,
        })
      );
    });

    it("should return true when user confirms", async () => {
      const mockConfirm = vi.mocked(inquirer.confirm);
      mockConfirm.mockResolvedValue(true);

      const result = await promptConfirm("Are you sure?");
      expect(result).toBe(true);
    });

    it("should return false when user denies", async () => {
      const mockConfirm = vi.mocked(inquirer.confirm);
      mockConfirm.mockResolvedValue(false);

      const result = await promptConfirm("Are you sure?");
      expect(result).toBe(false);
    });
  });

  describe("promptSelect", () => {
    it("should call select with message and choices", async () => {
      const mockSelect = vi.mocked(inquirer.select);
      mockSelect.mockResolvedValue("option1");

      const choices = [
        { value: "option1", name: "Option 1" },
        { value: "option2", name: "Option 2" },
      ];

      const result = await promptSelect("Choose:", choices);
      expect(result).toBe("option1");
      expect(mockSelect).toHaveBeenCalled();
    });

    it("should map choice objects correctly", async () => {
      const mockSelect = vi.mocked(inquirer.select);
      mockSelect.mockResolvedValue("music");

      const choices = [
        { value: "music", name: "Music Vault", description: "Music collection" },
        { value: "projects", name: "Projects", description: "Work projects" },
      ];

      await promptSelect("Select vault:", choices);

      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              value: "music",
              name: "Music Vault",
              description: "Music collection",
            }),
          ]),
        })
      );
    });

    it("should return selected value", async () => {
      const mockSelect = vi.mocked(inquirer.select);
      mockSelect.mockResolvedValue(42);

      const choices = [
        { value: 1, name: "One" },
        { value: 42, name: "Forty-two" },
      ];

      const result = await promptSelect("Pick a number:", choices);
      expect(result).toBe(42);
    });

    it("should work with string values", async () => {
      const mockSelect = vi.mocked(inquirer.select);
      mockSelect.mockResolvedValue("claude");

      const choices = [
        { value: "claude", name: "Claude" },
        { value: "gpt", name: "GPT" },
      ];

      const result = await promptSelect("Choose AI:", choices);
      expect(result).toBe("claude");
    });
  });

  describe("promptMultiSelect", () => {
    it("should call checkbox with message and choices", async () => {
      const mockCheckbox = vi.mocked(inquirer.checkbox);
      mockCheckbox.mockResolvedValue(["option1"]);

      const choices = [
        { value: "option1", name: "Option 1" },
        { value: "option2", name: "Option 2" },
      ];

      const result = await promptMultiSelect("Choose:", choices);
      expect(result).toEqual(["option1"]);
      expect(mockCheckbox).toHaveBeenCalled();
    });

    it("should handle pre-checked items", async () => {
      const mockCheckbox = vi.mocked(inquirer.checkbox);
      mockCheckbox.mockResolvedValue(["feature1", "feature2"]);

      const choices = [
        { value: "feature1", name: "Feature 1", checked: true },
        { value: "feature2", name: "Feature 2", checked: true },
        { value: "feature3", name: "Feature 3", checked: false },
      ];

      await promptMultiSelect("Select features:", choices);

      expect(mockCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              value: "feature1",
              checked: true,
            }),
            expect.objectContaining({
              value: "feature3",
              checked: false,
            }),
          ]),
        })
      );
    });

    it("should default to unchecked if not specified", async () => {
      const mockCheckbox = vi.mocked(inquirer.checkbox);
      mockCheckbox.mockResolvedValue([]);

      const choices = [
        { value: "option1", name: "Option 1" },
      ];

      await promptMultiSelect("Choose:", choices);

      expect(mockCheckbox).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              value: "option1",
              checked: false,
            }),
          ]),
        })
      );
    });

    it("should return multiple selections", async () => {
      const mockCheckbox = vi.mocked(inquirer.checkbox);
      mockCheckbox.mockResolvedValue(["a", "c"]);

      const choices = [
        { value: "a", name: "Alpha" },
        { value: "b", name: "Beta" },
        { value: "c", name: "Gamma" },
      ];

      const result = await promptMultiSelect("Select:", choices);
      expect(result).toEqual(["a", "c"]);
    });

    it("should return empty array if nothing selected", async () => {
      const mockCheckbox = vi.mocked(inquirer.checkbox);
      mockCheckbox.mockResolvedValue([]);

      const choices = [
        { value: "option1", name: "Option 1" },
      ];

      const result = await promptMultiSelect("Select:", choices);
      expect(result).toEqual([]);
    });

    it("should work with numeric values", async () => {
      const mockCheckbox = vi.mocked(inquirer.checkbox);
      mockCheckbox.mockResolvedValue([1, 3]);

      const choices = [
        { value: 1, name: "One" },
        { value: 2, name: "Two" },
        { value: 3, name: "Three" },
      ];

      const result = await promptMultiSelect("Pick numbers:", choices);
      expect(result).toEqual([1, 3]);
    });
  });
});
