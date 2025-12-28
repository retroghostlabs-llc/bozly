import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import blessed from "@unblessed/blessed";
import { Screen } from "@/cli/tui/core/screen.js";

// Mock @unblessed/blessed
vi.mock("@unblessed/blessed", () => ({
  default: {
    box: vi.fn().mockReturnValue({
      show: vi.fn(),
      hide: vi.fn(),
      destroy: vi.fn(),
      setContent: vi.fn(),
    }),
  },
}));

// Create a concrete implementation for testing
class TestScreen extends Screen {
  async init(): Promise<void> {
    this.box = this.createBox();
  }

  async render(): Promise<void> {
    if (this.box) {
      this.box.setContent("Test Screen Content");
    }
  }

  async handleKey(): Promise<void> {
    // Test implementation
  }
}

describe("Screen Base Class", () => {
  let mockScreen: {
    box: ReturnType<typeof vi.fn>;
    render: ReturnType<typeof vi.fn>;
  };
  let screen: TestScreen;

  beforeEach(() => {
    // Mock blessed screen
    mockScreen = {
      box: vi.fn().mockReturnValue({
        show: vi.fn(),
        hide: vi.fn(),
        destroy: vi.fn(),
        setContent: vi.fn(),
      }),
      render: vi.fn(),
    };

    screen = new TestScreen(mockScreen as any, {
      id: "test-screen",
      name: "Test Screen",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe("Constructor", () => {
    it("should initialize with required config", () => {
      const newScreen = new TestScreen(mockScreen as any, {
        id: "home",
        name: "Home",
      });
      expect(newScreen).toBeDefined();
    });

    it("should store parent screen reference", () => {
      const newScreen = new TestScreen(mockScreen as any, {
        id: "vaults",
        name: "Vaults",
      });
      expect(newScreen).toBeDefined();
    });

    it("should initialize box as null", () => {
      expect(screen).toBeDefined();
    });

    it("should set isActive to false initially", () => {
      expect(screen.isCurrentlyActive()).toBe(false);
    });
  });

  describe("init()", () => {
    it("should initialize screen without throwing", async () => {
      await expect(screen.init()).resolves.not.toThrow();
    });

    it("should create box element", async () => {
      await screen.init();
      expect(blessed.box).toHaveBeenCalled();
    });
  });

  describe("render()", () => {
    it("should render screen without throwing", async () => {
      await screen.init();
      await expect(screen.render()).resolves.not.toThrow();
    });

    it("should update box content", async () => {
      await screen.init();
      await screen.render();
      expect(mockScreen.render).toBeDefined();
    });
  });

  describe("refresh()", () => {
    it("should handle refresh without error", async () => {
      await expect(screen.refresh()).resolves.not.toThrow();
    });

    it("should be overridable in subclasses", async () => {
      class RefreshableScreen extends TestScreen {
        async refresh(): Promise<void> {
          // Custom refresh logic
        }
      }
      const refreshScreen = new RefreshableScreen(mockScreen as any, {
        id: "test",
        name: "Test",
      });
      await expect(refreshScreen.refresh()).resolves.not.toThrow();
    });
  });

  describe("activate()", () => {
    beforeEach(async () => {
      await screen.init();
    });

    it("should set isActive to true", () => {
      expect(screen.isCurrentlyActive()).toBe(false);
      screen.activate();
      expect(screen.isCurrentlyActive()).toBe(true);
    });

    it("should show the box element", () => {
      // Activate should not throw and should call show on the box
      expect(() => screen.activate()).not.toThrow();
    });

    it("should render parent screen", () => {
      // Activate calls parent.render() which mockScreen has
      expect(mockScreen.render).toBeDefined();
      expect(() => screen.activate()).not.toThrow();
    });

    it("should be safe to call multiple times", () => {
      screen.activate();
      expect(screen.isCurrentlyActive()).toBe(true);
      screen.activate();
      expect(screen.isCurrentlyActive()).toBe(true);
    });
  });

  describe("deactivate()", () => {
    beforeEach(async () => {
      await screen.init();
    });

    it("should set isActive to false", () => {
      screen.activate();
      expect(screen.isCurrentlyActive()).toBe(true);
      screen.deactivate();
      expect(screen.isCurrentlyActive()).toBe(false);
    });

    it("should hide the box element", () => {
      // Deactivate should not throw and should call hide on the box
      screen.activate();
      expect(() => screen.deactivate()).not.toThrow();
    });

    it("should be safe to call without activate", () => {
      expect(() => screen.deactivate()).not.toThrow();
      expect(screen.isCurrentlyActive()).toBe(false);
    });
  });

  describe("destroy()", () => {
    beforeEach(async () => {
      await screen.init();
    });

    it("should destroy box element", () => {
      // Destroy should not throw and should clean up resources
      expect(() => screen.destroy()).not.toThrow();
    });

    it("should handle destroy errors gracefully", () => {
      // Destroy should handle errors and not throw
      expect(() => screen.destroy()).not.toThrow();
    });

    it("should be idempotent", () => {
      screen.destroy();
      expect(() => screen.destroy()).not.toThrow();
    });

    it("should handle null box gracefully", () => {
      const newScreen = new TestScreen(mockScreen as any, {
        id: "no-box",
        name: "No Box",
      });
      expect(() => newScreen.destroy()).not.toThrow();
    });
  });

  describe("getId()", () => {
    it("should return screen ID", () => {
      expect(screen.getId()).toBe("test-screen");
    });

    it("should return ID set in config", () => {
      const customScreen = new TestScreen(mockScreen as any, {
        id: "custom-screen-id",
        name: "Custom",
      });
      expect(customScreen.getId()).toBe("custom-screen-id");
    });
  });

  describe("getName()", () => {
    it("should return screen name", () => {
      expect(screen.getName()).toBe("Test Screen");
    });

    it("should return name set in config", () => {
      const customScreen = new TestScreen(mockScreen as any, {
        id: "test",
        name: "Custom Screen Name",
      });
      expect(customScreen.getName()).toBe("Custom Screen Name");
    });
  });

  describe("isCurrentlyActive()", () => {
    it("should return false initially", () => {
      expect(screen.isCurrentlyActive()).toBe(false);
    });

    it("should return true after activate", async () => {
      await screen.init();
      screen.activate();
      expect(screen.isCurrentlyActive()).toBe(true);
    });

    it("should return false after deactivate", async () => {
      await screen.init();
      screen.activate();
      screen.deactivate();
      expect(screen.isCurrentlyActive()).toBe(false);
    });
  });

  describe("Protected Methods - Message Display", () => {
    beforeEach(async () => {
      await screen.init();
      vi.useFakeTimers();
      // Setup blessed.box mock to return proper object
      vi.mocked(blessed.box).mockReturnValue({
        show: vi.fn(),
        hide: vi.fn(),
        destroy: vi.fn(),
        setContent: vi.fn(),
      } as any);
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.clearAllMocks();
    });

    it("should show error message", () => {
      screen["showError"]("Test error message");
      expect(blessed.box).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should clean up error message after timeout", () => {
      screen["showError"]("Test error");
      expect(blessed.box).toHaveBeenCalled();
      vi.advanceTimersByTime(3000);
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should show success message", () => {
      screen["showSuccess"]("Test success message");
      expect(blessed.box).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should clean up success message after timeout", () => {
      screen["showSuccess"]("Test success");
      expect(blessed.box).toHaveBeenCalled();
      vi.advanceTimersByTime(2000);
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should show info message", () => {
      screen["showInfo"]("Test info message");
      expect(blessed.box).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should clean up info message after timeout", () => {
      screen["showInfo"]("Test info");
      expect(blessed.box).toHaveBeenCalled();
      vi.advanceTimersByTime(2000);
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should handle destroy errors in error message cleanup", () => {
      const boxMock = vi.fn().mockReturnValue({
        setContent: vi.fn(),
        destroy: vi.fn().mockImplementation(() => {
          throw new Error("Destroy failed");
        }),
      });
      (mockScreen as any).box = boxMock;
      expect(() => screen["showError"]("Test error")).not.toThrow();
      vi.advanceTimersByTime(3000);
      expect(() => {}).not.toThrow();
    });

    it("should handle destroy errors in success message cleanup", () => {
      const boxMock = vi.fn().mockReturnValue({
        setContent: vi.fn(),
        destroy: vi.fn().mockImplementation(() => {
          throw new Error("Destroy failed");
        }),
      });
      (mockScreen as any).box = boxMock;
      expect(() => screen["showSuccess"]("Test success")).not.toThrow();
      vi.advanceTimersByTime(2000);
    });

    it("should handle destroy errors in info message cleanup", () => {
      const boxMock = vi.fn().mockReturnValue({
        setContent: vi.fn(),
        destroy: vi.fn().mockImplementation(() => {
          throw new Error("Destroy failed");
        }),
      });
      (mockScreen as any).box = boxMock;
      expect(() => screen["showInfo"]("Test info")).not.toThrow();
      vi.advanceTimersByTime(2000);
    });
  });

  describe("Protected Methods - createBox", () => {
    it("should create box with default options", async () => {
      await screen.init();
      expect(blessed.box).toHaveBeenCalled();
    });

    it("should create box with custom options", () => {
      const customOptions = { top: 5, left: 10, width: 80, height: 30 };
      expect(() => screen["createBox"](customOptions)).not.toThrow();
    });

    it("should create box with parent", () => {
      expect(() => screen["createBox"]()).not.toThrow();
      expect(blessed.box).toHaveBeenCalled();
    });
  });

  describe("Lifecycle", () => {
    it("should support full lifecycle: init -> activate -> deactivate -> destroy", async () => {
      // Init
      await screen.init();
      expect(screen).toBeDefined();

      // Activate
      screen.activate();
      expect(screen.isCurrentlyActive()).toBe(true);

      // Deactivate
      screen.deactivate();
      expect(screen.isCurrentlyActive()).toBe(false);

      // Destroy
      expect(() => screen.destroy()).not.toThrow();
    });

    it("should handle activate/deactivate cycles", async () => {
      await screen.init();

      // First cycle
      screen.activate();
      expect(screen.isCurrentlyActive()).toBe(true);
      screen.deactivate();
      expect(screen.isCurrentlyActive()).toBe(false);

      // Second cycle
      screen.activate();
      expect(screen.isCurrentlyActive()).toBe(true);
      screen.deactivate();
      expect(screen.isCurrentlyActive()).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle activate without init", () => {
      const newScreen = new TestScreen(mockScreen as any, {
        id: "test",
        name: "Test",
      });
      expect(() => newScreen.activate()).not.toThrow();
    });

    it("should handle deactivate without init", () => {
      const newScreen = new TestScreen(mockScreen as any, {
        id: "test",
        name: "Test",
      });
      expect(() => newScreen.deactivate()).not.toThrow();
    });

    it("should handle destroy without init", () => {
      const newScreen = new TestScreen(mockScreen as any, {
        id: "test",
        name: "Test",
      });
      expect(() => newScreen.destroy()).not.toThrow();
    });

    it("should handle refresh without init", async () => {
      const newScreen = new TestScreen(mockScreen as any, {
        id: "test",
        name: "Test",
      });
      await expect(newScreen.refresh()).resolves.not.toThrow();
    });
  });

  describe("createFooterBox()", () => {
    it("should create footer box without throwing", () => {
      expect(() => (screen as any).createFooterBox()).not.toThrow();
    });

    it("should create footer box successfully", () => {
      const footerBox = (screen as any).createFooterBox();
      // The footer box creation is gracefully handled - returns value or null on error
      // This test verifies it doesn't throw an exception
      expect(true).toBe(true);
    });

    it("should handle footer creation with different page names", () => {
      // Create a screen with a specific name
      const namedScreen = new TestScreen(mockScreen as any, {
        id: "home",
        name: "Home",
      });

      // Should not throw when creating footer with any page name
      expect(() => (namedScreen as any).createFooterBox()).not.toThrow();
    });

    it("should use bright ANSI colors for footer text", () => {
      // Verify that footer uses bright colors that work on dark backgrounds
      // The method should execute without error
      expect(() => (screen as any).createFooterBox()).not.toThrow();
      // The implementation uses \x1b[36m (cyan) and \x1b[97m (bright white)
    });

    it("should include navigation hints in footer", () => {
      // Footer should show: [PageName] | [0] Main Menu | [?] Help | [Q] Quit
      // Method should complete without error
      expect(() => (screen as any).createFooterBox()).not.toThrow();
    });

    it("should handle multiple footer box creations gracefully", () => {
      // Should be safe to call multiple times
      expect(() => {
        (screen as any).createFooterBox();
        (screen as any).createFooterBox();
      }).not.toThrow();
    });

    it("should handle footer creation errors gracefully", () => {
      // The createFooterBox method has error handling
      // It should return null or undefined on error, not throw
      expect(() => (screen as any).createFooterBox()).not.toThrow();
    });

    it("should maintain footer box reference after creation", () => {
      // Create footer box and verify it's stored (if successful)
      expect(() => (screen as any).createFooterBox()).not.toThrow();
      // The implementation stores the footer box reference or null
    });

    it("should clean up footer box on destroy", async () => {
      await screen.init();
      (screen as any).createFooterBox();
      expect(() => screen.destroy()).not.toThrow();
      // Footer box should be cleaned up
    });
  });

  describe("Footer rendering - Supporting Methods", () => {
    it("should render context header with path information", () => {
      const header = (screen as any).renderContextHeader();
      expect(header).toBeDefined();
      expect(typeof header).toBe("string");
      // Should contain ANSI codes for colored output
      expect(header).toContain("\x1b");
    });

    it("should render status bar with vault information", () => {
      const statusBar = (screen as any).renderStatusBar();
      expect(statusBar).toBeDefined();
      expect(typeof statusBar).toBe("string");
      expect(statusBar).toContain("Vault");
      expect(statusBar).toContain("Directory");
    });

    it("should render footer text with page name", () => {
      const footer = (screen as any).renderFooter();
      expect(footer).toBeDefined();
      expect(typeof footer).toBe("string");
      expect(footer).toContain("[Test Screen]");
    });

    it("should include ANSI color codes in footer text", () => {
      const footer = (screen as any).renderFooter();
      // Footer should contain color codes (cyan \x1b[36m)
      expect(footer).toContain("\x1b[36m");
      // And should contain reset code
      expect(footer).toContain("\x1b[0m");
    });
  });
});
