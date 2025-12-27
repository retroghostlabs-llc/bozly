import { Command } from "commander";
import { killServerOnPort, findServerPID } from "../../core/server-manager.js";
import { getDefaultPort, isValidPort } from "../../core/port-config.js";
import { errorBox, successBox, infoBox, warningBox } from "../ui/index.js";

export const stopCommand = new Command()
  .name("stop")
  .description("Stop the BOZLY API server")
  .option(
    "-p, --port <port>",
    "Server port (default: BOZLY_PORT env or ~/.bozly/bozly-config.json)"
  )
  .action(async (options) => {
    try {
      // Use provided port or fall back to config
      const portStr = options.port ?? getDefaultPort().toString();
      const port = parseInt(portStr, 10);

      if (!isValidPort(port)) {
        errorBox("Invalid port number. Must be between 1 and 65535.");
        process.exit(1);
      }

      infoBox(`Stopping BOZLY Server on port ${port}...`);

      const pid = await findServerPID(port);

      if (!pid) {
        warningBox(`No server running on port ${port}`);
        process.exit(0);
      }

      infoBox(`Found server (PID: ${pid}), sending shutdown signal...`);

      const killed = await killServerOnPort(port);

      if (killed) {
        successBox(`Server stopped successfully (PID: ${pid})`);
        process.exit(0);
      } else {
        errorBox(`Failed to stop server (PID: ${pid})`);
        process.exit(1);
      }
    } catch (error) {
      errorBox(`Failed to stop server: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
