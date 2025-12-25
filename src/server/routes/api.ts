import { FastifyInstance } from "fastify";
import { listNodes, getNode } from "../../core/registry.js";
import { loadSession, getNodeSessions } from "../../core/sessions.js";
import { getNodeCommands } from "../../core/commands.js";
import { generateContext } from "../../core/context.js";
import { listProviders } from "../../core/providers.js";

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
          return {
            success: false,
            error: "Vault not found",
          };
        }

        const session = await loadSession(vault.path, request.params.sessionId);

        if (!session) {
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
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get stats",
      };
    }
  });

  // GET /api/vaults/:id/commands - List commands
  fastify.get<{ Params: { id: string } }>("/api/vaults/:id/commands", async (request) => {
    try {
      const vaultId = request.params.id;
      const vault = await getNode(vaultId);

      if (!vault) {
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
          return {
            success: false,
            error: "Vault not found",
          };
        }

        const commands = await getNodeCommands(vault.path);
        const command = commands.find((c: { name: string }) => c.name === request.params.name);

        if (!command) {
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
}
