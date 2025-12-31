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
  console.error("[DEBUG] createServer: Starting");

  // Initialize metrics at server startup
  console.error("[DEBUG] createServer: Initializing metrics");
  initializeMetrics();

  console.error("[DEBUG] createServer: Creating Fastify instance");
  const fastify = Fastify({
    logger: false,
  });

  // Add request tracking middleware
  console.error("[DEBUG] createServer: Adding request hooks");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fastify.addHook("onRequest", async (request, _reply) => {
    console.error(`[REQUEST] ${request.method} ${request.url}`);
    // Store request start time for response time calculation
    (request as any).startTime = Date.now();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fastify.addHook("onResponse", async (request, reply) => {
    console.error(`[RESPONSE] ${request.method} ${request.url} -> ${reply.statusCode}`);
    // Calculate response time and record request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startTime = (request as any).startTime ?? Date.now();
    const responseTime = Date.now() - startTime;
    const isError = reply.statusCode >= 400;

    const metrics = getMetrics();
    metrics.recordRequest(responseTime, isError);
  });

  // Register static file serving (CSS, JS, favicon, etc.)
  console.error("[DEBUG] createServer: Registering static files");
  const staticPath = path.join(__dirname, "static");
  await fastify.register(fastifyStatic, {
    root: staticPath,
    prefix: "/static/",
  });

  // Register API routes
  console.error("[DEBUG] createServer: Registering API routes");
  registerApiRoutes(fastify);

  // Register page routes
  console.error("[DEBUG] createServer: Registering page routes");
  registerPageRoutes(fastify);

  console.error("[DEBUG] createServer: Complete");
  return { fastify, config };
}

export async function startServer(config: ServerConfig) {
  console.error("[DEBUG] startServer: Creating server instance");
  const { fastify, config: serverConfig } = await createServer(config);

  try {
    console.error("[DEBUG] startServer: About to listen on port", serverConfig.port);
    await fastify.listen({ port: serverConfig.port, host: serverConfig.host });
    console.error("[DEBUG] startServer: Successfully listening");

    const url = `http://${serverConfig.host}:${serverConfig.port}`;
    console.error("[DEBUG] startServer: Logging info");
    await logger.info(`BOZLY Server running at ${url}`, {
      url,
      host: serverConfig.host,
      port: serverConfig.port,
    });
    console.error("[DEBUG] startServer: Logged info, checking headless");

    // Detect headless/SSH environments
    const isHeadless = !process.env.DISPLAY && process.env.SSH_CONNECTION;
    console.error("[DEBUG] startServer: isHeadless =", isHeadless);

    if (serverConfig.openBrowser && !isHeadless) {
      try {
        console.error("[DEBUG] startServer: Opening browser");
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

    console.error("[DEBUG] startServer: Returning fastify instance");
    return fastify;
  } catch (error) {
    console.error("[DEBUG] startServer: Error caught:", error);
    await logger.error(
      "Failed to start server",
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
}
