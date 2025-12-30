import { FastifyInstance } from "fastify";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { FULL_VERSION } from "../../core/version.js";
import { logger } from "../../core/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load HTML templates and inject version
function loadTemplate(name: string): string {
  const templatePath = path.join(__dirname, "..", "views", `${name}.html`);
  let html = readFileSync(templatePath, "utf-8");

  // Replace version placeholders with actual version
  // Supports both "v0.x.x" and "0.x.x" formats, including beta/rc suffixes
  html = html.replace(/BOZLY v[\d.]+([-.][\w.]+)?/g, `BOZLY v${FULL_VERSION}`);

  return html;
}

export function registerPageRoutes(fastify: FastifyInstance): void {
  // GET / - Dashboard
  fastify.get("/", async (_request, reply) => {
    try {
      const html = loadTemplate("layout");
      reply.type("text/html").send(html);
    } catch (error) {
      void logger.error("Failed to load dashboard", {
        error: error instanceof Error ? error.message : String(error),
      });
      reply.status(500).send({
        success: false,
        error: "Failed to load dashboard",
      });
    }
  });

  // GET /vaults/:id/sessions - Sessions list
  fastify.get<{ Params: { id: string } }>("/vaults/:id/sessions", async (request, reply) => {
    try {
      const html = loadTemplate("layout");
      reply.type("text/html").send(html);
    } catch (error) {
      void logger.error("Failed to load sessions page", {
        error: error instanceof Error ? error.message : String(error),
        vaultId: request.params.id,
      });
      reply.status(500).send({
        success: false,
        error: "Failed to load sessions page",
      });
    }
  });

  // GET /vaults/:id/sessions/:sessionId - Session detail
  fastify.get<{ Params: { id: string; sessionId: string } }>(
    "/vaults/:id/sessions/:sessionId",
    async (request, reply) => {
      try {
        const html = loadTemplate("layout");
        reply.type("text/html").send(html);
      } catch (error) {
        void logger.error("Failed to load session detail page", {
          error: error instanceof Error ? error.message : String(error),
          vaultId: request.params.id,
          sessionId: request.params.sessionId,
        });
        reply.status(500).send({
          success: false,
          error: "Failed to load session detail page",
        });
      }
    }
  );

  // GET /vaults/:id/commands - Commands list
  fastify.get<{ Params: { id: string } }>("/vaults/:id/commands", async (request, reply) => {
    try {
      const html = loadTemplate("layout");
      reply.type("text/html").send(html);
    } catch (error) {
      void logger.error("Failed to load commands page", {
        error: error instanceof Error ? error.message : String(error),
        vaultId: request.params.id,
      });
      reply.status(500).send({
        success: false,
        error: "Failed to load commands page",
      });
    }
  });

  // Catch-all for SPA routing - serve dashboard
  fastify.get("*", async (request, reply) => {
    try {
      const html = loadTemplate("layout");
      reply.type("text/html").send(html);
    } catch (error) {
      void logger.error("Failed to load page", {
        error: error instanceof Error ? error.message : String(error),
        path: request.url,
      });
      reply.status(404).send({
        success: false,
        error: "Page not found",
      });
    }
  });
}
