/**
 * Command Suggestion System (Phase 2k)
 *
 * Analyzes past command sessions and generates improvement suggestions
 * Key principle: BOZLY suggests, user approves. Never auto-updates.
 */

import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { querySessions, loadSession } from "./sessions.js";
import type { Suggestion, SuggestionsHistory } from "./types.js";
import type { Session, NodeConfig } from "./types.js";

/**
 * Suggestion generator that analyzes command sessions
 */
export class SuggestionEngine {
  private nodePath: string;
  private nodeConfig: NodeConfig;

  constructor(nodePath: string, nodeConfig: NodeConfig) {
    this.nodePath = nodePath;
    this.nodeConfig = nodeConfig;
  }

  /**
   * Analyze a command and generate suggestions based on past sessions
   */
  async analyzeSessions(
    commandName: string,
    options: {
      maxSessions?: number; // How many past sessions to analyze (default: 20)
      minConfidence?: number; // Minimum confidence threshold (default: 0.5)
    } = {}
  ): Promise<Suggestion[]> {
    const maxSessions = options.maxSessions ?? 20;
    const minConfidence = options.minConfidence ?? 0.5;

    // Query sessions for this command
    const sessions = await querySessions(this.nodePath, {
      command: commandName,
      limit: maxSessions,
    });

    if (sessions.length === 0) {
      return [];
    }

    // Load full session data for analysis
    const fullSessions: Session[] = [];
    for (const sessionMeta of sessions) {
      const fullSession = await loadSession(this.nodePath, sessionMeta.id);
      if (fullSession) {
        fullSessions.push(fullSession);
      }
    }

    if (fullSessions.length === 0) {
      return [];
    }

    const suggestions: Suggestion[] = [];

    // Run different analyzers
    suggestions.push(...this.analyzeErrorPatterns(commandName, fullSessions));
    suggestions.push(...this.analyzeContextOptimization(commandName, fullSessions));
    suggestions.push(...this.analyzeProviderPerformance(commandName, fullSessions));
    suggestions.push(...this.analyzePromptRefinement(commandName, fullSessions));
    suggestions.push(...this.analyzeCommandSplitting(commandName, fullSessions));

    // Filter by confidence and remove duplicates
    const filtered = suggestions.filter((s) => s.analysis.confidence >= minConfidence);
    const deduplicated = this.deduplicateSuggestions(filtered);

    // Sort by priority
    deduplicated.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return deduplicated;
  }

