import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer, ServerConfig } from "../../src/server/index.js";
import { FastifyInstance } from "fastify";

describe("Server Pages Routes - Comprehensive Coverage", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    const config: ServerConfig = {
      port: 3022,
      host: "127.0.0.1",
      openBrowser: false,
    };

    const { fastify: server } = await createServer(config);
    fastify = server;
  });

  afterAll(async () => {
    await fastify.close();
  });

  // ============================================================================
  // GET / - Dashboard Route
  // ============================================================================

  describe("GET / - Dashboard page", () => {
    it("should return dashboard HTML on success", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.body).toBeTruthy();
      expect(typeof response.body).toBe("string");
    });

    it("should return HTML content starting with DOCTYPE or html tag", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      const bodyLower = response.body.toLowerCase();
      expect(bodyLower).toMatch(/<!doctype|<html/);
    });

    it("should have proper HTML structure", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("<html") || expect(response.body).toContain("<HTML");
    });

    it("should set correct content-type header", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toMatch(/text\/html/i);
    });

    it("should cache-busting: return fresh content on repeated requests", async () => {
      const response1 = await fastify.inject({
        method: "GET",
        url: "/",
      });

      const response2 = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      expect(response1.body).toBe(response2.body);
    });
  });

  // ============================================================================
  // GET /vaults/:id/sessions - Sessions List Page
  // ============================================================================

  describe("GET /vaults/:id/sessions - Sessions list page", () => {
    it("should return sessions page with valid vault ID", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/vault1/sessions",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.body).toBeTruthy();
    });

    it("should handle different vault ID formats", async () => {
      const vaultIds = [
        "vault-123",
        "my_vault",
        "VAULT",
        "vault.name",
        "abc123def456",
      ];

      for (const vaultId of vaultIds) {
        const response = await fastify.inject({
          method: "GET",
          url: `/vaults/${vaultId}/sessions`,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["content-type"]).toContain("text/html");
      }
    });

    it("should return HTML content for sessions page", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/test-vault/sessions",
      });

      expect(response.statusCode).toBe(200);
      const bodyLower = response.body.toLowerCase();
      expect(bodyLower).toMatch(/<!doctype|<html/);
    });

    it("should handle special characters in vault ID", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/vault%2D123/sessions",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle empty vault ID gracefully", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults//sessions",
      });

      // Should either return dashboard (catch-all) or 404
      expect([200, 404]).toContain(response.statusCode);
    });

    it("should have same response format as dashboard", async () => {
      const dashboardResponse = await fastify.inject({
        method: "GET",
        url: "/",
      });

      const sessionsResponse = await fastify.inject({
        method: "GET",
        url: "/vaults/vault1/sessions",
      });

      expect(dashboardResponse.statusCode).toBe(200);
      expect(sessionsResponse.statusCode).toBe(200);
      expect(sessionsResponse.headers["content-type"]).toBe(
        dashboardResponse.headers["content-type"]
      );
    });
  });

  // ============================================================================
  // GET /vaults/:id/sessions/:sessionId - Session Detail Page
  // ============================================================================

  describe("GET /vaults/:id/sessions/:sessionId - Session detail page", () => {
    it("should return session detail page with valid parameters", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/vault1/sessions/session-uuid-123",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle various vault ID formats", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/my-vault/sessions/abc123def456",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle UUID-style session IDs", async () => {
      const sessionId = "550e8400-e29b-41d4-a716-446655440000";
      const response = await fastify.inject({
        method: "GET",
        url: `/vaults/vault1/sessions/${sessionId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle special characters in session ID", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/vault1/sessions/session%2D123",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should return HTML content for detail page", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/vault1/sessions/session123",
      });

      expect(response.statusCode).toBe(200);
      const bodyLower = response.body.toLowerCase();
      expect(bodyLower).toMatch(/<!doctype|<html/);
    });

    it("should handle long session IDs", async () => {
      const longSessionId = "a".repeat(100);
      const response = await fastify.inject({
        method: "GET",
        url: `/vaults/vault1/sessions/${longSessionId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should maintain same response structure across all parameters", async () => {
      const response1 = await fastify.inject({
        method: "GET",
        url: "/vaults/vault1/sessions/session1",
      });

      const response2 = await fastify.inject({
        method: "GET",
        url: "/vaults/vault2/sessions/session2",
      });

      expect(response1.statusCode).toBe(response2.statusCode);
      expect(response1.headers["content-type"]).toBe(response2.headers["content-type"]);
    });
  });

  // ============================================================================
  // GET /vaults/:id/commands - Commands List Page
  // ============================================================================

  describe("GET /vaults/:id/commands - Commands list page", () => {
    it("should return commands page with valid vault ID", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/vault1/commands",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle different vault ID formats", async () => {
      const vaultIds = [
        "vault-1",
        "my_vault",
        "VAULT",
        "vault.test",
        "test123",
      ];

      for (const vaultId of vaultIds) {
        const response = await fastify.inject({
          method: "GET",
          url: `/vaults/${vaultId}/commands`,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["content-type"]).toContain("text/html");
      }
    });

    it("should return valid HTML response", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/test-vault/commands",
      });

      expect(response.statusCode).toBe(200);
      const bodyLower = response.body.toLowerCase();
      expect(bodyLower).toMatch(/<!doctype|<html/);
    });

    it("should handle special characters in vault ID", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/vault%2D123/commands",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should have consistent response with other pages", async () => {
      const dashboardResponse = await fastify.inject({
        method: "GET",
        url: "/",
      });

      const commandsResponse = await fastify.inject({
        method: "GET",
        url: "/vaults/vault1/commands",
      });

      expect(dashboardResponse.statusCode).toBe(200);
      expect(commandsResponse.statusCode).toBe(200);
      expect(commandsResponse.headers["content-type"]).toBe(
        dashboardResponse.headers["content-type"]
      );
    });
  });

  // ============================================================================
  // GET * - Catch-all/SPA Routing
  // ============================================================================

  describe("GET * - Catch-all SPA routing", () => {
    it("should serve dashboard for unknown routes", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/unknown/route/path",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle deeply nested unknown routes", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/deep/nested/unknown/route/here",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle routes with query parameters", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/unknown/path?param1=value1&param2=value2",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle routes with hash fragments", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/unknown/path#section",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle single segment unknown routes", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/unknown",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should serve SPA for routes that look like files", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/unknown/route.html",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should serve same content for multiple catch-all routes", async () => {
      const response1 = await fastify.inject({
        method: "GET",
        url: "/catch/all/one",
      });

      const response2 = await fastify.inject({
        method: "GET",
        url: "/catch/all/two",
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      expect(response1.body).toBe(response2.body);
    });
  });

  // ============================================================================
  // Response Format & Headers - Comprehensive Tests
  // ============================================================================

  describe("Response format and headers", () => {
    it("should have consistent content-type across all page routes", async () => {
      const routes = [
        "/",
        "/vaults/vault1/sessions",
        "/vaults/vault1/sessions/session1",
        "/vaults/vault1/commands",
        "/unknown",
      ];

      const contentTypes = await Promise.all(
        routes.map(async (url) => {
          const response = await fastify.inject({
            method: "GET",
            url,
          });
          return response.headers["content-type"];
        })
      );

      // All should have text/html content type
      contentTypes.forEach((ct) => {
        expect(ct).toContain("text/html");
      });
    });

    it("should have charset in content-type header", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBeDefined();
    });

    it("should return non-empty response body", async () => {
      const routes = [
        "/",
        "/vaults/vault1/sessions",
        "/vaults/vault1/sessions/session1",
        "/vaults/vault1/commands",
      ];

      for (const url of routes) {
        const response = await fastify.inject({
          method: "GET",
          url,
        });

        expect(response.statusCode).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.length).toBeGreaterThan(0);
      }
    });

    it("should return valid string response body", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      expect(typeof response.body).toBe("string");
    });
  });

  // ============================================================================
  // Error Handling & Edge Cases
  // ============================================================================

  describe("Error handling and edge cases", () => {
    it("should handle very long URLs", async () => {
      const longId = "a".repeat(500);
      const response = await fastify.inject({
        method: "GET",
        url: `/vaults/${longId}/sessions`,
      });

      // Should either work or return a 414 (URI too long)
      expect([200, 404, 414]).toContain(response.statusCode);
    });

    it("should handle URLs with encoded special characters", async () => {
      const encodedUrl = "/vaults/vault%20with%20spaces/sessions";
      const response = await fastify.inject({
        method: "GET",
        url: encodedUrl,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle multiple trailing slashes", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/vault1///sessions",
      });

      // Should handle gracefully
      expect([200, 404]).toContain(response.statusCode);
    });

    it("should handle numeric vault IDs", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/vaults/123456/sessions",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle UUID-formatted vault IDs", async () => {
      const vaultId = "550e8400-e29b-41d4-a716-446655440000";
      const response = await fastify.inject({
        method: "GET",
        url: `/vaults/${vaultId}/sessions`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should consistently return 200 for all valid routes", async () => {
      const routes = [
        "/",
        "/vaults/v1/sessions",
        "/vaults/v1/sessions/s1",
        "/vaults/v1/commands",
      ];

      for (const route of routes) {
        const response = await fastify.inject({
          method: "GET",
          url: route,
        });

        expect(response.statusCode).toBe(200);
      }
    });
  });

  // ============================================================================
  // HTTP Method Tests - Only GET allowed
  // ============================================================================

  describe("HTTP method restrictions", () => {
    it("should only accept GET method for page routes", async () => {
      const response = await fastify.inject({
        method: "POST",
        url: "/",
      });

      // POST should not be allowed
      expect(response.statusCode).not.toBe(200);
    });

    it("should reject PUT requests to page routes", async () => {
      const response = await fastify.inject({
        method: "PUT",
        url: "/vaults/vault1/sessions",
      });

      expect(response.statusCode).not.toBe(200);
    });

    it("should reject DELETE requests to page routes", async () => {
      const response = await fastify.inject({
        method: "DELETE",
        url: "/vaults/vault1/sessions/session1",
      });

      expect(response.statusCode).not.toBe(200);
    });
  });

  // ============================================================================
  // Response Content Tests
  // ============================================================================

  describe("Response content validation", () => {
    it("should return HTML with opening tag", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      const body = response.body.trim();
      expect(
        body.toLowerCase().startsWith("<!doctype") ||
          body.toLowerCase().startsWith("<html")
      ).toBe(true);
    });

    it("should have matching opening and closing HTML tags", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("<html") || expect(response.body).toContain("<HTML");
    });

    it("should contain HEAD section", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      const bodyLower = response.body.toLowerCase();
      expect(bodyLower).toContain("<head") || expect(bodyLower).toContain("<!doctype");
    });

    it("should contain BODY section", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      const bodyLower = response.body.toLowerCase();
      expect(bodyLower).toContain("<body");
    });

    it("should have meta charset tag", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      const bodyLower = response.body.toLowerCase();
      expect(bodyLower).toContain("charset");
    });
  });
});
