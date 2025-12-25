/**
 * Unit tests for CLI theme utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shouldUseColor, isFancyTerminal } from '../../dist/cli/ui/theme.js';

describe('Theme Utilities', () => {
  const originalEnv = { ...process.env };
  const originalIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalIsTTY,
      writable: true,
    });
  });

  describe('shouldUseColor', () => {
    it('returns false when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      expect(shouldUseColor()).toBe(false);
    });

    it('returns true when FORCE_COLOR is set', () => {
      delete process.env.NO_COLOR;
      process.env.FORCE_COLOR = '1';
      expect(shouldUseColor()).toBe(true);
    });

    it('respects NO_COLOR over FORCE_COLOR', () => {
      process.env.NO_COLOR = '1';
      process.env.FORCE_COLOR = '1';
      expect(shouldUseColor()).toBe(false);
    });

    it('returns true when stdout is a TTY', () => {
      delete process.env.NO_COLOR;
      delete process.env.FORCE_COLOR;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      expect(shouldUseColor()).toBe(true);
    });

    it('returns false when stdout is not a TTY', () => {
      delete process.env.NO_COLOR;
      delete process.env.FORCE_COLOR;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        writable: true,
      });
      expect(shouldUseColor()).toBe(false);
    });
  });

  describe('isFancyTerminal', () => {
    it('returns false when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      expect(isFancyTerminal()).toBe(false);
    });

    it('returns false when TERM is dumb', () => {
      delete process.env.NO_COLOR;
      process.env.TERM = 'dumb';
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      expect(isFancyTerminal()).toBe(false);
    });

    it('returns false when CI environment is set', () => {
      delete process.env.NO_COLOR;
      delete process.env.TERM;
      process.env.CI = 'true';
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      expect(isFancyTerminal()).toBe(false);
    });

    it('returns true in normal terminal', () => {
      delete process.env.NO_COLOR;
      delete process.env.TERM;
      delete process.env.CI;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      expect(isFancyTerminal()).toBe(true);
    });

    it('returns false when not a TTY', () => {
      delete process.env.NO_COLOR;
      delete process.env.TERM;
      delete process.env.CI;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        writable: true,
      });
      expect(isFancyTerminal()).toBe(false);
    });
  });
});
