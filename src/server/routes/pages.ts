import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load HTML templates
function loadTemplate(name: string): string {
  const templatePath = path.join(__dirname, "..", "views", `${name}.html`);
  return readFileSync(templatePath, "utf-8");
}

export function registerPageRoutes(fastify: FastifyInstance): void {
  // GET / - Dashboard
  fastify.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const html = loadTemplate("layout");
      reply.type("text/html").send(html);
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: "Failed to load dashboard",
      });
    }
  });

  // GET /vaults/:id/sessions - Sessions list
  fastify.get<{ Params: { id: string } }>(
    "/vaults/:id/sessions",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const html = loadTemplate("layout");
        reply.type("text/html").send(html);
      } catch (error) {
        reply.status(500).send({
          success: false,
          error: "Failed to load sessions page",
        });
      }
    }
  );

  // GET /vaults/:id/sessions/:sessionId - Session detail
  fastify.get<{ Params: { id: string; sessionId: string } }>(
    "/vaults/:id/sessions/:sessionId",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const html = loadTemplate("layout");
        reply.type("text/html").send(html);
      } catch (error) {
        reply.status(500).send({
          success: false,
          error: "Failed to load session detail page",
        });
      }
    }
  );

  // GET /vaults/:id/commands - Commands list
  fastify.get<{ Params: { id: string } }>(
    "/vaults/:id/commands",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const html = loadTemplate("layout");
        reply.type("text/html").send(html);
      } catch (error) {
        reply.status(500).send({
          success: false,
          error: "Failed to load commands page",
        });
      }
    }
  );

  // Catch-all for SPA routing - serve dashboard
  fastify.get("*", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const html = loadTemplate("layout");
      reply.type("text/html").send(html);
    } catch (error) {
      reply.status(404).send({
        success: false,
        error: "Page not found",
      });
    }
  });
}
