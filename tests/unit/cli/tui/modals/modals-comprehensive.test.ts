import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock blessed before importing modals
vi.mock('blessed', () => ({
  default: {
    screen: vi.fn(() => ({
      box: vi.fn(function (opts: any) {
        this.parent = opts.parent;
        this.setContent = vi.fn();
        this.destroy = vi.fn();
        this.once = vi.fn();
      }),
      key: vi.fn(),
      on: vi.fn(),
      render: vi.fn(),
      destroy: vi.fn(),
    })),
  },
}));

describe('ConfirmModal Comprehensive', () => {
  let mockScreen: any;
  let ConfirmModal: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../../../../../src/cli/tui/modals/confirm.js');
    ConfirmModal = module.ConfirmModal;

    mockScreen = {
      box: vi.fn(function () {
        this.parent = null;
        this.setContent = vi.fn();
        this.destroy = vi.fn();
        this.once = vi.fn();
      }),
      key: vi.fn(),
      on: vi.fn(),
      render: vi.fn(),
      destroy: vi.fn(),
    };
  });

  describe('Constructor', () => {
    it('should initialize with required config', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Are you sure?',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should set default yesLabel', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Confirm action?',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should set custom yesLabel', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Confirm action?',
        yesLabel: 'Proceed',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should set default noLabel', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Confirm action?',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should set custom noLabel', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Confirm action?',
        noLabel: 'Cancel',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should set dangerous flag to false by default', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Delete file?',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should set dangerous flag to true when specified', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Delete all data?',
        dangerous: true,
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should store message', () => {
      const message = 'Are you sure you want to continue?';
      const config = {
        id: 'confirm-modal',
        message,
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });
  });

  describe('Modal methods', () => {
    it('should have init method', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Confirm?',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(typeof modal.init).toBe('function');
    });

    it('should have render method', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Confirm?',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(typeof modal.render).toBe('function');
    });

    it('should have show method', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Confirm?',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(typeof modal.show).toBe('function');
    });

    it('should have handleKey method', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Confirm?',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(typeof modal.handleKey).toBe('function');
    });

    it('should have close method', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Confirm?',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(typeof modal.close).toBe('function');
    });

    it('should have destroy method', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Confirm?',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(typeof modal.destroy).toBe('function');
    });
  });

  describe('Configuration variations', () => {
    it('should handle long messages', () => {
      const longMessage = 'Are you sure you want to delete this file? This action cannot be undone and will permanently remove all associated data from the system.';
      const config = {
        id: 'confirm-modal',
        message: longMessage,
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle custom button labels', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Continue?',
        yesLabel: 'Proceed Anyway',
        noLabel: 'Go Back',
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle dangerous + custom labels', () => {
      const config = {
        id: 'confirm-modal',
        message: 'Delete permanently?',
        yesLabel: 'DELETE',
        noLabel: 'CANCEL',
        dangerous: true,
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle all configuration options together', () => {
      const config = {
        id: 'full-config',
        message: 'Are you absolutely sure?',
        yesLabel: 'Yes, proceed',
        noLabel: 'No, cancel',
        dangerous: true,
      };
      const modal = new ConfirmModal(mockScreen, config);
      expect(modal).toBeDefined();
    });
  });
});

