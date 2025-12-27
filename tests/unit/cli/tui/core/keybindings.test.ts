import { describe, it, expect } from 'vitest';
import { KeybindingManager } from '../../../../../src/cli/tui/core/keybindings.js';

describe('KeybindingManager', () => {
  let manager: KeybindingManager;

  beforeEach(() => {
    manager = new KeybindingManager();
  });

  describe('Navigation Key Resolution', () => {
    it('should resolve j as down', () => {
      const dir = manager.resolveNavKey('j', {});
      expect(dir).toBe('down');
    });

    it('should resolve k as up', () => {
      const dir = manager.resolveNavKey('k', {});
      expect(dir).toBe('up');
    });

    it('should resolve arrow keys', () => {
      expect(manager.resolveNavKey('', { name: 'down' })).toBe('down');
      expect(manager.resolveNavKey('', { name: 'up' })).toBe('up');
      expect(manager.resolveNavKey('', { name: 'right' })).toBe('right');
      expect(manager.resolveNavKey('', { name: 'left' })).toBe('left');
    });

    it('should return null for non-navigation keys', () => {
      const dir = manager.resolveNavKey('x', {});
      expect(dir).toBeNull();
    });
  });

  describe('Submit Key Detection', () => {
    it('should detect enter as submit', () => {
      expect(manager.isSubmitKey('', { name: 'enter' })).toBe(true);
    });

    it('should reject non-submit keys', () => {
      expect(manager.isSubmitKey('', { name: 'backspace' })).toBe(false);
      expect(manager.isSubmitKey('', { name: 'return' })).toBe(false);
    });
  });

  describe('Cancel Key Detection', () => {
    it('should detect escape as cancel', () => {
      expect(manager.isCancelKey('', { name: 'escape' })).toBe(true);
    });

    it('should detect ctrl-c as cancel', () => {
      expect(manager.isCancelKey('', { ctrl: true, name: 'c' })).toBe(true);
    });

    it('should reject non-cancel keys', () => {
      expect(!manager.isCancelKey('', { name: 'enter' })).toBe(true);
    });
  });

  describe('Menu Shortcuts', () => {
    it('should parse menu shortcuts 1-8', () => {
      for (let i = 1; i <= 8; i++) {
        const shortcut = manager.getMenuShortcut(String(i));
        expect(shortcut).toBe(i);
      }
    });

    it('should return null for non-menu shortcuts', () => {
      const shortcut = manager.getMenuShortcut('9');
      expect(shortcut).toBeNull();
    });

    it('should return null for non-numeric keys', () => {
      const shortcut = manager.getMenuShortcut('a');
      expect(shortcut).toBeNull();
    });
  });

  describe('Double Key Sequences', () => {
    it('should detect double g (gg) for go to top', () => {
      // First 'g'
      const first = manager.parseDoubleKey('g');
      expect(first).toBeNull();

      // Second 'g'
      const second = manager.parseDoubleKey('g');
      expect(second).toBe('gg');
    });

    it('should reset buffer on different key', () => {
      manager.parseDoubleKey('g');
      const result = manager.parseDoubleKey('j');
      expect(result).toBeNull();
    });

    it('should allow resetting double key buffer manually', () => {
      manager.parseDoubleKey('g');
      manager.resetDoubleKeyBuffer();
      const result = manager.parseDoubleKey('g');
      expect(result).toBeNull();
    });
  });

  describe('Global Bindings', () => {
    it('should return global keybindings', () => {
      const bindings = manager.getGlobalBindings();
      expect(bindings).toBeInstanceOf(Map);
      expect(bindings.size).toBeGreaterThan(0);
    });

    it('should return list navigation bindings', () => {
      const bindings = manager.getListNavBindings();
      expect(bindings).toBeInstanceOf(Map);
      expect(bindings.size).toBeGreaterThan(0);
    });
  });
});
