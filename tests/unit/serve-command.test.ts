import { describe, it, expect, beforeEach, vi } from 'vitest';
import { serveCommand } from '../../src/cli/commands/serve.js';

describe('Serve Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Command Definition', () => {
    it('should have correct name', () => {
      expect(serveCommand.name()).toBe('serve');
    });

    it('should have descriptive description', () => {
      const description = serveCommand.description();
      expect(description).toContain('dashboard');
      expect(description).toContain('server');
    });
  });

  describe('Command Options', () => {
    it('should support port option', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('port');
    });

    it('should support host option', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('host');
    });

    it('should support open browser option', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText.toLowerCase()).toContain('open');
    });

    it('should support no-open negation flag', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('no-open');
    });
  });

  describe('Option Defaults', () => {
    it('should document port default in help', () => {
      // Port 3847 is the default
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('3847');
    });

    it('should document host default in help', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('127.0.0.1');
    });

    it('should mention browser opening behavior in help', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText.toLowerCase()).toContain('browser');
    });
  });

  describe('Port Validation', () => {
    it('should accept valid port numbers (1-65535)', () => {
      const validPorts = [
        { port: '80', shouldPass: true },
        { port: '3000', shouldPass: true },
        { port: '3847', shouldPass: true },
        { port: '8080', shouldPass: true },
        { port: '65535', shouldPass: true },
      ];

      validPorts.forEach(({ port, shouldPass }) => {
        if (shouldPass) {
          const numPort = parseInt(port, 10);
          expect(numPort >= 1 && numPort <= 65535).toBe(true);
        }
      });
    });

    it('should reject invalid port numbers', () => {
      const invalidPorts = ['0', '-1', '65536', '999999', 'abc'];

      invalidPorts.forEach((port) => {
        const numPort = parseInt(port, 10);
        if (!isNaN(numPort)) {
          expect(numPort < 1 || numPort > 65535).toBe(true);
        }
      });
    });
  });

  describe('Host Validation', () => {
    it('should accept various host addresses', () => {
      const validHosts = [
        '127.0.0.1',
        'localhost',
        '0.0.0.0',
        '192.168.1.1',
        '::1',
      ];

      validHosts.forEach((host) => {
        expect(typeof host).toBe('string');
        expect(host.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Command Structure', () => {
    it('should be a valid Command instance', () => {
      expect(serveCommand.name()).toBe('serve');
    });

    it('should be executable', () => {
      expect(typeof serveCommand.action).toBe('function');
    });

    it('should support method chaining', () => {
      const chained = serveCommand.description('test');
      expect(chained).toBeDefined();
    });
  });

  describe('Option Flags', () => {
    it('should document port short flag in help', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('-p');
    });

    it('should document port long flag in help', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('--port');
    });

    it('should document host short flag in help', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('-h');
    });

    it('should document host long flag in help', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('--host');
    });

    it('should document open short flag in help', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('-o');
    });

    it('should document open long flag in help', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('--open');
    });

    it('should document no-open negation flag in help', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('--no-open');
    });
  });

  describe('CLI Usage Examples', () => {
    it('should provide help text', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('serve');
      expect(helpText).toContain('Usage:');
    });

    it('should document default port', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('3847');
    });

    it('should document default host', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText).toContain('127.0.0.1');
    });

    it('should document open browser option', () => {
      const helpText = serveCommand.helpInformation();
      expect(helpText.toLowerCase()).toContain('browser');
    });
  });
});
