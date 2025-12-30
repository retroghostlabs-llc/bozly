/**
 * AI Provider Management
 *
 * Handles detection, configuration, and validation of AI CLI providers.
 * Supports: Claude, GPT, Gemini, Ollama, and custom providers.
 *
 * Provides functions to:
 * - Detect if provider CLI is installed on system
 * - Get provider configuration (command, args, input mode)
 * - List available providers
 * - Get setup instructions for missing providers
 *
 * @module core/providers
 */

import { execSync } from "child_process";
import { logger } from "./logger.js";

/**
 * Provider configuration for CLI execution
 */
export interface ProviderConfig {
  /** Provider identifier (lowercase) */
  name: string;
  /** Display name for user messages */
  displayName: string;
  /** CLI command to execute */
  command: string;
  /** Default arguments for provider */
  args: string[];
  /** How to pass prompt to provider */
  inputMode: "stdin" | "file" | "arg";
  /** Whether CLI is installed on system */
  installed: boolean;
  /** Homepage or documentation URL */
  docsUrl: string;
  /** Installation instructions */
  setupInstructions: string;
  /** Environment variables (if needed) */
  envVars?: Record<string, string>;
}

/**
 * Known provider configurations
 */
const PROVIDER_CONFIGS: Record<string, Omit<ProviderConfig, "installed">> = {
  claude: {
    name: "claude",
    displayName: "Claude",
    command: "claude",
    args: ["-p"],
    inputMode: "stdin",
    docsUrl: "https://github.com/anthropics/claude-cli",
    setupInstructions: `Install Claude CLI:
  npm install -g @anthropic-ai/claude-cli

Then authenticate:
  claude login

More info: https://github.com/anthropics/claude-cli`,
  },
  gpt: {
    name: "gpt",
    displayName: "ChatGPT",
    command: "gpt",
    args: [],
    inputMode: "stdin",
    docsUrl: "https://github.com/jamesdobson/prompt_gen",
    setupInstructions: `Install GPT CLI:
  npm install -g gpt-shell

Or for Python version:
  pip install openai-python

Then set your OpenAI API key:
  export OPENAI_API_KEY=your_key_here

More info: https://github.com/jamesdobson/prompt_gen`,
  },
  gemini: {
    name: "gemini",
    displayName: "Gemini",
    command: "gemini",
    args: [],
    inputMode: "stdin",
    docsUrl: "https://github.com/google/ai-cli",
    setupInstructions: `Gemini CLI support is experimental.

For now, use Claude or local Ollama instead.

If you'd like Gemini support, please file an issue:
  https://github.com/RetroGhostLabs/bozly/issues`,
  },
  ollama: {
    name: "ollama",
    displayName: "Ollama (Local)",
    command: "ollama",
    args: ["run", "llama2"],
    inputMode: "stdin",
    docsUrl: "https://ollama.ai",
    setupInstructions: `Install Ollama for local AI models:
  1. Download from https://ollama.ai
  2. Install and start: ollama serve
  3. In another terminal: ollama pull llama2

Supported models: llama2, neural-chat, mistral, and more

Then run: bozly run <command> --ai ollama`,
  },
};

/**
 * Check if a provider CLI is installed on the system
 */
function isProviderInstalled(command: string): boolean {
  try {
    if (process.platform === "win32") {
      execSync(`where ${command}`, { stdio: "ignore" });
    } else {
      execSync(`which ${command}`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get configuration for a specific provider
 *
 * @param providerName - Provider name (e.g., 'claude', 'gpt')
 * @returns Provider configuration with installation status
 * @throws Error if provider name is unknown
 */
export function getProviderConfig(providerName: string): ProviderConfig {
  const normalized = providerName.toLowerCase();
  const baseConfig = PROVIDER_CONFIGS[normalized];

  if (!baseConfig) {
    throw new Error(
      `Unknown provider: ${providerName}. Available: ${Object.keys(PROVIDER_CONFIGS).join(", ")}`
    );
  }

  return {
    ...baseConfig,
    installed: isProviderInstalled(baseConfig.command),
  };
}

/**
 * Check if a provider is available and installed
 *
 * @param providerName - Provider name
 * @returns True if provider CLI is installed
 */
export function isProviderAvailable(providerName: string): boolean {
  try {
    const config = getProviderConfig(providerName);
    return config.installed;
  } catch {
    return false;
  }
}

/**
 * List all available providers
 *
 * @returns Array of provider configs with installation status
 */
export function listProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  for (const name of Object.keys(PROVIDER_CONFIGS)) {
    try {
      const config = getProviderConfig(name);
      providers.push(config);
    } catch {
      // Skip on error
    }
  }

  return providers;
}

/**
 * Get installed providers (filtered)
 *
 * @returns Array of installed provider configs
 */
export function getInstalledProviders(): ProviderConfig[] {
  const all = listProviders();
  return all.filter((p) => p.installed);
}

/**
 * Get default provider (first installed, fallback to claude)
 *
 * @returns Provider name (e.g., 'claude')
 */
export function getDefaultProvider(): string {
  const installed = getInstalledProviders();
  if (installed.length > 0) {
    return installed[0].name;
  }
  return "claude"; // Fallback default
}

/**
 * Get help message for installing a provider
 *
 * @param providerName - Provider name
 * @returns Formatted setup instructions
 */
export function getSetupInstructions(providerName: string): string {
  const config = getProviderConfig(providerName);

  return `
┌────────────────────────────────────────────────┐
│ Provider not found: ${config.displayName}                       │
└────────────────────────────────────────────────┘

${config.setupInstructions}

After installation, retry:
  bozly run <command> --ai ${config.name}
`;
}

/**
 * Validate provider can be used
 *
 * Allows unavailable providers with a warning (for testing/development).
 * This enables testing provider integrations without installation.
 *
 * @param providerName - Provider name
 * @param allowUnavailable - If true, log warning instead of throwing for unavailable providers
 */
export async function validateProvider(
  providerName: string,
  allowUnavailable: boolean = false
): Promise<void> {
  const config = getProviderConfig(providerName);

  if (!config.installed) {
    if (allowUnavailable) {
      await logger.warn(
        `Provider '${providerName}' is not installed, but proceeding anyway (testing mode)`,
        {
          provider: providerName,
          command: config.command,
          installed: false,
          testingMode: true,
        }
      );
    } else {
      const instructions = getSetupInstructions(providerName);
      throw new Error(`Provider '${providerName}' is not installed.\n${instructions}`);
    }
  } else {
    await logger.debug("Provider validated", {
      provider: providerName,
      command: config.command,
      installed: true,
    });
  }
}

/**
 * Get provider info for display
 *
 * @param providerName - Provider name
 * @returns Display string (e.g., "Claude (installed)" or "Claude (not installed)")
 */
export function getProviderStatus(providerName: string): string {
  const config = getProviderConfig(providerName);
  const status = config.installed ? "installed" : "not installed";
  return `${config.displayName} (${status})`;
}

/**
 * Format all providers for display
 *
 * @returns Formatted provider list with status
 */
export function formatProvidersList(): string {
  const providers = listProviders();
  const lines: string[] = ["\nAvailable AI Providers:\n"];

  for (const provider of providers) {
    const status = provider.installed ? "✅" : "❌";
    lines.push(`  ${status} ${provider.displayName}`);
  }

  lines.push(
    "\nTo use a provider, first install it (see docs), then:",
    "  bozly run <command> --ai <provider>\n"
  );

  return lines.join("\n");
}
