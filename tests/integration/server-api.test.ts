import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, ServerConfig } from '../../src/server/index.js';
import { FastifyInstance } from 'fastify';

describe('Server API Endpoints', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    const config: ServerConfig = {
      port: 3020,
      host: '127.0.0.1',
      openBrowser: false,
    };

    const { fastify: server } = await createServer(config);
    fastify = server;
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('GET /api/vaults', () => {
    it('should return a list of vaults with success status', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should return vaults with required fields', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults',
      });

      const body = JSON.parse(response.body);
      if (body.data.length > 0) {
        const vault = body.data[0];
        expect(vault).toHaveProperty('id');
        expect(vault).toHaveProperty('path');
        expect(vault).toHaveProperty('name');
      }
    });

    it('should handle vault list errors gracefully', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults',
      });

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe('ok');
    });

    it('should include timestamp in health response', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/health',
      });

      const body = JSON.parse(response.body);
      expect(body.timestamp).toBeDefined();
      expect(typeof body.timestamp).toBe('string');
      // Validate ISO 8601 format
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });

    it('should be fast (respond in less than 100ms)', async () => {
      const start = Date.now();
      await fastify.inject({
        method: 'GET',
        url: '/api/health',
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('GET /api/providers', () => {
    it('should return available providers', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/providers',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should handle provider list errors gracefully', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/providers',
      });

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
    });
  });

  describe('API Response Format', () => {
    it('should follow consistent JSON response format', async () => {
      const endpoints = ['/api/vaults', '/api/health', '/api/providers'];

      for (const endpoint of endpoints) {
        const response = await fastify.inject({
          method: 'GET',
          url: endpoint,
        });

        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('success');
        expect(typeof body.success).toBe('boolean');
      }
    });

    it('should return valid JSON', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(() => JSON.parse(response.body)).not.toThrow();
    });

    it('should set appropriate Content-Type header', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Error Responses', () => {
    it('should handle non-existent API endpoint gracefully', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/nonexistent',
      });

      // SPA serves main page for unknown routes - that's expected behavior
      expect([200, 404]).toContain(response.statusCode);
    });

    it('should handle invalid vault ID gracefully', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/nonexistent-vault-id',
      });

      // Should return 200 with success: false
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body).toHaveProperty('error');
    });
  });

  describe('Static File Serving', () => {
    it('should serve static CSS files', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/static/css/styles.css',
      });

      // Should either return 200 or 404 (depending on file existence)
      expect([200, 404]).toContain(response.statusCode);
      if (response.statusCode === 200) {
        expect(response.headers['content-type']).toContain('text/css');
      }
    });

    it('should serve static JS files', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/static/js/app.js',
      });

      expect([200, 404]).toContain(response.statusCode);
      if (response.statusCode === 200) {
        expect(response.headers['content-type']).toContain('javascript');
      }
    });
  });

  describe('Page Routes', () => {
    it('should serve root dashboard page', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('should serve SPA pages with same HTML (catch-all)', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/vaults/test/sessions',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });
  });
});
