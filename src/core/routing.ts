/**
 * Smart Routing - Intelligent AI provider selection
 *
 * Implements a hierarchy-based provider resolution system:
 * 1. CLI flag (--ai)
 * 2. Command-level config
 * 3. Node-level config
 * 4. Global config
 * 5. Default ("claude")
 *
 * Also supports fallback chains when primary provider is unavailable.
 */

import { logger } from "./logger.js";
import { getNodeConfig, getGlobalConfig } from "./config.js";
import { isProviderAvailable as checkProviderAvailable } from "./providers.js";

/**
 * Provider configuration including how to invoke it
 */
export interface ProviderConfig {
  name: string; // "claude", "gpt", "ollama", etc.
  command: string; // CLI command to execute
  modelFlag?: string; // How to pass model (--model, -m, etc.)
  available?: boolean; // Is provider installed/available?
}

/**
 * Provider resolution context - tracks hierarchy for debugging
 */
export interface ProviderResolutionContext {
  selectedProvider: string;
  selectedModel?: string;
  resolvedFrom: "cli" | "frontmatter" | "command" | "node" | "global" | "default";
  fallbackChain?: string[];
}

/**
 * Known provider configurations
 */
const knownProviders: Record<string, Omit<ProviderConfig, "available">> = {
  claude: {
    name: "claude",
    command: "claude",
    modelFlag: "--model",
  },
  gpt: {
    name: "gpt",
    command: "gpt",
    modelFlag: "--model",
  },
  gemini: {
    name: "gemini",
    command: "gemini",
    modelFlag: "--model",
  },
  ollama: {
    name: "ollama",
    command: "ollama run",
    modelFlag: undefined, // Positional: "ollama run <model>"
  },
};

/**
 * Check if a provider is available
 * Delegates to the providers module which checks system availability
 */
export function isProviderAvailable(providerName: string): boolean {
  return checkProviderAvailable(providerName);
}

/**
 * Get provider configuration
 */
export function getProviderConfig(providerName: string): ProviderConfig | null {
  const config = knownProviders[providerName];
  if (!config) {
    return null;
  }
  return { ...config };
}

/**
 * Resolve provider based on hierarchy
 *
 * Hierarchy (highest to lowest priority):
 * 1. CLI flag override
 * 2. Command-level config
 * 3. Node-level config
 * 4. Global config default
 * 5. Hardcoded default ("claude")
 *
 * Note: Call this from within the node directory for per-node config to work.
 * getNodeConfig() reads from current working directory.
 */
export async function resolveProvider(
  commandName?: string,
  cliOverride?: string
): Promise<ProviderResolutionContext> {
  // 1. CLI flag wins
  if (cliOverride) {
    await logger.debug("Using CLI-provided provider", { provider: cliOverride });
    return {
      selectedProvider: cliOverride,
      resolvedFrom: "cli",
    };
  }

  try {
    const nodeConfig = await getNodeConfig();

    // 2. Command-level config
    if (commandName && nodeConfig?.commands?.[commandName]?.provider) {
      const provider = nodeConfig.commands[commandName].provider;
      const model = nodeConfig.commands[commandName].model;
      await logger.debug("Using command-level provider", { command: commandName, provider, model });
      return {
        selectedProvider: provider,
        selectedModel: model,
        resolvedFrom: "command",
      };
    }

    // 3. Node-level config
    if (nodeConfig?.provider) {
      const model = nodeConfig.model;
      await logger.debug("Using node-level provider", { provider: nodeConfig.provider, model });
      return {
        selectedProvider: nodeConfig.provider,
        selectedModel: model,
        resolvedFrom: "node",
      };
    }
  } catch (error) {
    await logger.debug("Failed to load node config, falling back to global config", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 4. Global config
  try {
    const globalConfig = await getGlobalConfig();
    if (globalConfig?.defaultAI) {
      await logger.debug("Using global default provider", { provider: globalConfig.defaultAI });
      return {
        selectedProvider: globalConfig.defaultAI,
        resolvedFrom: "global",
      };
    }
  } catch (error) {
    await logger.debug("Failed to load global config", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 5. Hardcoded default
  await logger.debug("Using hardcoded default provider", { provider: "claude" });
  return {
    selectedProvider: "claude",
    resolvedFrom: "default",
  };
}

/**
 * Execute with fallback chain
 *
 * Tries providers in order until one succeeds.
 * Falls back to next provider if current one is unavailable.
 */
export async function resolveFallbackChain(
  primaryProvider: string,
  fallbackChain?: string[]
): Promise<ProviderResolutionContext> {
  // Build full provider list
  const providers = [primaryProvider, ...(fallbackChain ?? [])].filter(
    (p, i, arr) => arr.indexOf(p) === i
  ); // Remove duplicates

  // Try each provider in sequence
  for (const provider of providers) {
    const available = isProviderAvailable(provider);
    if (available) {
      await logger.debug("Found available provider in fallback chain", { provider });
      return {
        selectedProvider: provider,
        resolvedFrom: "cli",
        fallbackChain: providers,
      };
    }
    await logger.debug("Provider unavailable, trying next in chain", { provider });
  }

  // If none available, still return first one (will error at execution time)
  await logger.warn("No providers in fallback chain are available", { providers });
  return {
    selectedProvider: providers[0],
    resolvedFrom: "cli",
    fallbackChain: providers,
  };
}

/**
 * Clear provider cache (no-op since we don't cache anymore)
 * Kept for backwards compatibility with tests
 */
export function clearProviderCache(): void {
  // No-op: provider availability is now checked directly via providers.js
}

/**
 * Get all known provider names
 */
export function getKnownProviders(): string[] {
  return Object.keys(knownProviders);
}

/**
 * Validate provider configuration is sensible
 */
export function validateProviderConfig(provider: string): string | null {
  if (!provider || provider.length === 0) {
    return "Provider name cannot be empty";
  }

  const config = getProviderConfig(provider);
  if (!config) {
    return `Unknown provider: ${provider}. Known providers: ${getKnownProviders().join(", ")}`;
  }

  return null;
}
