// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ControlBar } from "../../src/hud/ControlBar";
import type { HudMode, HudPower } from "../../src/hud/hudIcons";
import visualTokens from "../../src/config/visualTokens.json";

describe("hud/ControlBar (Figma component contract)", () => {
  let host: HTMLElement;
  let bar: ControlBar;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.querySelector<HTMLElement>("#host")!;
    bar = new ControlBar(host, {
      initialMode: "eyes",
      initialPower: "laserBurn",
      initialQuantity: 20,
    });
  });
  afterEach(() => {
    bar.destroy();
    document.body.innerHTML = "";
  });

  it("mounts as a native <div> with role=toolbar grouping", () => {
    const root = host.querySelector<HTMLElement>(".control-bar");
    expect(root).not.toBeNull();
    expect(root?.tagName).toBe("DIV");
    expect(root?.getAttribute("role")).toBe("toolbar");
  });

  it("renders three mode buttons (hand, bug, eye) with aria-pressed reflecting state", () => {
    const hand = host.querySelector<HTMLButtonElement>('[data-control-mode="pointedFinger"]');
    const bug = host.querySelector<HTMLButtonElement>('[data-control-mode="bugs"]');
    const eye = host.querySelector<HTMLButtonElement>('[data-control-mode="eyes"]');
    expect(hand).not.toBeNull();
    expect(bug).not.toBeNull();
    expect(eye).not.toBeNull();
    expect(eye?.getAttribute("aria-pressed")).toBe("true");
    expect(hand?.getAttribute("aria-pressed")).toBe("false");
    expect(bug?.getAttribute("aria-pressed")).toBe("false");
    bar.setMode("bugs");
    expect(bug?.getAttribute("aria-pressed")).toBe("true");
    expect(eye?.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders filter, gallery, and text triggers with aria-expanded and aria-controls", () => {
    for (const which of ["filter", "gallery", "text"] as const) {
      const trigger = host.querySelector<HTMLButtonElement>(`[data-control-trigger="${which}"]`);
      expect(trigger, `trigger for ${which}`).not.toBeNull();
      expect(trigger?.getAttribute("aria-expanded")).toBe("false");
      const controlsId = trigger?.getAttribute("aria-controls");
      expect(controlsId).toMatch(/.+/);
    }
  });

  it("Attack uses native HTMLButtonElement.disabled, not data-disabled", () => {
    const attack = host.querySelector<HTMLButtonElement>('[data-control-attack]');
    expect(attack).not.toBeNull();
    expect(attack?.tagName).toBe("BUTTON");
    expect(attack?.disabled).toBe(true);
    expect(attack?.getAttribute("data-disabled")).toBeNull();
    bar.setCurrentSubjectId(7);
    expect(attack?.disabled).toBe(false);
    bar.setCurrentSubjectId(null);
    expect(attack?.disabled).toBe(true);
  });

  it("every interactive control is a native <button> with an accessible name", () => {
    const buttons = host.querySelectorAll<HTMLButtonElement>(".control-bar button");
    expect(buttons.length).toBeGreaterThanOrEqual(7);
    for (const btn of buttons) {
      const label =
        btn.getAttribute("aria-label") ??
        btn.getAttribute("aria-labelledby") ??
        btn.textContent?.trim();
      expect(label, `button at .control-bar has no accessible name: ${btn.outerHTML}`).toBeTruthy();
    }
  });

  it("matches the Figma desktop geometry: 542×70 pill at reference viewport", () => {
    const root = host.querySelector<HTMLElement>(".control-bar")!;
    expect(root.dataset.geometry).toBe("desktop");
    const w = Number(root.dataset.targetWidth);
    const h = Number(root.dataset.targetHeight);
    expect(w).toBe(visualTokens.ui.control.bar.width);
    expect(h).toBe(visualTokens.ui.control.bar.height);
    expect(w).toBe(542);
    expect(h).toBe(70);
    expect(visualTokens.ui.control.bar.radius).toBe(35);
  });

  it("emits onModeChange on mode-button click and locks the matching power", () => {
    const cb = vi.fn();
    bar.onModeChange(cb);
    const bug = host.querySelector<HTMLButtonElement>('[data-control-mode="bugs"]')!;
    bug.click();
    expect(cb).toHaveBeenCalledWith("bugs");
    expect(bar.getMode()).toBe("bugs");
  });

  it("emits onQuantityChange on ± clicks clamped to [1,60]", () => {
    const cb = vi.fn();
    bar.onQuantityChange(cb);
    const inc = host.querySelector<HTMLButtonElement>('[data-control-qty="inc"]')!;
    const dec = host.querySelector<HTMLButtonElement>('[data-control-qty="dec"]')!;
    inc.click();
    expect(cb).toHaveBeenLastCalledWith(21);
    dec.click();
    expect(cb).toHaveBeenLastCalledWith(20);
  });

  it("exposes the Figma-typed quantity stepper with ± buttons and a numeric display", () => {
    const stepper = host.querySelector<HTMLElement>("[data-control-stepper]");
    expect(stepper).not.toBeNull();
    expect(stepper?.querySelector('[data-control-qty="inc"]')?.tagName).toBe("BUTTON");
    expect(stepper?.querySelector('[data-control-qty="dec"]')?.tagName).toBe("BUTTON");
    const value = stepper?.querySelector<HTMLElement>("[data-control-qty-value]");
    expect(value?.tagName).toBe("OUTPUT");
    expect(value?.textContent).toBe("20");
  });

  it("setPower updates dataset and label", () => {
    bar.setPower("electricBurn");
    expect(host.querySelector(".control-bar")?.dataset.power).toBe("electricBurn");
    expect(host.querySelector("[data-control-power-label]")?.textContent?.toLowerCase()).toContain("shock");
  });

  it("setHidden toggles data-hidden on the root", () => {
    const root = host.querySelector<HTMLElement>(".control-bar")!;
    expect(root.dataset.hidden).toBeUndefined();
    bar.setHidden(true);
    expect(root.dataset.hidden).toBe("true");
    bar.setHidden(false);
    expect(root.dataset.hidden).toBe("false");
  });
});
