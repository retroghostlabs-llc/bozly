import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../core/logger.js";
import { registerApiRoutes } from "./routes/api.js";
import { registerPageRoutes } from "./routes/pages.js";
import { initializeMetrics, getMetrics } from "../core/metrics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerConfig {
  port: number;
  host: string;
  openBrowser: boolean;
}

export async function createServer(config: ServerConfig) {
  // Initialize metrics at server startup
  initializeMetrics();

  const fastify = Fastify({
    logger: false,
  });

  // Add request tracking middleware
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fastify.addHook("onRequest", (request) => {
    // Store request start time for response time calculation
    (request as any).startTime = Date.now();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fastify.addHook("onResponse", (request, reply) => {
    // Calculate response time and record request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startTime = (request as any).startTime ?? Date.now();
    const responseTime = Date.now() - startTime;
    const isError = reply.statusCode >= 400;

    const metrics = getMetrics();
    metrics.recordRequest(responseTime, isError);
  });

  // Register static file serving (CSS, JS, favicon, etc.)
  const staticPath = path.join(__dirname, "static");
  await fastify.register(fastifyStatic, {
    root: staticPath,
    prefix: "/static/",
  });

  // Register API routes
  registerApiRoutes(fastify);

  // Register page routes
  registerPageRoutes(fastify);

  return { fastify, config };
}

export async function startServer(config: ServerConfig) {
  const { fastify, config: serverConfig } = await createServer(config);

  try {
    await fastify.listen({ port: serverConfig.port, host: serverConfig.host });

    const url = `http://${serverConfig.host}:${serverConfig.port}`;
    await logger.info(`BOZLY Server running at ${url}`, {
      url,
      host: serverConfig.host,
      port: serverConfig.port,
    });

    // Detect headless/SSH environments
    const isHeadless = !process.env.DISPLAY && process.env.SSH_CONNECTION;

    if (serverConfig.openBrowser && !isHeadless) {
      try {
        const open = (await import("open")).default;
        await open(url);
      } catch (error) {
        await logger.warn(
          `Failed to open browser automatically: ${error instanceof Error ? error.message : String(error)}`,
          { url, error: error instanceof Error ? error.message : String(error) }
        );
      }
    } else if (isHeadless) {
      await logger.info(`Running in headless/SSH environment. Open browser at: ${url}`, { url });
    }

    return fastify;
  } catch (error) {
    await logger.error(
      "Failed to start server",
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
}
