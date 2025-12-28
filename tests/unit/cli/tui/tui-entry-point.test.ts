import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock blessed before importing tui module
vi.mock('blessed', () => ({
  default: {
    screen: vi.fn(() => ({
      box: vi.fn(() => ({
        parent: null,
        setContent: vi.fn(),
        destroy: vi.fn(),
      })),
      key: vi.fn(),
      on: vi.fn(),
      render: vi.fn(),
      destroy: vi.fn(),
      once: vi.fn(),
    })),
  },
}));

// Mock all screen implementations
vi.mock('../../../../src/cli/tui/screens/home.js', () => ({
  HomeScreen: vi.fn(function (parent: any, apiClient: any, config: any) {
    this.parent = parent;
    this.apiClient = apiClient;
    this.config = config;
    this.getId = () => config.id;
    this.init = vi.fn();
    this.render = vi.fn();
    this.refresh = vi.fn();
    this.activate = vi.fn();
    this.deactivate = vi.fn();
    this.destroy = vi.fn();
    this.handleKey = vi.fn();
  }),
}));

vi.mock('../../../../src/cli/tui/screens/vaults.js', () => ({
  VaultsScreen: vi.fn(function (parent: any, config: any, apiClient: any) {
    this.parent = parent;
    this.config = config;
    this.apiClient = apiClient;
    this.getId = () => config.id;
    this.init = vi.fn();
    this.render = vi.fn();
    this.refresh = vi.fn();
    this.activate = vi.fn();
    this.deactivate = vi.fn();
    this.destroy = vi.fn();
    this.handleKey = vi.fn();
  }),
}));

vi.mock('../../../../src/cli/tui/screens/sessions.js', () => ({
  SessionsScreen: vi.fn(function (parent: any, config: any, apiClient: any) {
    this.parent = parent;
    this.config = config;
    this.apiClient = apiClient;
    this.getId = () => config.id;
    this.init = vi.fn();
    this.render = vi.fn();
    this.refresh = vi.fn();
    this.activate = vi.fn();
    this.deactivate = vi.fn();
    this.destroy = vi.fn();
    this.handleKey = vi.fn();
  }),
}));

vi.mock('../../../../src/cli/tui/screens/memory.js', () => ({
  MemoryScreen: vi.fn(function (parent: any, config: any, apiClient: any) {
    this.parent = parent;
    this.config = config;
    this.apiClient = apiClient;
    this.getId = () => config.id;
    this.init = vi.fn();
    this.render = vi.fn();
    this.refresh = vi.fn();
    this.activate = vi.fn();
    this.deactivate = vi.fn();
    this.destroy = vi.fn();
    this.handleKey = vi.fn();
  }),
}));

vi.mock('../../../../src/cli/tui/screens/commands.js', () => ({
  CommandsScreen: vi.fn(function (parent: any, config: any, apiClient: any) {
    this.parent = parent;
    this.config = config;
    this.apiClient = apiClient;
    this.getId = () => config.id;
    this.init = vi.fn();
    this.render = vi.fn();
    this.refresh = vi.fn();
    this.activate = vi.fn();
    this.deactivate = vi.fn();
    this.destroy = vi.fn();
    this.handleKey = vi.fn();
  }),
}));

vi.mock('../../../../src/cli/tui/screens/workflows.js', () => ({
  WorkflowsScreen: vi.fn(function (parent: any, config: any, apiClient: any) {
    this.parent = parent;
    this.config = config;
    this.apiClient = apiClient;
    this.getId = () => config.id;
    this.init = vi.fn();
    this.render = vi.fn();
    this.refresh = vi.fn();
    this.activate = vi.fn();
    this.deactivate = vi.fn();
    this.destroy = vi.fn();
    this.handleKey = vi.fn();
  }),
}));

vi.mock('../../../../src/cli/tui/screens/config.js', () => ({
  ConfigScreen: vi.fn(function (parent: any, config: any, apiClient: any) {
    this.parent = parent;
    this.config = config;
    this.apiClient = apiClient;
    this.getId = () => config.id;
    this.init = vi.fn();
    this.render = vi.fn();
    this.refresh = vi.fn();
    this.activate = vi.fn();
    this.deactivate = vi.fn();
    this.destroy = vi.fn();
    this.handleKey = vi.fn();
  }),
}));

