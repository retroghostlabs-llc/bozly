/**
 * Comprehensive Tests for API Routes
 *
 * Tests for all REST API endpoints:
 * - GET /api/vaults
 * - GET /api/vaults/:id
 * - GET /api/vaults/:id/sessions
 * - GET /api/vaults/:id/sessions/:sessionId
 * - GET /api/vaults/:id/sessions/stats
 * - GET /api/vaults/:id/commands
 * - GET /api/vaults/:id/commands/:name
 * - GET /api/vaults/:id/context
 * - GET /api/providers
 * - GET /api/health
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createServer } from "../../src/server/index.js";
import * as registry from "../../src/core/registry.js";
import * as sessions from "../../src/core/sessions.js";
import * as commands from "../../src/core/commands.js";
import * as context from "../../src/core/context.js";
import * as providers from "../../src/core/providers.js";
import * as workflows from "../../src/core/workflows.js";
import { ServerConfig } from "../../src/server/index.js";

describe("API Routes - Comprehensive Coverage", { timeout: 30000 }, () => {
  let fastifyApp: any;
  let config: ServerConfig;

  beforeEach(async () => {
    config = {
      port: 3847,
      host: "127.0.0.1",
      openBrowser: false,
    };
    const { fastify } = await createServer(config);
    fastifyApp = fastify;
  });

  afterEach(async () => {
    if (fastifyApp) {
      await fastifyApp.close();
    }
  });

  // ============================================================================
  // GET /api/health - Health Check
  // ============================================================================

  describe("GET /api/health", () => {
    it("should return health check response", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/health",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.status).toBe("ok");
      expect(data.data.timestamp).toBeDefined();
    });

    it("should return valid ISO timestamp", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/health",
      });

      const data = JSON.parse(response.body);
      const timestamp = new Date(data.data.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  // ============================================================================
  // GET /api/vaults - List All Vaults
  // ============================================================================

  describe("GET /api/vaults", () => {
    it("should return empty list when no vaults exist", async () => {
      vi.spyOn(registry, "listNodes").mockResolvedValueOnce([]);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("should return list of vaults with required fields", async () => {
      const mockVaults = [
        { id: "vault1", path: "/path/to/vault1", name: "Vault 1" },
        { id: "vault2", path: "/path/to/vault2", name: "Vault 2" },
      ];
      vi.spyOn(registry, "listNodes").mockResolvedValueOnce(mockVaults);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toHaveProperty("id");
      expect(data.data[0]).toHaveProperty("path");
      expect(data.data[0]).toHaveProperty("name");
    });

    it("should handle unnamed vaults", async () => {
      const mockVaults = [{ id: "vault1", path: "/path/to/vault1" }];
      vi.spyOn(registry, "listNodes").mockResolvedValueOnce(mockVaults as any);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults",
      });

      const data = JSON.parse(response.body);
      expect(data.data[0].name).toBe("Unnamed");
    });

    it("should handle errors gracefully", async () => {
      vi.spyOn(registry, "listNodes").mockRejectedValueOnce(
        new Error("Registry error")
      );

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Registry error");
    });

    it("should handle non-Error exceptions", async () => {
      vi.spyOn(registry, "listNodes").mockRejectedValueOnce("Unknown error");

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to list vaults");
    });
  });

  // ============================================================================
  // GET /api/vaults/:id - Get Specific Vault
  // ============================================================================

  describe("GET /api/vaults/:id", () => {
    it("should return vault when it exists", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1", name: "Test" };
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockVault);
    });

    it("should return error when vault does not exist", async () => {
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(null);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/nonexistent",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Vault not found");
    });

    it("should handle special characters in vault ID", async () => {
      const mockVault = { id: "vault-with-dashes", path: "/path", name: "Test" };
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault-with-dashes",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/sessions - List Sessions with Pagination
  // ============================================================================

  describe("GET /api/vaults/:id/sessions", () => {
    it("should return paginated sessions with default limits", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const mockSessions = Array.from({ length: 25 }, (_, i) => ({
        id: `session${i}`,
        status: "success",
      }));

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, "getNodeSessions").mockResolvedValueOnce(mockSessions as any);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/sessions",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(20); // Default limit
      expect(data.pagination.limit).toBe(20);
      expect(data.pagination.offset).toBe(0);
      expect(data.pagination.total).toBe(25);
    });

    it("should apply custom limit and offset", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const mockSessions = Array.from({ length: 50 }, (_, i) => ({
        id: `session${i}`,
      }));

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, "getNodeSessions").mockResolvedValueOnce(mockSessions as any);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/sessions?limit=10&offset=5",
      });

      const data = JSON.parse(response.body);
      expect(data.data).toHaveLength(10);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.offset).toBe(5);
      expect(data.pagination.total).toBe(50);
    });

    it("should handle invalid limit values", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, "getNodeSessions").mockResolvedValueOnce([]);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/sessions?limit=invalid",
      });

      expect(response.statusCode).toBe(200);
      // NaN should be handled gracefully
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    it("should return error when vault not found", async () => {
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(null);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/sessions",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Vault not found");
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/sessions/:sessionId - Get Specific Session
  // ============================================================================

  describe("GET /api/vaults/:id/sessions/:sessionId", () => {
    it("should return session when it exists", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const mockSession = {
        id: "session1",
        status: "success",
        output: "Test output",
      };

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, "loadSession").mockResolvedValueOnce(mockSession as any);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/sessions/session1",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSession);
    });

    it("should return error when session does not exist", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, "loadSession").mockResolvedValueOnce(null);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/sessions/nonexistent",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Session not found");
    });

    it("should return error when vault not found", async () => {
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(null);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/sessions/session1",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Vault not found");
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/sessions/stats - Session Statistics
  // ============================================================================

  describe("GET /api/vaults/:id/sessions/stats", () => {
    it("should calculate session statistics correctly", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const mockSessions = [
        { status: "success", provider: "claude" },
        { status: "success", provider: "claude" },
        { status: "error", provider: "gpt" },
        { status: "cancelled", provider: "claude" },
      ];

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, "getNodeSessions").mockResolvedValueOnce(mockSessions as any);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/sessions/stats",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.total).toBe(4);
      expect(data.data.successful).toBe(2);
      expect(data.data.failed).toBe(1);
      expect(data.data.cancelled).toBe(1);
      expect(data.data.byProvider.claude).toBe(3);
      expect(data.data.byProvider.gpt).toBe(1);
    });

    it("should handle empty session list", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, "getNodeSessions").mockResolvedValueOnce([]);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/sessions/stats",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.total).toBe(0);
      expect(data.data.successful).toBe(0);
      expect(data.data.failed).toBe(0);
      expect(data.data.cancelled).toBe(0);
      expect(Object.keys(data.data.byProvider)).toHaveLength(0);
    });

    it("should handle sessions without status or provider", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const mockSessions = [
        { id: "session1" }, // No status or provider
        { status: "success" }, // No provider
      ];

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, "getNodeSessions").mockResolvedValueOnce(mockSessions as any);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/sessions/stats",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.total).toBe(2);
      expect(data.data.successful).toBe(1);
    });

    it("should return error when vault not found", async () => {
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(null);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/sessions/stats",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Vault not found");
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/commands - List Commands
  // ============================================================================

  describe("GET /api/vaults/:id/commands", () => {
    it("should return list of commands with required fields", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const mockCommands = [
        { name: "daily", description: "Daily check", source: "local" },
        { name: "weekly", description: "Weekly review", source: "global" },
      ];

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, "getNodeCommands").mockResolvedValueOnce(mockCommands as any);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/commands",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toHaveProperty("name");
      expect(data.data[0]).toHaveProperty("description");
      expect(data.data[0]).toHaveProperty("source");
    });

    it("should provide defaults for missing fields", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const mockCommands = [{ name: "test" }]; // Missing description and source

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, "getNodeCommands").mockResolvedValueOnce(mockCommands as any);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/commands",
      });

      const data = JSON.parse(response.body);
      expect(data.data[0].description).toBe("No description");
      expect(data.data[0].source).toBe("Unknown");
    });

    it("should handle empty command list", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, "getNodeCommands").mockResolvedValueOnce([]);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/commands",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("should return error when vault not found", async () => {
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(null);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/commands",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Vault not found");
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/commands/:name - Get Specific Command
  // ============================================================================

  describe("GET /api/vaults/:id/commands/:name", () => {
    it("should return command when it exists", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const mockCommands = [
        { name: "daily", description: "Daily check" },
        { name: "weekly", description: "Weekly review" },
      ];

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, "getNodeCommands").mockResolvedValueOnce(mockCommands as any);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/commands/daily",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("daily");
    });

    it("should return error when command does not exist", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const mockCommands = [{ name: "daily", description: "Daily check" }];

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, "getNodeCommands").mockResolvedValueOnce(mockCommands as any);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/commands/nonexistent",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Command not found");
    });

    it("should handle special characters in command name", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const mockCommands = [{ name: "my-custom-command", description: "Test" }];

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, "getNodeCommands").mockResolvedValueOnce(mockCommands as any);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/commands/my-custom-command",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("my-custom-command");
    });

    it("should return error when vault not found", async () => {
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(null);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/commands/daily",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Vault not found");
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/context - Get Vault Context
  // ============================================================================

  describe("GET /api/vaults/:id/context", () => {
    it("should return vault context with length", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const contextContent = "# Vault Context\n\nThis is test context.";

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(context, "generateContext").mockResolvedValueOnce(contextContent);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/context",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.content).toBe(contextContent);
      expect(data.data.length).toBe(contextContent.length);
    });

    it("should handle empty context", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(context, "generateContext").mockResolvedValueOnce("");

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/context",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.content).toBe("");
      expect(data.data.length).toBe(0);
    });

    it("should handle large context", async () => {
      const mockVault = { id: "vault1", path: "/path/to/vault1" };
      const largeContent = "A".repeat(10000); // 10KB

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(context, "generateContext").mockResolvedValueOnce(largeContent);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/context",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.length).toBe(10000);
    });

    it("should return error when vault not found", async () => {
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(null);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/context",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Vault not found");
    });
  });

  // ============================================================================
  // GET /api/providers - List Available Providers
  // ============================================================================

  describe("GET /api/providers", () => {
    it("should return list of available providers", async () => {
      const mockProviders = ["claude", "gpt", "gemini", "ollama"];
      vi.spyOn(providers, "listProviders").mockReturnValueOnce(mockProviders);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/providers",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockProviders);
    });

    it("should return empty list when no providers available", async () => {
      vi.spyOn(providers, "listProviders").mockReturnValueOnce([]);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/providers",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("should handle errors gracefully", async () => {
      vi.spyOn(providers, "listProviders").mockImplementationOnce(() => {
        throw new Error("Provider listing failed");
      });

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/providers",
      });

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Provider listing failed");
    });
  });

  // ============================================================================
  // GET /api/workflows - List All Workflows
  // ============================================================================

  describe("GET /api/workflows", () => {
    it("should return empty list when no workflows exist", async () => {
      vi.spyOn(registry, "listNodes").mockResolvedValueOnce([]);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/workflows",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("should return workflows from all nodes", async () => {
      const mockVaults = [
        { id: "vault1", path: "/path/to/vault1", name: "Vault 1" },
        { id: "vault2", path: "/path/to/vault2", name: "Vault 2" },
      ];

      const mockWorkflows1 = [
        {
          id: "wf1",
          name: "Workflow 1",
          steps: 3,
          status: "active" as const,
        },
      ];

      const mockWorkflows2 = [
        {
          id: "wf2",
          name: "Workflow 2",
          steps: 2,
          status: "disabled" as const,
        },
      ];

      vi.spyOn(registry, "listNodes").mockResolvedValueOnce(mockVaults);
      vi.spyOn(workflows, "discoverWorkflows")
        .mockResolvedValueOnce(mockWorkflows1)
        .mockResolvedValueOnce(mockWorkflows2);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/workflows",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toHaveProperty("nodeId");
      expect(data.data[0]).toHaveProperty("nodeName");
    });

    it("should handle errors gracefully", async () => {
      vi.spyOn(registry, "listNodes").mockRejectedValueOnce(
        new Error("Registry error")
      );

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/workflows",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/workflows - List Workflows for Specific Vault
  // ============================================================================

  describe("GET /api/vaults/:id/workflows", () => {
    it("should return workflows for a specific vault", async () => {
      const mockVault = {
        id: "vault1",
        path: "/path/to/vault1",
        name: "Vault 1",
      };

      const mockWorkflows = [
        {
          id: "wf1",
          name: "Workflow 1",
          steps: 3,
          status: "active" as const,
        },
      ];

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(workflows, "discoverWorkflows").mockResolvedValueOnce(
        mockWorkflows
      );

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/workflows",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].nodeId).toBe("vault1");
      expect(data.data[0].nodeName).toBe("Vault 1");
    });

    it("should return error when vault not found", async () => {
      vi.spyOn(registry, "getNode").mockResolvedValueOnce(null);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/nonexistent/workflows",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Vault not found");
    });

    it("should return empty list when vault has no workflows", async () => {
      const mockVault = {
        id: "vault1",
        path: "/path/to/vault1",
        name: "Vault 1",
      };

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(workflows, "discoverWorkflows").mockResolvedValueOnce([]);

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/workflows",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("should handle errors gracefully", async () => {
      const mockVault = {
        id: "vault1",
        path: "/path/to/vault1",
        name: "Vault 1",
      };

      vi.spyOn(registry, "getNode").mockResolvedValueOnce(mockVault);
      vi.spyOn(workflows, "discoverWorkflows").mockRejectedValueOnce(
        new Error("Workflow discovery error")
      );

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults/vault1/workflows",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  // ============================================================================
  // Error Response Format Tests
  // ============================================================================

  describe("Error Response Format", () => {
    it("should always include success and error/data fields", async () => {
      vi.spyOn(registry, "listNodes").mockRejectedValueOnce(
        new Error("Test error")
      );

      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/vaults",
      });

      const data = JSON.parse(response.body);
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("error");
    });

    it("should return consistent JSON structure for all endpoints", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/api/health",
      });

      const data = JSON.parse(response.body);
      expect(typeof data.success).toBe("boolean");
      expect(data.success === true || data.success === false).toBe(true);
    });
  });
});
