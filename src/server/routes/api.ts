import { FastifyInstance } from "fastify";
import { listNodes, getNode } from "../../core/registry.js";
import { loadSession, getNodeSessions } from "../../core/sessions.js";
import { getNodeCommands } from "../../core/commands.js";
import { generateContext } from "../../core/context.js";
import { listProviders } from "../../core/providers.js";
import { discoverWorkflows } from "../../core/workflows.js";
import { ConfigManager } from "../../core/config-manager.js";
import { logger } from "../../core/logger.js";
import { MemoryManager } from "../../core/memory-manager.js";
import { getMetrics } from "../../core/metrics.js";
import { readFile, readdir, access } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import { homedir } from "os";

export function registerApiRoutes(fastify: FastifyInstance): void {
  // GET /api/vaults - List all vaults
  fastify.get("/api/vaults", async () => {
    try {
      const vaults = await listNodes();
      return {
        success: true,
        data: vaults.map((v) => ({
          id: v.id,
          path: v.path,
          name: v.name || "Unnamed",
        })),
      };
    } catch (error) {
      void logger.error("Failed to list vaults from API", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list vaults",
      };
    }
  });

  // GET /api/vaults/:id - Get specific vault
  fastify.get<{ Params: { id: string } }>("/api/vaults/:id", async (request) => {
    try {
      const vault = await getNode(request.params.id);
      if (!vault) {
        void logger.warn("Vault not found in API", { vaultId: request.params.id });
        return {
          success: false,
          error: "Vault not found",
        };
      }
      return {
        success: true,
        data: vault,
      };
    } catch (error) {
      void logger.error("Failed to get vault from API", {
        error: error instanceof Error ? error.message : String(error),
        vaultId: request.params.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get vault",
      };
    }
  });

  // GET /api/vaults/:id/sessions - List sessions with optional filters
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>("/api/vaults/:id/sessions", async (request) => {
    try {
      const vaultId = request.params.id;
      const vault = await getNode(vaultId);

      if (!vault) {
        void logger.warn("Vault not found when listing sessions in API", { vaultId });
        return {
          success: false,
          error: "Vault not found",
        };
      }

      const limit = parseInt(request.query.limit ?? "20", 10);
      const offset = parseInt(request.query.offset ?? "0", 10);

      const sessions = await getNodeSessions(vault.path, vaultId);
      const paginated = sessions.slice(offset, offset + limit);

      return {
        success: true,
        data: paginated,
        pagination: {
          limit,
          offset,
          total: sessions.length,
        },
      };
    } catch (error) {
      void logger.error("Failed to list sessions from API", {
        error: error instanceof Error ? error.message : String(error),
        vaultId: request.params.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list sessions",
      };
    }
  });

  // GET /api/vaults/:id/sessions/:sessionId - Get specific session
  fastify.get<{ Params: { id: string; sessionId: string } }>(
    "/api/vaults/:id/sessions/:sessionId",
    async (request) => {
      try {
        const vault = await getNode(request.params.id);
        if (!vault) {
          void logger.warn("Vault not found when getting session in API", {
            vaultId: request.params.id,
            sessionId: request.params.sessionId,
          });
          return {
            success: false,
            error: "Vault not found",
          };
        }

        const session = await loadSession(vault.path, request.params.sessionId);

        if (!session) {
          void logger.warn("Session not found in API", {
            vaultId: request.params.id,
            sessionId: request.params.sessionId,
          });
          return {
            success: false,
            error: "Session not found",
          };
        }

        return {
          success: true,
          data: session,
        };
      } catch (error) {
        void logger.error("Failed to get session from API", {
          error: error instanceof Error ? error.message : String(error),
          vaultId: request.params.id,
          sessionId: request.params.sessionId,
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get session",
        };
      }
    }
  );

  // GET /api/vaults/:id/sessions/stats - Session statistics
  fastify.get<{ Params: { id: string } }>("/api/vaults/:id/sessions/stats", async (request) => {
    try {
      const vaultId = request.params.id;
      const vault = await getNode(vaultId);

      if (!vault) {
        void logger.warn("Vault not found when getting stats in API", { vaultId });
        return {
          success: false,
          error: "Vault not found",
        };
      }

      const sessions = await getNodeSessions(vault.path, vaultId);

      const stats = {
        total: sessions.length,
        successful: sessions.filter((s: { status?: string }) => s.status === "success").length,
        failed: sessions.filter((s: { status?: string }) => s.status === "error").length,
        cancelled: sessions.filter((s: { status?: string }) => s.status === "cancelled").length,
        byProvider: {} as Record<string, number>,
      };

      // Count by provider
      sessions.forEach((s: { provider?: string }) => {
        if (s.provider) {
          stats.byProvider[s.provider] = (stats.byProvider[s.provider] || 0) + 1;
        }
      });

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      void logger.error("Failed to get stats from API", {
        error: error instanceof Error ? error.message : String(error),
        vaultId: request.params.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get stats",
      };
    }
  });

  // GET /api/commands - List all commands across all vaults
  fastify.get("/api/commands", async () => {
    try {
      const vaults = await listNodes();
      const allCommands: Array<{
        name: string;
        description: string;
        source: string;
        nodeId: string;
        type: "global" | "local";
        vaultName?: string;
        usage?: unknown;
      }> = [];

      for (const vault of vaults) {
        try {
          const commands = await getNodeCommands(vault.path);
          allCommands.push(
            ...commands.map(
              (c: { name: string; description?: string; source?: string; usage?: unknown }) => ({
                name: c.name,
                description: c.description ?? "No description",
                source: c.source ?? "vault",
                nodeId: vault.id,
                type: "local" as const,
                vaultName: vault.name,
                usage: c.usage,
              })
            )
          );
        } catch {
          // Skip vaults that fail to load
        }
      }

      return {
        success: true,
        data: allCommands,
      };
    } catch (error) {
      void logger.error("Failed to list commands from API", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list commands",
      };
    }
  });

  // GET /api/vaults/:id/commands - List commands
  fastify.get<{ Params: { id: string } }>("/api/vaults/:id/commands", async (request) => {
    try {
      const vaultId = request.params.id;
      const vault = await getNode(vaultId);

      if (!vault) {
        void logger.warn("Vault not found when listing commands in API", { vaultId });
        return {
          success: false,
          error: "Vault not found",
        };
      }

      const commands = await getNodeCommands(vault.path);

      return {
        success: true,
        data: commands.map((c: { name: string; description?: string; source?: string }) => ({
          name: c.name,
          description: c.description ?? "No description",
          source: c.source ?? "Unknown",
        })),
      };
    } catch (error) {
      void logger.error("Failed to list commands from API", {
        error: error instanceof Error ? error.message : String(error),
        vaultId: request.params.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list commands",
      };
    }
  });

  // GET /api/vaults/:id/commands/:name - Get specific command
  fastify.get<{ Params: { id: string; name: string } }>(
    "/api/vaults/:id/commands/:name",
    async (request) => {
      try {
        const vaultId = request.params.id;
        const vault = await getNode(vaultId);

        if (!vault) {
          void logger.warn("Vault not found when getting command in API", {
            vaultId,
            commandName: request.params.name,
          });
          return {
            success: false,
            error: "Vault not found",
          };
        }

        const commands = await getNodeCommands(vault.path);
        const command = commands.find((c: { name: string }) => c.name === request.params.name);

        if (!command) {
          void logger.warn("Command not found in API", {
            vaultId,
            commandName: request.params.name,
          });
          return {
            success: false,
            error: "Command not found",
          };
        }

        return {
          success: true,
          data: command,
        };
      } catch (error) {
        void logger.error("Failed to get command from API", {
          error: error instanceof Error ? error.message : String(error),
          vaultId: request.params.id,
          commandName: request.params.name,
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get command",
        };
      }
    }
  );

  // GET /api/vaults/:id/context - Get vault context
  fastify.get<{ Params: { id: string } }>("/api/vaults/:id/context", async (request) => {
    try {
      const vaultId = request.params.id;
      const vault = await getNode(vaultId);

      if (!vault) {
        void logger.warn("Vault not found when getting context in API", { vaultId });
        return {
          success: false,
          error: "Vault not found",
        };
      }

      const context = await generateContext(vault);

      return {
        success: true,
        data: {
          content: context,
          length: context.length,
        },
      };
    } catch (error) {
      void logger.error("Failed to load context from API", {
        error: error instanceof Error ? error.message : String(error),
        vaultId: request.params.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load context",
      };
    }
  });

  // GET /api/providers - List available providers
  fastify.get("/api/providers", () => {
    try {
      const providers = listProviders();
      return {
        success: true,
        data: providers,
      };
    } catch (error) {
      void logger.error("Failed to list providers from API", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list providers",
      };
    }
  });

  // Health check
  fastify.get("/api/health", async () => {
    console.error("[HEALTH] Endpoint called");
    try {
      console.error("[HEALTH] Reading package.json");
      // Get version from package.json
      let version = "unknown";
      try {
        const __filename = fileURLToPath(import.meta.url);
        const projectRoot = path.resolve(__filename, "../../../..");
        const packageJsonPath = path.join(projectRoot, "package.json");
        const packageData = JSON.parse(await readFile(packageJsonPath, "utf-8")) as {
          version?: string;
        };
        version = packageData.version ?? "unknown";
      } catch {
        // If we can't read package.json, continue with "unknown"
      }
      console.error("[HEALTH] Got version:", version);

      // Get metrics (don't load vaults - expensive operation for health check)
      console.error("[HEALTH] Getting metrics");
      const metrics = getMetrics();
      console.error("[HEALTH] Getting health metrics");
      const healthMetrics = metrics.getHealthMetrics(version);
      console.error("[HEALTH] Got health metrics, returning response");

      return {
        success: true,
        status: healthMetrics.status,
        data: {
          status: healthMetrics.status,
          version: healthMetrics.version,
          uptime: healthMetrics.uptime,
          startedAt: healthMetrics.startedAt,
          responseTime: healthMetrics.responseTime,
          requestCount: healthMetrics.requestCount,
          errorCount: healthMetrics.errorCount,
          memory: {
            used: healthMetrics.memoryUsage.used,
            total: healthMetrics.memoryUsage.total,
            percentage: healthMetrics.memoryUsage.percentage,
          },
          apiEndpoints: healthMetrics.apiEndpoints,
          timestamp: healthMetrics.timestamp,
        },
      };
    } catch (error) {
      void logger.error("Failed to get health metrics", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        status: "error",
        error: error instanceof Error ? error.message : "Failed to get health metrics",
      };
    }
  });

  // GET /api/config - Get application configuration
  fastify.get("/api/config", () => {
    try {
      const configManager = ConfigManager.getInstance();
      return {
        success: true,
        data: {
          server: configManager.getServer(),
          storage: configManager.getStorage(),
          client: configManager.getClient(),
          logging: configManager.getLogging(),
          process: configManager.getProcess(),
        },
      };
    } catch (error) {
      void logger.error("Failed to get config from API", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get config",
      };
    }
  });

  // PUT /api/config - Update application configuration
  fastify.put<{ Body: Record<string, unknown> }>("/api/config", (request) => {
    try {
      const configManager = ConfigManager.getInstance();
      const updates = request.body;

      // Process each config update
      const results: { path: string; success: boolean; error?: string }[] = [];

      for (const [key, value] of Object.entries(updates)) {
        try {
          // Validate the key is a valid config path
          if (typeof key !== "string" || !key.includes(".")) {
            results.push({
              path: key,
              success: false,
              error: "Invalid config path format. Use dot notation (e.g., 'server.port')",
            });
            continue;
          }

          // Update the config value
          configManager.set(key, value);
          results.push({ path: key, success: true });

          void logger.info("Config updated via API", { path: key, value });
        } catch (err) {
          results.push({
            path: key,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
          void logger.warn("Failed to update config value", {
            path: key,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Check if any updates succeeded
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      if (succeeded === 0 && failed > 0) {
        return {
          success: false,
          error: `Failed to update ${failed} config value(s)`,
          results,
        };
      }

      // Return updated config
      return {
        success: true,
        message: `Updated ${succeeded} value(s), failed ${failed} value(s)`,
        results,
        data: {
          server: configManager.getServer(),
          storage: configManager.getStorage(),
          client: configManager.getClient(),
          logging: configManager.getLogging(),
          process: configManager.getProcess(),
        },
      };
    } catch (error) {
      void logger.error("Failed to update config via API", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update config",
      };
    }
  });

  // ============================================================================
  // MEMORY ENDPOINTS
  // ============================================================================

  // GET /api/memory - List all memories with optional filters
  fastify.get<{
    Querystring: { vaultId?: string; limit?: string; search?: string; tags?: string };
  }>("/api/memory", async (request) => {
    try {
      const memoryManager = MemoryManager.getInstance();
      const limit = Math.min(parseInt(request.query.limit ?? "50", 10), 100);
      const vaultId = request.query.vaultId;
      const search = request.query.search;
      const tags = request.query.tags?.split(",").filter(Boolean) ?? [];

      let memories;

      if (search) {
        // Full-text search
        memories = await memoryManager.searchMemories(search, limit);
      } else if (tags.length > 0) {
        // Filter by tags
        memories = await memoryManager.getMemoriesByTags(tags, limit);
      } else if (vaultId) {
        // Filter by vault/node
        memories = await memoryManager.listMemories(vaultId, limit);
      } else {
        // Get all memories
        memories = await memoryManager.listMemories(undefined, limit);
      }

      void logger.debug(`Retrieved ${memories.length} memories from index`, {
        vaultId,
        search,
        tags,
        limit,
      });

      return {
        success: true,
        data: memories,
        count: memories.length,
      };
    } catch (error) {
      void logger.error("Failed to list memories from API", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list memories",
      };
    }
  });

  // GET /api/memory/:sessionId - Get specific memory details
  fastify.get<{
    Params: { sessionId: string };
    Querystring: { nodeId?: string };
  }>("/api/memory/:sessionId", async (request) => {
    try {
      const memoryManager = MemoryManager.getInstance();
      const { sessionId } = request.params;
      const nodeId = request.query.nodeId;

      if (!nodeId) {
        return {
          success: false,
          error: "nodeId query parameter is required",
        };
      }

      const memory = await memoryManager.loadMemory(sessionId, nodeId);

      if (!memory) {
        return {
          success: false,
          error: "Memory not found",
        };
      }

      return {
        success: true,
        data: memory,
      };
    } catch (error) {
      void logger.error("Failed to get memory from API", {
        error: error instanceof Error ? error.message : String(error),
        sessionId: request.params.sessionId,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get memory",
      };
    }
  });

  // DELETE /api/memory/:sessionId - Delete a memory
  fastify.delete<{
    Params: { sessionId: string };
    Querystring: { nodeId?: string };
  }>("/api/memory/:sessionId", async (request) => {
    try {
      const memoryManager = MemoryManager.getInstance();
      const { sessionId } = request.params;
      const nodeId = request.query.nodeId;

      if (!nodeId) {
        return {
          success: false,
          error: "nodeId query parameter is required",
        };
      }

      const success = await memoryManager.deleteMemory(sessionId, nodeId);

      if (!success) {
        return {
          success: false,
          error: "Failed to delete memory",
        };
      }

      return {
        success: true,
        message: `Memory ${sessionId} deleted`,
      };
    } catch (error) {
      void logger.error("Failed to delete memory from API", {
        error: error instanceof Error ? error.message : String(error),
        sessionId: request.params.sessionId,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete memory",
      };
    }
  });

  // GET /api/memory/stats - Get memory statistics
  fastify.get<{
    Querystring: { nodeId?: string };
  }>("/api/memory/stats", async (request) => {
    try {
      const memoryManager = MemoryManager.getInstance();
      const nodeId = request.query.nodeId;

      const stats = await memoryManager.getMemoryStats(nodeId);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      void logger.error("Failed to get memory stats from API", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get memory stats",
      };
    }
  });

  // GET /api/memory/cache-stats - Get cache size statistics
  fastify.get("/api/memory/cache-stats", async () => {
    try {
      const memoryManager = MemoryManager.getInstance();
      const cacheSize = await memoryManager.getCacheSize();

      return {
        success: true,
        data: {
          totalCacheMB: cacheSize.totalSizeMB,
          cacheFileCount: 0, // Can be calculated if needed
          byVault: cacheSize.byVault,
        },
      };
    } catch (error) {
      void logger.error("Failed to get cache stats from API", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get cache stats",
      };
    }
  });

  // GET /api/memory/archive-stats - Get archive statistics
  fastify.get<{
    Querystring: { nodeId?: string };
  }>("/api/memory/archive-stats", async (request) => {
    try {
      const memoryManager = MemoryManager.getInstance();
      const nodeId = request.query.nodeId;

      // Search archived memories (this gets a list of archives)
      const searchedArchives = await memoryManager.searchArchivedMemories("", nodeId);

      // Group archives by vault and month
      const byVault: Record<string, { count: number; sizeMB: number }> = {};
      const byMonth: Record<string, { count: number; sizeMB: number }> = {};

      let totalCount = 0;
      let totalSize = 0;

      // Note: This is a simplified implementation
      // In a real scenario, would need to iterate through actual archive files
      totalCount = searchedArchives.length;
      // Estimate size (actual implementation would need file size)
      totalSize = searchedArchives.length * 0.01; // Placeholder

      return {
        success: true,
        data: {
          totalArchivedCount: totalCount,
          totalArchivedMB: Math.round(totalSize * 100) / 100,
          byVault,
          byMonth,
        },
      };
    } catch (error) {
      void logger.error("Failed to get archive stats from API", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get archive stats",
      };
    }
  });

  // GET /api/workflows - List all workflows from all nodes
  fastify.get("/api/workflows", async () => {
    try {
      const nodes = await listNodes();
      const allWorkflows = [];

      for (const node of nodes) {
        try {
          const workflows = await discoverWorkflows(node.path);
          allWorkflows.push(
            ...workflows.map((w) => ({
              ...w,
              nodeId: node.id,
              nodeName: node.name || "Unnamed",
            }))
          );
        } catch (error) {
          void logger.warn("Failed to load workflows for node", {
            nodeId: node.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return {
        success: true,
        data: allWorkflows,
      };
    } catch (error) {
      void logger.error("Failed to list workflows from API", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list workflows",
      };
    }
  });

  // GET /api/vaults/:id/workflows - List workflows for a specific vault
  fastify.get<{ Params: { id: string } }>("/api/vaults/:id/workflows", async (request) => {
    try {
      const node = await getNode(request.params.id);

      if (!node) {
        void logger.warn("Vault not found when listing workflows in API", {
          vaultId: request.params.id,
        });
        return {
          success: false,
          error: "Vault not found",
        };
      }

      const workflows = await discoverWorkflows(node.path);

      return {
        success: true,
        data: workflows.map((w) => ({
          ...w,
          nodeId: node.id,
          nodeName: node.name || "Unnamed",
        })),
      };
    } catch (error) {
      void logger.error("Failed to list workflows for vault from API", {
        error: error instanceof Error ? error.message : String(error),
        vaultId: request.params.id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list workflows",
      };
    }
  });

  // GET /api/logs - Get aggregated system logs with filtering
  fastify.get<{
    Querystring: { level?: string; limit?: string; offset?: string };
  }>("/api/logs", async (request) => {
    try {
      const level = (request.query.level ?? "ALL").toUpperCase();
      const limit = parseInt(request.query.limit ?? "100", 10);
      const offset = parseInt(request.query.offset ?? "0", 10);

      // Load logs from global and all vaults
      const allLogs = await loadAllLogs();

      // Filter by level
      let filtered = allLogs;
      if (level !== "ALL") {
        filtered = allLogs.filter((log) => log.level === level);
      }

      // Sort by timestamp descending (most recent first)
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const paginated = filtered.slice(offset, offset + limit);

      return {
        success: true,
        data: paginated,
        pagination: {
          limit,
          offset,
          total: filtered.length,
        },
      };
    } catch (error) {
      void logger.error("Failed to load logs from API", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load logs",
      };
    }
  });
}

/**
 * Helper function to load all logs from global and vault directories
 */
async function loadAllLogs(): Promise<
  Array<{
    timestamp: string;
    level: string;
    message: string;
    context?: Record<string, unknown>;
    error?: string;
    file?: string;
    function?: string;
    line?: number;
    source?: string;
  }>
> {
  const logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    context?: Record<string, unknown>;
    error?: string;
    file?: string;
    function?: string;
    line?: number;
    source?: string;
  }> = [];

  // Load global logs
  await loadLogsFromDirectory(path.join(homedir(), ".bozly", "logs"), "Global", logs);

  // Load logs from all vaults
  await loadVaultLogs(logs);

  return logs;
}

/**
 * Load logs from a specific directory
 */
async function loadLogsFromDirectory(
  dir: string,
  source: string,
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    context?: Record<string, unknown>;
    error?: string;
    file?: string;
    function?: string;
    line?: number;
    source?: string;
  }>
): Promise<void> {
  try {
    // Check if directory exists
    try {
      await access(dir);
    } catch {
      return;
    }

    // Get all log files
    const files = await readdir(dir);
    const logFiles = files
      .filter((f) => f.startsWith("bozly-") && f.endsWith(".log"))
      .sort()
      .reverse(); // Most recent first

    // Load logs from ALL files
    for (const file of logFiles) {
      const filePath = path.join(dir, file);

      try {
        const content = await readFile(filePath, "utf-8");
        parseLogsFromFile(content, source, logs);
      } catch {
        // Skip files that can't be read
      }
    }
  } catch {
    // Ignore errors for this directory
  }
}

/**
 * Parse log entries from file content (handles multi-line JSON)
 */
function parseLogsFromFile(
  content: string,
  source: string,
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    context?: Record<string, unknown>;
    error?: string;
    file?: string;
    function?: string;
    line?: number;
    source?: string;
  }>
): void {
  // Split by lines and reconstruct multi-line JSON objects
  const lines = content.split("\n");
  let currentObject = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip headers and empty lines
    if (
      !trimmed ||
      trimmed.includes("BOZLY Session Log") ||
      trimmed.includes("Started:") ||
      trimmed.includes("═══════")
    ) {
      continue;
    }

    // Accumulate lines for JSON object
    if (trimmed.startsWith("{")) {
      currentObject = trimmed;
    } else if (currentObject && trimmed.endsWith("}")) {
      currentObject += trimmed;

      // Try to parse the complete JSON object
      try {
        const entry = JSON.parse(currentObject) as {
          timestamp: string;
          level: string;
          message: string;
          context?: Record<string, unknown>;
          error?: string;
          file?: string;
          function?: string;
          line?: number;
          source?: string;
        };
        entry.source = source;
        logs.push(entry);
      } catch {
        // Skip invalid JSON
      }

      currentObject = "";
    } else if (currentObject) {
      currentObject += trimmed;
    }
  }
}

/**
 * Load logs from all registered vaults
 */
async function loadVaultLogs(
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    context?: Record<string, unknown>;
    error?: string;
    file?: string;
    function?: string;
    line?: number;
    source?: string;
  }>
): Promise<void> {
  try {
    const registryPath = path.join(homedir(), ".bozly", "bozly-registry.json");
    const registryContent = await readFile(registryPath, "utf-8");
    const registry = JSON.parse(registryContent) as {
      nodes?: Array<{ name: string; path: string }>;
    };

    if (registry.nodes && Array.isArray(registry.nodes)) {
      for (const node of registry.nodes) {
        const vaultLogDir = path.join(node.path, ".bozly", "logs");
        await loadLogsFromDirectory(vaultLogDir, node.name, logs);
      }
    }
  } catch {
    // Silently fail if registry doesn't exist or vaults have no logs
  }
}
