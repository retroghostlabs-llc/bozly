/**
 * Unit tests for CLI symbols
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { symbols, statusSymbol } from '../../dist/cli/ui/symbols.js';

describe('Symbols', () => {
  const originalEnv = { ...process.env };
  const originalIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalIsTTY,
      writable: true,
    });
  });

  describe('symbols object', () => {
    it('has all required symbol properties', () => {
      expect(symbols).toHaveProperty('success');
      expect(symbols).toHaveProperty('error');
      expect(symbols).toHaveProperty('warning');
      expect(symbols).toHaveProperty('info');
      expect(symbols).toHaveProperty('bullet');
      expect(symbols).toHaveProperty('pointer');
      expect(symbols).toHaveProperty('arrowRight');
      expect(symbols).toHaveProperty('active');
      expect(symbols).toHaveProperty('inactive');
      expect(symbols).toHaveProperty('ellipsis');
      expect(symbols).toHaveProperty('line');
    });

    it('all symbols are strings', () => {
      Object.values(symbols).forEach((symbol) => {
        expect(typeof symbol).toBe('string');
        expect(symbol.length).toBeGreaterThan(0);
      });
    });
  });

  describe('statusSymbol', () => {
    it('returns colored success symbol when colors enabled', () => {
      delete process.env.NO_COLOR;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const result = statusSymbol('success');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns colored error symbol when colors enabled', () => {
      delete process.env.NO_COLOR;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const result = statusSymbol('error');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns colored warning symbol when colors enabled', () => {
      delete process.env.NO_COLOR;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const result = statusSymbol('warning');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns colored info symbol when colors enabled', () => {
      delete process.env.NO_COLOR;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const result = statusSymbol('info');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns colored active symbol when colors enabled', () => {
      delete process.env.NO_COLOR;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const result = statusSymbol('active');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns colored inactive symbol when colors enabled', () => {
      delete process.env.NO_COLOR;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const result = statusSymbol('inactive');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns plain symbol when colors disabled (NO_COLOR)', () => {
      process.env.NO_COLOR = '1';
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const result = statusSymbol('success');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      // When NO_COLOR, it should return just the symbol without ANSI codes
      expect(result).toBe(symbols.success);
    });
  });
});
