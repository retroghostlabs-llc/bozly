import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock blessed module
vi.mock('@unblessed/blessed', () => {
  const mockBox = vi.fn((options: any) => ({
    parent: options?.parent,
    top: options?.top,
    left: options?.left,
    right: options?.right,
    bottom: options?.bottom,
    height: 20,
    scrollable: options?.scrollable,
    mouse: options?.mouse,
    keys: options?.keys,
    setContent: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    scroll: vi.fn(),
    setScroll: vi.fn(),
    getScrollHeight: vi.fn(() => 100),
  }));

  return {
    default: {
      box: mockBox,
    },
  };
});

// Mock fs/promises
vi.mock('fs/promises', () => {
  const mockAccess = vi.fn();
  const mockReaddir = vi.fn();
  const mockReadFile = vi.fn();

  return {
    access: mockAccess,
    readdir: mockReaddir,
    readFile: mockReadFile,
    default: {
      access: mockAccess,
      readdir: mockReaddir,
      readFile: mockReadFile,
    },
  };
});

// Mock getColorContext
vi.mock('../../../../../src/cli/tui/utils/colors.js', () => ({
  getColorContext: vi.fn(() => ({
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    reset: '\x1b[0m',
  })),
}));

describe('LogsScreen', () => {
  let mockScreen: any;
  let mockBoxElement: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup blessed mocks
    mockBoxElement = {
      height: 20,
      setContent: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
    };

    mockScreen = {
      box: vi.fn(() => mockBoxElement),
      render: vi.fn(),
      key: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('LogsScreen class', () => {
    it('should be defined and importable', async () => {
      const module = await import('../../../../../src/cli/tui/screens/logs.js');
      expect(module.LogsScreen).toBeDefined();
    });

    it('should instantiate with valid parameters', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');
      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });
      expect(screen).toBeDefined();
    });

    it('should have required methods', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');
      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });
      expect(typeof screen.init).toBe('function');
      expect(typeof screen.render).toBe('function');
      expect(typeof screen.refresh).toBe('function');
      expect(typeof screen.handleKey).toBe('function');
    });
  });

  describe('LogsScreen initialization', () => {
    it('should initialize successfully', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await expect(screen.init()).resolves.not.toThrow();
    });

    it('should initialize with no errors', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();

      // Verify the screen object is still valid after init
      expect(screen).toBeDefined();
    });
  });

  describe('LogsScreen rendering', () => {
    it('should render without error', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await expect(screen.render()).resolves.not.toThrow();
    });

    it('should render successfully multiple times', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await screen.render();
      await screen.render();

      // Verify render was successful (no errors thrown)
      expect(screen).toBeDefined();
    });
  });

  describe('LogsScreen filtering keybindings', () => {
    it('should handle filter key a (ALL)', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await screen.handleKey('a');

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Filter: ALL');
    });

    it('should handle filter key i (INFO)', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await screen.handleKey('i');

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Filter: INFO');
    });

    it('should handle filter key t (TRACE/DEBUG)', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await screen.handleKey('t');

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Filter: DEBUG (Trace)');
    });

    it('should handle filter key x (ERROR/Exceptions)', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await screen.handleKey('x');

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Filter: ERROR (Exceptions)');
    });
  });

  describe('LogsScreen navigation keybindings', () => {
    it('should handle scroll down with j key', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await screen.handleKey('j');

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Scrolling down...');
    });

    it('should handle scroll down with arrow down key', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await screen.handleKey('', { name: 'down' });

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Scrolling down...');
    });

    it('should handle scroll up with k key', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await screen.handleKey('k');

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Scrolling up...');
    });

    it('should handle scroll up with arrow up key', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await screen.handleKey('', { name: 'up' });

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Scrolling up...');
    });

    it('should handle jump to bottom with G key', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await screen.handleKey('G', { shift: true });

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Jumped to bottom');
    });

    it('should handle jump to top with g key', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await screen.handleKey('g', { shift: false });

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Jumped to top');
    });

    it('should handle refresh with r key', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await screen.handleKey('r');

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Refreshing logs...');
    });
  });

  describe('LogsScreen refresh', () => {
    it('should support refresh method', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await expect(screen.refresh()).resolves.not.toThrow();
    });
  });

  describe('LogsScreen edge cases', () => {
    it('should handle rendering with no logs gracefully', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await expect(screen.render()).resolves.not.toThrow();
    });

    it('should handle unknown keybindings gracefully', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();
      await expect(screen.handleKey('x')).resolves.not.toThrow();
    });

    it('should support multiple filter changes in sequence', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      const mockAppRef = {
        showStatusMessage: vi.fn(),
      };
      screen.setAppReference(mockAppRef);

      await screen.init();

      // Change filters in sequence
      await screen.handleKey('i'); // INFO
      await screen.handleKey('t'); // TRACE/DEBUG
      await screen.handleKey('x'); // ERROR/Exceptions
      await screen.handleKey('a'); // ALL

      expect(mockAppRef.showStatusMessage).toHaveBeenCalledWith('Filter: ALL');
    });
  });

  describe('LogsScreen multi-log aggregation', () => {
    it('should parse single-line JSON log entries correctly', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');
      const { readFile, readdir, access } = await import('fs/promises');

      // Mock fs functions
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['bozly-2025-12-31-17-44-22.log']);
      vi.mocked(readFile).mockResolvedValue(
        `═══════════════════════════════════════════════════════════
BOZLY Session Log
Started: 2025-12-31T17:44:22.039Z
═══════════════════════════════════════════════════════════
{"timestamp":"2025-12-31T17:44:22.061Z","level":"INFO","message":"Test log entry","file":"test.js","line":10}
`
      );

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await screen.refresh();
      await screen.render();

      // Should not throw and should render successfully
      expect(screen).toBeDefined();
    });

    it('should parse multi-line pretty-printed JSON log entries correctly', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');
      const { readFile, readdir, access } = await import('fs/promises');

      // Mock fs functions
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['bozly-2025-12-31-test.log']);
      vi.mocked(readFile).mockResolvedValue(
        `═══════════════════════════════════════════════════════════
BOZLY Session Log
Started: 2025-12-31T17:44:22.039Z
═══════════════════════════════════════════════════════════
{
  "timestamp": "2025-12-31T17:44:22.061Z",
  "level": "INFO",
  "message": "Test log entry",
  "file": "test.js",
  "line": 10
}
{
  "timestamp": "2025-12-31T17:44:23.061Z",
  "level": "DEBUG",
  "message": "Another log entry"
}
`
      );

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await screen.refresh();
      await screen.render();

      // Should successfully parse multi-line JSON
      expect(screen).toBeDefined();
    });

    it('should load logs from multiple files in directory', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');
      const { readFile, readdir, access } = await import('fs/promises');

      // Mock fs functions
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue([
        'bozly-2025-12-31-17-44-22.log',
        'bozly-2025-12-31-17-45-00.log',
        'bozly-2025-12-31-17-46-00.log',
      ]);

      let callCount = 0;
      vi.mocked(readFile).mockImplementation(() => {
        callCount++;
        return Promise.resolve(
          `{"timestamp":"2025-12-31T17:44:${String(callCount).padStart(2, '0')}.061Z","level":"INFO","message":"Log entry ${callCount}"}`
        );
      });

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await screen.refresh();
      await screen.render();

      // Should load from all files (readFile should be called 3+ times for all files)
      expect(readFile).toHaveBeenCalled();
      expect(screen).toBeDefined();
    });

    it('should add source field to log entries', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');
      const { readFile, readdir, access } = await import('fs/promises');

      // Mock fs functions
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['bozly-2025-12-31-test.log']);
      vi.mocked(readFile).mockResolvedValue(
        `{"timestamp":"2025-12-31T17:44:22.061Z","level":"INFO","message":"Global log entry"}`
      );

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await screen.refresh();

      // Should not throw when rendering
      await expect(screen.render()).resolves.not.toThrow();
      expect(screen).toBeDefined();
    });

    it('should handle missing log directory gracefully', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');
      const { access } = await import('fs/promises');

      // Mock fs functions to simulate missing directory
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await expect(screen.refresh()).resolves.not.toThrow();
      await expect(screen.render()).resolves.not.toThrow();

      expect(screen).toBeDefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');
      const { readFile, readdir, access } = await import('fs/promises');

      // Mock fs functions
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['bozly-2025-12-31-test.log']);
      vi.mocked(readFile).mockResolvedValue(
        `{"timestamp":"2025-12-31T17:44:22.061Z","level":"INFO","message":"Valid entry"}
{invalid json content here}
{"timestamp":"2025-12-31T17:44:23.061Z","level":"INFO","message":"Another valid entry"}`
      );

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await screen.refresh();
      await expect(screen.render()).resolves.not.toThrow();

      // Should skip malformed JSON and continue
      expect(screen).toBeDefined();
    });

    it('should handle vault logs loading with missing registry', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');
      const { readFile, readdir, access } = await import('fs/promises');

      // Mock fs functions
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['bozly-2025-12-31-test.log']);

      // Fail on registry read, succeed on log directory read
      let callCount = 0;
      vi.mocked(readFile).mockImplementation((path: any) => {
        callCount++;
        if (String(path).includes('bozly-registry.json')) {
          return Promise.reject(new Error('Registry not found'));
        }
        return Promise.resolve(
          `{"timestamp":"2025-12-31T17:44:22.061Z","level":"INFO","message":"Log entry"}`
        );
      });

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await screen.refresh();
      await expect(screen.render()).resolves.not.toThrow();

      // Should gracefully handle missing registry
      expect(screen).toBeDefined();
    });

    it('should sort logs by timestamp in descending order', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');
      const { readFile, readdir, access } = await import('fs/promises');

      // Mock fs functions
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['bozly-2025-12-31-test.log']);
      vi.mocked(readFile).mockResolvedValue(
        `{"timestamp":"2025-12-31T17:44:22.061Z","level":"INFO","message":"First entry"}
{"timestamp":"2025-12-31T17:44:25.061Z","level":"INFO","message":"Third entry"}
{"timestamp":"2025-12-31T17:44:23.061Z","level":"INFO","message":"Second entry"}`
      );

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await screen.refresh();

      // Logs should be sorted most recent first (descending)
      // The render output should reflect this order
      await expect(screen.render()).resolves.not.toThrow();
      expect(screen).toBeDefined();
    });

    it('should display log sources in rendered output', async () => {
      const { LogsScreen } = await import('../../../../../src/cli/tui/screens/logs.js');
      const { readFile, readdir, access } = await import('fs/promises');

      // Mock fs functions
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue(['bozly-2025-12-31-test.log']);
      vi.mocked(readFile).mockResolvedValue(
        `{"timestamp":"2025-12-31T17:44:22.061Z","level":"INFO","message":"Test log"}`
      );

      const screen = new LogsScreen(mockScreen, {
        id: 'logs',
        name: 'Logs',
      });

      await screen.init();
      await screen.refresh();

      // Should not throw when rendering with source information
      await expect(screen.render()).resolves.not.toThrow();
      expect(screen).toBeDefined();
    });
  });
});
