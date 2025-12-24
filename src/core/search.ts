/**
 * Cross-node search functionality for BOZLY
 * Enables searching across multiple vaults for sessions, memories, and commands
 */

import * as fs from "fs";
import * as path from "path";
import {
  SearchQuery,
  SearchTarget,
  AggregatedSearchResults,
  HistoryOptions,
  HistoryResult,
  SearchStats,
  SessionSearchResult,
  MemorySearchResult,
  CommandSearchResult,
  NodeCommand,
  Session,
} from "./types.js";
import { querySessionsGlobal } from "./sessions.js";
import { getGlobalCommands, getAllCommands } from "./commands.js";
import { MemoryIndex } from "../memory/index.js";
import { getRegistry } from "./registry.js";

/**
 * CrossNodeSearcher - Search across all vaults for sessions, memories, and commands
 */
export class CrossNodeSearcher {
  private bozlyPath: string;
  private memoryIndex: MemoryIndex;

  constructor(bozlyPath: string) {
    this.bozlyPath = bozlyPath;
    this.memoryIndex = new MemoryIndex(bozlyPath);
  }

  /**
   * Search across all targets (sessions, memories, commands)
   * Returns aggregated results sorted by relevance
   */
  async searchAll(query: SearchQuery): Promise<AggregatedSearchResults> {
    const startTime = Date.now();

    // Determine which targets to search
    const searchIn: SearchTarget[] = query.searchIn || ["sessions", "memories", "commands"];

    const results: AggregatedSearchResults = {
      query,
      timestamp: new Date().toISOString(),
      queryTimeMs: 0,
      counts: {
        sessions: 0,
        memories: 0,
        commands: 0,
        total: 0,
      },
      results: {
        sessions: [],
        memories: [],
        commands: [],
      },
    };

    // Search sessions
    if (searchIn.includes("sessions")) {
      results.results.sessions = await this.searchSessions(query);
      results.counts.sessions = results.results.sessions.length;
    }

    // Search memories
    if (searchIn.includes("memories")) {
      results.results.memories = await this.searchMemories(query);
      results.counts.memories = results.results.memories.length;
    }

    // Search commands
    if (searchIn.includes("commands")) {
      results.results.commands = await this.searchCommands(query);
      results.counts.commands = results.results.commands.length;
    }

    results.counts.total =
      results.counts.sessions + results.counts.memories + results.counts.commands;

    // Group by node if requested (will be useful for display)
    results.groupedByNode = this.groupResultsByNode(results);

    results.queryTimeMs = Date.now() - startTime;

    return results;
  }

  /**
   * Search sessions across all vaults
   */
  async searchSessions(query: SearchQuery): Promise<SessionSearchResult[]> {
    const globalSessionsPath = path.join(this.bozlyPath, "sessions");

    // Check if sessions directory exists
    if (!fs.existsSync(globalSessionsPath)) {
      return [];
    }

    // Get all sessions matching the filter query
    const sessions = await querySessionsGlobal(globalSessionsPath, {
      command: query.command,
      provider: query.provider,
      node: query.nodeId,
      status: query.status as any,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: Math.max(query.limit ?? 50, 1000), // Get more to filter by text
      offset: 0,
    });

    // Filter by text if provided
    const filtered = query.text
      ? sessions.filter((session) => this.matchesQuery(session, query.text || ""))
      : sessions;

    // Score results by relevance
    const scored: SessionSearchResult[] = filtered.map((session) => {
      const relevanceScore = this.scoreSessionRelevance(session, query);
      const matchedFields = this.getSessionMatchedFields(session, query);

      return {
        type: "session",
        session,
        matchedFields,
        relevanceScore,
        nodeInfo: {
          nodeId: session.nodeId,
          nodeName: session.nodeName,
          nodePath: session.nodePath,
        },
      };
    });

    // Sort by relevance (highest first)
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply limit and offset
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return scored.slice(offset, offset + limit);
  }

