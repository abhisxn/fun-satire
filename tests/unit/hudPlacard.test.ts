// tests/unit/hudPlacard.test.ts
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Hud } from "../../src/hud/Hud";

describe("hud/Hud placard structure + hud.css tokens (T33)", () => {
  it("hud-root contains a grain hook element for the placard's own grain treatment", () => {
    const root = document.createElement("div");
    root.id = "hud-root";
    document.body.appendChild(root);
    new Hud(root);
    const grainEl = root.querySelector(".hud-placard__grain");
    expect(grainEl).not.toBeNull();
  });

  it("hud.css promotes mode/power labels to the display font in italic", () => {
    const css = fs.readFileSync(path.join(__dirname, "../../src/hud/hud.css"), "utf-8");
    const modeLabelBlock = css.slice(css.indexOf(".hud-placard__mode-label"));
    expect(modeLabelBlock).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(modeLabelBlock).toMatch(/font-style:\s*italic/);
  });

  it("hud.css gives .hud-placard__tear a drop-shadow", () => {
    const css = fs.readFileSync(path.join(__dirname, "../../src/hud/hud.css"), "utf-8");
    const tearBlock = css.slice(css.indexOf(".hud-placard__tear"), css.indexOf(".hud-placard__tear") + 400);
    expect(tearBlock).toMatch(/filter:\s*drop-shadow/);
  });

  it("hud.css gives .hud-placard__grain the shared grain tile token", () => {
    const css = fs.readFileSync(path.join(__dirname, "../../src/hud/hud.css"), "utf-8");
    expect(css).toMatch(/\.hud-placard__grain[\s\S]*?var\(--grain-tile-url\)/);
  });
});
