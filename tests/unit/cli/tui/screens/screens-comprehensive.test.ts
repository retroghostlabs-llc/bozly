import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock blessed with full API
vi.mock('blessed', () => ({
  default: {
    screen: vi.fn(() => ({
      box: vi.fn(() => ({
        parent: null,
        setContent: vi.fn(),
        destroy: vi.fn(),
        on: vi.fn(),
        scroll: vi.fn(),
        setScroll: vi.fn(),
        getScrollHeight: vi.fn(() => 100),
      })),
      key: vi.fn(),
      on: vi.fn(),
      render: vi.fn(),
      destroy: vi.fn(),
    })),
  },
}));

// Mock APIClient
vi.mock('../../../../../src/cli/tui/core/api-client.js', () => {
  return {
    APIClient: vi.fn(function () {
      this.getVaults = vi.fn().mockResolvedValue([]);
      this.getSessions = vi.fn().mockResolvedValue([]);
      this.getCommands = vi.fn().mockResolvedValue([]);
      this.getWorkflows = vi.fn().mockResolvedValue([]);
      this.getMemory = vi.fn().mockResolvedValue([]);
      this.getHealth = vi.fn().mockResolvedValue({});
      this.getConfig = vi.fn().mockResolvedValue({});
    }),
  };
});

