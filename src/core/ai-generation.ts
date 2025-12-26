/**
 * AI-Powered Command & Template Generation
 * Phase 2.5: AI-Assisted Creation
 *
 * Generates command prompts and templates using AI providers
 * (Claude, GPT, Gemini, Ollama) based on user descriptions.
 *
 * @module core/ai-generation
 */

import { spawn } from "child_process";
import { getProviderConfig, validateProvider } from "./providers.js";

/**
 * Generate command content via AI
 *
 * Takes a user's description and uses configured AI provider
 * to generate a complete command prompt template.
 *
 * @param name - Command name
 * @param purpose - What the command should do
 * @param examples - Example use cases (optional)
 * @param provider - AI provider to use (e.g., 'claude')
 * @returns Generated command prompt content
 * @throws Error if provider is not installed or generation fails
 */
export async function generateCommandContent(
  name: string,
  purpose: string,
  examples: string,
  provider: string
): Promise<string> {
  // Validate provider is installed
  await validateProvider(provider);

  // Build the generation prompt
  const generationPrompt = buildCommandGenerationPrompt(name, purpose, examples);

  // Execute via AI provider
  const generatedContent = await executeWithProvider(provider, generationPrompt);

  // Clean up the response (remove any markdown code fences)
  return cleanGeneratedContent(generatedContent);
}

/**
 * Generate template from vault analysis
 *
 * Analyzes vault structure and uses AI to generalize it into
 * a reusable template with variables.
 *
 * @param vaultName - Name of the vault
 * @param vaultStructure - JSON description of vault structure
 * @param provider - AI provider to use
 * @returns Generated template as JSON
 */
export async function generateTemplateFromVault(
  vaultName: string,
  vaultStructure: string,
  provider: string
): Promise<string> {
  // Validate provider
  await validateProvider(provider);

  // Build the template generation prompt
  const generationPrompt = buildTemplateGenerationPrompt(vaultName, vaultStructure);

  // Execute via AI provider
  const generatedTemplate = await executeWithProvider(provider, generationPrompt);

  // Clean up and validate JSON
  return cleanGeneratedContent(generatedTemplate);
}

/**
 * Suggest new commands user might need
 *
 * Analyzes session history patterns and uses AI to suggest
 * new commands the user might want to create.
 *
 * @param sessionHistory - Summary of recent sessions
 * @param provider - AI provider to use
 * @returns Generated suggestions as JSON array
 */
export async function generateCommandSuggestions(
  sessionHistory: string,
  provider: string
): Promise<string> {
  // Validate provider
  await validateProvider(provider);

  // Build the suggestions prompt
  const generationPrompt = buildSuggestionsPrompt(sessionHistory);

  // Execute via AI provider
  const generatedSuggestions = await executeWithProvider(provider, generationPrompt);

  // Clean up and validate JSON
  return cleanGeneratedContent(generatedSuggestions);
}

/**
 * Build the command generation prompt
 *
 * Creates a structured prompt that guides AI to generate
 * a well-formed command markdown file with proper syntax.
 */
function buildCommandGenerationPrompt(name: string, purpose: string, examples: string): string {
  return `You are a prompt engineering expert. Create a command prompt that will help users accomplish a specific task via an AI assistant.

Command Details:
- Name: ${name}
- Purpose: ${purpose}
${examples ? `- Use Cases: ${examples}` : ""}

Generate a COMPLETE command prompt that:
1. Clearly explains what the AI should do
2. Includes any context the AI needs (domain knowledge, format preferences, etc.)
3. Provides example outputs if relevant
4. Specifies the format of responses expected
5. Includes any constraints or rules the AI should follow

The prompt should be:
- Professional and clear
- Actionable and specific
- Formatted for easy use in BOZLY
- Between 200-500 words

Return ONLY the command prompt text, without markdown code fences or additional explanation.`;
}

/**
 * Build the template generation prompt
 *
 * Creates a prompt that guides AI to analyze vault structure
 * and suggest variables for a reusable template.
 */
