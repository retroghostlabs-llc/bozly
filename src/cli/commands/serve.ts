import { Command } from "commander";
import { startServer } from "../../server/index.js";
import { errorBox, successBox, infoBox } from "../ui/index.js";

export const serveCommand = new Command()
  .name("serve")
  .description("Start BOZLY web dashboard server")
  .option("-p, --port <port>", "Server port", "3847")
  .option("-h, --host <host>", "Server host", "127.0.0.1")
  .option("-o, --open", "Open browser automatically", true)
  .option("--no-open", "Do not open browser automatically")
  .action(async (options) => {
    try {
      const port = parseInt(options.port, 10);
      const host = options.host;
      const openBrowser = options.open;

      if (isNaN(port) || port < 1 || port > 65535) {
        errorBox("Invalid port number. Must be between 1 and 65535.");
        process.exit(1);
      }

      infoBox(`Starting BOZLY Server on http://${host}:${port}`);

      const fastify = await startServer({
        port,
        host,
        openBrowser,
      });

      // Graceful shutdown
      const signals = ["SIGINT", "SIGTERM"];
      signals.forEach((signal) => {
        process.on(signal, () => {
          void fastify.close().then(() => {
            successBox("Shutting down BOZLY Server...");
            process.exit(0);
          });
        });
      });
    } catch (error) {
      errorBox(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
