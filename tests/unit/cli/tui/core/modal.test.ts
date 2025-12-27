import { describe, it, expect, beforeEach, vi } from 'vitest';
import blessed from 'blessed';
import { Modal } from '../../../../../src/cli/tui/core/modal.js';

// Concrete implementation for testing
class TestModal extends Modal {
  async init(): Promise<void> {
    this.box = this.createBox();
  }

  async render(): Promise<void> {
    if (this.box) {
      this.box.show();
    }
  }

  async handleKey(_ch: string, _key?: any): Promise<void> {
    // Test implementation
  }
}

describe('Modal', () => {
  let mockScreen: blessed.Widgets.Screen;
  let modal: TestModal;

  beforeEach(() => {
    const mockBox = {
      show: vi.fn(),
      hide: vi.fn(),
      focus: vi.fn(),
      destroy: vi.fn(),
    } as any;

    mockScreen = {
      render: vi.fn(),
      destroy: vi.fn(),
      box: vi.fn().mockReturnValue(mockBox),
      textbox: vi.fn().mockReturnValue(mockBox),
      button: vi.fn().mockReturnValue(mockBox),
      list: vi.fn().mockReturnValue(mockBox),
    } as any;

    modal = new TestModal(mockScreen, {
      id: 'test-modal',
      title: 'Test Modal',
    });
  });

  describe('Modal Lifecycle', () => {
    it('should initialize with correct config', () => {
      expect(modal.getId()).toBe('test-modal');
      expect(modal.getTitle()).toBe('Test Modal');
    });

    it('should not be visible by default', () => {
      expect(modal.isCurrentlyVisible()).toBe(false);
    });

    it('should be showable and closeable', async () => {
      const showPromise = modal.show();
      expect(modal.isCurrentlyVisible()).toBe(true);

      await modal.close('result');
      const result = await showPromise;

      expect(result).toBe('result');
      expect(modal.isCurrentlyVisible()).toBe(false);
    });
  });

  describe('Modal Methods', () => {
    it('should get modal ID', () => {
      expect(modal.getId()).toBe('test-modal');
    });

    it('should get modal title', () => {
      expect(modal.getTitle()).toBe('Test Modal');
    });

    it('should handle init', async () => {
      await expect(modal.init()).resolves.not.toThrow();
    });

    it('should handle render', async () => {
      await expect(modal.render()).resolves.not.toThrow();
    });

    it('should handle destroy', () => {
      expect(() => modal.destroy()).not.toThrow();
    });
  });

  describe('Modal Promise Pattern', () => {
    it('should return promise from show', async () => {
      const showPromise = modal.show();
      expect(showPromise).toBeInstanceOf(Promise);

      await modal.close('result');
      const result = await showPromise;

      expect(result).toBe('result');
    });

    it('should support multiple calls', async () => {
      // First show/close cycle
      let promise1 = modal.show();
      await modal.close('first');
      let result1 = await promise1;
      expect(result1).toBe('first');

      // Second show/close cycle
      let promise2 = modal.show();
      await modal.close('second');
      let result2 = await promise2;
      expect(result2).toBe('second');
    });

    it('should close without result', async () => {
      const showPromise = modal.show();
      await modal.close();
      const result = await showPromise;

      expect(result).toBeUndefined();
    });
  });

  describe('Custom Dimensions', () => {
    it('should accept custom width and height', () => {
      const customModal = new TestModal(mockScreen, {
        id: 'custom',
        title: 'Custom',
        width: 80,
        height: 30,
      });

      expect((customModal as any).width).toBe(80);
      expect((customModal as any).height).toBe(30);
    });

    it('should use default dimensions', () => {
      expect((modal as any).width).toBe(60);
      expect((modal as any).height).toBe(20);
    });
  });
});
