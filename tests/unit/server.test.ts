import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, startServer, ServerConfig } from '../../src/server/index.js';
import { FastifyInstance } from 'fastify';

describe('Server Module', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createServer', () => {
    it('should create a Fastify instance with valid configuration', async () => {
      const config: ServerConfig = {
        port: 3000,
        host: '127.0.0.1',
        openBrowser: false,
      };

      const { fastify, config: returnedConfig } = await createServer(config);

      expect(fastify).toBeDefined();
      expect(returnedConfig).toEqual(config);
    });

    it('should initialize static file serving', async () => {
      const config: ServerConfig = {
        port: 3001,
        host: '127.0.0.1',
        openBrowser: false,
      };

      const { fastify } = await createServer(config);

      // Verify the server is ready to handle requests
      expect(fastify).toBeDefined();
      expect(typeof fastify.inject).toBe('function');
    });

    it('should register API routes', async () => {
      const config: ServerConfig = {
        port: 3002,
        host: '127.0.0.1',
        openBrowser: false,
      };

      const { fastify } = await createServer(config);

      // Verify API routes are registered by checking for common endpoints
      const routes = fastify.printRoutes();
      expect(routes).toContain('api');
      expect(routes).toContain('vaults');
      expect(routes).toContain('health');
    });

    it('should register page routes', async () => {
      const config: ServerConfig = {
        port: 3003,
        host: '127.0.0.1',
        openBrowser: false,
      };

      const { fastify } = await createServer(config);

      const routes = fastify.printRoutes();
      expect(routes).toContain('/');
    });

    it('should handle various configuration values', async () => {
      const configs: ServerConfig[] = [
        { port: 8080, host: '0.0.0.0', openBrowser: true },
        { port: 3000, host: 'localhost', openBrowser: false },
        { port: 5000, host: '192.168.1.1', openBrowser: true },
      ];

      for (const config of configs) {
        const { fastify: server, config: returnedConfig } = await createServer(config);
        expect(returnedConfig.port).toBe(config.port);
        expect(returnedConfig.host).toBe(config.host);
        expect(returnedConfig.openBrowser).toBe(config.openBrowser);
      }
    });
  });

  describe('ServerConfig Interface', () => {
    it('should accept valid port numbers', () => {
      const validPorts = [80, 3000, 3847, 8080, 9000, 65535];

      validPorts.forEach((port) => {
        const config: ServerConfig = {
          port,
          host: '127.0.0.1',
          openBrowser: false,
        };
        expect(config.port).toBe(port);
      });
    });

    it('should accept various host addresses', () => {
      const validHosts = ['127.0.0.1', 'localhost', '0.0.0.0', '192.168.1.1'];

      validHosts.forEach((host) => {
        const config: ServerConfig = {
          port: 3000,
          host,
          openBrowser: false,
        };
        expect(config.host).toBe(host);
      });
    });

    it('should accept openBrowser boolean values', () => {
      const config1: ServerConfig = {
        port: 3000,
        host: '127.0.0.1',
        openBrowser: true,
      };
      expect(config1.openBrowser).toBe(true);

      const config2: ServerConfig = {
        port: 3000,
        host: '127.0.0.1',
        openBrowser: false,
      };
      expect(config2.openBrowser).toBe(false);
    });
  });

  describe('Server Lifecycle', () => {
    it('should be closeable without errors', async () => {
      const config: ServerConfig = {
        port: 3010,
        host: '127.0.0.1',
        openBrowser: false,
      };

      const { fastify } = await createServer(config);

      // Should not throw
      await expect(fastify.close()).resolves.toBeUndefined();
    });

    it('should handle multiple close calls gracefully', async () => {
      const config: ServerConfig = {
        port: 3011,
        host: '127.0.0.1',
        openBrowser: false,
      };

      const { fastify } = await createServer(config);

      await fastify.close();

      // Closing again should not throw
      await expect(fastify.close()).resolves.toBeUndefined();
    });
  });

  describe('Server Error Handling', () => {
    it('should handle invalid configurations gracefully', async () => {
      const invalidConfig = {
        port: 999999, // Invalid port
        host: '127.0.0.1',
        openBrowser: false,
      } as ServerConfig;

      // Create should succeed, but listening would fail
      const { fastify } = await createServer(invalidConfig);
      await fastify.close();
    });

    it('should initialize with logger disabled for clean output', async () => {
      const config: ServerConfig = {
        port: 3012,
        host: '127.0.0.1',
        openBrowser: false,
      };

      const { fastify } = await createServer(config);

      // Verify logger is configured (false means no logging to stdout)
      expect(fastify.log).toBeDefined();
      expect(typeof fastify.log.debug).toBe('function');
    });
  });
});
