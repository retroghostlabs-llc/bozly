/**
 * Vault command management
 *
 * Handles command discovery, execution, and AI provider integration.
 * Provides functions to:
 * - Discover commands in a vault
 * - Get specific command content
 * - Run commands with optional context
 * - Execute prompts via AI providers (Claude, GPT, Gemini, Ollama)
 *
 * @module core/commands
 */

import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { VaultInfo, VaultCommand, RunOptions, RunResult } from "./types.js";
import { generateContext } from "./context.js";
import { loadModel, modelExists, formatModelForPrompt } from "./models.js";
import { validateProvider, getProviderConfig } from "./providers.js";

/**
 * Get all commands for a vault
 */
export async function getVaultCommands(vaultPath: string): Promise<VaultCommand[]> {
  const commandsPath = path.join(vaultPath, ".bozly", "commands");
  const commands: VaultCommand[] = [];

  try {
    const files = await fs.readdir(commandsPath);
    for (const file of files) {
      if (file.endsWith(".md")) {
        const name = file.replace(".md", "");
        const filePath = path.join(commandsPath, file);
        const content = await fs.readFile(filePath, "utf-8");
        const description = extractDescription(content);

        commands.push({
          name,
          description,
          file: filePath,
          content,
        });
      }
    }
  } catch {
    // No commands directory
  }

  return commands;
}

/**
 * Get a specific command
 */
export async function getCommand(
  vaultPath: string,
  commandName: string
): Promise<VaultCommand | null> {
  const commandsPath = path.join(vaultPath, ".bozly", "commands");
  const filePath = path.join(commandsPath, `${commandName}.md`);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const description = extractDescription(content);

    return {
      name: commandName,
      description,
      file: filePath,
      content,
    };
  } catch {
    return null;
  }
}

/**
 * Run a vault command
 *
 * Executes a command by:
 * 1. Loading command content and metadata
 * 2. Generating vault context (if enabled)
 * 3. Loading referenced model (if specified in command)
 * 4. Building complete prompt with context, model, and command
 * 5. Executing with AI provider (or showing dry-run)
 */
export async function runVaultCommand(
  vault: VaultInfo,
  commandName: string,
  options: RunOptions = {}
): Promise<RunResult> {
  const command = await getCommand(vault.path, commandName);

  if (!command) {
    throw new Error(`Command '${commandName}' not found in vault '${vault.name}'`);
  }

  // Generate context
  let context = "";
  if (options.includeContext !== false) {
    context = await generateContext(vault, { provider: options.provider });
  }

  // Load referenced model if specified in command
  let modelContent = "";
  const modelName = extractModelName(command.content);
  const modelsUsed: string[] = [];
  if (modelName) {
    try {
      const hasModel = await modelExists(vault.path, modelName);
      if (hasModel) {
        const model = await loadModel(vault.path, modelName);
        modelContent = formatModelForPrompt(model);
        modelsUsed.push(modelName);
      }
    } catch (error) {
      // If model fails to load, continue without it
      console.warn(`Warning: Could not load model '${modelName}'`);
    }
  }

  // Build prompt
  const prompt = buildPrompt(context, modelContent, command);
  const provider = options.provider || "claude";

  if (options.dryRun) {
    return {
      provider,
      prompt,
      contextSize: context.length,
      contextText: context,
      commandText: command.content,
      commandName,
      modelsUsed,
    };
  }

  // Execute with AI provider and measure duration
  const startTime = Date.now();
  const output = await executeWithProvider(provider, prompt);
  const duration = Date.now() - startTime;

  return {
    provider,
    prompt,
    contextSize: context.length,
    output,
    contextText: context,
    commandText: command.content,
    commandName,
    modelsUsed,
    duration,
  };
}

/**
 * Build the full prompt with context, model, and command
 */
function buildPrompt(context: string, modelContent: string, command: VaultCommand): string {
  let prompt = context;

  if (modelContent) {
    prompt += `\n\n---\n\n${modelContent}`;
  }

  prompt += `\n\n---\n\n## Command: /${command.name}\n\n${command.content}`;

  return prompt;
}

/**
 * Extract model name from command frontmatter (if specified)
 *
 * Looks for "model: model-name" in YAML frontmatter
 * @internal
 */
function extractModelName(content: string | undefined): string | null {
  if (!content) {
    return null;
  }

  const lines = content.split("\n");

  if (lines[0] === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === "---") {
        break;
      }
      const match = lines[i].match(/^model:\s*(.+)$/);
      if (match) {
        return match[1].trim();
      }
    }
  }

  return null;
}

/**
 * Execute prompt with AI provider
 *
 * Validates provider availability, executes with streaming output,
 * and returns full response text.
 *
 * @param provider - Provider name
 * @param prompt - Full prompt text
 * @returns Response text from provider
 * @throws Error if provider unavailable or execution fails
 */
async function executeWithProvider(provider: string, prompt: string): Promise<string> {
  // Validate provider is available
  await validateProvider(provider);

  // Get provider configuration
  const config = getProviderConfig(provider);

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const proc = spawn(config.command, config.args, {
      stdio: ["pipe", "pipe", "inherit"], // Stream stderr to console for user visibility
    });

    let output = "";

    // Send prompt via stdin
    if (proc.stdin) {
      proc.stdin.write(prompt);
      proc.stdin.end();
    }

    // Collect stdout
    if (proc.stdout) {
      proc.stdout.setEncoding("utf-8");
      proc.stdout.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        // Stream output to console in real-time
        process.stdout.write(chunk);
      });
    }

    proc.on("close", (code) => {
      const duration = Date.now() - startTime;

      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`${config.displayName} exited with code ${code} after ${duration}ms`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start ${config.displayName}: ${err.message}`));
    });
  });
}

/**
 * Extract description from command content
 */
function extractDescription(content: string): string {
  const lines = content.split("\n");

  // Check for YAML frontmatter
  if (lines[0] === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === "---") {
        break;
      }
      const match = lines[i].match(/^description:\s*(.+)$/);
      if (match) {
        return match[1];
      }
    }
  }

  // Use first non-empty, non-heading line
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---")) {
      return trimmed.slice(0, 100);
    }
  }

  return "No description";
}
