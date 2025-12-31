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
        console.log(`\nThe BOZLY server is already running. You can:
  1. Use the existing server (just open the browser)
  2. Kill the existing server and start a fresh one\n`);

        const shouldKill = await confirm({
          message: "Kill existing server and start a new one?",
          default: false, // Changed default to false - safer to reuse existing
        });

        if (!shouldKill) {
          successBox(`BOZLY Server is already running!`);
          const serverUrl = `http://${host}:${port}`;
          console.log(`\n  Web Dashboard: ${serverUrl}/`);
          console.log(`  API Health:    ${serverUrl}/api/health\n`);
          process.exit(0);
        }

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
      }

      infoBox(`Starting BOZLY Server on http://${host}:${port}`);

      const fastify = await startServer({
        port,
        host,
        openBrowser,
      });

      // Show success message with URL
      console.error("[SERVE] Showing success box");
      successBox(`BOZLY Server is running!`);
      console.error("[SERVE] Logging URLs");
      console.log(`\n  Web Dashboard: http://${host}:${port}/`);
      console.log(`  API Health:    http://${host}:${port}/api/health\n`);
      console.error("[SERVE] Server is ready and waiting for requests");

      // Graceful shutdown
      console.error("[SERVE] Setting up signal handlers");
      const signals = ["SIGINT", "SIGTERM"];
      signals.forEach((signal) => {
        process.on(signal, () => {
          console.error(`[SERVE] Got ${signal} signal`);
          void fastify.close().then(() => {
            successBox("Shutting down BOZLY Server...");
            process.exit(0);
          });
        });
      });
      console.error("[SERVE] Signal handlers setup complete");
    } catch (error) {
      errorBox(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
