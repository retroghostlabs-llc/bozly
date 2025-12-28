import { FastifyInstance } from "fastify";
import { listNodes, getNode } from "../../core/registry.js";
import { loadSession, getNodeSessions } from "../../core/sessions.js";
import { getNodeCommands } from "../../core/commands.js";
import { generateContext } from "../../core/context.js";
import { listProviders } from "../../core/providers.js";
import { getConfig } from "../../core/config-manager.js";
import { logger } from "../../core/logger.js";

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
      const allCommands: any[] = [];

      for (const vault of vaults) {
        try {
          const commands = await getNodeCommands(vault.path);
          allCommands.push(
            ...commands.map((c: any) => ({
              name: c.name,
              description: c.description ?? "No description",
              source: c.source ?? "Unknown",
              nodeId: vault.id,
              type: c.type ?? "unknown",
              usage: c.usage,
            }))
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
  fastify.get("/api/health", () => {
    return {
      success: true,
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  });

  // GET /api/config - Get application configuration
  fastify.get("/api/config", () => {
    try {
      const configManager = getConfig();
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
}
