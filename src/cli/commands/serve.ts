import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import { startServer } from "../../server/index.js";
import { killServerOnPort, findServerPID } from "../../core/server-manager.js";
import { getDefaultPort, getDefaultHost, isValidPort } from "../../core/port-config.js";
import { ConfigManager } from "../../core/config-manager.js";
import { errorBox, successBox, infoBox, warningBox } from "../ui/index.js";

export const serveCommand = new Command()
  .name("serve")
  .description("Start BOZLY web dashboard server")
  .option("-p, --port <port>", "Server port (default: 3847, or BOZLY_PORT env)")
  .option("-h, --host <host>", "Server host (default: 127.0.0.1, or BOZLY_HOST env)")
  .option("-o, --open", "Open browser automatically")
  .option("--no-open", "Do not open browser automatically")
  .action(async (options) => {
    try {
      // Use provided port or fall back to config
      const portStr = options.port ?? getDefaultPort().toString();
      const port = parseInt(portStr, 10);
      const host = options.host ?? getDefaultHost();

      // Determine openBrowser: CLI flag takes precedence, then config default
      let openBrowser: boolean;
      if (options.open === true) {
        openBrowser = true;
      } else if (options.open === false) {
        openBrowser = false;
      } else {
        openBrowser = ConfigManager.getInstance().getServer().openBrowser;
      }

      if (!isValidPort(port)) {
        errorBox("Invalid port number. Must be between 1 and 65535.");
        process.exit(1);
      }

      // Check if server is already running on this port
      const existingPID = await findServerPID(port);
      if (existingPID) {
        warningBox(`Server already running on port ${port} (PID: ${existingPID})`);

        const shouldKill = await confirm({
          message: "Kill existing server and start new one?",
          default: true,
        });

        if (shouldKill) {
          infoBox("Stopping existing server...");
          const killed = await killServerOnPort(port);
          if (killed) {
            successBox("Existing server stopped");
            // Wait a moment before starting new one
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            errorBox("Failed to stop existing server");
            process.exit(1);
          }
        } else {
          infoBox("Use 'bozly stop' to stop the server manually");
          process.exit(1);
        }
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
