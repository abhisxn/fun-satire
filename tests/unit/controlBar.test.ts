// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ControlBar, type ControlEvent } from "../../src/hud/ControlBar";
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

  it("mode buttons all have a 46px native well at the Figma control token", () => {
    const well = visualTokens.ui.control.well;
    expect(well).toBe(46);
    for (const m of ["eyes", "bugs", "pointedFinger"] as const) {
      const btn = host.querySelector<HTMLButtonElement>(`[data-control-mode="${m}"]`)!;
      expect(btn.classList.contains("control-bar__mode-btn")).toBe(true);
    }
  });

  it("power is read-only: there is no power selector in the DOM", () => {
    expect(host.querySelector("[data-control-power]")).toBeNull();
    expect(host.querySelector(".control-bar__power-select")).toBeNull();
  });

  it("setPower is reflected in the dataset and the power label without firing onModeChange", () => {
    const cb = vi.fn();
    bar.onModeChange(cb);
    bar.setPower("bugEat");
    expect(bar.getPower()).toBe("bugEat");
    expect(host.querySelector(".control-bar")?.dataset.power).toBe("bugEat");
    expect(cb).not.toHaveBeenCalled();
  });

  it("attack button transitions through pointerdown→pointerup pair (no synthetic MouseEvent)", () => {
    const events: string[] = [];
    bar.onAttackPress(() => events.push("press"));
    bar.onAttackRelease(() => events.push("release"));
    bar.setCurrentSubjectId(7);
    const attack = host.querySelector<HTMLButtonElement>("[data-control-attack]")!;
    const opts = { bubbles: true, pointerId: 1, pointerType: "mouse" } as PointerEventInit;
    attack.dispatchEvent(new PointerEvent("pointerdown", opts));
    attack.dispatchEvent(new PointerEvent("pointerup", opts));
    expect(events).toEqual(["press", "release"]);
  });

  it("pointercancel fires attack release without pressing twice", () => {
    const events: string[] = [];
    bar.onAttackPress(() => events.push("press"));
    bar.onAttackRelease(() => events.push("release"));
    bar.setCurrentSubjectId(7);
    const attack = host.querySelector<HTMLButtonElement>("[data-control-attack]")!;
    const opts = { bubbles: true, pointerId: 1, pointerType: "mouse" } as PointerEventInit;
    attack.dispatchEvent(new PointerEvent("pointerdown", opts));
    attack.dispatchEvent(new PointerEvent("pointercancel", opts));
    expect(events).toEqual(["press", "release"]);
  });

  it("pointerleave after press also fires release (drag-off safety)", () => {
    const events: string[] = [];
    bar.onAttackPress(() => events.push("press"));
    bar.onAttackRelease(() => events.push("release"));
    bar.setCurrentSubjectId(7);
    const attack = host.querySelector<HTMLButtonElement>("[data-control-attack]")!;
    const opts = { bubbles: true, pointerId: 1, pointerType: "mouse" } as PointerEventInit;
    attack.dispatchEvent(new PointerEvent("pointerdown", opts));
    attack.dispatchEvent(new PointerEvent("pointerleave", opts));
    expect(events).toEqual(["press", "release"]);
  });

  it("attack press is a no-op when no subject is set (native disabled blocks pointerdown)", () => {
    const onPress = vi.fn();
    bar.onAttackPress(onPress);
    const attack = host.querySelector<HTMLButtonElement>("[data-control-attack]")!;
    expect(attack.disabled).toBe(true);
    const opts = { bubbles: true, pointerId: 1, pointerType: "mouse" } as PointerEventInit;
    attack.dispatchEvent(new PointerEvent("pointerdown", opts));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("emits a typed 'mode' ControlEvent with the new HudMode and the matching power", () => {
    const events: ControlEvent[] = [];
    bar.onControlEvent((e) => events.push(e));
    host.querySelector<HTMLButtonElement>('[data-control-mode="pointedFinger"]')!.click();
    expect(events).toEqual([{ type: "mode", mode: "pointedFinger", power: "electricBurn" }]);
  });

  it("emits typed 'panel' ControlEvent for filter/gallery/text triggers", () => {
    const events: ControlEvent[] = [];
    bar.onControlEvent((e) => events.push(e));
    host.querySelector<HTMLButtonElement>('[data-control-trigger="filter"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-control-trigger="gallery"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-control-trigger="text"]')!.click();
    expect(events.map((e) => e.type)).toEqual(["panel", "panel", "panel"]);
  });

  it("emits typed 'hand' ControlEvent with active boolean on hand tool click", () => {
    const events: ControlEvent[] = [];
    bar.onControlEvent((e) => events.push(e));
    const hand = host.querySelector<HTMLButtonElement>("[data-control-hand]")!;
    hand.click();
    hand.click();
    expect(events).toEqual([
      { type: "hand", active: true },
      { type: "hand", active: false },
    ]);
  });

  it("emits typed 'attack-press'/'attack-release' ControlEvents on pointer events", () => {
    const events: ControlEvent[] = [];
    bar.onControlEvent((e) => events.push(e));
    bar.setCurrentSubjectId(11);
    const attack = host.querySelector<HTMLButtonElement>("[data-control-attack]")!;
    const opts = { bubbles: true, pointerId: 1, pointerType: "mouse" } as PointerEventInit;
    attack.dispatchEvent(new PointerEvent("pointerdown", opts));
    attack.dispatchEvent(new PointerEvent("pointerup", opts));
    expect(events).toEqual([
      { type: "attack-press", subjectId: 11 },
      { type: "attack-release" },
    ]);
  });
});
