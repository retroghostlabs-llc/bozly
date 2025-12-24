/**
 * Unified prompt utilities for BOZLY CLI
 * Wraps @inquirer/prompts with common patterns and defaults
 */

import { input, select, confirm, checkbox } from "@inquirer/prompts";

/**
 * Prompt for text input
 */
export async function promptText(
  message: string,
  defaultValue?: string,
  validate?: (value: string) => boolean | string
): Promise<string> {
  return await input({
    message,
    default: defaultValue,
    validate: validate ? (v) => validate(v) || true : undefined,
  });
}

/**
 * Prompt for yes/no confirmation
 */
export async function promptConfirm(
  message: string,
  defaultValue: boolean = false
): Promise<boolean> {
  return await confirm({
    message,
    default: defaultValue,
  });
}

/**
 * Prompt to select one item from a list
 */
export async function promptSelect<T>(
  message: string,
  choices: Array<{
    value: T;
    name: string;
    description?: string;
  }>
): Promise<T> {
  return await select({
    message,
    choices: choices.map((c) => ({
      value: c.value,
      name: c.name,
      description: c.description,
    })),
  });
}

/**
 * Prompt to select multiple items from a list
 */
export async function promptMultiSelect<T>(
  message: string,
  choices: Array<{
    value: T;
    name: string;
    checked?: boolean;
  }>
): Promise<T[]> {
  return await checkbox({
    message,
    choices: choices.map((c) => ({
      value: c.value,
      name: c.name,
      checked: c.checked ?? false,
    })),
  });
}

/**
 * Validate command name (alphanumeric, hyphens, underscores)
 */
export function validateCommandName(name: string): boolean | string {
  if (!name || name.length === 0) {
    return "Name is required";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return "Name must contain only alphanumeric characters, hyphens, and underscores";
  }
  if (name.length > 50) {
    return "Name must be 50 characters or less";
  }
  return true;
}

/**
 * Validate template name (same rules as command name)
 */
export function validateTemplateName(name: string): boolean | string {
  return validateCommandName(name);
}

/**
 * Validate vault name (alphanumeric, hyphens, underscores, spaces)
 */
export function validateVaultName(name: string): boolean | string {
  if (!name || name.length === 0) {
    return "Name is required";
  }
  if (!/^[a-zA-Z0-9_\- ]+$/.test(name)) {
    return "Name must contain only alphanumeric characters, hyphens, underscores, and spaces";
  }
  if (name.length > 100) {
    return "Name must be 100 characters or less";
  }
  return true;
}

/**
 * Validate description (non-empty)
 */
export function validateDescription(desc: string): boolean | string {
  if (!desc || desc.length === 0) {
    return "Description is required";
  }
  if (desc.length > 500) {
    return "Description must be 500 characters or less";
  }
  return true;
}

/**
 * Validate that string is not empty
 */
export function validateRequired(value: string, fieldName: string): boolean | string {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return true;
}
