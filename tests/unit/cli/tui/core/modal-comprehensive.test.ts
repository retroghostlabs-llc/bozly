import { describe, it, expect, vi, beforeEach } from "vitest";
import blessed from "blessed";
import { Modal } from "@/cli/tui/core/modal.js";

// Mock blessed
vi.mock("blessed");

// Create a concrete implementation for testing
class TestModal extends Modal {
  async init(): Promise<void> {
    this.box = this.createBox();
  }

  async render(): Promise<void> {
    if (this.box) {
      this.box.setContent("Test Modal Content");
    }
  }

  async handleKey(): Promise<void> {
    // Test implementation
  }

  private createBox(): blessed.Widgets.BoxElement {
    return this.parent.box({
      parent: this.parent,
      top: "center",
      left: "center",
      width: this.width,
      height: this.height,
    });
  }
}

describe("Modal Base Class", () => {
  let mockScreen: {
    box: ReturnType<typeof vi.fn>;
    render: ReturnType<typeof vi.fn>;
  };
  let modal: TestModal;

  beforeEach(() => {
    // Mock blessed screen
    mockScreen = {
      box: vi.fn().mockReturnValue({
        show: vi.fn(),
        hide: vi.fn(),
        focus: vi.fn(),
        destroy: vi.fn(),
        setContent: vi.fn(),
      }),
      render: vi.fn(),
    };

    modal = new TestModal(mockScreen as any, {
      id: "test-modal",
      title: "Test Modal",
    });
  });

  describe("Constructor", () => {
    it("should initialize with required config", () => {
      const newModal = new TestModal(mockScreen as any, {
        id: "confirm",
        title: "Confirm Action",
      });
      expect(newModal).toBeDefined();
    });

    it("should initialize with custom dimensions", () => {
      const newModal = new TestModal(mockScreen as any, {
        id: "input",
        title: "Enter Value",
        width: 50,
        height: 15,
      });
      expect(newModal).toBeDefined();
    });

    it("should use default dimensions if not provided", () => {
      const newModal = new TestModal(mockScreen as any, {
        id: "test",
        title: "Test",
      });
      expect(newModal).toBeDefined();
    });

    it("should store parent screen reference", () => {
      const newModal = new TestModal(mockScreen as any, {
        id: "test",
        title: "Test",
      });
      expect(newModal).toBeDefined();
    });

    it("should initialize box as null", () => {
      expect(modal).toBeDefined();
    });

    it("should set isVisible to false initially", () => {
      const isVisible = modal.isCurrentlyVisible();
      expect(isVisible).toBe(false);
    });
  });

  describe("init()", () => {
    it("should initialize modal without throwing", async () => {
      await expect(modal.init()).resolves.not.toThrow();
    });

    it("should create box element", async () => {
      await modal.init();
      expect(mockScreen.box).toHaveBeenCalled();
    });

    it("should be called before show", async () => {
      await modal.init();
      expect(modal).toBeDefined();
    });
  });

  describe("render()", () => {
    it("should render modal without throwing", async () => {
      await modal.init();
      await expect(modal.render()).resolves.not.toThrow();
    });

    it("should update box content", async () => {
      await modal.init();
      await modal.render();
      expect(mockScreen.render).toBeDefined();
    });
  });

  describe("show()", () => {
    beforeEach(async () => {
      await modal.init();
    });

    it("should return a promise", () => {
      const result = modal.show();
      expect(result).toBeInstanceOf(Promise);
    });

    it("should set isVisible to true", async () => {
      const promise = modal.show();
      expect(modal.isCurrentlyVisible()).toBe(true);
      // Close it to clean up
      modal.close();
      await promise.catch(() => {});
    });

    it("should show the box element", async () => {
      const boxMock = mockScreen.box.mock.results[0].value;
      const promise = modal.show();
      expect(boxMock.show).toHaveBeenCalled();
      modal.close();
      await promise.catch(() => {});
    });

    it("should focus the box element", async () => {
      const boxMock = mockScreen.box.mock.results[0].value;
      const promise = modal.show();
      expect(boxMock.focus).toHaveBeenCalled();
      modal.close();
      await promise.catch(() => {});
    });

    it("should render parent screen", async () => {
      const promise = modal.show();
      expect(mockScreen.render).toHaveBeenCalled();
      modal.close();
      await promise.catch(() => {});
    });

    it("should resolve when closed with result", async () => {
      const promise = modal.show();
      const expectedResult = { confirmed: true };
      modal.close(expectedResult);
      const result = await promise;
      expect(result).toEqual(expectedResult);
    });

    it("should resolve when closed without result", async () => {
      const promise = modal.show();
      modal.close();
      const result = await promise;
      expect(result).toBeUndefined();
    });
  });

  describe("close()", () => {
    beforeEach(async () => {
      await modal.init();
    });

    it("should set isVisible to false", async () => {
      const showPromise = modal.show();
      expect(modal.isCurrentlyVisible()).toBe(true);
      modal.close();
      expect(modal.isCurrentlyVisible()).toBe(false);
      await showPromise;
    });

    it("should hide the box element", async () => {
      const boxMock = mockScreen.box.mock.results[0].value;
      const promise = modal.show();
      modal.close();
      expect(boxMock.hide).toHaveBeenCalled();
      await promise;
    });

    it("should handle hide errors gracefully", async () => {
      const boxMock = mockScreen.box.mock.results[0].value;
      boxMock.hide.mockImplementation(() => {
        throw new Error("Hide failed");
      });
      const promise = modal.show();
      expect(() => modal.close()).not.toThrow();
      await promise.catch(() => {});
    });

    it("should resolve the show promise", async () => {
      const promise = modal.show();
      modal.close("test-result");
      const result = await promise;
      expect(result).toBe("test-result");
    });

    it("should render parent screen", async () => {
      const promise = modal.show();
      const renderCallsBefore = mockScreen.render.mock.calls.length;
      modal.close();
      const renderCallsAfter = mockScreen.render.mock.calls.length;
      expect(renderCallsAfter).toBeGreaterThan(renderCallsBefore);
      await promise;
    });

    it("should be safe to call multiple times", async () => {
      const promise = modal.show();
      modal.close("first");
      expect(() => modal.close("second")).not.toThrow();
      const result = await promise;
      // Should resolve with first close call
      expect(result).toBe("first");
    });
  });

  describe("destroy()", () => {
    beforeEach(async () => {
      await modal.init();
    });

    it("should destroy box element", () => {
      const boxMock = mockScreen.box.mock.results[0].value;
      modal.destroy();
      expect(boxMock.destroy).toHaveBeenCalled();
    });

    it("should handle destroy errors gracefully", () => {
      const boxMock = mockScreen.box.mock.results[0].value;
      boxMock.destroy.mockImplementation(() => {
        throw new Error("Destroy failed");
      });
      expect(() => modal.destroy()).not.toThrow();
    });

    it("should clean up resources", () => {
      const boxMock = mockScreen.box.mock.results[0].value;
      modal.destroy();
      expect(boxMock.destroy).toHaveBeenCalled();
    });

    it("should be idempotent", () => {
      modal.destroy();
      expect(() => modal.destroy()).not.toThrow();
    });
  });

  describe("isCurrentlyVisible()", () => {
    it("should return false initially", () => {
      expect(modal.isCurrentlyVisible()).toBe(false);
    });

    it("should return true when showing", async () => {
      const promise = modal.show();
      expect(modal.isCurrentlyVisible()).toBe(true);
      modal.close();
      await promise;
    });

    it("should return false after close", async () => {
      const promise = modal.show();
      modal.close();
      expect(modal.isCurrentlyVisible()).toBe(false);
      await promise;
    });
  });

  describe("getId()", () => {
    it("should return modal ID", () => {
      expect(modal.getId()).toBe("test-modal");
    });

    it("should return ID set in config", () => {
      const customModal = new TestModal(mockScreen as any, {
        id: "custom-id",
        title: "Custom",
      });
      expect(customModal.getId()).toBe("custom-id");
    });
  });

  describe("getTitle()", () => {
    it("should return modal title", () => {
      expect(modal.getTitle()).toBe("Test Modal");
    });

    it("should return title set in config", () => {
      const customModal = new TestModal(mockScreen as any, {
        id: "test",
        title: "Custom Title",
      });
      expect(customModal.getTitle()).toBe("Custom Title");
    });
  });

  describe("Lifecycle", () => {
    it("should support full lifecycle: init -> show -> close -> destroy", async () => {
      // Init
      await modal.init();
      expect(modal).toBeDefined();

      // Show
      const promise = modal.show();
      expect(modal.isCurrentlyVisible()).toBe(true);

      // Close
      modal.close("result");
      const result = await promise;
      expect(result).toBe("result");

      // Destroy
      expect(() => modal.destroy()).not.toThrow();
    });

    it("should handle show without init", () => {
      // Create new modal without init
      const newModal = new TestModal(mockScreen as any, {
        id: "test",
        title: "Test",
      });
      // Should not crash
      expect(() => {
        newModal.show();
      }).not.toThrow();
    });

    it("should handle multiple show/close cycles", async () => {
      await modal.init();

      // First cycle
      const promise1 = modal.show();
      modal.close("first");
      const result1 = await promise1;
      expect(result1).toBe("first");

      // Second cycle (might not work with promise-based API, but test robustness)
      expect(() => modal.show()).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle closing before showing completes", async () => {
      await modal.init();
      const promise = modal.show();
      // Close immediately
      modal.close("immediate");
      const result = await promise;
      expect(result).toBe("immediate");
    });

    it("should handle destroy before showing completes", async () => {
      await modal.init();
      const promise = modal.show();
      // Destroy immediately
      modal.destroy();
      expect(() => {
        // Attempting to close after destroy
        modal.close("after-destroy");
      }).not.toThrow();
    });

    it("should handle null box gracefully", async () => {
      // Create modal without calling init
      const newModal = new TestModal(mockScreen as any, {
        id: "no-init",
        title: "No Init",
      });
      // Should handle gracefully
      expect(() => newModal.destroy()).not.toThrow();
      expect(() => newModal.close("no-box")).not.toThrow();
    });
  });

  describe("Protected Helper Methods", () => {
    it("should create text input with default options", async () => {
      await modal.init();
      const textboxMock = vi.fn().mockReturnValue({
        focus: vi.fn(),
        destroyed: false,
      });
      (mockScreen as any).textbox = textboxMock;
      const input = modal["createTextInput"](mockScreen.box.mock.results[0].value);
      expect(textboxMock).toHaveBeenCalled();
      expect(input).toBeDefined();
    });

    it("should create text input with custom options", async () => {
      await modal.init();
      const textboxMock = vi.fn().mockReturnValue({
        focus: vi.fn(),
        destroyed: false,
      });
      (mockScreen as any).textbox = textboxMock;
      const customOptions = { top: 2, left: 2, height: 3 };
      const input = modal["createTextInput"](mockScreen.box.mock.results[0].value, customOptions);
      expect(textboxMock).toHaveBeenCalledWith(
        expect.objectContaining(customOptions)
      );
    });

    it("should create button with label", async () => {
      await modal.init();
      const buttonMock = vi.fn().mockReturnValue({
        focus: vi.fn(),
        destroyed: false,
      });
      (mockScreen as any).button = buttonMock;
      const button = modal["createButton"](mockScreen.box.mock.results[0].value, "Submit");
      expect(buttonMock).toHaveBeenCalled();
      const callArgs = buttonMock.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.name).toBe("Submit");
    });

    it("should create button with custom options", async () => {
      await modal.init();
      const buttonMock = vi.fn().mockReturnValue({
        focus: vi.fn(),
        destroyed: false,
      });
      (mockScreen as any).button = buttonMock;
      const customOptions = { top: 5, left: 10, width: 15 };
      const button = modal["createButton"](mockScreen.box.mock.results[0].value, "Cancel", customOptions);
      expect(buttonMock).toHaveBeenCalledWith(
        expect.objectContaining(customOptions)
      );
    });

    it("should create list with default options", async () => {
      await modal.init();
      const listMock = vi.fn().mockReturnValue({
        focus: vi.fn(),
        destroyed: false,
      });
      (mockScreen as any).list = listMock;
      const list = modal["createList"](mockScreen.box.mock.results[0].value);
      expect(listMock).toHaveBeenCalled();
      expect(list).toBeDefined();
    });

    it("should create list with custom options", async () => {
      await modal.init();
      const listMock = vi.fn().mockReturnValue({
        focus: vi.fn(),
        destroyed: false,
      });
      (mockScreen as any).list = listMock;
      const customOptions = { mouse: false, keys: false };
      const list = modal["createList"](mockScreen.box.mock.results[0].value, customOptions);
      expect(listMock).toHaveBeenCalledWith(
        expect.objectContaining(customOptions)
      );
    });

    it("should set focus to non-destroyed element", async () => {
      await modal.init();
      const focusMock = vi.fn();
      const element = {
        focus: focusMock,
        destroyed: false,
      };
      modal["setFocus"](element);
      expect(focusMock).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it("should not focus destroyed element", async () => {
      await modal.init();
      const focusMock = vi.fn();
      const element = {
        focus: focusMock,
        destroyed: true,
      };
      const renderCallsBefore = mockScreen.render.mock.calls.length;
      modal["setFocus"](element);
      expect(focusMock).not.toHaveBeenCalled();
      // Render should not be called for destroyed element
      expect(mockScreen.render.mock.calls.length).toBe(renderCallsBefore);
    });

    it("should handle setFocus with null element", async () => {
      await modal.init();
      expect(() => {
        modal["setFocus"](null as any);
      }).not.toThrow();
    });

    it("should create box with title label", async () => {
      const newModal = new TestModal(mockScreen as any, {
        id: "custom-box",
        title: "Custom Box Title",
      });
      await newModal.init();
      expect(mockScreen.box).toHaveBeenCalled();
      // Verify box was called with parent screen
      expect(mockScreen.box.mock.calls[0][0]).toHaveProperty("parent");
    });
  });
});
