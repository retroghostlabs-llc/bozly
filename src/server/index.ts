import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import { registerApiRoutes } from "./routes/api.js";
import { registerPageRoutes } from "./routes/pages.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerConfig {
  port: number;
  host: string;
  openBrowser: boolean;
}

export async function createServer(config: ServerConfig) {
  const fastify = Fastify({
    logger: false,
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
    // eslint-disable-next-line no-console
    console.log(`✅ BOZLY Server running at ${url}`);

    if (serverConfig.openBrowser) {
      try {
        const open = (await import("open")).default;
        await open(url);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`📖 Open in browser: ${url}`);
      }
    }

    return fastify;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}
