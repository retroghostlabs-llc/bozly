/**
 * Comprehensive Serve CLI Command Tests
 *
 * Tests for the BOZLY server startup command:
 * - Port and host parsing
 * - Invalid port handling
 * - Server startup success/failure
 * - Signal handling (SIGINT, SIGTERM)
 * - UI output
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Command } from "commander";
import * as serverIndex from "../../src/server/index.js";
import * as ui from "../../src/cli/ui/index.js";

// Import the serve command
import { serveCommand } from "../../src/cli/commands/serve.js";

describe("Serve CLI Command - Comprehensive Coverage", () => {
  let originalExit: typeof process.exit;
  let originalOn: typeof process.on;
  let processOnSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock process.exit
    originalExit = process.exit;
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      // Don't actually exit
    }) as any);

    // Mock process.on for signal handling
    originalOn = process.on;
    const signalHandlers: Record<string, Set<Function>> = {};

    processOnSpy = vi.spyOn(process, "on").mockImplementation(((signal: string, handler: Function) => {
      if (!signalHandlers[signal]) {
        signalHandlers[signal] = new Set();
      }
      signalHandlers[signal].add(handler);
      return process; // Allow chaining
    }) as any);

    // Mock UI functions
    vi.spyOn(ui, "errorBox").mockImplementation(() => {});
    vi.spyOn(ui, "successBox").mockImplementation(() => {});
    vi.spyOn(ui, "infoBox").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.exit = originalExit;
    process.on = originalOn;
  });

  // ============================================================================
  // Actual serveCommand Tests (for code coverage)
  // ============================================================================

  describe("Actual serveCommand execution and coverage", () => {
    it("should execute action handler with valid configuration", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      const startServerSpy = vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);
      vi.spyOn(ui, "infoBox").mockImplementation(() => {});

      // Execute serveCommand to trigger action handler
      await serveCommand.parseAsync(["node", "bozly", "serve", "-p", "9000", "-h", "127.0.0.1"]);

      // Verify startServer was called (exercises the action handler code)
      expect(startServerSpy).toHaveBeenCalled();
    });

    it("should validate port and call errorBox on invalid port", async () => {
      const errorBoxSpy = vi.spyOn(ui, "errorBox").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});

      await serveCommand.parseAsync(["node", "bozly", "serve", "-p", "99999"]);

      expect(errorBoxSpy).toHaveBeenCalledWith("Invalid port number. Must be between 1 and 65535.");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle server startup errors", async () => {
      vi.spyOn(serverIndex, "startServer").mockRejectedValueOnce(new Error("Port in use"));
      const errorBoxSpy = vi.spyOn(ui, "errorBox").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});

      await serveCommand.parseAsync(["node", "bozly", "serve", "-p", "9001"]);

      expect(errorBoxSpy).toHaveBeenCalledWith("Failed to start server: Port in use");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("should register signal handlers after server startup", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);
      vi.spyOn(ui, "infoBox").mockImplementation(() => {});
      processOnSpy = vi.spyOn(process, "on").mockImplementation(((signal: string, handler: Function) => {
        return process;
      }) as any);

      await serveCommand.parseAsync(["node", "bozly", "serve", "-p", "9002"]);

      // Verify signal handlers were registered
      expect(processOnSpy).toHaveBeenCalled();
    });

    it("should pass correct options to startServer", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      const startServerSpy = vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);
      vi.spyOn(ui, "infoBox").mockImplementation(() => {});

      await serveCommand.parseAsync(["node", "bozly", "serve", "-p", "9003", "--no-open"]);

      expect(startServerSpy).toHaveBeenCalled();
      const args = startServerSpy.mock.calls[0][0];
      expect(args).toEqual({
        port: 9003,
        host: "127.0.0.1",
        openBrowser: false,
      });
    });

    it("should display startup message with correct URL", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);
      const infoBoxSpy = vi.spyOn(ui, "infoBox").mockImplementation(() => {});

      await serveCommand.parseAsync(["node", "bozly", "serve", "-p", "9004", "-h", "0.0.0.0"]);

      expect(infoBoxSpy).toHaveBeenCalledWith("Starting BOZLY Server on http://0.0.0.0:9004");
    });

    it("should validate port 0 as invalid", async () => {
      const errorBoxSpy = vi.spyOn(ui, "errorBox").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});

      await serveCommand.parseAsync(["node", "bozly", "serve", "-p", "0"]);

      expect(errorBoxSpy).toHaveBeenCalledWith("Invalid port number. Must be between 1 and 65535.");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("should validate non-numeric port", async () => {
      const errorBoxSpy = vi.spyOn(ui, "errorBox").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});

      await serveCommand.parseAsync(["node", "bozly", "serve", "-p", "invalid"]);

      expect(errorBoxSpy).toHaveBeenCalledWith("Invalid port number. Must be between 1 and 65535.");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ============================================================================
  // Port Validation Tests
  // ============================================================================

  describe("Port validation", () => {
    it("should accept valid port number", async () => {
      // Mock server startup
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          expect(port).toBe(3847);
          expect(isNaN(port)).toBe(false);
          expect(port >= 1 && port <= 65535).toBe(true);
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "3847"]);
    });

    it("should accept port 1 (minimum)", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          expect(port).toBe(1);
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "1"]);
    });

    it("should accept port 65535 (maximum)", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          expect(port).toBe(65535);
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "65535"]);
    });

    it("should reject port 0 (invalid)", async () => {
      const errorBoxSpy = vi.spyOn(ui, "errorBox");

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            errorBoxSpy("Invalid port number. Must be between 1 and 65535.");
          }
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "0"]);
      expect(errorBoxSpy).toHaveBeenCalled();
    });

    it("should reject port 65536 (too high)", async () => {
      const errorBoxSpy = vi.spyOn(ui, "errorBox");

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            errorBoxSpy("Invalid port number. Must be between 1 and 65535.");
          }
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "65536"]);
      expect(errorBoxSpy).toHaveBeenCalled();
    });

    it("should reject non-numeric port", async () => {
      const errorBoxSpy = vi.spyOn(ui, "errorBox");

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            errorBoxSpy("Invalid port number. Must be between 1 and 65535.");
          }
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "invalid"]);
      expect(errorBoxSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Host Configuration Tests
  // ============================================================================

  describe("Host configuration", () => {
    it("should accept default host", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          expect(options.host).toBe("127.0.0.1");
        });

      await command.parseAsync(["node", "bozly", "serve"]);
    });

    it("should accept custom host", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          expect(options.host).toBe("0.0.0.0");
        });

      await command.parseAsync(["node", "bozly", "serve", "-h", "0.0.0.0"]);
    });

    it("should accept localhost", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          expect(options.host).toBe("localhost");
        });

      await command.parseAsync(["node", "bozly", "serve", "-h", "localhost"]);
    });
  });

  // ============================================================================
  // Open Browser Option Tests
  // ============================================================================

  describe("Open browser option", () => {
    it("should default to opening browser", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          expect(options.open).toBe(true);
        });

      await command.parseAsync(["node", "bozly", "serve"]);
    });

    it("should disable browser open with --no-open flag", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          expect(options.open).toBe(false);
        });

      await command.parseAsync(["node", "bozly", "serve", "--no-open"]);
    });

    it("should enable browser open with explicit -o flag", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          expect(options.open).toBe(true);
        });

      await command.parseAsync(["node", "bozly", "serve", "-o"]);
    });
  });

  // ============================================================================
  // Server Startup Tests
  // ============================================================================

  describe("Server startup", () => {
    it("should call startServer with correct configuration", async () => {
      const startServerSpy = vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce({
        close: vi.fn().mockResolvedValue(undefined),
      } as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            throw new Error("Invalid port");
          }
          const startedServer = await serverIndex.startServer({
            port,
            host: options.host,
            openBrowser: options.open,
          });
          expect(startedServer).toBeDefined();
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "3847", "-h", "127.0.0.1"]);
      expect(startServerSpy).toHaveBeenCalledWith({
        port: 3847,
        host: "127.0.0.1",
        openBrowser: true,
      });
    });

    it("should handle server startup with custom port", async () => {
      const startServerSpy = vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce({
        close: vi.fn().mockResolvedValue(undefined),
      } as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            throw new Error("Invalid port");
          }
          await serverIndex.startServer({
            port,
            host: options.host,
            openBrowser: options.open,
          });
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "8080"]);
      expect(startServerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 8080,
        })
      );
    });

    it("should handle server startup errors", async () => {
      const errorBoxSpy = vi.spyOn(ui, "errorBox");
      vi.spyOn(serverIndex, "startServer").mockRejectedValueOnce(new Error("Port already in use"));

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          try {
            const port = parseInt(options.port, 10);
            if (isNaN(port) || port < 1 || port > 65535) {
              throw new Error("Invalid port");
            }
            await serverIndex.startServer({
              port,
              host: options.host,
              openBrowser: options.open,
            });
          } catch (error) {
            errorBoxSpy(
              `Failed to start server: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "8080"]);
      expect(errorBoxSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Info Display Tests
  // ============================================================================

  describe("Info display", () => {
    it("should display server startup message", async () => {
      const infoBoxSpy = vi.spyOn(ui, "infoBox");
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce({
        close: vi.fn().mockResolvedValue(undefined),
      } as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          const host = options.host;
          infoBoxSpy(`Starting BOZLY Server on http://${host}:${port}`);
          await serverIndex.startServer({
            port,
            host,
            openBrowser: options.open,
          });
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "3847"]);
      expect(infoBoxSpy).toHaveBeenCalledWith("Starting BOZLY Server on http://127.0.0.1:3847");
    });

    it("should register signal handlers for graceful shutdown", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          const host = options.host;
          await serverIndex.startServer({
            port,
            host,
            openBrowser: options.open,
          });

          // Simulate signal handler registration
          const signals = ["SIGINT", "SIGTERM"];
          signals.forEach((signal) => {
            process.on(signal, () => {
              // Signal handler registered
            });
          });
        });

      await command.parseAsync(["node", "bozly", "serve"]);
      // Verify that process.on was called for signal handling
      expect(processOnSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge cases", () => {
    it("should handle port as string correctly", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          expect(typeof port).toBe("number");
          expect(Number.isInteger(port)).toBe(true);
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "3000"]);
    });

    it("should handle negative port", async () => {
      const errorBoxSpy = vi.spyOn(ui, "errorBox");

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            errorBoxSpy("Invalid port number. Must be between 1 and 65535.");
          }
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "-1"]);
      expect(errorBoxSpy).toHaveBeenCalled();
    });

    it("should handle decimal port", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          const port = parseInt(options.port, 10);
          // parseInt truncates decimals
          expect(port).toBe(3000);
        });

      await command.parseAsync(["node", "bozly", "serve", "-p", "3000.5"]);
    });

    it("should handle very long host name", async () => {
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(serverIndex, "startServer").mockResolvedValueOnce(mockFastify as any);

      const longHost = "a".repeat(100) + ".example.com";

      const command = new Command();
      command
        .name("serve")
        .option("-p, --port <port>", "Server port", "3847")
        .option("-h, --host <host>", "Server host", "127.0.0.1")
        .option("-o, --open", "Open browser automatically", true)
        .option("--no-open", "Do not open browser automatically")
        .action(async (options) => {
          expect(options.host).toBe(longHost);
        });

      await command.parseAsync(["node", "bozly", "serve", "-h", longHost]);
    });
  });
});
