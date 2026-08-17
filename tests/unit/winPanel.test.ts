// tests/unit/winPanel.test.ts
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WinPanel } from "../../src/hud/WinPanel";
import { WIN_COPY_VARIANTS } from "../../src/hud/winCopy";

describe("hud/WinPanel", () => {
  let panel: WinPanel;

  beforeEach(() => {
    document.body.innerHTML = "";
    panel = new WinPanel();
  });

  afterEach(() => {
    panel.destroy();
    document.body.innerHTML = "";
  });

  it("mounts hidden after attachTo", () => {
    panel.attachTo(document.body);
    const root = panel.getRoot();
    expect(root.classList.contains("win-panel-overlay")).toBe(true);
    expect(root.classList.contains("open")).toBe(false);
    expect(panel.isPanelOpen()).toBe(false);
    expect(document.body.contains(root)).toBe(true);
  });

  it("destroy() removes the overlay from the DOM", () => {
    panel.attachTo(document.body);
    const root = panel.getRoot();
    expect(document.body.contains(root)).toBe(true);
    panel.destroy();
    expect(document.body.contains(root)).toBe(false);
  });

  it("show() with an explicit variant renders that title and copy, and opens", () => {
    panel.attachTo(document.body);
    const variant = WIN_COPY_VARIANTS[2]!;
    panel.show(variant);

    expect(panel.isPanelOpen()).toBe(true);
    expect(panel.getRoot().classList.contains("open")).toBe(true);
    expect(panel.getRoot().querySelector(".win-panel-title")?.textContent).toBe(variant.title);
    expect(panel.getRoot().querySelector(".win-panel-copy")?.textContent).toBe(variant.copy);
  });

  it("show() with no argument renders one of the known variants", () => {
    panel.attachTo(document.body);
    panel.show();
    const titleText = panel.getRoot().querySelector(".win-panel-title")?.textContent;
    expect(WIN_COPY_VARIANTS.map((v) => v.title)).toContain(titleText);
  });

  it("close button hides the panel", () => {
    panel.attachTo(document.body);
    panel.show(WIN_COPY_VARIANTS[0]!);
    const closeBtn = panel.getRoot().querySelector<HTMLButtonElement>(".win-panel-close");
    expect(closeBtn).not.toBeNull();
    closeBtn?.click();
    expect(panel.isPanelOpen()).toBe(false);
    expect(panel.getRoot().classList.contains("open")).toBe(false);
  });

  it("clicking outside on the overlay backdrop hides the panel", () => {
    panel.attachTo(document.body);
    panel.show(WIN_COPY_VARIANTS[0]!);
    panel.getRoot().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(panel.isPanelOpen()).toBe(false);
  });

  it("clicking inside the panel does not hide it", () => {
    panel.attachTo(document.body);
    panel.show(WIN_COPY_VARIANTS[0]!);
    const header = panel.getRoot().querySelector(".win-panel-header");
    header?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(panel.isPanelOpen()).toBe(true);
  });

  it("hide() is a no-op when already closed", () => {
    panel.attachTo(document.body);
    expect(() => panel.hide()).not.toThrow();
    expect(panel.isPanelOpen()).toBe(false);
  });

  it("clicking next-sticker fires the registered callback and closes the panel", () => {
    panel.attachTo(document.body);
    panel.show(WIN_COPY_VARIANTS[0]!);

    let called = 0;
    panel.onNextSticker(() => {
      called += 1;
    });

    const btn = panel.getRoot().querySelector<HTMLButtonElement>(".win-panel-next-btn");
    expect(btn).not.toBeNull();
    btn?.click();

    expect(called).toBe(1);
    expect(panel.isPanelOpen()).toBe(false);
  });

  it("clicking next-sticker before onNextSticker is registered does not throw", () => {
    panel.attachTo(document.body);
    panel.show(WIN_COPY_VARIANTS[0]!);
    const btn = panel.getRoot().querySelector<HTMLButtonElement>(".win-panel-next-btn");
    expect(() => btn?.click()).not.toThrow();
  });

  describe("onOpenChange", () => {
    it("show() fires onOpenChange(true)", () => {
      panel.attachTo(document.body);
      const cb = vi.fn();
      panel.onOpenChange(cb);
      panel.show(WIN_COPY_VARIANTS[0]!);
      expect(cb).toHaveBeenCalledWith(true);
    });

    it("hide() fires onOpenChange(false) when actually open", () => {
      panel.attachTo(document.body);
      panel.show(WIN_COPY_VARIANTS[0]!);
      const cb = vi.fn();
      panel.onOpenChange(cb);
      panel.hide();
      expect(cb).toHaveBeenCalledWith(false);
    });

    it("hide() when already closed does not fire the callback", () => {
      panel.attachTo(document.body);
      const cb = vi.fn();
      panel.onOpenChange(cb);
      panel.hide();
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe("share row", () => {
    it("renders WhatsApp, Facebook, and Instagram icon buttons when navigator.share is unavailable", () => {
      panel.attachTo(document.body);
      panel.show(WIN_COPY_VARIANTS[0]!);
      const root = panel.getRoot();
      expect(root.querySelector(".win-panel-share-icon-btn--whatsapp")).not.toBeNull();
      expect(root.querySelector(".win-panel-share-icon-btn--facebook")).not.toBeNull();
      expect(root.querySelector(".win-panel-share-icon-btn--instagram")).not.toBeNull();
    });

    it("renders a Copy link button", () => {
      panel.attachTo(document.body);
      panel.show(WIN_COPY_VARIANTS[0]!);
      const btn = panel.getRoot().querySelector<HTMLButtonElement>(".win-panel-copy-link-btn");
      expect(btn).not.toBeNull();
      expect(btn?.textContent).toBe("Copy link");
    });

    it("Copy link writes the current URL to the clipboard and shows a toast", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

      panel.attachTo(document.body);
      panel.show(WIN_COPY_VARIANTS[0]!);
      const btn = panel.getRoot().querySelector<HTMLButtonElement>(".win-panel-copy-link-btn");
      btn?.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(writeText).toHaveBeenCalledWith(window.location.href);
      const toast = panel.getRoot().querySelector(".win-panel-toast");
      expect(toast?.classList.contains("visible")).toBe(true);
      expect(toast?.textContent).toBe("Link copied!");
    });
  });

  describe("auto-dismiss", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("hides itself automatically after 7 seconds", () => {
      panel.attachTo(document.body);
      panel.show(WIN_COPY_VARIANTS[0]!);
      expect(panel.isPanelOpen()).toBe(true);

      vi.advanceTimersByTime(6999);
      expect(panel.isPanelOpen()).toBe(true);

      vi.advanceTimersByTime(1);
      expect(panel.isPanelOpen()).toBe(false);
    });

    it("does not fire the auto-dismiss timer again after a manual close", () => {
      panel.attachTo(document.body);
      panel.show(WIN_COPY_VARIANTS[0]!);
      panel.hide();

      expect(() => vi.advanceTimersByTime(7000)).not.toThrow();
      expect(panel.isPanelOpen()).toBe(false);
    });

    it("restarts the timer on each show() call", () => {
      panel.attachTo(document.body);
      panel.show(WIN_COPY_VARIANTS[0]!);
      vi.advanceTimersByTime(5000);
      panel.show(WIN_COPY_VARIANTS[1]!);
      vi.advanceTimersByTime(5000);
      expect(panel.isPanelOpen()).toBe(true);
      vi.advanceTimersByTime(2000);
      expect(panel.isPanelOpen()).toBe(false);
    });

    it("fires the next-sticker callback when it auto-dismisses untouched", () => {
      panel.attachTo(document.body);
      panel.show(WIN_COPY_VARIANTS[0]!);

      let called = 0;
      panel.onNextSticker(() => {
        called += 1;
      });

      vi.advanceTimersByTime(7000);
      expect(called).toBe(1);
      expect(panel.isPanelOpen()).toBe(false);
    });

    it("does NOT fire the next-sticker callback when manually closed before the timer fires", () => {
      panel.attachTo(document.body);
      panel.show(WIN_COPY_VARIANTS[0]!);

      let called = 0;
      panel.onNextSticker(() => {
        called += 1;
      });

      panel.hide();
      vi.advanceTimersByTime(7000);
      expect(called).toBe(0);
    });
  });
});