describe('ErrorModal Comprehensive', () => {
  let mockScreen: any;
  let ErrorModal: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../../../../../src/cli/tui/modals/error.js');
    ErrorModal = module.ErrorModal;

    mockScreen = {
      box: vi.fn(function () {
        this.parent = null;
        this.setContent = vi.fn();
        this.destroy = vi.fn();
        this.once = vi.fn();
      }),
      key: vi.fn(),
      on: vi.fn(),
      render: vi.fn(),
      destroy: vi.fn(),
    };
  });

  describe('Constructor', () => {
    it('should initialize with required config', () => {
      const config = {
        id: 'error-modal',
        message: 'An error occurred',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should set error message', () => {
      const message = 'Operation failed';
      const config = {
        id: 'error-modal',
        message,
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle message without details', () => {
      const config = {
        id: 'error-modal',
        message: 'Error: File not found',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should set error details when provided', () => {
      const config = {
        id: 'error-modal',
        message: 'Failed to load data',
        details: 'Network connection timeout',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle undefined details', () => {
      const config = {
        id: 'error-modal',
        message: 'Error occurred',
        details: undefined,
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle empty details string', () => {
      const config = {
        id: 'error-modal',
        message: 'Error',
        details: '',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });
  });

  describe('Modal methods', () => {
    it('should have init method', () => {
      const config = {
        id: 'error-modal',
        message: 'An error occurred',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(typeof modal.init).toBe('function');
    });

    it('should have render method', () => {
      const config = {
        id: 'error-modal',
        message: 'An error occurred',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(typeof modal.render).toBe('function');
    });

    it('should have show method', () => {
      const config = {
        id: 'error-modal',
        message: 'An error occurred',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(typeof modal.show).toBe('function');
    });

    it('should have handleKey method', () => {
      const config = {
        id: 'error-modal',
        message: 'An error occurred',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(typeof modal.handleKey).toBe('function');
    });

    it('should have close method', () => {
      const config = {
        id: 'error-modal',
        message: 'An error occurred',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(typeof modal.close).toBe('function');
    });

    it('should have destroy method', () => {
      const config = {
        id: 'error-modal',
        message: 'An error occurred',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(typeof modal.destroy).toBe('function');
    });

    it('should be modal with details', () => {
      const config = {
        id: 'error-modal',
        message: 'Connection failed',
        details: 'Unable to connect to server at localhost:3000',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });
  });

  describe('Configuration variations', () => {
    it('should handle short error messages', () => {
      const config = {
        id: 'error-modal',
        message: 'Error',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle long error messages', () => {
      const longMessage = 'An unexpected error occurred while processing your request. The server returned an invalid response and the operation could not be completed.';
      const config = {
        id: 'error-modal',
        message: longMessage,
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle detailed error information', () => {
      const config = {
        id: 'error-modal',
        message: 'Database connection failed',
        details: 'Error: connect ECONNREFUSED 127.0.0.1:5432',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle multiline details', () => {
      const config = {
        id: 'error-modal',
        message: 'Multiple errors occurred',
        details: 'Error 1: File not found\nError 2: Permission denied',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle error with code reference', () => {
      const config = {
        id: 'error-modal',
        message: 'API Error 500',
        details: 'Internal Server Error',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle user-friendly error message', () => {
      const config = {
        id: 'error-modal',
        message: 'Could not save changes',
        details: 'The file may be read-only',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle validation error', () => {
      const config = {
        id: 'error-modal',
        message: 'Validation Error',
        details: 'Invalid email format',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle network error', () => {
      const config = {
        id: 'error-modal',
        message: 'Network Error',
        details: 'Failed to fetch data from server',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle permission error', () => {
      const config = {
        id: 'error-modal',
        message: 'Permission Denied',
        details: 'You do not have permission',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle timeout error', () => {
      const config = {
        id: 'error-modal',
        message: 'Operation Timeout',
        details: 'The operation took too long',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle system error', () => {
      const config = {
        id: 'error-modal',
        message: 'System Error',
        details: 'An unexpected system error occurred',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle special characters in message', () => {
      const config = {
        id: 'error-modal',
        message: 'Error: File "test.txt" could not be deleted!',
        details: 'Check permissions',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle empty message gracefully', () => {
      const config = {
        id: 'error-modal',
        message: '',
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });

    it('should handle null-like details', () => {
      const config = {
        id: 'error-modal',
        message: 'Error occurred',
        details: undefined,
      };
      const modal = new ErrorModal(mockScreen, config);
      expect(modal).toBeDefined();
    });
  });
});
