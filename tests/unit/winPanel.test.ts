// tests/unit/winPanel.test.ts
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
});
