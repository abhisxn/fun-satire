// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { OverlayLayout, resolveOverlayVariant } from "../../src/hud/OverlayLayout";

describe("OverlayLayout responsive variant resolver", () => {
  it("returns desktop-panel for a wide viewport that fits the panel", () => {
    expect(resolveOverlayVariant({ width: 1400, height: 900, panelFits: true })).toBe("desktop-panel");
  });

  it("returns portrait-sheet when height dominates and panel does not fit width", () => {
    expect(resolveOverlayVariant({ width: 420, height: 900, panelFits: false })).toBe("portrait-sheet");
  });

  it("returns landscape-tray when width dominates and panel does not fit height", () => {
    expect(resolveOverlayVariant({ width: 900, height: 420, panelFits: false })).toBe("landscape-tray");
  });

  it("prefers desktop-panel over a sheet even on small viewports when the panel fits", () => {
    expect(resolveOverlayVariant({ width: 800, height: 600, panelFits: true })).toBe("desktop-panel");
  });
});

describe("OverlayLayout applies a variant data-attribute to all registered panels", () => {
  it("sets data-variant on every registered panel when setVariant is called", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const layout = new OverlayLayout();
    const a = document.createElement("section");
    const b = document.createElement("section");
    layout.register("filter", a);
    layout.register("gallery", b);
    layout.setVariant("portrait-sheet");
    expect(a.dataset.variant).toBe("portrait-sheet");
    expect(b.dataset.variant).toBe("portrait-sheet");
    layout.destroy();
    host.remove();
  });
});
