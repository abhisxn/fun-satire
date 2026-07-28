// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OverlayLayout } from "../../src/hud/OverlayLayout";
import { FilterPanel } from "../../src/hud/FilterPanel";
import { AvatarGallery } from "../../src/hud/AvatarGallery";

function makeTextPanel(host: HTMLElement): HTMLElement {
  const el = document.createElement("section");
  el.className = "text-panel";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Text subject");
  host.appendChild(el);
  return el;
}

describe("hud/OverlayLayout (one-open-panel exclusivity + a11y)", () => {
  let host: HTMLElement;
  let layout: OverlayLayout;
  let filter: FilterPanel;
  let gallery: AvatarGallery;
  let text: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.querySelector<HTMLElement>("#host")!;
    layout = new OverlayLayout();
    filter = new FilterPanel(host, { initialQuantity: 20, initialRepel: 1 });
    gallery = new AvatarGallery(host, {
      avatars: [{ id: "lotus", label: "Lotus", url: "/avatars/lotus.png" }],
      cardCount: 2,
    });
    text = makeTextPanel(host);
    layout.register("filter", filter.getRoot());
    layout.register("gallery", gallery.getRoot());
    layout.register("text", text);
  });
  afterEach(() => {
    filter.destroy();
    gallery.destroy();
    document.body.innerHTML = "";
  });

  it("starts with all panels closed", () => {
    expect(layout.getActive()).toBe("none");
    expect(filter.getRoot().hidden).toBe(true);
    expect(gallery.getRoot().hidden).toBe(true);
    expect(text.hidden).toBe(true);
  });

  it("only one contextual panel is open at a time", () => {
    layout.open("filter");
    expect(filter.getRoot().hidden).toBe(false);
    expect(gallery.getRoot().hidden).toBe(true);
    layout.open("gallery");
    expect(filter.getRoot().hidden).toBe(true);
    expect(gallery.getRoot().hidden).toBe(false);
    layout.open("text");
    expect(gallery.getRoot().hidden).toBe(true);
    expect(text.hidden).toBe(false);
    expect(layout.getActive()).toBe("text");
  });

  it("open() of the active panel closes it (toggle off)", () => {
    layout.open("filter");
    layout.open("filter");
    expect(layout.getActive()).toBe("none");
    expect(filter.getRoot().hidden).toBe(true);
  });

  it("Escape closes the active panel and dispatches onClose", () => {
    const cb = vi.fn();
    layout.onClose(cb);
    layout.open("gallery");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(layout.getActive()).toBe("none");
    expect(gallery.getRoot().hidden).toBe(true);
    expect(cb).toHaveBeenCalledWith("gallery");
  });

  it("Escape with no open panel is a no-op", () => {
    const cb = vi.fn();
    layout.onClose(cb);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(cb).not.toHaveBeenCalled();
  });

  it("focus returns to the trigger that opened the panel after close", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "open filter";
    document.body.appendChild(trigger);
    trigger.addEventListener("click", () => layout.open("filter"));
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter") layout.open("filter");
    });
    trigger.focus();
    trigger.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("closed panels carry hidden + inert (or hidden + tabindex=-1 fallback)", () => {
    layout.open("filter");
    expect(gallery.getRoot().hidden).toBe(true);
    expect(gallery.getRoot().inert || gallery.getRoot().getAttribute("inert") !== null).toBe(true);
    expect(text.hidden).toBe(true);
    expect(text.inert || text.getAttribute("inert") !== null).toBe(true);
  });
});