  /**
   * Search memories across all vaults
   */
  async searchMemories(query: SearchQuery): Promise<MemorySearchResult[]> {
    // Query memory index for matching memories
    let entries: any[] = [];
    if (query.text) {
      const result = await this.memoryIndex.search(query.text, query.limit ?? 50);
      entries = result.entries ?? [];
    }

    // Filter by other criteria
    const filtered = entries.filter((entry) => {
      if (query.nodeId && entry.nodeId !== query.nodeId) {
        return false;
      }
      if (query.command && entry.command !== query.command) {
        return false;
      }

      // Check date range if provided
      if (query.startDate || query.endDate) {
        const entryDate = new Date(entry.timestamp);
        if (query.startDate && entryDate < new Date(query.startDate)) {
          return false;
        }
        if (query.endDate && entryDate > new Date(query.endDate)) {
          return false;
        }
      }

      return true;
    });

    // Convert to MemorySearchResult
    const results: MemorySearchResult[] = filtered.map((entry) => {
      const relevanceScore = this.scoreMemoryRelevance(entry, query);
      const matchedFields = this.getMemoryMatchedFields(entry, query);

      return {
        type: "memory",
        memory: {
          sessionId: entry.sessionId,
          nodeId: entry.nodeId,
          nodeName: entry.nodeName,
          timestamp: entry.timestamp,
          command: entry.command,
          summary: entry.summary,
          tags: entry.tags,
          filePath: entry.filePath,
        },
        matchedFields,
        relevanceScore,
        sessionPath: entry.filePath,
      };
    });

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results;
  }

