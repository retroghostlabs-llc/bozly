import { describe, it, expect, beforeEach, vi } from 'vitest';
import blessed from '@unblessed/blessed';
import { Screen } from '../../../../../src/cli/tui/core/screen.js';

// Mock @unblessed/blessed
vi.mock('@unblessed/blessed', () => ({
  default: {
    box: vi.fn().mockReturnValue({
      show: vi.fn(),
      hide: vi.fn(),
      destroy: vi.fn(),
      setContent: vi.fn(),
    }),
  },
}));

// Concrete implementation for testing
class TestScreen extends Screen {
  async init(): Promise<void> {
    this.box = this.createBox();
  }

  async render(): Promise<void> {
    // Test implementation
  }

  async handleKey(_ch: string, _key?: any): Promise<void> {
    // Test implementation
  }
}

describe('Screen', () => {
  let mockScreen: blessed.Widgets.Screen;
  let screen: TestScreen;

  beforeEach(() => {
    // Create a mock blessed box
    const mockBox = {
      show: vi.fn(),
      hide: vi.fn(),
      destroy: vi.fn(),
      setContent: vi.fn(),
    } as any;

    // Create a mock blessed screen
    mockScreen = {
      render: vi.fn(),
      destroy: vi.fn(),
      box: vi.fn().mockReturnValue(mockBox),
    } as any;

    screen = new TestScreen(mockScreen, {
      id: 'test-screen',
      name: 'Test Screen',
    });
  });

  describe('Screen Lifecycle', () => {
    it('should initialize with correct config', () => {
      expect(screen.getId()).toBe('test-screen');
      expect(screen.getName()).toBe('Test Screen');
    });

    it('should be inactive by default', () => {
      expect(screen.isCurrentlyActive()).toBe(false);
    });

    it('should activate and deactivate', () => {
      expect(screen.isCurrentlyActive()).toBe(false);

      screen.activate();
      expect(screen.isCurrentlyActive()).toBe(true);

      screen.deactivate();
      expect(screen.isCurrentlyActive()).toBe(false);
    });
  });

  describe('Screen Methods', () => {
    it('should have refresh method', async () => {
      await expect(screen.refresh()).resolves.not.toThrow();
    });

    it('should destroy screen', () => {
      expect(() => screen.destroy()).not.toThrow();
    });

    it('should get screen ID', () => {
      expect(screen.getId()).toBe('test-screen');
    });

    it('should get screen name', () => {
      expect(screen.getName()).toBe('Test Screen');
    });
  });

  describe('Error Display', () => {
    beforeEach(() => {
      // Setup blessed.box mock to return proper object
      vi.mocked(blessed.box).mockReturnValue({
        show: vi.fn(),
        hide: vi.fn(),
        destroy: vi.fn(),
        setContent: vi.fn(),
      } as any);
    });

    it('should show error messages', () => {
      // Mock setTimeout to avoid actual delays in tests
      vi.useFakeTimers();

      screen.activate();
      mockScreen.render = vi.fn();

      // This should not throw
      (screen as any).showError('Test error message');

      expect(blessed.box).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should show success messages', () => {
      vi.useFakeTimers();

      screen.activate();
      mockScreen.render = vi.fn();

      (screen as any).showSuccess('Test success message');

      expect(blessed.box).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should show info messages', () => {
      vi.useFakeTimers();

      screen.activate();
      mockScreen.render = vi.fn();

      (screen as any).showInfo('Test info message');

      expect(blessed.box).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
