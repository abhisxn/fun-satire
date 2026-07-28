// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Hud } from "../../src/hud/Hud";
import { resolveScenePolicy } from "../../src/render/responsiveScene";

function readCss(rel: string): string {
  return readFileSync(resolve(__dirname, "..", "..", rel), "utf8");
}

describe("responsive HUD CSS consumes controlVariant", () => {
  const controlBarCss = readCss("src/hud/controlBar.css");
  const overlayLayoutCss = readCss("src/hud/overlayLayout.css");
  const audioControlCss = readCss("src/hud/audioControl.css");

  it("defines tablet layout overrides for the control bar", () => {
    expect(controlBarCss).toContain('[data-control-variant="tablet"]');
    expect(controlBarCss).toContain('[data-control-variant="tablet"] .control-bar');
  });

  it("defines portrait-sheet layout overrides for the control bar", () => {
    expect(controlBarCss).toContain('[data-control-variant="portrait-sheet"]');
    expect(controlBarCss).toContain('[data-control-variant="portrait-sheet"] .control-bar');
  });

  it("defines landscape-tray layout overrides for the control bar", () => {
    expect(controlBarCss).toContain('[data-control-variant="landscape-tray"]');
    expect(controlBarCss).toContain('[data-control-variant="landscape-tray"] .control-bar');
  });

  it("repositions the audio control for non-desktop variants", () => {
    expect(audioControlCss).toContain('[data-control-variant="tablet"] ~ .audio-control');
    expect(audioControlCss).toContain('[data-control-variant="portrait-sheet"] ~ .audio-control');
    expect(audioControlCss).toContain('[data-control-variant="landscape-tray"] ~ .audio-control');
  });

  it("defines panel layout overrides for portrait-sheet and landscape-tray", () => {
    expect(overlayLayoutCss).toContain('[data-control-variant="portrait-sheet"] .filter-panel');
    expect(overlayLayoutCss).toContain('[data-control-variant="portrait-sheet"] .avatar-gallery');
    expect(overlayLayoutCss).toContain('[data-control-variant="landscape-tray"] .filter-panel');
    expect(overlayLayoutCss).toContain('[data-control-variant="landscape-tray"] .avatar-gallery');
  });

  it("preserves the desktop design by leaving desktop styles as the default", () => {
    expect(controlBarCss).not.toContain('[data-control-variant="desktop"]');
    expect(overlayLayoutCss).not.toContain('[data-control-variant="desktop"]');
    expect(audioControlCss).not.toContain('[data-control-variant="desktop"]');
  });
});

describe("responsive HUD layout hooks at runtime", () => {
  let root: HTMLElement;
  let hud: Hud;

  beforeEach(() => {
    document.body.innerHTML = '<div id="hud-root"></div>';
    root = document.querySelector<HTMLElement>("#hud-root")!;
    hud = new Hud(root);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("sets the correct data-control-variant for every target viewport", () => {
    const cases = [
      { width: 1280, height: 832, variant: "desktop" },
      { width: 1440, height: 900, variant: "desktop" },
      { width: 1024, height: 768, variant: "tablet" },
      { width: 768, height: 1024, variant: "tablet" },
      { width: 390, height: 844, variant: "portrait-sheet" },
      { width: 844, height: 390, variant: "landscape-tray" },
    ];

    for (const { width, height, variant } of cases) {
      hud.setControlVariant(resolveScenePolicy(width, height).controlVariant);
      expect(root.dataset.controlVariant, `${width}x${height}`).toBe(variant);
    }
  });

  it("keeps the control bar and panels as descendants so variant selectors apply", () => {
    for (const variant of ["desktop", "tablet", "portrait-sheet", "landscape-tray"] as const) {
      hud.setControlVariant(variant);
      expect(root.querySelector(".control-bar"), `${variant} control bar`).not.toBeNull();
      expect(root.querySelector(".filter-panel"), `${variant} filter panel`).not.toBeNull();
      expect(root.querySelector(".avatar-gallery"), `${variant} avatar gallery`).not.toBeNull();
    }
  });
});
