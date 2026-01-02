import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchMemoryCacheStats,
  fetchMemoryArchiveStats,
  fetchArchivedMemories,
  restoreMemories,
  MemoryCacheStats,
  MemoryArchiveStats,
  MemoryRestoreRequest,
} from '../../src/server/memory-api-helpers.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('Memory API Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchMemoryCacheStats', () => {
    it('should fetch and return cache stats', async () => {
      const mockResponse: MemoryCacheStats = {
        totalCacheMB: 2.5,
        cacheFileCount: 42,
        byVault: {
          'vault-1': 1.2,
          'vault-2': 1.3,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockResponse,
        }),
      });

      const result = await fetchMemoryCacheStats();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/memory/cache-stats');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Server error',
        }),
      });

      await expect(fetchMemoryCacheStats()).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchMemoryCacheStats()).rejects.toThrow('Network error');
    });
  });

  describe('fetchMemoryArchiveStats', () => {
    it('should fetch archive stats for all vaults', async () => {
      const mockResponse: MemoryArchiveStats = {
        totalArchivedCount: 150,
        totalArchivedMB: 5.8,
        byVault: {
          'vault-1': { count: 75, sizeMB: 2.9 },
          'vault-2': { count: 75, sizeMB: 2.9 },
        },
        byMonth: {
          '2025-12': { count: 50, sizeMB: 2.0 },
          '2025-11': { count: 100, sizeMB: 3.8 },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockResponse,
        }),
      });

      const result = await fetchMemoryArchiveStats();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/memory/archive-stats');
    });

    it('should fetch archive stats for a specific vault', async () => {
      const mockResponse: MemoryArchiveStats = {
        totalArchivedCount: 75,
        totalArchivedMB: 2.9,
        byVault: {
          'vault-1': { count: 75, sizeMB: 2.9 },
        },
        byMonth: {
          '2025-12': { count: 25, sizeMB: 1.0 },
          '2025-11': { count: 50, sizeMB: 1.9 },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockResponse,
        }),
      });

      const result = await fetchMemoryArchiveStats('vault-1');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/memory/archive-stats?nodeId=vault-1');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Failed to get archive stats',
        }),
      });

      await expect(fetchMemoryArchiveStats()).rejects.toThrow();
    });
  });

  describe('fetchArchivedMemories', () => {
    it('should fetch archived memories with search query', async () => {
      const mockResponse = [
        {
          sessionId: 'session-1',
          vaultId: 'vault-1',
          timestamp: '2025-01-01T12:00:00Z',
          preview: 'Memory content...',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockResponse,
        }),
      });

      const result = await fetchArchivedMemories('test search');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/memory?archived=true&search=test+search&limit=50'
      );
    });

    it('should fetch archived memories by date range', async () => {
      const mockResponse = [];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockResponse,
        }),
      });

      const result = await fetchArchivedMemories('', {
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        limit: 100,
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/memory?archived=true&startDate=2025-12-01&endDate=2025-12-31&limit=100'
      );
    });
  });

  describe('restoreMemories', () => {
    it('should restore memories by session ID', async () => {
      const request: MemoryRestoreRequest = {
        mode: 'session',
        sessionIds: ['session-1', 'session-2'],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            restored: 2,
            failed: 0,
          },
        }),
      });

      const result = await restoreMemories(request);

      expect(result).toEqual({ restored: 2, failed: 0 });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/memory/restore',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        })
      );
    });

    it('should restore all archived memories', async () => {
      const request: MemoryRestoreRequest = {
        mode: 'all',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            restored: 150,
            failed: 0,
          },
        }),
      });

      const result = await restoreMemories(request);

      expect(result).toEqual({ restored: 150, failed: 0 });
    });

    it('should handle restore errors', async () => {
      const request: MemoryRestoreRequest = {
        mode: 'all',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Restore failed',
        }),
      });

      await expect(restoreMemories(request)).rejects.toThrow();
    });
  });
});
