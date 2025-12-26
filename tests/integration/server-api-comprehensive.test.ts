import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer, ServerConfig } from '../../src/server/index.js';
import { FastifyInstance } from 'fastify';
import * as registry from '../../src/core/registry.js';
import * as sessions from '../../src/core/sessions.js';
import * as commands from '../../src/core/commands.js';
import * as context from '../../src/core/context.js';
import * as providers from '../../src/core/providers.js';

describe('Comprehensive API Endpoints Coverage', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    const config: ServerConfig = {
      port: 3021,
      host: '127.0.0.1',
      openBrowser: false,
    };

    const { fastify: server } = await createServer(config);
    fastify = server;
  });

  afterAll(async () => {
    await fastify.close();
  });

  // ============================================================================
  // GET /api/vaults - List all vaults
  // ============================================================================
  describe('GET /api/vaults - List all vaults', () => {
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

    it('should return empty array when no vaults exist', async () => {
      vi.spyOn(registry, 'listNodes').mockResolvedValueOnce([]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults',
      });

      const body = JSON.parse(response.body);
      expect(body.data).toEqual([]);
    });

    it('should include vault metadata in response', async () => {
      const mockVaults = [
        { id: 'vault1', path: '/path/to/vault1', name: 'Music Vault' },
        { id: 'vault2', path: '/path/to/vault2', name: 'Journal Vault' },
      ];
      vi.spyOn(registry, 'listNodes').mockResolvedValueOnce(mockVaults);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults',
      });

      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.data[0]).toHaveProperty('id');
      expect(body.data[0]).toHaveProperty('path');
      expect(body.data[0]).toHaveProperty('name');
    });

    it('should handle default vault name when missing', async () => {
      const mockVaults = [
        { id: 'vault1', path: '/path/to/vault1', name: undefined },
      ];
      vi.spyOn(registry, 'listNodes').mockResolvedValueOnce(mockVaults);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults',
      });

      const body = JSON.parse(response.body);
      expect(body.data[0].name).toBe('Unnamed');
    });

    it('should handle list errors gracefully', async () => {
      vi.spyOn(registry, 'listNodes').mockRejectedValueOnce(
        new Error('Registry access failed')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error).toContain('Registry access failed');
    });

    it('should return consistent response structure', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults',
      });

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
      expect(typeof body.success).toBe('boolean');
    });
  });

  // ============================================================================
  // GET /api/vaults/:id - Get specific vault
  // ============================================================================
  describe('GET /api/vaults/:id - Get specific vault', () => {
    it('should return vault details when vault exists', async () => {
      const mockVault = {
        id: 'vault1',
        path: '/path/to/vault1',
        name: 'Music Vault',
        config: { theme: 'dark' },
      };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockVault);
    });

    it('should return error when vault does not exist', async () => {
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/nonexistent',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Vault not found');
    });

    it('should handle vault fetch errors', async () => {
      vi.spyOn(registry, 'getNode').mockRejectedValueOnce(
        new Error('File system error')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('File system error');
    });

    it('should accept various vault ID formats', async () => {
      const mockVault = { id: 'test-vault-123', path: '/test', name: 'Test' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/test-vault-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/sessions - List sessions with pagination
  // ============================================================================
  describe('GET /api/vaults/:id/sessions - List sessions with pagination', () => {
    it('should return sessions with pagination info', async () => {
      const mockVault = {
        id: 'vault1',
        path: '/vault/path',
        name: 'Test Vault',
      };

      const mockSessions = Array(50)
        .fill(null)
        .map((_, i) => ({
          id: `session-${i}`,
          status: i % 3 === 0 ? 'error' : 'success',
          provider: i % 2 === 0 ? 'claude' : 'gpt',
        }));

      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'getNodeSessions').mockResolvedValueOnce(mockSessions);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(20); // Default limit
      expect(body.pagination).toEqual({
        limit: 20,
        offset: 0,
        total: 50,
      });
    });

    it('should respect custom limit parameter', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      const mockSessions = Array(100)
        .fill(null)
        .map((_, i) => ({ id: `session-${i}` }));

      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'getNodeSessions').mockResolvedValueOnce(mockSessions);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions?limit=50',
      });

      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(50);
      expect(body.pagination.limit).toBe(50);
    });

    it('should respect offset parameter', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      const mockSessions = Array(100)
        .fill(null)
        .map((_, i) => ({ id: `session-${i}` }));

      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'getNodeSessions').mockResolvedValueOnce(mockSessions);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions?offset=30&limit=20',
      });

      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(20);
      expect(body.pagination.offset).toBe(30);
    });

    it('should handle invalid limit parameter', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      const mockSessions = Array(30).fill(null).map((_, i) => ({ id: `session-${i}` }));
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'getNodeSessions').mockResolvedValueOnce(mockSessions);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions?limit=invalid',
      });

      const body = JSON.parse(response.body);
      // Should fallback to default or NaN handling
      expect(body).toHaveProperty('success');
    });

    it('should handle vault not found in sessions endpoint', async () => {
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/nonexistent/sessions',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Vault not found');
    });

    it('should handle session fetch errors', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'getNodeSessions').mockRejectedValueOnce(
        new Error('Database error')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Database error');
    });

    it('should return pagination info even with no sessions', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'getNodeSessions').mockResolvedValueOnce([]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions',
      });

      const body = JSON.parse(response.body);
      expect(body.pagination.total).toBe(0);
      expect(body.data).toEqual([]);
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/sessions/:sessionId - Get specific session
  // ============================================================================
  describe('GET /api/vaults/:id/sessions/:sessionId - Get specific session', () => {
    it('should return session details when session exists', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      const mockSession = {
        id: 'session-123',
        command: 'daily',
        status: 'success',
        output: 'Task completed',
        timestamp: '2025-12-26T10:00:00Z',
      };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'loadSession').mockResolvedValueOnce(mockSession);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions/session-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockSession);
    });

    it('should return error when session does not exist', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'loadSession').mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions/nonexistent',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Session not found');
    });

    it('should return error when vault does not exist', async () => {
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/nonexistent/sessions/session-123',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Vault not found');
    });

    it('should handle session load errors', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'loadSession').mockRejectedValueOnce(
        new Error('Corrupted session file')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions/session-123',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Corrupted session file');
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/sessions/stats - Session statistics
  // ============================================================================
  describe('GET /api/vaults/:id/sessions/stats - Session statistics', () => {
    it('should return session statistics', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      const mockSessions = [
        { id: 'session-1', status: 'success', provider: 'claude' },
        { id: 'session-2', status: 'success', provider: 'gpt' },
        { id: 'session-3', status: 'error', provider: 'claude' },
        { id: 'session-4', status: 'cancelled', provider: 'gpt' },
      ];
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'getNodeSessions').mockResolvedValueOnce(mockSessions);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({
        total: 4,
        successful: 2,
        failed: 1,
        cancelled: 1,
        byProvider: { claude: 2, gpt: 2 },
      });
    });

    it('should handle empty sessions list', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'getNodeSessions').mockResolvedValueOnce([]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions/stats',
      });

      const body = JSON.parse(response.body);
      expect(body.data.total).toBe(0);
      expect(body.data.successful).toBe(0);
      expect(body.data.byProvider).toEqual({});
    });

    it('should handle sessions with missing status', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      const mockSessions = [
        { id: 'session-1', provider: 'claude' },
        { id: 'session-2', status: 'success', provider: 'gpt' },
      ];
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'getNodeSessions').mockResolvedValueOnce(mockSessions);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions/stats',
      });

      const body = JSON.parse(response.body);
      expect(body.data.total).toBe(2);
      expect(body.data.successful).toBe(1);
    });

    it('should handle vault not found', async () => {
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/nonexistent/sessions/stats',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should handle stats calculation errors', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(sessions, 'getNodeSessions').mockRejectedValueOnce(
        new Error('Stats calculation failed')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions/stats',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/commands - List commands
  // ============================================================================
  describe('GET /api/vaults/:id/commands - List commands', () => {
    it('should return list of commands', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      const mockCommands = [
        { name: 'daily', description: 'Daily standup', source: 'builtin' },
        { name: 'weekly', source: 'user' },
        { name: 'review', description: 'Weekly review' },
      ];
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, 'getNodeCommands').mockResolvedValueOnce(mockCommands);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/commands',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
    });

    it('should provide default values for missing command fields', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      const mockCommands = [
        { name: 'test' }, // Missing description and source
      ];
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, 'getNodeCommands').mockResolvedValueOnce(mockCommands);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/commands',
      });

      const body = JSON.parse(response.body);
      expect(body.data[0].description).toBe('No description');
      expect(body.data[0].source).toBe('Unknown');
    });

    it('should handle empty commands list', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, 'getNodeCommands').mockResolvedValueOnce([]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/commands',
      });

      const body = JSON.parse(response.body);
      expect(body.data).toEqual([]);
    });

    it('should handle vault not found', async () => {
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/nonexistent/commands',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should handle command fetch errors', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, 'getNodeCommands').mockRejectedValueOnce(
        new Error('Command loading failed')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/commands',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/commands/:name - Get specific command
  // ============================================================================
  describe('GET /api/vaults/:id/commands/:name - Get specific command', () => {
    it('should return command details when command exists', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      const mockCommands = [
        { name: 'daily', description: 'Daily standup', prompt: 'What did you do?', source: 'user' },
        { name: 'weekly', description: 'Weekly review', source: 'builtin' },
      ];
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, 'getNodeCommands').mockResolvedValueOnce(mockCommands);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/commands/daily',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('daily');
      expect(body.data.description).toBe('Daily standup');
    });

    it('should return error when command does not exist', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      const mockCommands = [{ name: 'existing' }];
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, 'getNodeCommands').mockResolvedValueOnce(mockCommands);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/commands/nonexistent',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Command not found');
    });

    it('should handle case-sensitive command names', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      const mockCommands = [
        { name: 'Daily', description: 'Command' },
      ];
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, 'getNodeCommands').mockResolvedValueOnce(mockCommands);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/commands/daily',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should handle vault not found', async () => {
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/nonexistent/commands/daily',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should handle command fetch errors', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(commands, 'getNodeCommands').mockRejectedValueOnce(
        new Error('Command loading failed')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/commands/daily',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  // ============================================================================
  // GET /api/vaults/:id/context - Get vault context
  // ============================================================================
  describe('GET /api/vaults/:id/context - Get vault context', () => {
    it('should return vault context with metadata', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path', name: 'Test Vault' };
      const contextContent = 'This is vault context content...';
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(context, 'generateContext').mockResolvedValueOnce(contextContent);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/context',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.content).toBe(contextContent);
      expect(body.data.length).toBe(contextContent.length);
    });

    it('should handle large context files', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path', name: 'Test Vault' };
      const largeContext = 'x'.repeat(100000);
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(context, 'generateContext').mockResolvedValueOnce(largeContext);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/context',
      });

      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(100000);
    });

    it('should handle empty context', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path', name: 'Test Vault' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(context, 'generateContext').mockResolvedValueOnce('');

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/context',
      });

      const body = JSON.parse(response.body);
      expect(body.data.content).toBe('');
      expect(body.data.length).toBe(0);
    });

    it('should handle vault not found', async () => {
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/nonexistent/context',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Vault not found');
    });

    it('should handle context generation errors', async () => {
      const mockVault = { id: 'vault1', path: '/vault/path', name: 'Test Vault' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);
      vi.spyOn(context, 'generateContext').mockRejectedValueOnce(
        new Error('Context file missing')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/context',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Context file missing');
    });
  });

  // ============================================================================
  // GET /api/providers - List available providers
  // ============================================================================
  describe('GET /api/providers - List available providers', () => {
    it('should return list of available providers', async () => {
      const mockProviders = [
        { name: 'claude', available: true },
        { name: 'gpt', available: true },
        { name: 'gemini', available: false },
      ];
      vi.spyOn(providers, 'listProviders').mockReturnValueOnce(mockProviders);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/providers',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(3);
    });

    it('should handle empty provider list', async () => {
      vi.spyOn(providers, 'listProviders').mockReturnValueOnce([]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/providers',
      });

      const body = JSON.parse(response.body);
      expect(body.data).toEqual([]);
    });

    it('should handle provider listing errors', async () => {
      vi.spyOn(providers, 'listProviders').mockImplementationOnce(() => {
        throw new Error('Provider detection failed');
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/providers',
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Provider detection failed');
    });
  });

  // ============================================================================
  // GET /api/health - Health check
  // ============================================================================
  describe('GET /api/health - Health check', () => {
    it('should return health status with timestamp', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });

    it('should return valid ISO 8601 timestamp', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/health',
      });

      const body = JSON.parse(response.body);
      const date = new Date(body.timestamp);
      expect(date.toISOString()).toBe(body.timestamp);
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

    it('should handle multiple health checks', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await fastify.inject({
          method: 'GET',
          url: '/api/health',
        });

        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
      }
    });
  });

  // ============================================================================
  // Response Format Consistency
  // ============================================================================
  describe('Response Format Consistency', () => {
    it('should follow consistent JSON response format for all endpoints', async () => {
      const endpoints = [
        '/api/vaults',
        '/api/health',
        '/api/providers',
      ];

      for (const endpoint of endpoints) {
        const response = await fastify.inject({
          method: 'GET',
          url: endpoint,
        });

        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('success');
        expect(typeof body.success).toBe('boolean');
        if (body.success) {
          expect(body.data !== undefined || body.status !== undefined).toBe(true);
        } else {
          expect(body).toHaveProperty('error');
        }
      }
    });

    it('should set appropriate Content-Type header', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should return valid JSON for all endpoints', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(() => JSON.parse(response.body)).not.toThrow();
    });
  });

  // ============================================================================
  // Error Handling & Edge Cases
  // ============================================================================
  describe('Error Handling & Edge Cases', () => {
    it('should handle malformed query parameters', async () => {
      vi.spyOn(registry, 'getNode').mockResolvedValue({ id: 'vault1', path: '/path' });
      const mockSessions = Array(10).fill(null).map((_, i) => ({ id: `s${i}` }));
      vi.spyOn(sessions, 'getNodeSessions').mockResolvedValue(mockSessions);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault1/sessions?limit=abc&offset=xyz',
      });

      // Should handle gracefully (either error or default)
      expect(response.statusCode).toBe(200);
    });

    it('should handle special characters in vault IDs', async () => {
      const mockVault = { id: 'vault-with-special-chars_123', path: '/path' };
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(mockVault);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/vaults/vault-with-special-chars_123',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle very long vault IDs', async () => {
      const longVaultId = 'v'.repeat(500);
      vi.spyOn(registry, 'getNode').mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/vaults/${longVaultId}`,
      });

      expect([200, 404, 414]).toContain(response.statusCode); // 200, 404, or 414
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.success).toBe(false);
      }
    });

    it('should handle non-existent endpoints consistently', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/nonexistent-endpoint',
      });

      // SPA serves main page for unknown routes - expected behavior
      expect([200, 404]).toContain(response.statusCode);
    });
  });
});
