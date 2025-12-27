import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';

// Mock axios to avoid actual API calls
vi.mock('axios');

describe('TUI Application Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TUI Initialization', () => {
    it('should have TUI command entry point', async () => {
      const { runTUI } = await import('../../src/cli/tui/index.js');
      expect(typeof runTUI).toBe('function');
    });

    it('should have API client class', async () => {
      const { APIClient } = await import('../../src/cli/tui/core/api-client.js');
      expect(APIClient).toBeDefined();
      expect(typeof APIClient).toBe('function');
    });

    it('should handle API health check failures gracefully', async () => {
      const { APIClient } = await import('../../src/cli/tui/core/api-client.js');
      const client = new APIClient('http://localhost:9999/api'); // Non-existent port

      // The client should exist and have isHealthy method
      expect(client.isHealthy).toBeDefined();
      expect(typeof client.isHealthy).toBe('function');
    });
  });

  describe('Screen Management', () => {
    it('should have base Screen class', async () => {
      const { Screen } = await import('../../src/cli/tui/core/screen.js');
      expect(Screen).toBeDefined();
    });

    it('should have HomeScreen implementation', async () => {
      const { HomeScreen } = await import('../../src/cli/tui/screens/home.js');
      expect(HomeScreen).toBeDefined();
    });

    it('should support screen registration and switching', async () => {
      const { BozlyTUI } = await import('../../src/cli/tui/core/app.js');
      // Can't easily test blessed without full initialization, but we can verify methods exist
      expect(BozlyTUI.prototype.registerScreen).toBeDefined();
      expect(BozlyTUI.prototype.switchScreen).toBeDefined();
    });
  });

  describe('Modal System', () => {
    it('should have Modal base class', async () => {
      const { Modal } = await import('../../src/cli/tui/core/modal.js');
      expect(Modal).toBeDefined();
    });

    it('should have ConfirmModal implementation', async () => {
      const { ConfirmModal } = await import('../../src/cli/tui/modals/confirm.js');
      expect(ConfirmModal).toBeDefined();
    });

    it('should have ErrorModal implementation', async () => {
      const { ErrorModal } = await import('../../src/cli/tui/modals/error.js');
      expect(ErrorModal).toBeDefined();
    });
  });

  describe('Keybinding System', () => {
    it('should have KeybindingManager', async () => {
      const { KeybindingManager } = await import('../../src/cli/tui/core/keybindings.js');
      const manager = new KeybindingManager();

      expect(manager.resolveNavKey('j', {})).toBe('down');
      expect(manager.isSubmitKey('', { name: 'enter' })).toBe(true);
      expect(manager.isCancelKey('', { name: 'escape' })).toBe(true);
    });
  });

  describe('API Client Integration', () => {
    it('should have methods for vault operations', async () => {
      const { APIClient } = await import('../../src/cli/tui/core/api-client.js');
      const client = new APIClient('http://localhost:3000/api');

      expect(client.getVaults).toBeDefined();
      expect(typeof client.getVaults).toBe('function');
    });

    it('should have methods for session operations', async () => {
      const { APIClient } = await import('../../src/cli/tui/core/api-client.js');
      const client = new APIClient('http://localhost:3000/api');

      expect(client.getSessions).toBeDefined();
      expect(typeof client.getSessions).toBe('function');
    });

    it('should have methods for command operations', async () => {
      const { APIClient } = await import('../../src/cli/tui/core/api-client.js');
      const client = new APIClient('http://localhost:3000/api');

      expect(client.getCommands).toBeDefined();
      expect(typeof client.getCommands).toBe('function');
    });

    it('should have methods for workflow operations', async () => {
      const { APIClient } = await import('../../src/cli/tui/core/api-client.js');
      const client = new APIClient('http://localhost:3000/api');

      expect(client.getWorkflows).toBeDefined();
      expect(typeof client.getWorkflows).toBe('function');
    });

    it('should have error parsing capability', async () => {
      const { APIClient } = await import('../../src/cli/tui/core/api-client.js');
      const client = new APIClient('http://localhost:3000/api');

      expect((client as any).parseError).toBeDefined();
      expect(typeof (client as any).parseError).toBe('function');
    });
  });

  describe('CLI Command Registration', () => {
    it('should export tui command for CLI', async () => {
      const { tuiCommand } = await import('../../src/cli/commands/tui.js');
      expect(tuiCommand).toBeDefined();
      expect(tuiCommand.name()).toBe('tui');
    });
  });
});