  /**
   * Search commands across all vaults
   */
  async searchCommands(query: SearchQuery): Promise<CommandSearchResult[]> {
    const registry = await getRegistry();
    const results: CommandSearchResult[] = [];

    // Get global commands and commands from all vaults
    const globalCommands = await getGlobalCommands();
    const allCommands: NodeCommand[] = [...globalCommands];

    // Get commands from each vault
    for (const node of registry.nodes) {
      const nodeCommands = await getAllCommands(node.path);
      allCommands.push(...nodeCommands);
    }

    for (const cmd of allCommands) {
      if (query.nodeId && cmd.source !== "vault") {
        // If filtering by node, only include vault commands for that node
        continue;
      }

      const matches = this.matchesCommandQuery(cmd, query);
      if (matches) {
        const relevanceScore = this.scoreCommandRelevance(cmd, query);
        const matchedFields = this.getCommandMatchedFields(cmd, query);

        // Determine source node if it's a vault command
        let sourceNode: { nodeId: string; nodeName: string } | undefined;
        if (cmd.source === "vault") {
          const node = registry.nodes.find((n) => n.path === path.dirname(path.dirname(cmd.file)));
          if (node) {
            sourceNode = { nodeId: node.id, nodeName: node.name };
          }
        }

        results.push({
          type: "command",
          command: cmd,
          matchedFields,
          relevanceScore,
          sourceNode,
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply limit and offset
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return results.slice(offset, offset + limit);
  }

  /**
   * Get recent sessions across all vaults or for a specific vault
   */
  async getRecentSessions(options: HistoryOptions, nodeId?: string): Promise<HistoryResult[]> {
    const globalSessionsPath = path.join(this.bozlyPath, "sessions");

    // Check if sessions directory exists
    if (!fs.existsSync(globalSessionsPath)) {
      return [];
    }

    // Calculate date range from options.older
    let startDate: string | undefined;
    if (options.older) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - options.older);
      startDate = daysAgo.toISOString();
    }

    // Query sessions
    const sessions = await querySessionsGlobal(globalSessionsPath, {
      command: options.command,
      provider: options.provider,
      node: nodeId,
      status: options.status,
      startDate,
      limit: Math.min(options.limit ?? 10, 100),
      offset: options.offset ?? 0,
    });

    // Convert to HistoryResult
    const results: HistoryResult[] = sessions.map((session) => {
      // Try to load memory for this session if it exists
      const memoryPath = path.join(
        globalSessionsPath,
        session.nodeId,
        new Date(session.timestamp).getFullYear().toString(),
        String(new Date(session.timestamp).getMonth() + 1).padStart(2, "0"),
        String(new Date(session.timestamp).getDate()).padStart(2, "0"),
        session.id,
        "memory.md"
      );

      let memory: { sessionId: string; summary: string } | undefined;
      if (fs.existsSync(memoryPath)) {
        const content = fs.readFileSync(memoryPath, "utf-8");
        const firstLine = content.split("\n")[0];
        memory = {
          sessionId: session.id,
          summary: firstLine.replace(/^#+ /, "").trim(),
        };
      }

      return {
        session,
        nodeInfo: {
          nodeId: session.nodeId,
          nodeName: session.nodeName,
        },
        memory,
      };
    });

    return results;
  }

  /**
   * Get statistics for search results
   */
  async getSearchStats(query: SearchQuery): Promise<SearchStats> {
    const results = await this.searchAll(query);

    // Build stats from results
    const byType: Record<string, number> = {
      sessions: results.counts.sessions,
      memories: results.counts.memories,
      commands: results.counts.commands,
    };

    const byNode: Record<string, number> = {};
    const byProvider: Record<string, number> = {};

    // Count by node
    for (const session of results.results.sessions) {
      byNode[session.nodeInfo.nodeId] = (byNode[session.nodeInfo.nodeId] || 0) + 1;
    }
    for (const memory of results.results.memories) {
      byNode[memory.memory.nodeId] = (byNode[memory.memory.nodeId] || 0) + 1;
    }

    // Count by provider
    for (const session of results.results.sessions) {
      byProvider[session.session.provider] = (byProvider[session.session.provider] || 0) + 1;
    }

    // Find date range
    let oldest: string | undefined;
    let newest: string | undefined;

    for (const session of results.results.sessions) {
      if (!oldest || session.session.timestamp < oldest) {
        oldest = session.session.timestamp;
      }
      if (!newest || session.session.timestamp > newest) {
        newest = session.session.timestamp;
      }
    }

    for (const memory of results.results.memories) {
      if (!oldest || memory.memory.timestamp < oldest) {
        oldest = memory.memory.timestamp;
      }
      if (!newest || memory.memory.timestamp > newest) {
        newest = memory.memory.timestamp;
      }
    }

    return {
      totalResults: results.counts.total,
      byType,
      byNode,
      byProvider,
      dateRange: { oldest, newest },
    };
  }

  /**
   * Private helper: Check if session matches text query
   */
  private matchesQuery(session: Session, query: string): boolean {
    const text = query.toLowerCase();

    // Check command name
    if (session.command?.toLowerCase().includes(text)) {
      return true;
    }

    // Check in metadata tags
    if (session.metadata?.tags?.some((tag: string) => tag.toLowerCase().includes(text))) {
      return true;
    }

    return false;
  }

  /**
   * Private helper: Score session relevance
   */
  private scoreSessionRelevance(session: Session, query: SearchQuery): number {
    let score = 0.5; // Base score

    // Boost for command match
    if (query.command && session.command === query.command) {
      score += 0.3;
    }

    // Boost for provider match
    if (query.provider && session.provider === query.provider) {
      score += 0.2;
    }

    // Boost for success
    if (query.status === "completed" && session.status === "completed") {
      score += 0.1;
    }

    // Boost for text match
    if (query.text && this.matchesQuery(session, query.text)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Private helper: Score memory relevance
   */
  private scoreMemoryRelevance(
    memory: { summary: string; tags?: string[]; command?: string },
    query: SearchQuery
  ): number {
    let score = 0.5;

    if (query.text) {
      if (memory.summary.toLowerCase().includes(query.text.toLowerCase())) {
        score += 0.3;
      }
      if (
        memory.tags?.some((tag: string) =>
          tag.toLowerCase().includes(query.text?.toLowerCase() ?? "")
        )
      ) {
        score += 0.2;
      }
    }

    if (query.command && memory.command === query.command) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Private helper: Score command relevance
   */
  private scoreCommandRelevance(cmd: NodeCommand, query: SearchQuery): number {
    let score = 0.5;

    if (query.text) {
      const text = query.text.toLowerCase();
      if (cmd.name.toLowerCase().includes(text)) {
        score += 0.3;
      }
      if (cmd.description?.toLowerCase().includes(text)) {
        score += 0.2;
      }
      if (cmd.tags?.some((tag) => tag.toLowerCase().includes(text))) {
        score += 0.15;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Private helper: Get matched field names for session
   */
  private getSessionMatchedFields(session: Session, query: SearchQuery): string[] {
    const fields: string[] = [];

    if (query.command && session.command === query.command) {
      fields.push("command");
    }
    if (query.text && this.matchesQuery(session, query.text)) {
      fields.push("text");
    }
    if (query.provider && session.provider === query.provider) {
      fields.push("provider");
    }

    return fields;
  }

  /**
   * Private helper: Get matched field names for memory
   */
  private getMemoryMatchedFields(
    memory: { summary: string; tags?: string[]; command?: string },
    query: SearchQuery
  ): string[] {
    const fields: string[] = [];

    if (query.text) {
      if (memory.summary.toLowerCase().includes(query.text.toLowerCase())) {
        fields.push("summary");
      }
      if (
        memory.tags?.some((tag: string) =>
          tag.toLowerCase().includes(query.text?.toLowerCase() ?? "")
        )
      ) {
        fields.push("tags");
      }
    }

    if (query.command && memory.command === query.command) {
      fields.push("command");
    }

    return fields;
  }

  /**
   * Private helper: Get matched field names for command
   */
  private getCommandMatchedFields(cmd: NodeCommand, query: SearchQuery): string[] {
    const fields: string[] = [];

    if (query.text) {
      const text = query.text.toLowerCase();
      if (cmd.name.toLowerCase().includes(text)) {
        fields.push("name");
      }
      if (cmd.description?.toLowerCase().includes(text)) {
        fields.push("description");
      }
      if (cmd.tags?.some((tag: string) => tag.toLowerCase().includes(text))) {
        fields.push("tags");
      }
    }

    return fields;
  }

  /**
   * Private helper: Check if command matches query
   */
  private matchesCommandQuery(cmd: NodeCommand, query: SearchQuery): boolean {
    if (query.text) {
      const text = query.text.toLowerCase();
      if (!cmd.name.toLowerCase().includes(text)) {
        if (!cmd.description?.toLowerCase().includes(text)) {
          if (!cmd.tags?.some((tag: string) => tag.toLowerCase().includes(text))) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Private helper: Group results by node
   */
  private groupResultsByNode(results: AggregatedSearchResults): Record<
    string,
    {
      sessions: SessionSearchResult[];
      memories: MemorySearchResult[];
      commands: CommandSearchResult[];
    }
  > {
    const grouped: Record<
      string,
      {
        sessions: SessionSearchResult[];
        memories: MemorySearchResult[];
        commands: CommandSearchResult[];
      }
    > = {};

    // Group sessions
    for (const session of results.results.sessions) {
      const nodeId = session.nodeInfo.nodeId;
      if (!grouped[nodeId]) {
        grouped[nodeId] = { sessions: [], memories: [], commands: [] };
      }
      grouped[nodeId].sessions.push(session);
    }

    // Group memories
    for (const memory of results.results.memories) {
      const nodeId = memory.memory.nodeId;
      if (!grouped[nodeId]) {
        grouped[nodeId] = { sessions: [], memories: [], commands: [] };
      }
      grouped[nodeId].memories.push(memory);
    }

    // Group commands
    for (const cmd of results.results.commands) {
      const nodeId = cmd.sourceNode?.nodeId || "global";
      if (!grouped[nodeId]) {
        grouped[nodeId] = { sessions: [], memories: [], commands: [] };
      }
      grouped[nodeId].commands.push(cmd);
    }

    return grouped;
  }
}

/**
 * Export helper for default instantiation
 */
export function createSearcher(bozlyPath: string): CrossNodeSearcher {
  return new CrossNodeSearcher(bozlyPath);
}
