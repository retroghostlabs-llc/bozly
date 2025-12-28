/**
 * Unit tests for CLI banner rendering
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderBanner, renderBannerWithVersion } from '../../dist/cli/ui/banner.js';

describe('Banner Rendering', () => {
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

  describe('renderBanner', () => {
    it('returns fancy banner in fancy terminal', () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const banner = renderBanner();
      expect(banner).toBeTruthy();
      expect(typeof banner).toBe('string');
      // Fancy banner should contain the tagline text (ANSI codes wrap individual chars)
      expect(banner).toContain('Build');
      expect(banner).toContain('Organize');
      expect(banner).toContain('Link');
      expect(banner).toContain('Yield');
    });

    it('returns simple banner in CI environment', () => {
      delete process.env.NO_COLOR;
      process.env.CI = 'true';
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const banner = renderBanner();
      expect(banner).toBeTruthy();
      expect(typeof banner).toBe('string');
      // Simple banner should have box-drawing and tagline
      expect(banner).toContain('═');
      expect(banner).toContain('Build');
    });

    it('returns simple banner when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const banner = renderBanner();
      expect(banner).toBeTruthy();
      expect(typeof banner).toBe('string');
      expect(banner).toContain('═');
    });

    it('returns simple banner when TERM is dumb', () => {
      delete process.env.NO_COLOR;
      process.env.TERM = 'dumb';
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const banner = renderBanner();
      expect(banner).toBeTruthy();
      expect(typeof banner).toBe('string');
      expect(banner).toContain('═');
    });

    it('returns simple banner when not a TTY', () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        writable: true,
      });
      const banner = renderBanner();
      expect(banner).toBeTruthy();
      expect(typeof banner).toBe('string');
      expect(banner).toContain('═');
    });

    it('contains tagline in banner', () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const banner = renderBanner();
      expect(banner).toContain('Build');
      expect(banner).toContain('Organize');
      expect(banner).toContain('Link');
      expect(banner).toContain('Yield');
    });
  });

  describe('renderBannerWithVersion', () => {
    it('includes version in output', () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const banner = renderBannerWithVersion('1.0.0');
      expect(banner).toContain('v1.0.0');
    });

    it('returns string for any version', () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const banner = renderBannerWithVersion('0.3.0-beta.1');
      expect(typeof banner).toBe('string');
      expect(banner).toContain('v0.3.0-beta.1');
    });

    it('includes tagline even with version', () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;
      delete process.env.TERM;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      const banner = renderBannerWithVersion('1.0.0');
      expect(banner).toContain('Build');
      expect(banner).toContain('Organize');
    });
  });
});
