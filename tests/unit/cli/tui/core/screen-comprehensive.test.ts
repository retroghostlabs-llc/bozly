import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import blessed from "blessed";
import { Screen } from "@/cli/tui/core/screen.js";

// Mock blessed
vi.mock("blessed");

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
      expect(mockScreen.box).toHaveBeenCalled();
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
      const boxMock = mockScreen.box.mock.results[0].value;
      screen.activate();
      expect(boxMock.show).toHaveBeenCalled();
    });

    it("should render parent screen", () => {
      const initialRenderCalls = mockScreen.render.mock.calls.length;
      screen.activate();
      expect(mockScreen.render.mock.calls.length).toBeGreaterThan(initialRenderCalls);
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
      const boxMock = mockScreen.box.mock.results[0].value;
      screen.activate();
      screen.deactivate();
      expect(boxMock.hide).toHaveBeenCalled();
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
      const boxMock = mockScreen.box.mock.results[0].value;
      screen.destroy();
      expect(boxMock.destroy).toHaveBeenCalled();
    });

    it("should handle destroy errors gracefully", () => {
      const boxMock = mockScreen.box.mock.results[0].value;
      boxMock.destroy.mockImplementation(() => {
        throw new Error("Destroy failed");
      });
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
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should show error message", () => {
      screen["showError"]("Test error message");
      expect(mockScreen.box).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should clean up error message after timeout", () => {
      screen["showError"]("Test error");
      expect(mockScreen.box).toHaveBeenCalled();
      vi.advanceTimersByTime(3000);
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should show success message", () => {
      screen["showSuccess"]("Test success message");
      expect(mockScreen.box).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should clean up success message after timeout", () => {
      screen["showSuccess"]("Test success");
      expect(mockScreen.box).toHaveBeenCalled();
      vi.advanceTimersByTime(2000);
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should show info message", () => {
      screen["showInfo"]("Test info message");
      expect(mockScreen.box).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should clean up info message after timeout", () => {
      screen["showInfo"]("Test info");
      expect(mockScreen.box).toHaveBeenCalled();
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
      expect(mockScreen.box).toHaveBeenCalled();
    });

    it("should create box with custom options", () => {
      const customOptions = { top: 5, left: 10, width: 80, height: 30 };
      const boxElement = screen["createBox"](customOptions);
      expect(boxElement).toBeDefined();
    });

    it("should create box with parent", () => {
      const boxElement = screen["createBox"]();
      expect(boxElement).toBeDefined();
      expect(mockScreen.box).toHaveBeenCalled();
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
});
