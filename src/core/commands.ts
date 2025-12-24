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
import * as os from "os";
import { spawn } from "child_process";
import { NodeInfo, NodeCommand, RunOptions, RunResult, HookContext } from "./types.js";
import { generateContext } from "./context.js";
import { loadModel, modelExists, formatModelForPrompt } from "./models.js";
import { validateProvider, getProviderConfig } from "./providers.js";
import { executeHooks } from "./hooks.js";

/**
 * Get all commands for a vault
 */
export async function getNodeCommands(vaultPath: string): Promise<NodeCommand[]> {
  const commandsPath = path.join(vaultPath, ".bozly", "commands");
  const commands: NodeCommand[] = [];

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
 * Get a specific command (vault first, then global)
 * Searches in order: vault local → global → null
 */
export async function getCommand(
  vaultPath: string,
  commandName: string
): Promise<NodeCommand | null> {
  // Try vault-local first
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
      source: "vault",
    };
  } catch {
    // Try global commands
    const globalCommands = await getGlobalCommands();
    const globalCommand = globalCommands.find((c) => c.name === commandName);
    if (globalCommand) {
      return globalCommand;
    }
    return null;
  }
}

/**
 * Get all global commands from ~/.bozly/commands/
 * Initializes default commands on first run
 */
export async function getGlobalCommands(): Promise<NodeCommand[]> {
  // Initialize default commands if not already present
  await initializeDefaultCommands();

  const globalPath = path.join(os.homedir(), ".bozly", "commands");
  const commands: NodeCommand[] = [];

  try {
    const files = await fs.readdir(globalPath);
    for (const file of files) {
      if (file.endsWith(".md")) {
        const name = file.replace(".md", "");
        const filePath = path.join(globalPath, file);
        const content = await fs.readFile(filePath, "utf-8");
        const description = extractDescription(content);

        commands.push({
          name,
          description,
          file: filePath,
          content,
          source: "global",
        });
      }
    }
  } catch {
    // Global commands directory may not exist yet
  }

  return commands;
}

/**
 * Get all available commands (vault + global with resolution)
 * Vault commands override global commands of the same name
 */
export async function getAllCommands(vaultPath: string): Promise<NodeCommand[]> {
  const commandsByName = new Map<string, NodeCommand>();

  // Load global commands first (lowest priority)
  const globalCommands = await getGlobalCommands();
  for (const cmd of globalCommands) {
    commandsByName.set(cmd.name, cmd);
  }

  // Load vault commands (override global)
  const vaultCommands = await getNodeCommands(vaultPath);
  for (const cmd of vaultCommands) {
    commandsByName.set(cmd.name, { ...cmd, source: "vault" });
  }

  return Array.from(commandsByName.values());
}

/**
 * Create a new global command file
 */
export async function createGlobalCommand(
  name: string,
  description: string,
  content: string
): Promise<void> {
  const globalPath = path.join(os.homedir(), ".bozly", "commands");

  // Create directory if not exists
  await fs.mkdir(globalPath, { recursive: true });

  // Create command file with frontmatter
  const fullContent = `---
description: ${description}
---

${content}`;

  const filePath = path.join(globalPath, `${name}.md`);
  await fs.writeFile(filePath, fullContent, "utf-8");
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
export async function runNodeCommand(
  vault: NodeInfo,
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

  // Execute pre-execution hooks (before calling AI)
  const preContext: HookContext = {
    nodeId: vault.id,
    nodeName: vault.name,
    nodePath: vault.path,
    command: commandName,
    provider,
    timestamp: new Date().toISOString(),
    prompt,
    promptSize: prompt.length,
  };

  await executeHooks(vault.path, "pre-execution", preContext);

  // Execute with AI provider and measure duration
  const startTime = Date.now();
  const output = await executeWithProvider(provider, prompt);
  const duration = Date.now() - startTime;

  // Execute post-execution hooks (after AI completes successfully)
  const postContext: HookContext = {
    nodeId: vault.id,
    nodeName: vault.name,
    nodePath: vault.path,
    command: commandName,
    provider,
    timestamp: new Date().toISOString(),
    prompt,
    promptSize: prompt.length,
    session: {
      id: "pre-recording", // Will be created in run.ts after recordSession
      sessionPath: vault.path,
      status: "completed",
      duration,
      output,
    },
  };

  await executeHooks(vault.path, "post-execution", postContext);

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
function buildPrompt(context: string, modelContent: string, command: NodeCommand): string {
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

/**
 * Initialize default global commands on first run
 * Copies default commands from package to ~/.bozly/commands/ if not already present
 */
export async function initializeDefaultCommands(): Promise<void> {
  const globalPath = path.join(os.homedir(), ".bozly", "commands");

  try {
    // Check if global commands directory exists
    try {
      await fs.access(globalPath);
      // Directory exists, check if it already has commands
      const files = await fs.readdir(globalPath);
      if (files.length > 0) {
        // Commands already initialized
        return;
      }
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(globalPath, { recursive: true });
    }

    // Copy default commands from package
    const defaultCommandsPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      "..",
      "..",
      "default-commands"
    );

    try {
      const defaultFiles = await fs.readdir(defaultCommandsPath);

      for (const file of defaultFiles) {
        if (file.endsWith(".md")) {
          const sourcePath = path.join(defaultCommandsPath, file);
          const targetPath = path.join(globalPath, file);

          // Skip if already exists
          try {
            await fs.access(targetPath);
            continue;
          } catch {
            // File doesn't exist, OK to copy
          }

          // Copy the file
          const content = await fs.readFile(sourcePath, "utf-8");
          await fs.writeFile(targetPath, content, "utf-8");
        }
      }
    } catch (error) {
      // Default commands directory not found (might be in different build/install location)
      // This is not fatal - just means default commands aren't initialized
      // User can create commands manually with 'bozly command create'
    }
  } catch (error) {
    // Initialization failed but not fatal - user can still use BOZLY
    // Just log at debug level
  }
}