function buildTemplateGenerationPrompt(vaultName: string, vaultStructure: string): string {
  return `You are a template design expert. Analyze this vault structure and create a reusable template.

Vault Name: ${vaultName}
Structure:
${vaultStructure}

Generate a template configuration as JSON with:
1. "name": Template identifier (kebab-case)
2. "description": What this template is for
3. "variables": Array of variables with:
   - "name": Variable name (SCREAMING_SNAKE_CASE)
   - "description": What this variable is for
   - "default": Default value (if any)
   - "example": Example value
4. "directories": Array of directories to create
5. "files": Array of files to create with paths using variables

Variables should include:
- {{VAULT_NAME}} - Name of the vault
- {{CREATED_DATE}} - Creation date
- Any domain-specific variables (e.g., {{ARTIST_NAME}} for music vault)

Return ONLY valid JSON, no markdown code fences or explanation.`;
}

/**
 * Build the suggestions prompt
 *
 * Creates a prompt that analyzes session patterns and
 * suggests new commands the user might need.
 */
function buildSuggestionsPrompt(sessionHistory: string): string {
  return `You are a workflow optimization expert. Analyze this session history and suggest new commands the user might benefit from.

Session History:
${sessionHistory}

For each suggestion, provide JSON with:
1. "name": Command name (kebab-case)
2. "purpose": What the command should do
3. "confidence": Confidence score 0-1
4. "rationale": Why this command would be useful based on the history
5. "exampleUsage": How the user might use it

Suggest 3-5 commands that would improve the user's workflow.
Return a JSON array with these objects.
No markdown code fences or additional explanation - ONLY valid JSON.`;
}

/**
 * Execute prompt with AI provider via stdin/stdout
 *
 * Spawns the provider CLI and passes the prompt via stdin,
 * collecting output via stdout.
 *
 * @param provider - Provider name (e.g., 'claude')
 * @param prompt - The prompt to send to AI
 * @returns AI-generated response
 * @throws Error if provider execution fails
 */
async function executeWithProvider(provider: string, prompt: string): Promise<string> {
  const config = getProviderConfig(provider);

  return new Promise((resolve, reject) => {
    const proc = spawn(config.command, config.args, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 60000, // 60 second timeout for generation
    });

    let output = "";
    let errorOutput = "";

    // Send prompt via stdin
    if (proc.stdin) {
      proc.stdin.write(prompt);
      proc.stdin.end();
    }

    // Collect stdout
    if (proc.stdout) {
      proc.stdout.setEncoding("utf-8");
      proc.stdout.on("data", (data) => {
        output += data.toString();
      });
    }

    // Collect stderr for error messages
    if (proc.stderr) {
      proc.stderr.setEncoding("utf-8");
      proc.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
    }

    // Handle completion
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        const errorMsg = errorOutput || `Provider exited with code ${code}`;
        reject(new Error(`${config.displayName} generation failed: ${errorMsg}`));
      }
    });

    // Handle spawn errors
    proc.on("error", (err) => {
      reject(new Error(`Failed to execute ${config.displayName}: ${err.message}`));
    });

    // Handle timeout
    const timeoutHandle = setTimeout(() => {
      proc.kill();
      reject(new Error(`${config.displayName} generation timed out after 60 seconds`));
    }, 65000);

    proc.on("close", () => {
      clearTimeout(timeoutHandle);
    });
  });
}

/**
 * Clean generated content by removing markdown fences
 *
 * Removes common markdown patterns like ```json or ```
 * that might be included in AI responses.
 */
function cleanGeneratedContent(content: string): string {
  let cleaned = content.trim();

  // Remove markdown code fences if present
  cleaned = cleaned.replace(/^```[a-z]*\n?/i, "");
  cleaned = cleaned.replace(/\n?```$/i, "");

  // Remove leading/trailing whitespace again
  return cleaned.trim();
}
