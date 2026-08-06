// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FilterPanel } from "../../src/hud/FilterPanel";

describe("hud/FilterPanel", () => {
  let panel: FilterPanel;
  let settingsButton: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    settingsButton = document.createElement("button");
    settingsButton.className = "hud-btn--settings";
    document.body.appendChild(settingsButton);

    const rect = {
      top: 500,
      bottom: 540,
      left: 300,
      right: 340,
      width: 40,
      height: 40,
    };
    vi.spyOn(settingsButton, "getBoundingClientRect").mockReturnValue(rect as DOMRect);

    panel = new FilterPanel(60, 1);
  });

  afterEach(() => {
    panel.destroy();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("DOM structure", () => {
    it("creates correct structure with sections, stepper, divider, and repel slider", () => {
      panel.attachTo(settingsButton);
      const root = panel.getRoot();

      const numbersSection = root.querySelector('[data-filter-section="numbers"]');
      expect(numbersSection).not.toBeNull();

      const label = numbersSection?.querySelector(".filter-panel__label");
      expect(label?.textContent).toBe("Numbers");

      const stepper = root.querySelector(".filter-panel__stepper");
      expect(stepper).not.toBeNull();

      const decBtn = root.querySelector('[data-filter-qty="dec"]');
      const incBtn = root.querySelector('[data-filter-qty="inc"]');
      const qtyValue = root.querySelector("[data-filter-qty-value]");
      expect(decBtn).not.toBeNull();
      expect(incBtn).not.toBeNull();
      expect(qtyValue).not.toBeNull();
      expect(qtyValue?.textContent?.trim()).toBe("60");

      const divider = root.querySelector(".filter-panel__divider");
      expect(divider).not.toBeNull();

      const repelSection = root.querySelector('[data-filter-section="repel"]');
      expect(repelSection).not.toBeNull();

      const repelLabel = repelSection?.querySelector(".filter-panel__label");
      expect(repelLabel?.textContent).toBe("Repel");

      const repelInput = root.querySelector<HTMLInputElement>("[data-filter-repel]");
      expect(repelInput).not.toBeNull();
      expect(repelInput?.type).toBe("range");
      expect(repelInput?.min).toBe("0");
      expect(repelInput?.max).toBe("2");
      expect(repelInput?.step).toBe("0.05");
    });
  });

  describe("Quantity stepper", () => {
    it("increments quantity by step (10)", () => {
      panel.attachTo(settingsButton);
      const cb = vi.fn();
      panel.onQuantityChange(cb);

      const incBtn = panel.getRoot().querySelector<HTMLButtonElement>('[data-filter-qty="inc"]');
      incBtn?.click();

      expect(cb).toHaveBeenCalledWith(70);
      expect(panel.getQuantity()).toBe(70);
    });

    it("decrements quantity by step (10)", () => {
      panel.attachTo(settingsButton);
      const cb = vi.fn();
      panel.onQuantityChange(cb);

      const decBtn = panel.getRoot().querySelector<HTMLButtonElement>('[data-filter-qty="dec"]');
      decBtn?.click();

      expect(cb).toHaveBeenCalledWith(50);
      expect(panel.getQuantity()).toBe(50);
    });

    it("respects minimum bound (10)", () => {
      panel = new FilterPanel(10, 1);
      panel.attachTo(settingsButton);
      const cb = vi.fn();
      panel.onQuantityChange(cb);

      const decBtn = panel.getRoot().querySelector<HTMLButtonElement>('[data-filter-qty="dec"]');
      decBtn?.click();

      expect(cb).not.toHaveBeenCalled();
      expect(panel.getQuantity()).toBe(10);
    });

    it("respects maximum bound (500)", () => {
      panel = new FilterPanel(500, 1);
      panel.attachTo(settingsButton);
      const cb = vi.fn();
      panel.onQuantityChange(cb);

      const incBtn = panel.getRoot().querySelector<HTMLButtonElement>('[data-filter-qty="inc"]');
      incBtn?.click();

      expect(cb).not.toHaveBeenCalled();
      expect(panel.getQuantity()).toBe(500);
    });

    it("updates display value", () => {
      panel.attachTo(settingsButton);
      const incBtn = panel.getRoot().querySelector<HTMLButtonElement>('[data-filter-qty="inc"]');
      incBtn?.click();

      const qtyValue = panel.getRoot().querySelector("[data-filter-qty-value]");
      expect(qtyValue?.textContent?.trim()).toBe("70");
    });
  });

  describe("Repel slider", () => {
    it("emits change events with correct value", () => {
      panel.attachTo(settingsButton);
      const cb = vi.fn();
      panel.onRepelChange(cb);

      const repelInput = panel.getRoot().querySelector<HTMLInputElement>("[data-filter-repel]");
      repelInput!.value = "1.5";
      repelInput?.dispatchEvent(new Event("input", { bubbles: true }));

      expect(cb).toHaveBeenCalledWith(1.5);
    });

    it("clamps value to [0, 2] range", () => {
      panel.attachTo(settingsButton);
      const cb = vi.fn();
      panel.onRepelChange(cb);

      const repelInput = panel.getRoot().querySelector<HTMLInputElement>("[data-filter-repel]");

      repelInput!.value = "3";
      repelInput?.dispatchEvent(new Event("input", { bubbles: true }));
      expect(cb).toHaveBeenLastCalledWith(2);

      repelInput!.value = "-1";
      repelInput?.dispatchEvent(new Event("input", { bubbles: true }));
      expect(cb).toHaveBeenLastCalledWith(0);
    });
  });

  describe("Bug Mode toggle", () => {
    it("creates a bug-mode section with a toggle input, unchecked by default", () => {
      panel.attachTo(settingsButton);
      const root = panel.getRoot();

      const section = root.querySelector('[data-filter-section="bug-mode"]');
      expect(section).not.toBeNull();

      const label = section?.querySelector(".filter-panel__label");
      expect(label?.textContent).toBe("Bug Mode");

      const toggleInput = root.querySelector<HTMLInputElement>("[data-filter-bug-mode]");
      expect(toggleInput).not.toBeNull();
      expect(toggleInput?.type).toBe("checkbox");
      expect(toggleInput?.checked).toBe(false);
    });

    it("fires the bug mode toggle callback when checked", () => {
      panel.attachTo(settingsButton);
      const cb = vi.fn();
      panel.onBugModeToggle(cb);

      const toggleInput = panel.getRoot().querySelector<HTMLInputElement>("[data-filter-bug-mode]");
      toggleInput!.checked = true;
      toggleInput?.dispatchEvent(new Event("change", { bubbles: true }));

      expect(cb).toHaveBeenCalledWith(true);
    });

    it("fires the bug mode toggle callback when unchecked", () => {
      panel.attachTo(settingsButton);
      const cb = vi.fn();
      panel.onBugModeToggle(cb);

      const toggleInput = panel.getRoot().querySelector<HTMLInputElement>("[data-filter-bug-mode]");
      toggleInput!.checked = true;
      toggleInput?.dispatchEvent(new Event("change", { bubbles: true }));
      toggleInput!.checked = false;
      toggleInput?.dispatchEvent(new Event("change", { bubbles: true }));

      expect(cb).toHaveBeenNthCalledWith(1, true);
      expect(cb).toHaveBeenNthCalledWith(2, false);
    });

    it("isBugModeActive reflects current state", () => {
      panel.attachTo(settingsButton);
      expect(panel.isBugModeActive()).toBe(false);

      const toggleInput = panel.getRoot().querySelector<HTMLInputElement>("[data-filter-bug-mode]");
      toggleInput!.checked = true;
      toggleInput?.dispatchEvent(new Event("change", { bubbles: true }));

      expect(panel.isBugModeActive()).toBe(true);
    });
  });

  describe("Open/Close/Toggle", () => {
    it("open() shows the panel", () => {
      panel.attachTo(settingsButton);
      panel.open();

      const root = panel.getRoot();
      expect(root.style.display).toBe("block");
    });

    it("close() hides the panel", () => {
      panel.attachTo(settingsButton);
      panel.open();
      panel.close();

      const root = panel.getRoot();
      expect(root.style.display).toBe("none");
    });

    it("toggle() switches between open and closed states", () => {
      panel.attachTo(settingsButton);

      panel.toggle();
      expect(panel.getRoot().style.display).toBe("block");

      panel.toggle();
      expect(panel.getRoot().style.display).toBe("none");
    });

    it("open() is idempotent", () => {
      panel.attachTo(settingsButton);
      panel.open();
      panel.open();

      expect(panel.getRoot().style.display).toBe("block");
    });

    it("close() is idempotent", () => {
      panel.attachTo(settingsButton);
      panel.close();
      panel.close();

      expect(panel.getRoot().style.display).toBe("none");
    });
  });

  describe("Positioning", () => {
    it("positions panel above the settings button", () => {
      panel.attachTo(settingsButton);
      panel.open();

      const root = panel.getRoot();
      const top = Number.parseFloat(root.style.top);
      const left = Number.parseFloat(root.style.left);

      expect(top).toBeLessThan(500);
      expect(left).toBeGreaterThan(0);
    });

    it("adjusts position if too close to viewport top", () => {
      const rect = {
        top: 50,
        bottom: 90,
        left: 300,
        right: 340,
        width: 40,
        height: 40,
      };
      vi.spyOn(settingsButton, "getBoundingClientRect").mockReturnValue(rect as DOMRect);

      panel.attachTo(settingsButton);
      panel.open();

      const root = panel.getRoot();
      const top = Number.parseFloat(root.style.top);

      expect(top).toBeGreaterThanOrEqual(8);
    });

    it("adjusts position if too close to viewport edges", () => {
      const rect = {
        top: 500,
        bottom: 540,
        left: 10,
        right: 50,
        width: 40,
        height: 40,
      };
      vi.spyOn(settingsButton, "getBoundingClientRect").mockReturnValue(rect as DOMRect);

      panel.attachTo(settingsButton);
      panel.open();

      const root = panel.getRoot();
      const left = Number.parseFloat(root.style.left);

      expect(left).toBeGreaterThanOrEqual(8);
    });
  });

  describe("Outside click", () => {
    it("closes panel when clicking outside", () => {
      panel.attachTo(settingsButton);
      panel.open();

      const outsideElement = document.createElement("div");
      document.body.appendChild(outsideElement);

      outsideElement.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(panel.getRoot().style.display).toBe("none");
    });

    it("does not close when clicking inside panel", () => {
      panel.attachTo(settingsButton);
      panel.open();

      const root = panel.getRoot();
      root.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(root.style.display).toBe("block");
    });

    it("does not close when clicking settings button", () => {
      panel.attachTo(settingsButton);
      panel.open();

      settingsButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(panel.getRoot().style.display).toBe("block");
    });
  });

  describe("Escape key", () => {
    it("closes panel when Escape is pressed", () => {
      panel.attachTo(settingsButton);
      panel.open();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(panel.getRoot().style.display).toBe("none");
    });

    it("does not close on other keys", () => {
      panel.attachTo(settingsButton);
      panel.open();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(panel.getRoot().style.display).toBe("block");
    });
  });

  describe("setQuantity", () => {
    it("updates quantity and display", () => {
      panel.attachTo(settingsButton);
      panel.setQuantity(100);

      expect(panel.getQuantity()).toBe(100);
      const qtyValue = panel.getRoot().querySelector("[data-filter-qty-value]");
      expect(qtyValue?.textContent?.trim()).toBe("100");
    });

    it("rounds to nearest step", () => {
      panel.attachTo(settingsButton);
      panel.setQuantity(95);

      expect(panel.getQuantity()).toBe(100);
    });

    it("clamps to minimum", () => {
      panel.attachTo(settingsButton);
      panel.setQuantity(5);

      expect(panel.getQuantity()).toBe(10);
    });

    it("clamps to maximum", () => {
      panel.attachTo(settingsButton);
      panel.setQuantity(600);

      expect(panel.getQuantity()).toBe(500);
    });
  });

  describe("setRepel", () => {
    it("updates repel value and input", () => {
      panel.attachTo(settingsButton);
      panel.setRepel(1.5);

      expect(panel.getRepel()).toBe(1.5);
      const repelInput = panel.getRoot().querySelector<HTMLInputElement>("[data-filter-repel]");
      expect(repelInput?.value).toBe("1.5");
    });

    it("clamps to range", () => {
      panel.attachTo(settingsButton);
      panel.setRepel(3);

      expect(panel.getRepel()).toBe(2);

      panel.setRepel(-1);
      expect(panel.getRepel()).toBe(0);
    });
  });

  describe("destroy", () => {
    it("removes panel from DOM and cleans up listeners", () => {
      panel.attachTo(settingsButton);
      panel.open();

      panel.destroy();

      expect(document.querySelector(".filter-panel-popover")).toBeNull();
    });
  });
});
