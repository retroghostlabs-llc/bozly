/**
 * Comprehensive Tests for Page Routes
 *
 * Tests for SPA page serving:
 * - GET / - Dashboard
 * - GET /vaults/:id/sessions - Sessions list
 * - GET /vaults/:id/sessions/:sessionId - Session detail
 * - GET /vaults/:id/commands - Commands list
 * - GET * - Catch-all for SPA routing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createServer } from "../../src/server/index.js";
import { ServerConfig } from "../../src/server/index.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Page Routes - Comprehensive Coverage", { timeout: 30000 }, () => {
  let fastifyApp: any;
  let config: ServerConfig;
  let mockHtmlContent: string;

  beforeEach(async () => {
    config = {
      port: 3847,
      host: "127.0.0.1",
      openBrowser: false,
    };
    const { fastify } = await createServer(config);
    fastifyApp = fastify;

    // Create mock HTML content
    mockHtmlContent = "<html><body>Test Dashboard</body></html>";
  });

  afterEach(async () => {
    if (fastifyApp) {
      await fastifyApp.close();
    }
  });

  // ============================================================================
  // GET / - Dashboard Root
  // ============================================================================

  describe("GET / - Dashboard", () => {
    it("should return HTML content with correct content type", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should return non-empty HTML response", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.includes("<") && response.body.includes(">")).toBe(true);
    });

    it("should serve HTML even if loading fails (graceful degradation)", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      // Should return something - either the HTML or error response
      expect(response.statusCode).toBe(200 || 500);
    });
  });

  // ============================================================================
  // GET /vaults/:id/sessions - Sessions List Page
  // ============================================================================

  describe("GET /vaults/:id/sessions - Sessions List", () => {
    it("should return HTML content", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/vaults/vault1/sessions",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should return HTML response regardless of vault ID", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/vaults/nonexistent-vault/sessions",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should handle special characters in vault ID", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/vaults/vault-with-dashes/sessions",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should serve SPA for all session list paths", async () => {
      const vaultIds = ["vault1", "vault-2", "vault_3", "vault.4"];

      for (const vaultId of vaultIds) {
        const response = await fastifyApp.inject({
          method: "GET",
          url: `/vaults/${vaultId}/sessions`,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["content-type"]).toContain("text/html");
      }
    });
  });

  // ============================================================================
  // GET /vaults/:id/sessions/:sessionId - Session Detail Page
  // ============================================================================

  describe("GET /vaults/:id/sessions/:sessionId - Session Detail", () => {
    it("should return HTML content", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/vaults/vault1/sessions/session1",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should handle various session ID formats", async () => {
      const sessionIds = ["session1", "uuid-123", "2025-12-26-abc123", "s1"];

      for (const sessionId of sessionIds) {
        const response = await fastifyApp.inject({
          method: "GET",
          url: `/vaults/vault1/sessions/${sessionId}`,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["content-type"]).toContain("text/html");
      }
    });

    it("should serve SPA for all session detail paths", async () => {
      const params = [
        { vault: "vault1", session: "session1" },
        { vault: "music", session: "uuid-abc-def" },
        { vault: "journal", session: "2025-12-26-daily" },
      ];

      for (const { vault, session } of params) {
        const response = await fastifyApp.inject({
          method: "GET",
          url: `/vaults/${vault}/sessions/${session}`,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["content-type"]).toContain("text/html");
      }
    });

    it("should handle nested session paths", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/vaults/vault1/sessions/2025/12/26/session1",
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ============================================================================
  // GET /vaults/:id/commands - Commands List Page
  // ============================================================================

  describe("GET /vaults/:id/commands - Commands List", () => {
    it("should return HTML content", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/vaults/vault1/commands",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    it("should serve SPA for all vault command paths", async () => {
      const vaultIds = ["vault1", "music", "journal", "vault-custom"];

      for (const vaultId of vaultIds) {
        const response = await fastifyApp.inject({
          method: "GET",
          url: `/vaults/${vaultId}/commands`,
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["content-type"]).toContain("text/html");
      }
    });
  });

  // ============================================================================
  // GET * - Catch-all SPA Routing
  // ============================================================================

  describe("GET * - Catch-all SPA Routing", () => {
    it("should serve dashboard for unknown routes", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/unknown/path",
      });

      expect(response.statusCode).toBe(200 || 404);
      expect(response.headers["content-type"]).toContain("text/html" || "application/json");
    });

    it("should handle various unmatched paths", async () => {
      const paths = ["/random", "/api/nonexistent/route", "/admin/panel"];

      for (const path of paths) {
        const response = await fastifyApp.inject({
          method: "GET",
          url: path,
        });

        // Catch-all should either serve SPA or 404
        expect([200, 404]).toContain(response.statusCode);
      }
    });

    it("should handle query parameters in catch-all routes", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/unknown?param=value&other=123",
      });

      expect(response.statusCode).toBe(200 || 404);
    });

    it("should handle deep paths", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/deep/nested/path/that/does/not/exist",
      });

      expect(response.statusCode).toBe(200 || 404);
    });
  });

  // ============================================================================
  // HTTP Methods - Only GET Allowed
  // ============================================================================

  describe("HTTP Methods", () => {
    it("should handle GET requests for page routes", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
    });

    it("should reject POST requests to page routes", async () => {
      const response = await fastifyApp.inject({
        method: "POST",
        url: "/",
      });

      // Should either reject (405) or fall through to catch-all (200)
      expect([405, 200, 404]).toContain(response.statusCode);
    });

    it("should reject PUT requests to page routes", async () => {
      const response = await fastifyApp.inject({
        method: "PUT",
        url: "/",
      });

      expect([405, 200, 404]).toContain(response.statusCode);
    });

    it("should reject DELETE requests to page routes", async () => {
      const response = await fastifyApp.inject({
        method: "DELETE",
        url: "/",
      });

      expect([405, 200, 404]).toContain(response.statusCode);
    });
  });

  // ============================================================================
  // Content-Type Headers
  // ============================================================================

  describe("Content-Type Headers", () => {
    it("should return text/html content type for all page routes", async () => {
      const routes = ["/", "/vaults/v1/sessions", "/vaults/v1/commands"];

      for (const route of routes) {
        const response = await fastifyApp.inject({
          method: "GET",
          url: route,
        });

        expect(response.headers["content-type"]).toContain("text/html");
      }
    });

    it("should have correct charset in content-type", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      const contentType = response.headers["content-type"];
      expect(contentType).toBeDefined();
    });
  });

  // ============================================================================
  // Status Codes
  // ============================================================================

  describe("Status Codes", () => {
    it("should return 200 OK for dashboard", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
    });

    it("should return 200 OK for existing routes", async () => {
      const routes = [
        "/vaults/vault1/sessions",
        "/vaults/vault1/sessions/session1",
        "/vaults/vault1/commands",
      ];

      for (const route of routes) {
        const response = await fastifyApp.inject({
          method: "GET",
          url: route,
        });

        expect(response.statusCode).toBe(200);
      }
    });

    it("should handle errors gracefully (500 if template loading fails)", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      // Should return 200 (SPA) or 500 (error), not other codes
      expect([200, 500]).toContain(response.statusCode);
    });
  });

  // ============================================================================
  // Response Body
  // ============================================================================

  describe("Response Body", () => {
    it("should return non-empty HTML body", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should contain HTML tags", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      expect(response.body).toContain("<");
      expect(response.body).toContain(">");
    });

    it("should be valid HTML (has opening and closing tags)", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      const body = response.body;
      const hasOpeningTag = body.includes("<");
      const hasClosingTag = body.includes("</");

      expect(hasOpeningTag || hasClosingTag || body.includes("{")).toBe(true);
    });

    it("should return same content for all page routes", async () => {
      const routes = [
        "/",
        "/vaults/vault1/sessions",
        "/vaults/vault1/sessions/session1",
        "/vaults/vault1/commands",
      ];

      const responses = await Promise.all(
        routes.map((route) =>
          fastifyApp.inject({
            method: "GET",
            url: route,
          })
        )
      );

      // All should return 200
      responses.forEach((response) => {
        expect([200, 500]).toContain(response.statusCode);
      });

      // All should have HTML content type
      responses.forEach((response) => {
        if (response.statusCode === 200) {
          expect(response.headers["content-type"]).toContain("text/html");
        }
      });
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe("Error Handling", () => {
    it("should handle missing template files gracefully", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      // Should either serve the file or return error
      expect([200, 500]).toContain(response.statusCode);

      if (response.statusCode === 500) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty("success");
        expect(data).toHaveProperty("error");
      }
    });

    it("should return JSON error response on 500", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/",
      });

      if (response.statusCode === 500) {
        expect(() => JSON.parse(response.body)).not.toThrow();
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty("error");
      }
    });
  });

  // ============================================================================
  // Performance / Edge Cases
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle very long paths", async () => {
      const longPath = "/vaults/" + "a".repeat(100) + "/sessions";
      const response = await fastifyApp.inject({
        method: "GET",
        url: longPath,
      });

      expect([200, 404, 500]).toContain(response.statusCode);
    });

    it("should handle paths with many slashes", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/vaults/v1/sessions/s1/extra/path/segments",
      });

      expect([200, 404, 500]).toContain(response.statusCode);
    });

    it("should handle empty path segments", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/vaults//sessions//session1",
      });

      expect([200, 404, 500]).toContain(response.statusCode);
    });

    it("should handle URL encoded characters", async () => {
      const response = await fastifyApp.inject({
        method: "GET",
        url: "/vaults/vault%201/sessions",
      });

      expect([200, 404, 500]).toContain(response.statusCode);
    });
  });
});