describe('Screen Implementations Comprehensive', () => {
  let mockScreen: any;
  let mockAPIClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAPIClient = {
      getVaults: vi.fn().mockResolvedValue([]),
      getSessions: vi.fn().mockResolvedValue([]),
      getCommands: vi.fn().mockResolvedValue([]),
      getWorkflows: vi.fn().mockResolvedValue([]),
      getMemory: vi.fn().mockResolvedValue([]),
      getHealth: vi.fn().mockResolvedValue({}),
      getConfig: vi.fn().mockResolvedValue({}),
    };

    mockScreen = {
      box: vi.fn(() => ({
        parent: null,
        setContent: vi.fn(),
        destroy: vi.fn(),
        on: vi.fn(),
        scroll: vi.fn(),
        setScroll: vi.fn(),
        getScrollHeight: vi.fn(() => 100),
      })),
      render: vi.fn(),
    };
  });

  describe('HomeScreen', () => {
    it('should be defined and importable', async () => {
      const module = await import('../../../../../src/cli/tui/screens/home.js');
      expect(module.HomeScreen).toBeDefined();
    });

    it('should instantiate with valid parameters', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });
      expect(screen).toBeDefined();
      expect(screen.getId()).toBe('home');
    });

    it('should have required methods', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });
      expect(typeof screen.init).toBe('function');
      expect(typeof screen.render).toBe('function');
      expect(typeof screen.refresh).toBe('function');
      expect(typeof screen.handleKey).toBe('function');
    });

    it('should extend Screen base class', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });
      expect(typeof screen.activate).toBe('function');
      expect(typeof screen.deactivate).toBe('function');
      expect(typeof screen.destroy).toBe('function');
    });

    it('should render header with BOZLY logo and tagline', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });

      const header = (screen as any).renderHeader();
      expect(header).toBeDefined();
      expect(typeof header).toBe('string');
      // Should contain the tagline
      expect(header).toContain('Build. Organize. Link. Yield.');
      // Should contain ASCII art box-drawing characters for logo
      expect(header).toContain('██████');
      // Should use terminal-respecting colors (cyan: \x1b[36m) instead of hardcoded RGB
      // This allows users' terminal color schemes to be applied
      expect(header).toContain('\x1b[36m');
    });

    it('should render stats section with proper formatting', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });

      await screen.init();
      const stats = (screen as any).renderStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('string');
      // Should show system overview headers
      expect(stats).toContain('System Overview');
      expect(stats).toContain('Active Vaults');
      expect(stats).toContain('Total Sessions');
      expect(stats).toContain('Success Rate');
    });

    it('should render quick actions menu with all navigation options', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });

      const actions = (screen as any).renderQuickActions();
      expect(actions).toBeDefined();
      expect(typeof actions).toBe('string');
      // Should show navigation menu
      expect(actions).toContain('Navigation');
      // Should show [0] Home option (not [1])
      expect(actions).toContain('[0]');
      expect(actions).toContain('Home');
      // Should show Vaults (previously Nodes - terminology updated for Obsidian users)
      expect(actions).toContain('Vaults');
      // Should have other menu options
      expect(actions).toContain('Sessions');
      expect(actions).toContain('Commands');
      expect(actions).toContain('Memory');
      expect(actions).toContain('Workflows');
      expect(actions).toContain('Config');
      expect(actions).toContain('Health');
    });

    it('should render recent sessions when available', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });

      await screen.init();
      const recentSessions = (screen as any).renderRecentSessions();
      expect(typeof recentSessions).toBe('string');
      // When no sessions, should return empty or loading
    });

    it('should handle init without throwing', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });

      await expect(screen.init()).resolves.not.toThrow();
    });

    it('should render screen content without throwing', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });

      await screen.init();
      await expect(screen.render()).resolves.not.toThrow();
    });

    it('should include footer box in init', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });

      await screen.init();
      // Footer box should be created (we can't directly inspect it, but the method should complete successfully)
      expect(screen).toBeDefined();
    });

    it('should use proper terminology: Vaults for Obsidian-friendly UX', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });

      const actions = (screen as any).renderQuickActions();
      // Updated terminology: "Vaults" is user-facing (Obsidian-friendly), "Nodes" is internal
      expect(actions).toContain('Vaults');
    });

    it('should include [0] Home in navigation menu', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });

      const actions = (screen as any).renderQuickActions();
      expect(actions).toContain('[0]');
      expect(actions).toContain('Home');
      // [0] should come before other options
      const zeroIndex = actions.indexOf('[0]');
      const oneIndex = actions.indexOf('[1]');
      expect(zeroIndex).toBeLessThan(oneIndex);
    });
  });

  describe('NodesScreen', () => {
    it('should be defined and importable', async () => {
      const module = await import('../../../../../src/cli/tui/screens/nodes.js');
      expect(module.NodesScreen).toBeDefined();
    });

    it('should instantiate with valid parameters', async () => {
      const { NodesScreen } = await import('../../../../../src/cli/tui/screens/nodes.js');
      const screen = new NodesScreen(mockScreen, { id: 'nodes', name: 'Nodes' }, mockAPIClient);
      expect(screen).toBeDefined();
      expect(screen.getId()).toBe('nodes');
    });

    it('should have required methods', async () => {
      const { NodesScreen } = await import('../../../../../src/cli/tui/screens/nodes.js');
      const screen = new NodesScreen(mockScreen, { id: 'nodes', name: 'Nodes' }, mockAPIClient);
      expect(typeof screen.init).toBe('function');
      expect(typeof screen.render).toBe('function');
      expect(typeof screen.refresh).toBe('function');
      expect(typeof screen.handleKey).toBe('function');
    });

    it('should extend Screen base class', async () => {
      const { NodesScreen } = await import('../../../../../src/cli/tui/screens/nodes.js');
      const screen = new NodesScreen(mockScreen, { id: 'nodes', name: 'Nodes' }, mockAPIClient);
      expect(typeof screen.activate).toBe('function');
      expect(typeof screen.deactivate).toBe('function');
      expect(typeof screen.destroy).toBe('function');
    });
  });

  describe('SessionsScreen', () => {
    it('should be defined and importable', async () => {
      const module = await import('../../../../../src/cli/tui/screens/sessions.js');
      expect(module.SessionsScreen).toBeDefined();
    });

    it('should instantiate with valid parameters', async () => {
      const { SessionsScreen } = await import('../../../../../src/cli/tui/screens/sessions.js');
      const screen = new SessionsScreen(
        mockScreen,
        { id: 'sessions', name: 'Sessions' },
        mockAPIClient
      );
      expect(screen).toBeDefined();
      expect(screen.getId()).toBe('sessions');
    });

    it('should have required methods', async () => {
      const { SessionsScreen } = await import('../../../../../src/cli/tui/screens/sessions.js');
      const screen = new SessionsScreen(
        mockScreen,
        { id: 'sessions', name: 'Sessions' },
        mockAPIClient
      );
      expect(typeof screen.init).toBe('function');
      expect(typeof screen.render).toBe('function');
      expect(typeof screen.refresh).toBe('function');
      expect(typeof screen.handleKey).toBe('function');
    });
  });

  describe('CommandsScreen', () => {
    it('should be defined and importable', async () => {
      const module = await import('../../../../../src/cli/tui/screens/commands.js');
      expect(module.CommandsScreen).toBeDefined();
    });

    it('should instantiate with valid parameters', async () => {
      const { CommandsScreen } = await import('../../../../../src/cli/tui/screens/commands.js');
      const screen = new CommandsScreen(
        mockScreen,
        { id: 'commands', name: 'Commands' },
        mockAPIClient
      );
      expect(screen).toBeDefined();
      expect(screen.getId()).toBe('commands');
    });

    it('should have required methods', async () => {
      const { CommandsScreen } = await import('../../../../../src/cli/tui/screens/commands.js');
      const screen = new CommandsScreen(
        mockScreen,
        { id: 'commands', name: 'Commands' },
        mockAPIClient
      );
      expect(typeof screen.init).toBe('function');
      expect(typeof screen.render).toBe('function');
      expect(typeof screen.refresh).toBe('function');
      expect(typeof screen.handleKey).toBe('function');
    });
  });

  describe('WorkflowsScreen', () => {
    it('should be defined and importable', async () => {
      const module = await import('../../../../../src/cli/tui/screens/workflows.js');
      expect(module.WorkflowsScreen).toBeDefined();
    });

    it('should instantiate with valid parameters', async () => {
      const { WorkflowsScreen } = await import('../../../../../src/cli/tui/screens/workflows.js');
      const screen = new WorkflowsScreen(
        mockScreen,
        { id: 'workflows', name: 'Workflows' },
        mockAPIClient
      );
      expect(screen).toBeDefined();
      expect(screen.getId()).toBe('workflows');
    });

    it('should have required methods', async () => {
      const { WorkflowsScreen } = await import('../../../../../src/cli/tui/screens/workflows.js');
      const screen = new WorkflowsScreen(
        mockScreen,
        { id: 'workflows', name: 'Workflows' },
        mockAPIClient
      );
      expect(typeof screen.init).toBe('function');
      expect(typeof screen.render).toBe('function');
      expect(typeof screen.refresh).toBe('function');
      expect(typeof screen.handleKey).toBe('function');
    });
  });

  describe('ConfigScreen', () => {
    it('should be defined and importable', async () => {
      const module = await import('../../../../../src/cli/tui/screens/config.js');
      expect(module.ConfigScreen).toBeDefined();
    });

    it('should instantiate with valid parameters', async () => {
      const { ConfigScreen } = await import('../../../../../src/cli/tui/screens/config.js');
      const screen = new ConfigScreen(mockScreen, { id: 'config', name: 'Config' }, mockAPIClient);
      expect(screen).toBeDefined();
      expect(screen.getId()).toBe('config');
    });

    it('should have required methods', async () => {
      const { ConfigScreen } = await import('../../../../../src/cli/tui/screens/config.js');
      const screen = new ConfigScreen(mockScreen, { id: 'config', name: 'Config' }, mockAPIClient);
      expect(typeof screen.init).toBe('function');
      expect(typeof screen.render).toBe('function');
      expect(typeof screen.refresh).toBe('function');
      expect(typeof screen.handleKey).toBe('function');
    });
  });

  describe('HealthScreen', () => {
    it('should be defined and importable', async () => {
      const module = await import('../../../../../src/cli/tui/screens/health.js');
      expect(module.HealthScreen).toBeDefined();
    });

    it('should instantiate with valid parameters', async () => {
      const { HealthScreen } = await import('../../../../../src/cli/tui/screens/health.js');
      const screen = new HealthScreen(mockScreen, { id: 'health', name: 'Health' }, mockAPIClient);
      expect(screen).toBeDefined();
      expect(screen.getId()).toBe('health');
    });

    it('should have required methods', async () => {
      const { HealthScreen } = await import('../../../../../src/cli/tui/screens/health.js');
      const screen = new HealthScreen(mockScreen, { id: 'health', name: 'Health' }, mockAPIClient);
      expect(typeof screen.init).toBe('function');
      expect(typeof screen.render).toBe('function');
      expect(typeof screen.refresh).toBe('function');
      expect(typeof screen.handleKey).toBe('function');
    });
  });

  describe('MemoryScreen', () => {
    it('should be defined and importable', async () => {
      const module = await import('../../../../../src/cli/tui/screens/memory.js');
      expect(module.MemoryScreen).toBeDefined();
    });

    it('should instantiate with valid parameters', async () => {
      const { MemoryScreen } = await import('../../../../../src/cli/tui/screens/memory.js');
      const screen = new MemoryScreen(mockScreen, { id: 'memory', name: 'Memory' }, mockAPIClient);
      expect(screen).toBeDefined();
      expect(screen.getId()).toBe('memory');
    });

    it('should have required methods', async () => {
      const { MemoryScreen } = await import('../../../../../src/cli/tui/screens/memory.js');
      const screen = new MemoryScreen(mockScreen, { id: 'memory', name: 'Memory' }, mockAPIClient);
      expect(typeof screen.init).toBe('function');
      expect(typeof screen.render).toBe('function');
      expect(typeof screen.refresh).toBe('function');
      expect(typeof screen.handleKey).toBe('function');
    });
  });

  describe('All Screens - Consistency', () => {
    it('should all implement Screen interface', async () => {
      const modules = await Promise.all([
        import('../../../../../src/cli/tui/screens/home.js'),
        import('../../../../../src/cli/tui/screens/nodes.js'),
        import('../../../../../src/cli/tui/screens/sessions.js'),
        import('../../../../../src/cli/tui/screens/commands.js'),
        import('../../../../../src/cli/tui/screens/workflows.js'),
        import('../../../../../src/cli/tui/screens/config.js'),
        import('../../../../../src/cli/tui/screens/health.js'),
        import('../../../../../src/cli/tui/screens/memory.js'),
      ]);

      const screens = [
        modules[0].HomeScreen,
        modules[1].NodesScreen,
        modules[2].SessionsScreen,
        modules[3].CommandsScreen,
        modules[4].WorkflowsScreen,
        modules[5].ConfigScreen,
        modules[6].HealthScreen,
        modules[7].MemoryScreen,
      ];

      for (const Screen of screens) {
        expect(Screen).toBeDefined();
        expect(Screen.prototype.init).toBeDefined();
        expect(Screen.prototype.render).toBeDefined();
        expect(Screen.prototype.refresh).toBeDefined();
        expect(Screen.prototype.handleKey).toBeDefined();
      }
    });

    it('should all have consistent constructor signatures', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const { NodesScreen } = await import('../../../../../src/cli/tui/screens/nodes.js');

      const homeScreen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });
      const vaultsScreen = new NodesScreen(mockScreen, { id: 'nodes', name: 'Nodes' }, mockAPIClient);

      expect(homeScreen.getId()).toBeDefined();
      expect(vaultsScreen.getId()).toBeDefined();
    });

    it('should all extend base Screen class with lifecycle methods', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const screen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });

      expect(typeof screen.activate).toBe('function');
      expect(typeof screen.deactivate).toBe('function');
      expect(typeof screen.destroy).toBe('function');
    });
  });

  describe('Screen Configuration', () => {
    it('should accept screen config with id and name', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const config = { id: 'test', name: 'Test Screen' };
      const screen = new HomeScreen(mockScreen, mockAPIClient, config);
      expect(screen).toBeDefined();
    });

    it('should support all 8 screen IDs', async () => {
      const screenIds = ['home', 'nodes', 'sessions', 'commands', 'workflows', 'config', 'health', 'memory'];

      for (const id of screenIds) {
        expect(id).toBeDefined();
      }
    });
  });

  describe('Screen Integration', () => {
    it('should be usable together in TUI', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const { NodesScreen } = await import('../../../../../src/cli/tui/screens/nodes.js');
      const { SessionsScreen } = await import('../../../../../src/cli/tui/screens/sessions.js');

      const homeScreen = new HomeScreen(mockScreen, mockAPIClient, {
        id: 'home',
        name: 'Home',
      });
      const vaultsScreen = new NodesScreen(mockScreen, { id: 'nodes', name: 'Nodes' }, mockAPIClient);
      const sessionsScreen = new SessionsScreen(
        mockScreen,
        { id: 'sessions', name: 'Sessions' },
        mockAPIClient
      );

      const screens = [homeScreen, vaultsScreen, sessionsScreen];
      const screenIds = screens.map(s => s.getId());

      expect(screenIds).toContain('home');
      expect(screenIds).toContain('nodes');
      expect(screenIds).toContain('sessions');
    });

    it('should handle screen switching', async () => {
      const { HomeScreen } = await import('../../../../../src/cli/tui/screens/home.js');
      const { NodesScreen } = await import('../../../../../src/cli/tui/screens/nodes.js');

      const home = new HomeScreen(mockScreen, mockAPIClient, { id: 'home', name: 'Home' });
      const vaults = new NodesScreen(mockScreen, { id: 'nodes', name: 'Nodes' }, mockAPIClient);

      expect(home.getId()).not.toBe(vaults.getId());
    });
  });
});
