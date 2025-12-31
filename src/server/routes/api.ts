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
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

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
    try {
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

      // Get metrics
      const metrics = getMetrics();

      // Calculate and set API endpoint count if not already set
      if (metrics.getApiEndpoints() === 0) {
        const vaults = await listNodes();
        const endpointCount = vaults.length * 5 + 15; // Rough estimate of endpoints per vault + global
        metrics.setApiEndpoints(endpointCount);
      }

      const healthMetrics = metrics.getHealthMetrics(version);

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
}