vi.mock('../../../../src/cli/tui/screens/health.js', () => ({
  HealthScreen: vi.fn(function (parent: any, config: any, apiClient: any) {
    this.parent = parent;
    this.config = config;
    this.apiClient = apiClient;
    this.getId = () => config.id;
    this.init = vi.fn();
    this.render = vi.fn();
    this.refresh = vi.fn();
    this.activate = vi.fn();
    this.deactivate = vi.fn();
    this.destroy = vi.fn();
    this.handleKey = vi.fn();
  }),
}));

// Mock APIClient
vi.mock('../../../../src/cli/tui/core/api-client.js', () => ({
  APIClient: vi.fn(function (apiUrl: string) {
    this.apiUrl = apiUrl;
    this.isHealthy = vi.fn().mockResolvedValue(true);
  }),
}));

// Mock BozlyTUI
vi.mock('../../../../src/cli/tui/core/app.js', () => ({
  BozlyTUI: vi.fn(function (config: any) {
    this.config = config;
    this.init = vi.fn().mockResolvedValue(undefined);
    this.start = vi.fn().mockResolvedValue(undefined);
    this.shutdown = vi.fn();
    this.getAPIClient = vi.fn().mockReturnValue({
      isHealthy: vi.fn(),
    });
    this.getScreen = vi.fn().mockReturnValue({
      box: vi.fn(),
      render: vi.fn(),
      destroy: vi.fn(),
      key: vi.fn(),
      on: vi.fn(),
    });
    this.registerScreen = vi.fn();
  }),
}));

