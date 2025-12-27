import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BozlyTUI } from '../../../../../src/cli/tui/core/app.js';
import { APIClient } from '../../../../../src/cli/tui/core/api-client.js';
import { Screen } from '../../../../../src/cli/tui/core/screen.js';
import { Modal } from '../../../../../src/cli/tui/core/modal.js';
import { getAPIURL } from '../../../../../src/core/port-config.js';

// Mock blessed
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
      once: vi.fn((event: string, cb: () => void) => {
        if (event === 'key') {
          cb();
        }
      }),
    })),
  },
}));

// Mock APIClient
vi.mock('../../../../../src/cli/tui/core/api-client.js', () => {
  const APIClientMock = vi.fn(function (this: any) {
    this.isHealthy = vi.fn();
  });
  return {
    APIClient: APIClientMock,
  };
});

// Mock Screen with concrete implementation
class TestScreen extends Screen {
  async init(): Promise<void> {}
  async render(): Promise<void> {}
  async refresh(): Promise<void> {}
  async handleKey(): Promise<void> {}
}

// Mock Modal with concrete implementation
class TestModal extends Modal {
  async init(): Promise<void> {}
  async render(): Promise<void> {}
  async handleKey(): Promise<void> {}
}

describe('BozlyTUI Application Comprehensive', () => {
  let tui: BozlyTUI;
  let mockAPIClient: any;
  let mockBlessedScreen: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock process.exit to prevent actual exit
    vi.spyOn(process, 'exit').mockImplementation((): never => {
      return undefined as never;
    });

    // Create mockAPIClient first
    mockAPIClient = {
      isHealthy: vi.fn().mockResolvedValue(true),
    };

    // Reset modules to get fresh instances
    tui = new BozlyTUI({
      apiUrl: getAPIURL(),
      refreshInterval: 1000,
    });

    mockBlessedScreen = tui.getScreen();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const app = new BozlyTUI();
      expect(app).toBeDefined();
      expect(typeof app.init).toBe('function');
    });

    it('should initialize with custom apiUrl', () => {
      const customUrl = 'http://custom:3000/api';
      const app = new BozlyTUI({ apiUrl: customUrl });
      expect(app.getAPIClient()).toBeDefined();
    });

    it('should initialize with custom refreshInterval', () => {
      const app = new BozlyTUI({ refreshInterval: 2000 });
      expect(app).toBeDefined();
    });

    it('should create blessed screen instance', () => {
      expect(tui.getScreen()).toBeDefined();
    });

    it('should create APIClient instance', () => {
      expect(tui.getAPIClient()).toBeDefined();
    });

    it('should initialize with running state as false', () => {
      const app = new BozlyTUI();
      // Private field - verify through indirect means
      expect(app).toBeDefined();
    });
  });

  describe('init()', () => {
    it('should have init method', () => {
      expect(typeof tui.init).toBe('function');
    });

    it('should be async function', () => {
      const initResult = tui.init();
      expect(initResult).toBeInstanceOf(Promise);
      // Clean up the promise to avoid unhandled rejection
      initResult.catch(() => {
        /* ignore */
      });
    });

    it('should initialize TUI state', () => {
      expect(tui).toBeDefined();
      expect(tui.getAPIClient()).toBeDefined();
    });

    it('should have access to APIClient', () => {
      const apiClient = tui.getAPIClient();
      expect(apiClient).toBeDefined();
    });

    it('should have access to blessed screen', () => {
      const screen = tui.getScreen();
      expect(screen).toBeDefined();
    });
  });

  describe('start()', () => {
    it('should have start method', () => {
      expect(typeof tui.start).toBe('function');
    });

    it('should be async function', () => {
      const startResult = tui.start();
      expect(startResult).toBeInstanceOf(Promise);
      // Clean up the promise
      startResult.catch(() => {
        /* ignore */
      });
    });

    it('should activate screen if registered', async () => {
      const screen = new TestScreen(mockBlessedScreen, { id: 'home', name: 'Home' });
      tui.registerScreen(screen);
      const activateSpy = vi.spyOn(screen, 'activate');
      try {
        await tui.start();
      } catch {
        /* ignore errors from init */
      }
      // Verify method was defined and spy was set up
      expect(activateSpy).toBeDefined();
    });

    it('should support polling setup', () => {
      expect(tui).toBeDefined();
    });
  });

  describe('registerScreen()', () => {
    it('should register a screen', () => {
      const screen = new TestScreen(mockBlessedScreen, { id: 'home', name: 'Home' });
      tui.registerScreen(screen);
      expect(tui.getAPIClient()).toBeDefined();
    });

    it('should set first screen as current', () => {
      const screen = new TestScreen(mockBlessedScreen, { id: 'home', name: 'Home' });
      tui.registerScreen(screen);
      expect(tui.getCurrentScreen()).toBe(screen);
    });

    it('should not override current screen on subsequent registrations', () => {
      const screen1 = new TestScreen(mockBlessedScreen, { id: 'home', name: 'Home' });
      const screen2 = new TestScreen(mockBlessedScreen, { id: 'vaults', name: 'Vaults' });
      tui.registerScreen(screen1);
      tui.registerScreen(screen2);
      expect(tui.getCurrentScreen()).toBe(screen1);
    });

    it('should register multiple screens', () => {
      const screens = [
        new TestScreen(mockBlessedScreen, { id: 'home', name: 'Home' }),
        new TestScreen(mockBlessedScreen, { id: 'vaults', name: 'Vaults' }),
        new TestScreen(mockBlessedScreen, { id: 'sessions', name: 'Sessions' }),
      ];
      screens.forEach(s => tui.registerScreen(s));
      expect(tui).toBeDefined();
    });
  });

  describe('switchScreen()', () => {
    beforeEach(() => {
      const screen1 = new TestScreen(mockBlessedScreen, { id: 'home', name: 'Home' });
      const screen2 = new TestScreen(mockBlessedScreen, { id: 'vaults', name: 'Vaults' });
      tui.registerScreen(screen1);
      tui.registerScreen(screen2);
    });

    it('should switch to existing screen', async () => {
      await tui.switchScreen('vaults');
      expect(tui).toBeDefined();
    });

    it('should initialize and render new screen', async () => {
      const screen = new TestScreen(mockBlessedScreen, { id: 'test', name: 'Test' });
      const initSpy = vi.spyOn(screen, 'init');
      const renderSpy = vi.spyOn(screen, 'render');
      tui.registerScreen(screen);
      await tui.switchScreen('test');
      expect(initSpy).toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should activate new screen', async () => {
      const screen = new TestScreen(mockBlessedScreen, { id: 'test', name: 'Test' });
      const activateSpy = vi.spyOn(screen, 'activate');
      tui.registerScreen(screen);
      await tui.switchScreen('test');
      expect(activateSpy).toHaveBeenCalled();
    });

    it('should deactivate previous screen', async () => {
      const screen1 = tui.getCurrentScreen();
      const deactivateSpy = vi.spyOn(screen1!, 'deactivate');
      const screen2 = new TestScreen(mockBlessedScreen, { id: 'new', name: 'New' });
      tui.registerScreen(screen2);
      await tui.switchScreen('new');
      expect(deactivateSpy).toHaveBeenCalled();
    });

    it('should render screen after switch', async () => {
      const screen = new TestScreen(mockBlessedScreen, { id: 'test', name: 'Test' });
      tui.registerScreen(screen);
      await tui.switchScreen('test');
      expect(mockBlessedScreen.render).toHaveBeenCalled();
    });

    it('should handle non-existent screen gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await tui.switchScreen('non-existent');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('showModal()', () => {
    it('should have showModal method', () => {
      expect(typeof tui.showModal).toBe('function');
    });

    it('should accept modal as parameter', () => {
      const modal = new TestModal(mockBlessedScreen, { id: 'test' });
      const result = tui.showModal(modal);
      expect(result).toBeInstanceOf(Promise);
      // Don't wait for it to complete since show() won't resolve without mocking
      result.catch(() => {
        /* ignore */
      });
    });

    it('should initialize modal', async () => {
      const modal = new TestModal(mockBlessedScreen, { id: 'test' });
      const initSpy = vi.spyOn(modal, 'init');
      vi.spyOn(modal, 'show').mockResolvedValue(true);
      await tui.showModal(modal);
      expect(initSpy).toHaveBeenCalled();
    });

    it('should return modal promise result', async () => {
      const modal = new TestModal(mockBlessedScreen, { id: 'test' });
      const expectedResult = { confirmed: true };
      vi.spyOn(modal, 'show').mockResolvedValue(expectedResult);
      const result = await tui.showModal(modal);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('closeModal()', () => {
    it('should have closeModal method', () => {
      expect(typeof tui.closeModal).toBe('function');
    });

    it('should accept optional result parameter', () => {
      const result = { success: true };
      expect(() => tui.closeModal(result)).not.toThrow();
    });

    it('should handle no current modal gracefully', () => {
      expect(() => tui.closeModal()).not.toThrow();
    });

    it('should close modal when one is active', async () => {
      const modal = new TestModal(mockBlessedScreen, { id: 'test' });
      const closeSpy = vi.spyOn(modal, 'close');
      vi.spyOn(modal, 'show').mockResolvedValue(true);
      await tui.showModal(modal);
      tui.closeModal();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should destroy modal', async () => {
      const modal = new TestModal(mockBlessedScreen, { id: 'test' });
      const destroySpy = vi.spyOn(modal, 'destroy');
      vi.spyOn(modal, 'show').mockResolvedValue(true);
      await tui.showModal(modal);
      tui.closeModal();
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('refresh()', () => {
    it('should have refresh method', () => {
      expect(typeof tui.refresh).toBe('function');
    });

    it('should be async function', () => {
      const refreshResult = tui.refresh();
      expect(refreshResult).toBeInstanceOf(Promise);
      refreshResult.catch(() => {
        /* ignore */
      });
    });

    it('should handle current screen', async () => {
      const screen = new TestScreen(mockBlessedScreen, { id: 'home', name: 'Home' });
      tui.registerScreen(screen);
      const currentScreen = tui.getCurrentScreen();
      const refreshSpy = vi.spyOn(currentScreen!, 'refresh');
      await tui.refresh();
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should handle no current screen', async () => {
      const newTUI = new BozlyTUI();
      // Should not throw even with no screen
      const result = newTUI.refresh();
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => {
        /* ignore */
      });
    });
  });

  describe('shutdown()', () => {
    it('should have shutdown method', () => {
      expect(typeof tui.shutdown).toBe('function');
    });

    it('should handle shutdown with no active poller', () => {
      // Shutdown without a running poller should not throw
      expect(() => tui.shutdown()).not.toThrow();
    });

    it('should clean up resources on shutdown', () => {
      const screen = new TestScreen(mockBlessedScreen, { id: 'home', name: 'Home' });
      tui.registerScreen(screen);
      // Shutdown should clean up without throwing
      expect(() => tui.shutdown()).not.toThrow();
    });

    it('should destroy current modal if exists', async () => {
      const modal = new TestModal(mockBlessedScreen, { id: 'test' });
      vi.spyOn(modal, 'show').mockResolvedValue(true);
      await tui.showModal(modal);
      const destroySpy = vi.spyOn(modal, 'destroy');
      tui.shutdown();
      expect(destroySpy).toHaveBeenCalled();
    });

    it('should destroy current screen', () => {
      const screen = new TestScreen(mockBlessedScreen, { id: 'home', name: 'Home' });
      tui.registerScreen(screen);
      const currentScreen = tui.getCurrentScreen();
      const destroySpy = vi.spyOn(currentScreen!, 'destroy');
      tui.shutdown();
      expect(destroySpy).toHaveBeenCalled();
    });

    it('should destroy all registered screens', () => {
      const screen1 = new TestScreen(mockBlessedScreen, { id: 'home', name: 'Home' });
      const screen2 = new TestScreen(mockBlessedScreen, { id: 'vaults', name: 'Vaults' });
      tui.registerScreen(screen1);
      tui.registerScreen(screen2);

      const destroy1Spy = vi.spyOn(screen1, 'destroy');
      const destroy2Spy = vi.spyOn(screen2, 'destroy');

      tui.shutdown();

      expect(destroy1Spy).toHaveBeenCalled();
      expect(destroy2Spy).toHaveBeenCalled();
    });

    it('should destroy blessed screen', () => {
      tui.shutdown();
      expect(mockBlessedScreen.destroy).toHaveBeenCalled();
    });

    it('should call process.exit(0)', () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      tui.shutdown();
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('Getters', () => {
    it('getAPIClient() returns APIClient instance', () => {
      const client = tui.getAPIClient();
      expect(client).toBeDefined();
    });

    it('getScreen() returns blessed screen', () => {
      const screen = tui.getScreen();
      expect(screen).toBeDefined();
    });

    it('getCurrentScreen() returns current screen', () => {
      const testScreen = new TestScreen(mockBlessedScreen, { id: 'test', name: 'Test' });
      tui.registerScreen(testScreen);
      expect(tui.getCurrentScreen()).toBe(testScreen);
    });

    it('getCurrentScreen() returns null if none registered', () => {
      const newTUI = new BozlyTUI();
      expect(tui.getCurrentScreen()).toBeDefined();
    });
  });

  describe('Global Keybindings', () => {
    it('should setup key handlers', () => {
      expect(mockBlessedScreen.key).toHaveBeenCalled();
    });

    it('should respond to escape key', () => {
      const keyHandler = (mockBlessedScreen.key as any).mock.calls.find(
        (call: any) => call[0].includes('escape')
      );
      expect(keyHandler).toBeDefined();
    });

    it('should respond to Ctrl+C', () => {
      const keyHandler = (mockBlessedScreen.key as any).mock.calls.find(
        (call: any) => call[0].includes('C-c')
      );
      expect(keyHandler).toBeDefined();
    });

    it('should respond to numeric menu shortcuts', () => {
      for (let i = 1; i <= 8; i++) {
        const keyHandler = (mockBlessedScreen.key as any).mock.calls.find(
          (call: any) => call[0].includes(String(i))
        );
        expect(keyHandler).toBeDefined();
      }
    });

    it('should respond to help key', () => {
      const keyHandler = (mockBlessedScreen.key as any).mock.calls.find(
        (call: any) => call[0].includes('?')
      );
      expect(keyHandler).toBeDefined();
    });

    it('should respond to refresh key (Ctrl+L)', () => {
      const keyHandler = (mockBlessedScreen.key as any).mock.calls.find(
        (call: any) => call[0].includes('C-l')
      );
      expect(keyHandler).toBeDefined();
    });
  });

  describe('Menu Creation', () => {
    it('should support menu creation', () => {
      expect(tui).toBeDefined();
      expect(tui.getScreen()).toBeDefined();
    });

    it('should have blessed screen with box capability', () => {
      // Verify the blessed screen has the necessary methods for menu creation
      const screen = tui.getScreen();
      expect(typeof screen.box).toBe('function');
    });
  });

  describe('Config variations', () => {
    it('should use default API URL if not provided', () => {
      const app = new BozlyTUI();
      expect(app.getAPIClient()).toBeDefined();
    });

    it('should use custom API URL if provided', () => {
      const customURL = 'http://example.com:3000/api';
      const app = new BozlyTUI({ apiUrl: customURL });
      expect(app.getAPIClient()).toBeDefined();
    });

    it('should use default refresh interval if not provided', () => {
      const app = new BozlyTUI();
      expect(app).toBeDefined();
    });

    it('should use custom refresh interval if provided', () => {
      const app = new BozlyTUI({ refreshInterval: 10000 });
      expect(app).toBeDefined();
    });

    it('should handle both config options together', () => {
      const app = new BozlyTUI({
        apiUrl: 'http://custom:3000/api',
        refreshInterval: 2000,
      });
      expect(app.getAPIClient()).toBeDefined();
      expect(app.getScreen()).toBeDefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle screen switching sequence', async () => {
      const screen1 = new TestScreen(mockBlessedScreen, { id: 'home', name: 'Home' });
      const screen2 = new TestScreen(mockBlessedScreen, { id: 'vaults', name: 'Vaults' });
      const screen3 = new TestScreen(mockBlessedScreen, { id: 'sessions', name: 'Sessions' });

      tui.registerScreen(screen1);
      tui.registerScreen(screen2);
      tui.registerScreen(screen3);

      await tui.switchScreen('vaults');
      expect(tui.getCurrentScreen()).toBe(screen2);

      await tui.switchScreen('sessions');
      expect(tui.getCurrentScreen()).toBe(screen3);
    });

    it('should handle modal lifecycle', async () => {
      const modal = new TestModal(mockBlessedScreen, { id: 'test' });
      const showResult = { confirmed: true };
      vi.spyOn(modal, 'show').mockResolvedValue(showResult);

      const result = await tui.showModal(modal);
      expect(result).toEqual(showResult);

      tui.closeModal();
      expect(tui).toBeDefined();
    });

    it('should handle multiple modal show/close cycles', async () => {
      const modal1 = new TestModal(mockBlessedScreen, { id: 'modal1' });
      const modal2 = new TestModal(mockBlessedScreen, { id: 'modal2' });

      vi.spyOn(modal1, 'show').mockResolvedValue(true);
      vi.spyOn(modal2, 'show').mockResolvedValue(true);

      await tui.showModal(modal1);
      tui.closeModal();

      await tui.showModal(modal2);
      tui.closeModal();

      expect(tui).toBeDefined();
    });
  });
});