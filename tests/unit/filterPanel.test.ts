// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FilterPanel } from "../../src/hud/FilterPanel";
import visualTokens from "../../src/config/visualTokens.json";

describe("hud/FilterPanel (Figma 139×170 glass satellite)", () => {
  let host: HTMLElement;
  let panel: FilterPanel;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.querySelector<HTMLElement>("#host")!;
    panel = new FilterPanel(host, {
      initialQuantity: 20,
      initialRepel: 1,
    });
  });
  afterEach(() => {
    panel.destroy();
    document.body.innerHTML = "";
  });

  it("mounts as a 139×170 glass satellite", () => {
    const root = host.querySelector<HTMLElement>(".filter-panel")!;
    expect(root).not.toBeNull();
    expect(Number(root.dataset.targetWidth)).toBe(visualTokens.ui.panel.filter.width);
    expect(Number(root.dataset.targetHeight)).toBe(visualTokens.ui.panel.filter.height);
    expect(visualTokens.ui.panel.filter.width).toBe(139);
    expect(visualTokens.ui.panel.filter.height).toBe(170);
  });

  it("quantity stepper has ± buttons and a numeric display", () => {
    const inc = host.querySelector<HTMLButtonElement>('[data-filter-qty="inc"]');
    const dec = host.querySelector<HTMLButtonElement>('[data-filter-qty="dec"]');
    const value = host.querySelector<HTMLElement>("[data-filter-qty-value]");
    expect(inc?.tagName).toBe("BUTTON");
    expect(dec?.tagName).toBe("BUTTON");
    expect(value?.textContent?.trim()).toBe("20");
  });

  it("repel is a native <input type=range> with a label", () => {
    const range = host.querySelector<HTMLInputElement>("[data-filter-repel]");
    expect(range).not.toBeNull();
    expect(range?.tagName).toBe("INPUT");
    expect(range?.type).toBe("range");
    const label = host.querySelector<HTMLLabelElement>("label[for]");
    expect(label).not.toBeNull();
    const id = range?.id;
    expect(id).toBeTruthy();
    expect(label?.htmlFor).toBe(id);
  });

  it("fires onQuantityChange on ± clicks", () => {
    const cb = vi.fn();
    panel.onQuantityChange(cb);
    host.querySelector<HTMLButtonElement>('[data-filter-qty="inc"]')!.click();
    expect(cb).toHaveBeenLastCalledWith(21);
    host.querySelector<HTMLButtonElement>('[data-filter-qty="dec"]')!.click();
    expect(cb).toHaveBeenLastCalledWith(20);
  });

  it("fires onRepelChange on range input, clamped to [0,2]", () => {
    const cb = vi.fn();
    panel.onRepelChange(cb);
    const range = host.querySelector<HTMLInputElement>("[data-filter-repel]")!;
    range.value = "1.5";
    range.dispatchEvent(new Event("input", { bubbles: true }));
    expect(cb).toHaveBeenLastCalledWith(1.5);
    range.value = "3";
    range.dispatchEvent(new Event("input", { bubbles: true }));
    expect(cb).toHaveBeenLastCalledWith(2);
    range.value = "-1";
    range.dispatchEvent(new Event("input", { bubbles: true }));
    expect(cb).toHaveBeenLastCalledWith(0);
  });

  it("closed state is hidden and removed from the tab order", () => {
    const root = host.querySelector<HTMLElement>(".filter-panel")!;
    expect(root.hidden).toBe(true);
    expect(root.inert || root.getAttribute("inert") !== null).toBe(true);
  });

  it("setOpen(true) reveals the panel and makes it focusable", () => {
    panel.setOpen(true);
    const root = host.querySelector<HTMLElement>(".filter-panel")!;
    expect(root.hidden).toBe(false);
    expect(root.inert || root.getAttribute("inert") !== null).toBe(false);
  });

  it("setQuantity updates the display and is reflected back to consumers", () => {
    panel.setQuantity(33);
    expect(host.querySelector("[data-filter-qty-value]")?.textContent?.trim()).toBe("33");
  });
});