  /**
   * Detect error patterns in failed sessions
   */
  private analyzeErrorPatterns(commandName: string, sessions: Session[]): Suggestion[] {
    const failedSessions = sessions.filter((s) => s.status === "failed");

    if (failedSessions.length === 0) {
      return [];
    }

    const failureRate = failedSessions.length / sessions.length;

    // Only suggest if failure rate is significant (>50%)
    if (failureRate < 0.5) {
      return [];
    }

    // Group errors by provider
    const errorsByProvider: Record<string, { count: number; errors: string[] }> = {};
    for (const session of failedSessions) {
      const provider = session.provider;
      if (!errorsByProvider[provider]) {
        errorsByProvider[provider] = { count: 0, errors: [] };
      }
      errorsByProvider[provider].count++;
      if (session.error?.message) {
        errorsByProvider[provider].errors.push(session.error.message);
      }
    }

    // Create suggestion if one provider has significantly higher failure rate
    const worstProvider = Object.entries(errorsByProvider).reduce((prev, current) =>
      current[1].count > prev[1].count ? current : prev
    );

    const worstRate = worstProvider[1].count / failedSessions.length;

    if (worstRate > 0.6) {
      const suggestion: Suggestion = {
        id: randomUUID(),
        commandName,
        type: "pattern",
        priority: "high",
        title: "Error Pattern Detected",
        description: `Command fails ${Math.round(failureRate * 100)}% of the time with provider '${worstProvider[0]}'`,
        analysis: {
          samplesAnalyzed: sessions.length,
          confidence: Math.min(worstRate, 1),
          data: {
            provider: worstProvider[0],
            failureRate: failureRate,
            failedCount: failedSessions.length,
            totalSessions: sessions.length,
            commonErrors: worstProvider[1].errors.slice(0, 3),
          },
        },
        recommendation: {
          action: `Switch to a different provider or reduce context size`,
          rationale: `Provider '${worstProvider[0]}' has a ${Math.round(failureRate * 100)}% failure rate on this command`,
        },
        impact: {
          expectedImprovement: `+${Math.round((1 - failureRate) * 100)}% success rate (if provider is root cause)`,
          riskLevel: "low",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      return [suggestion];
    }

    return [];
  }

  /**
   * Detect unused context in successful sessions
   */
  private analyzeContextOptimization(commandName: string, sessions: Session[]): Suggestion[] {
    const successfulSessions = sessions.filter((s) => s.status === "completed");

    if (successfulSessions.length < 3) {
      return [];
    }

    // Analyze context size vs output
    const contextSizes: number[] = [];
    const outputSizes: number[] = [];

    for (const session of successfulSessions) {
      if (session.prompt?.metadata?.contextSize) {
        contextSizes.push(session.prompt.metadata.contextSize);
      }
      if (session.response?.metadata?.outputSize) {
        outputSizes.push(session.response.metadata.outputSize);
      }
    }

    if (contextSizes.length < 3) {
      return [];
    }

    const avgContext = contextSizes.reduce((a, b) => a + b, 0) / contextSizes.length;
    const avgOutput =
      outputSizes.length > 0 ? outputSizes.reduce((a, b) => a + b, 0) / outputSizes.length : 0;

    // If context is >3x the output, flag for optimization
    if (avgContext > avgOutput * 3 && avgContext > 2000) {
      const wastePercentage = ((avgContext - avgOutput) / avgContext) * 100;

      const suggestion: Suggestion = {
        id: randomUUID(),
        commandName,
        type: "context",
        priority: "medium",
        title: "Context Optimization Opportunity",
        description: `${Math.round(wastePercentage)}% of context is unused in successful responses`,
        analysis: {
          samplesAnalyzed: successfulSessions.length,
          confidence: 0.7,
          data: {
            avgContextSize: Math.round(avgContext),
            avgOutputSize: Math.round(avgOutput),
            wastePercentage: Math.round(wastePercentage),
            potentialSavings: Math.round(
              (avgContext - avgOutput) * (successfulSessions.length / 10)
            ),
          },
        },
        recommendation: {
          action: `Review and trim context.md to remove unused sections`,
          example: `Current context: ${Math.round(avgContext)} tokens → Optimized: ${Math.round(avgContext * 0.7)} tokens`,
          rationale: `Smaller context means faster execution and lower costs while maintaining quality`,
        },
        impact: {
          expectedImprovement: `${Math.round((wastePercentage / 100) * 30)}% faster response time`,
          riskLevel: "medium",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      return [suggestion];
    }

    return [];
  }

  /**
   * Analyze which provider performs best
   */
  private analyzeProviderPerformance(commandName: string, sessions: Session[]): Suggestion[] {
    // Group by provider
    const providerStats: Record<string, { total: number; success: number; avgDuration: number }> =
      {};

    for (const session of sessions) {
      const provider = session.provider;
      if (!providerStats[provider]) {
        providerStats[provider] = { total: 0, success: 0, avgDuration: 0 };
      }
      providerStats[provider].total++;
      if (session.status === "completed") {
        providerStats[provider].success++;
      }
      providerStats[provider].avgDuration += session.executionTimeMs;
    }

    // Calculate success rates
    for (const provider in providerStats) {
      providerStats[provider].avgDuration /= providerStats[provider].total;
    }

    // Only suggest if we have multiple providers
    if (Object.keys(providerStats).length < 2) {
      return [];
    }

    // Find best and worst performers
    let bestProvider = Object.entries(providerStats)[0];
    let worstProvider = bestProvider;

    for (const [provider, stats] of Object.entries(providerStats)) {
      const successRate = stats.success / stats.total;
      const bestRate = bestProvider[1].success / bestProvider[1].total;
      const worstRate = worstProvider[1].success / worstProvider[1].total;

      if (successRate > bestRate) {
        bestProvider = [provider, stats];
      }
      if (successRate < worstRate) {
        worstProvider = [provider, stats];
      }
    }

    const bestRate = bestProvider[1].success / bestProvider[1].total;
    const worstRate = worstProvider[1].success / worstProvider[1].total;
    const improvement = ((bestRate - worstRate) / worstRate) * 100;

    // Only suggest if difference is significant
    if (improvement > 20 && bestProvider[0] !== this.nodeConfig.ai.defaultProvider) {
      const suggestion: Suggestion = {
        id: randomUUID(),
        commandName,
        type: "provider",
        priority: "medium",
        title: "Provider Recommendation",
        description: `Provider '${bestProvider[0]}' performs ${Math.round(improvement)}% better than '${worstProvider[0]}'`,
        analysis: {
          samplesAnalyzed: sessions.length,
          confidence: Math.min(bestProvider[1].total / sessions.length, 1),
          data: {
            providers: Object.entries(providerStats).map(([name, stats]) => ({
              name,
              successRate: Math.round((stats.success / stats.total) * 100),
              avgDuration: Math.round(stats.avgDuration),
              samples: stats.total,
            })),
            recommended: bestProvider[0],
            improvement: Math.round(improvement),
          },
        },
        recommendation: {
          action: `Consider using provider '${bestProvider[0]}' as default`,
          example: `bozly config set ai.defaultProvider ${bestProvider[0]}`,
          rationale: `Historically delivers ${Math.round(bestRate * 100)}% success rate vs current ${Math.round(worstRate * 100)}%`,
        },
        impact: {
          expectedImprovement: `+${Math.round(improvement)}% success rate`,
          riskLevel: "low",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      return [suggestion];
    }

    return [];
  }

  /**
   * Suggest prompt refinements based on response analysis
   */
  private analyzePromptRefinement(commandName: string, sessions: Session[]): Suggestion[] {
    const successfulSessions = sessions.filter((s) => s.status === "completed");

    if (successfulSessions.length < 3) {
      return [];
    }

    // Look for keywords in successful vs failed responses
    const successKeywords = new Set<string>();
    const potentialKeywords = ["actionable", "concise", "specific", "detailed", "step-by-step"];

    for (const session of successfulSessions.slice(0, 5)) {
      if (session.response?.content) {
        const content = session.response.content.toLowerCase();
        for (const keyword of potentialKeywords) {
          if (content.includes(keyword)) {
            successKeywords.add(keyword);
          }
        }
      }
    }

    // If pattern found, suggest adding to prompt
    if (successKeywords.size > 0) {
      const keywords = Array.from(successKeywords);
      const suggestion: Suggestion = {
        id: randomUUID(),
        commandName,
        type: "prompt",
        priority: "low",
        title: "Prompt Refinement Suggestion",
        description: `Successful responses often include: ${keywords.join(", ")}`,
        analysis: {
          samplesAnalyzed: successfulSessions.length,
          confidence: 0.6,
          data: {
            successKeywords: keywords,
            occurrenceRate: Math.round((keywords.length / potentialKeywords.length) * 100),
          },
        },
        recommendation: {
          action: `Add keywords to your command prompt`,
          example: `Consider adding "${keywords[0]}" or "${keywords[1] || "step-by-step"}" to your context`,
          rationale: `These keywords appear in your most successful responses`,
        },
        impact: {
          expectedImprovement: "+10-15% response quality",
          riskLevel: "low",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      return [suggestion];
    }

    return [];
  }

  /**
   * Suggest splitting complex commands into sub-commands
   */
  private analyzeCommandSplitting(commandName: string, sessions: Session[]): Suggestion[] {
    // If command has long context and handles multiple tasks, suggest splitting
    const successfulSessions = sessions.filter((s) => s.status === "completed");

    if (successfulSessions.length < 3) {
      return [];
    }

    const contextSizes = successfulSessions
      .map((s) => s.prompt?.metadata?.contextSize ?? 0)
      .filter((c) => c > 0);

    const avgContext = contextSizes.reduce((a, b) => a + b, 0) / contextSizes.length;

    // Suggest splitting if context is very large and contains multiple tasks
    if (avgContext > 4000 && commandName.includes("daily")) {
      const suggestion: Suggestion = {
        id: randomUUID(),
        commandName,
        type: "splitting",
        priority: "low",
        title: "Command Splitting Suggestion",
        description: `Consider splitting into more focused sub-commands`,
        analysis: {
          samplesAnalyzed: successfulSessions.length,
          confidence: 0.65,
          data: {
            avgContextSize: Math.round(avgContext),
            potentialSubcommands: 2,
          },
        },
        recommendation: {
          action: `Split into focused sub-commands`,
          example: `Split '${commandName}' into '${commandName}-overview' and '${commandName}-details'`,
          rationale: `Smaller, focused commands are easier to maintain and execute faster`,
        },
        impact: {
          expectedImprovement: "Better modularity and reusability",
          riskLevel: "medium",
          reversible: true,
        },
        createdAt: new Date().toISOString(),
      };

      return [suggestion];
    }

    return [];
  }

  /**
   * Remove duplicate suggestions (same type, command, and core recommendation)
   */
  private deduplicateSuggestions(suggestions: Suggestion[]): Suggestion[] {
    const seen = new Set<string>();
    const deduplicated: Suggestion[] = [];

    for (const suggestion of suggestions) {
      const key = `${suggestion.type}:${suggestion.commandName}:${suggestion.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(suggestion);
      }
    }

    return deduplicated;
  }
}

/**
 * Get suggestions history file path
 */
export function getSuggestionsHistoryPath(nodePath: string): string {
  return path.join(nodePath, ".bozly", "suggestions-history.json");
}

/**
 * Load suggestions history
 */
export async function loadSuggestionsHistory(nodePath: string): Promise<SuggestionsHistory> {
  const historyPath = getSuggestionsHistoryPath(nodePath);

  try {
    const content = await fs.readFile(historyPath, "utf-8");
    const parsed = JSON.parse(content) as SuggestionsHistory;
    return parsed;
  } catch {
    // File doesn't exist or is invalid - return empty history
    return {
      version: "1.0",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      suggestions: [],
    };
  }
}

/**
 * Save suggestion to history
 */
export async function saveSuggestionToHistory(
  nodePath: string,
  suggestion: Suggestion
): Promise<void> {
  const history = await loadSuggestionsHistory(nodePath);
  const historyPath = getSuggestionsHistoryPath(nodePath);

  // Check if this suggestion is already in history
  const existing = history.suggestions.find((s) => s.id === suggestion.id);
  if (!existing) {
    history.suggestions.push(suggestion);
  }

  history.updated = new Date().toISOString();

  await fs.writeFile(historyPath, JSON.stringify(history, null, 2), "utf-8");
}

/**
 * Mark suggestion as applied
 */
export async function applySuggestion(nodePath: string, suggestionId: string): Promise<void> {
  const history = await loadSuggestionsHistory(nodePath);
  const historyPath = getSuggestionsHistoryPath(nodePath);

  const suggestion = history.suggestions.find((s) => s.id === suggestionId);
  if (suggestion) {
    suggestion.appliedAt = new Date().toISOString();
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2), "utf-8");
  }
}
