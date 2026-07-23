import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Hud } from "../../src/hud/Hud";
// @vitest-environment happy-dom

describe("hud/Hud (T22)", () => {
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

  it("mounts a placard with the locked data-mode and data-power attributes", () => {
    const placard = root.querySelector<HTMLElement>(".hud-placard");
    expect(placard).not.toBeNull();
    expect(placard?.dataset.mode).toBe("eyes");
    expect(placard?.dataset.power).toBe("laserBurn");
  });

  it("renders both SVG icons inside their hosts", () => {
    const modeIcon = root.querySelector<HTMLElement>(".hud-placard__mode-icon svg");
    const powerIcon = root.querySelector<HTMLElement>(".hud-placard__power-icon svg");
    expect(modeIcon).not.toBeNull();
    expect(powerIcon).not.toBeNull();
  });

  it("setMode updates label and dataset.mode", () => {
    hud.setMode("eyes");
    expect(root.querySelector(".hud-placard__mode-label")!.textContent).toBe("eyes");
    expect(root.querySelector(".hud-placard")!.dataset.mode).toBe("eyes");
  });

  it("setPower updates label and dataset.power", () => {
    hud.setPower("laserBurn");
    expect(root.querySelector(".hud-placard__power-label")!.textContent).toBe("laser burn");
    expect(root.querySelector(".hud-placard")!.dataset.power).toBe("laserBurn");
  });

  it("setCharge clamps progress into [0,1] and updates data-visible", () => {
    hud.setCharge(2, true);
    const charge = root.querySelector<HTMLElement>(".hud-placard__charge")!;
    expect(charge.dataset.visible).toBe("true");
    expect(charge.style.getPropertyValue("--charge")).toBe("1.000");
    hud.setCharge(-0.5, false);
    expect(charge.dataset.visible).toBe("false");
    expect(charge.style.getPropertyValue("--charge")).toBe("0.000");
  });

  it("uses only the locked palette colors in the rendered HTML", () => {
    const html = root.innerHTML;
    const banned = ["#aa3bff", "#646cff", "#ffffff", "#000000", "system-ui", "Inter"];
    for (const b of banned) {
      expect(html.toLowerCase()).not.toContain(b.toLowerCase());
    }
    expect(html).toContain("#EDE7DD");
    expect(html).toContain("#2A2420");
  });

  it("does not animate width or top (GPU-safe only)", () => {
    const css = readText("src/hud/hud.css");
    const banned = /transition[^;]*(width|top|left|right|height)\s/;
    expect(banned.test(css)).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readText(rel: string): string {
  return readFileSync(resolve(__dirname, "..", "..", rel), "utf8");
}
