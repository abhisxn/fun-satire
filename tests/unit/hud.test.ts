import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
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

describe("hud/Hud (Phase C Lane 1 chrome)", () => {
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

  const q = (sel: string): HTMLElement =>
    root.querySelector<HTMLElement>(sel)!;

  it("renders the new drag handle, visibility toggle, and chrome tool buttons", () => {
    expect(q(".hud-placard__drag-handle")).not.toBeNull();
    expect(q(".hud-visibility-toggle")).not.toBeNull();
    expect(q(".hud-placard__tool--hand")).not.toBeNull();
    expect(q(".hud-placard__tool--text")).not.toBeNull();
    expect(q(".hud-placard__tool--grid")).not.toBeNull();
  });

  it("renders the ATTACK CTA with icon and label", () => {
    const attack = q(".hud-placard__attack");
    expect(attack).not.toBeNull();
    expect(q(".hud-placard__attack-icon svg")).not.toBeNull();
    expect(q(".hud-placard__attack-label").textContent).toBe("attack");
  });

  it("clicking-and-holding the ATTACK CTA calls onAttackPress with the current subject id", () => {
    const onPress = vi.fn();
    const onRelease = vi.fn();
    hud.onAttackPress(onPress);
    hud.onAttackRelease(onRelease);
    hud.setCurrentSubjectId(42);

    const attack = q(".hud-placard__attack");
    attack.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(42);
    expect(attack.dataset.pressed).toBe("true");

    attack.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }));
    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(attack.dataset.pressed).toBe("false");
  });

  it("ATTACK press is a no-op when no subject is set (CTA disabled)", () => {
    const onPress = vi.fn();
    hud.onAttackPress(onPress);
    hud.setCurrentSubjectId(null);

    const attack = q(".hud-placard__attack");
    expect(attack.dataset.disabled).toBe("true");

    attack.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }),
    );
    expect(onPress).not.toHaveBeenCalled();
  });

  it("ATTACK button is disabled by default (no subject locked)", () => {
    const attack = q(".hud-placard__attack");
    expect(attack.dataset.disabled).toBe("true");
  });

  it("ATTACK button becomes enabled when a subject is locked", () => {
    const attack = q(".hud-placard__attack");
    hud.setCurrentSubjectId(42);
    expect(attack.dataset.disabled).toBe("false");
  });

  it("ATTACK button becomes disabled again when subject is unlocked", () => {
    const attack = q(".hud-placard__attack");
    hud.setCurrentSubjectId(42);
    expect(attack.dataset.disabled).toBe("false");
    hud.setCurrentSubjectId(null);
    expect(attack.dataset.disabled).toBe("true");
  });

  it("ATTACK release fires on pointercancel and on pointerleave while pressed", () => {
    const onRelease = vi.fn();
    hud.onAttackRelease(onRelease);
    hud.setCurrentSubjectId(7);
    const attack = q(".hud-placard__attack");

    attack.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
    attack.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: 1 }));
    expect(onRelease).toHaveBeenCalledTimes(1);

    attack.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 2 }));
    attack.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerId: 2 }));
    expect(onRelease).toHaveBeenCalledTimes(2);
  });

  it("visibility toggle hides and shows the placard", () => {
    const onToggle = vi.fn();
    hud.onVisibilityToggle(onToggle);
    const placard = q(".hud-placard");
    const toggle = q(".hud-visibility-toggle");

    expect(placard.dataset.hidden).toBeUndefined();
    toggle.click();
    expect(placard.dataset.hidden).toBe("true");
    expect(hud.isHidden()).toBe(true);
    expect(onToggle).toHaveBeenCalledWith(false);

    toggle.click();
    expect(placard.dataset.hidden).toBe("false");
    expect(hud.isHidden()).toBe(false);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("hand tool toggle fires callback and sets aria-pressed", () => {
    const onToggle = vi.fn();
    hud.onHandToolToggle(onToggle);
    const hand = q(".hud-placard__tool--hand");

    expect(hand.getAttribute("aria-pressed")).toBe("false");
    hand.click();
    expect(hand.getAttribute("aria-pressed")).toBe("true");
    expect(hand.dataset.active).toBe("true");
    expect(onToggle).toHaveBeenCalledWith(true);

    hand.click();
    expect(hand.getAttribute("aria-pressed")).toBe("false");
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("text and grid tool buttons fire their callbacks", () => {
    const onText = vi.fn();
    const onGrid = vi.fn();
    hud.onTextTool(onText);
    hud.onGridTool(onGrid);
    q(".hud-placard__tool--text").click();
    q(".hud-placard__tool--grid").click();
    expect(onText).toHaveBeenCalledTimes(1);
    expect(onGrid).toHaveBeenCalledTimes(1);
  });

  it("drag handle translates the placard via CSS custom properties", () => {
    const handle = q(".hud-placard__drag-handle");
    handle.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, pointerId: 1, clientX: 100, clientY: 200,
    }));
    handle.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, pointerId: 1, clientX: 140, clientY: 230,
    }));
    const placard = q(".hud-placard");
    expect(placard.style.getPropertyValue("--placard-x")).toBe("40px");
    expect(placard.style.getPropertyValue("--placard-y")).toBe("30px");
    handle.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, pointerId: 1, clientX: 140, clientY: 230,
    }));
  });
});

describe("hud/Hud (PR2 Lane 3 identity binding + subject count)", () => {
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

  it("setSubjectCount(n) renders a count indicator with the number", () => {
    hud.setSubjectCount(3);
    const count = root.querySelector<HTMLElement>(".hud-placard__subject-count");
    expect(count).not.toBeNull();
    expect(count?.textContent).toBe("3");
  });

  it("setSubjectCount(0) renders 0", () => {
    hud.setSubjectCount(0);
    expect(root.querySelector<HTMLElement>(".hud-placard__subject-count")?.textContent).toBe("0");
  });

  it("setLockedSubjectId(id) pre-populates the compose row with the locked subject's text skin", () => {
    hud.setActiveSubjectSkin(7, { kind: "text", value: "Vote", scale: 1.35, fontId: "fraunces", align: "left" });
    hud.setLockedSubjectId(7);
    const input = root.querySelector<HTMLInputElement>(".subject-drawer__compose-input")!;
    expect(input.value).toBe("Vote");
    expect(root.querySelector('[data-size="large"]')?.classList.contains("subject-drawer__size-btn--active")).toBe(true);
  });

  it("setLockedSubjectId(null) does not throw and clears the active subject", () => {
    hud.setActiveSubjectSkin(7, { kind: "text", value: "X", scale: 1 });
    hud.setLockedSubjectId(7);
    hud.setLockedSubjectId(null);
    const resize = vi.fn();
    hud.onSubjectResize(resize);
    root.querySelector<HTMLElement>('[data-size="large"]')?.click();
    expect(resize).not.toHaveBeenCalled();
  });

  it("propagates identity through onSubjectResize to the callback", () => {
    const cb = vi.fn();
    hud.onSubjectResize(cb);
    hud.setActiveSubjectSkin(42, { kind: "text", value: "Hi", scale: 1 });
    hud.setLockedSubjectId(42);
    root.querySelector<HTMLElement>('[data-size="small"]')?.click();
    expect(cb).toHaveBeenCalledWith(42, 0.75);
  });
});