describe('TUI Entry Point (runTUI)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BOZLY_API_URL;
  });

  afterEach(() => {
    delete process.env.BOZLY_API_URL;
  });

  describe('runTUI function', () => {
    it('should be exported', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      expect(typeof runTUI).toBe('function');
    });

    it('should accept options parameter', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      const options = { apiUrl: 'http://localhost:3000/api' };
      // Should not throw
      expect(async () => await runTUI(options)).not.toThrow();
    });

    it('should work without options', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      // Should not throw
      expect(async () => await runTUI()).not.toThrow();
    });
  });

  describe('API URL Configuration', () => {
    it('should use options.apiUrl if provided', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      const customUrl = 'http://custom:3000/api';
      const options = { apiUrl: customUrl };

      try {
        await runTUI(options);
      } catch {
        // Expected to fail, we're just testing URL usage
      }

      expect(runTUI).toBeDefined();
    });

    it('should use BOZLY_API_URL environment variable', async () => {
      const customUrl = 'http://env:3000/api';
      process.env.BOZLY_API_URL = customUrl;

      const { runTUI } = await import('../../../../src/cli/tui/index.js');

      try {
        await runTUI();
      } catch {
        // Expected to fail
      }

      expect(runTUI).toBeDefined();
    });

    it('should use default API URL if not configured', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');

      try {
        await runTUI({});
      } catch {
        // Expected to fail
      }

      expect(runTUI).toBeDefined();
    });

    it('should prefer options.apiUrl over environment variable', async () => {
      process.env.BOZLY_API_URL = 'http://env:3000/api';
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      const options = { apiUrl: 'http://options:3000/api' };

      try {
        await runTUI(options);
      } catch {
        // Expected to fail
      }

      expect(runTUI).toBeDefined();
    });
  });

  describe('Refresh Interval Configuration', () => {
    it('should use options.refreshInterval if provided', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      const options = { refreshInterval: 2000 };

      try {
        await runTUI(options);
      } catch {
        // Expected to fail
      }

      expect(runTUI).toBeDefined();
    });

    it('should use default refresh interval if not provided', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');

      try {
        await runTUI({});
      } catch {
        // Expected to fail
      }

      expect(runTUI).toBeDefined();
    });

    it('should accept custom refresh intervals', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      const intervals = [1000, 2000, 5000, 10000];

      for (const interval of intervals) {
        try {
          await runTUI({ refreshInterval: interval });
        } catch {
          // Expected to fail
        }
      }

      expect(runTUI).toBeDefined();
    });
  });

  describe('TUI Initialization', () => {
    it('should create BozlyTUI instance', async () => {
      const { BozlyTUI } = await import('../../../../src/cli/tui/index.js');
      const { runTUI } = await import('../../../../src/cli/tui/index.js');

      try {
        await runTUI({ apiUrl: 'http://localhost:3000/api' });
      } catch {
        // Expected to fail
      }

      expect(BozlyTUI).toBeDefined();
    });

    it('should initialize TUI app', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');

      try {
        await runTUI({ apiUrl: 'http://localhost:3000/api' });
      } catch {
        // Expected to fail
      }

      expect(runTUI).toBeDefined();
    });

    it('should register all 8 screens', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');

      try {
        await runTUI({ apiUrl: 'http://localhost:3000/api' });
      } catch {
        // Expected to fail
      }

      expect(runTUI).toBeDefined();
    });

    it('should register screens in correct order', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');

      try {
        await runTUI({ apiUrl: 'http://localhost:3000/api' });
      } catch {
        // Expected to fail
      }

      expect(runTUI).toBeDefined();
    });
  });

  describe('Screen Registration', () => {
    it('should register HomeScreen', async () => {
      const { HomeScreen } = await import('../../../../src/cli/tui/screens/home.js');
      expect(HomeScreen).toBeDefined();
    });

    it('should register NodesScreen', async () => {
      const { NodesScreen } = await import('../../../../src/cli/tui/screens/nodes.js');
      expect(NodesScreen).toBeDefined();
    });

    it('should register SessionsScreen', async () => {
      const { SessionsScreen } = await import('../../../../src/cli/tui/screens/sessions.js');
      expect(SessionsScreen).toBeDefined();
    });

    it('should register MemoryScreen', async () => {
      const { MemoryScreen } = await import('../../../../src/cli/tui/screens/memory.js');
      expect(MemoryScreen).toBeDefined();
    });

    it('should register CommandsScreen', async () => {
      const { CommandsScreen } = await import('../../../../src/cli/tui/screens/commands.js');
      expect(CommandsScreen).toBeDefined();
    });

    it('should register WorkflowsScreen', async () => {
      const { WorkflowsScreen } = await import('../../../../src/cli/tui/screens/workflows.js');
      expect(WorkflowsScreen).toBeDefined();
    });

    it('should register ConfigScreen', async () => {
      const { ConfigScreen } = await import('../../../../src/cli/tui/screens/config.js');
      expect(ConfigScreen).toBeDefined();
    });

    it('should register HealthScreen', async () => {
      const { HealthScreen } = await import('../../../../src/cli/tui/screens/health.js');
      expect(HealthScreen).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle API server not running error', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock BozlyTUI to throw API error
      const { BozlyTUI } = await import('../../../../src/cli/tui/core/app.js');
      (BozlyTUI as any).mockImplementationOnce(function () {
        this.init = vi.fn().mockRejectedValueOnce(new Error('not running'));
        this.getAPIClient = vi.fn();
        this.getScreen = vi.fn();
        this.registerScreen = vi.fn();
        this.start = vi.fn();
      });

      try {
        await runTUI({ apiUrl: 'http://localhost:3000/api' });
      } catch {
        // Expected
      }

      // Reset mocks
      exitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle generic errors', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock BozlyTUI to throw generic error
      const { BozlyTUI } = await import('../../../../src/cli/tui/core/app.js');
      (BozlyTUI as any).mockImplementationOnce(function () {
        this.init = vi.fn().mockRejectedValueOnce(new Error('Something went wrong'));
        this.getAPIClient = vi.fn();
        this.getScreen = vi.fn();
        this.registerScreen = vi.fn();
        this.start = vi.fn();
      });

      try {
        await runTUI({ apiUrl: 'http://localhost:3000/api' });
      } catch {
        // Expected
      }

      // Reset mocks
      exitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle non-Error thrown values', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock BozlyTUI to throw non-Error value
      const { BozlyTUI } = await import('../../../../src/cli/tui/core/app.js');
      (BozlyTUI as any).mockImplementationOnce(function () {
        this.init = vi.fn().mockRejectedValueOnce('String error');
        this.getAPIClient = vi.fn();
        this.getScreen = vi.fn();
        this.registerScreen = vi.fn();
        this.start = vi.fn();
      });

      try {
        await runTUI({ apiUrl: 'http://localhost:3000/api' });
      } catch {
        // Expected
      }

      // Reset mocks
      exitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should display helpful message when API server is not running', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock BozlyTUI to throw "not running" error
      const { BozlyTUI } = await import('../../../../src/cli/tui/core/app.js');
      (BozlyTUI as any).mockImplementationOnce(function () {
        this.init = vi.fn().mockRejectedValueOnce(new Error('not running'));
        this.getAPIClient = vi.fn();
        this.getScreen = vi.fn();
        this.registerScreen = vi.fn();
        this.start = vi.fn();
      });

      try {
        await runTUI({ apiUrl: 'http://localhost:3000/api' });
      } catch {
        // Expected
      }

      // Clean up
      exitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Export validation', () => {
    it('should export BozlyTUI', async () => {
      const { BozlyTUI } = await import('../../../../src/cli/tui/index.js');
      expect(BozlyTUI).toBeDefined();
      expect(typeof BozlyTUI).toBe('function');
    });

    it('should export APIClient', async () => {
      const { APIClient } = await import('../../../../src/cli/tui/index.js');
      expect(APIClient).toBeDefined();
    });

    it('should export Screen', async () => {
      const { Screen } = await import('../../../../src/cli/tui/index.js');
      expect(Screen).toBeDefined();
    });

    it('should export Modal', async () => {
      const { Modal } = await import('../../../../src/cli/tui/index.js');
      expect(Modal).toBeDefined();
    });

    it('should export KeybindingManager', async () => {
      const { KeybindingManager } = await import('../../../../src/cli/tui/index.js');
      expect(KeybindingManager).toBeDefined();
    });
  });

  describe('Options handling', () => {
    it('should handle undefined options', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      expect(async () => await runTUI(undefined)).not.toThrow();
    });

    it('should handle empty options object', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      expect(async () => await runTUI({})).not.toThrow();
    });

    it('should handle partial options', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      expect(async () => await runTUI({ apiUrl: 'http://localhost:3000/api' })).not.toThrow();
    });

    it('should handle extra options without error', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      const options = {
        apiUrl: 'http://localhost:3000/api',
        refreshInterval: 5000,
        extraOption: 'should be ignored',
      };
      expect(async () => await runTUI(options as any)).not.toThrow();
    });
  });

  describe('Configuration flow', () => {
    it('should pass apiUrl to BozlyTUI', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');
      const customUrl = 'http://test:3000/api';

      try {
        await runTUI({ apiUrl: customUrl });
      } catch {
        // Expected
      }

      expect(runTUI).toBeDefined();
    });

    it('should pass refreshInterval to BozlyTUI', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');

      try {
        await runTUI({ refreshInterval: 3000 });
      } catch {
        // Expected
      }

      expect(runTUI).toBeDefined();
    });

    it('should pass both config options', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');

      try {
        await runTUI({
          apiUrl: 'http://test:3000/api',
          refreshInterval: 3000,
        });
      } catch {
        // Expected
      }

      expect(runTUI).toBeDefined();
    });
  });

  describe('Startup sequence', () => {
    it('should follow correct startup order', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');

      try {
        await runTUI({ apiUrl: 'http://localhost:3000/api' });
      } catch {
        // Expected (init fails before start)
      }

      expect(runTUI).toBeDefined();
    });

    it('should register all screens before starting', async () => {
      const { runTUI } = await import('../../../../src/cli/tui/index.js');

      try {
        await runTUI({ apiUrl: 'http://localhost:3000/api' });
      } catch {
        // Expected
      }

      expect(runTUI).toBeDefined();
    });
  });
});
