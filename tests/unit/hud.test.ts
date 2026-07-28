// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Hud } from "../../src/hud/Hud";

function readText(rel: string): string {
  return readFileSync(resolve(__dirname, "..", "..", rel), "utf8");
}

describe("hud/Hud (Figma glass-pill HUD)", () => {
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

  const q = (sel: string): HTMLElement => root.querySelector<HTMLElement>(sel)!;

  it("mounts control bar with locked data-mode and data-power", () => {
    const bar = q(".control-bar");
    expect(bar).not.toBeNull();
    expect(bar.dataset.mode).toBe("eyes");
    expect(bar.dataset.power).toBe("laserBurn");
  });

  it("does not render the legacy paper-cut placard", () => {
    expect(root.querySelector(".hud-placard")).toBeNull();
    expect(root.querySelector(".subject-drawer")).toBeNull();
    expect(root.querySelector(".hud-fixture-filter-panel")).toBeNull();
  });

  it("setMode updates control-bar dataset.mode", () => {
    hud.setMode("bugs");
    expect(q(".control-bar").dataset.mode).toBe("bugs");
    expect(q('[data-control-mode="bugs"]').getAttribute("aria-pressed")).toBe("true");
  });

  it("setPower updates control-bar dataset.power and label", () => {
    hud.setPower("electricBurn");
    expect(q(".control-bar").dataset.power).toBe("electricBurn");
    expect(q("[data-control-power-label]").textContent?.toLowerCase()).toContain("shock");
  });

  it("setCharge clamps progress into [0,1] and updates data-visible", () => {
    hud.setCharge(2, true);
    const charge = q(".hud-charge");
    expect(charge.dataset.visible).toBe("true");
    expect(charge.style.getPropertyValue("--charge")).toBe("1.000");
    hud.setCharge(-0.5, false);
    expect(charge.dataset.visible).toBe("false");
    expect(charge.style.getPropertyValue("--charge")).toBe("0.000");
  });

  it("materializes distinct default, filter, and gallery fixture panel DOM states", () => {
    hud.setVisualFixturePanel("none");
    expect(q(".filter-panel").hidden).toBe(true);
    expect(q(".avatar-gallery").hidden).toBe(true);

    hud.setVisualFixturePanel("filter");
    expect(q(".filter-panel").hidden).toBe(false);
    expect(q(".filter-panel").inert).toBe(false);
    expect(q(".avatar-gallery").hidden).toBe(true);

    hud.setVisualFixturePanel("gallery");
    expect(q(".filter-panel").hidden).toBe(true);
    expect(q(".avatar-gallery").hidden).toBe(false);
    expect(root.querySelectorAll("[data-avatar-card]").length).toBeGreaterThan(0);
  });

  it("finishes entrance transitions without waiting on constructor RAF", async () => {
    await hud.finishEntranceTransitions();
    expect(q(".control-bar").classList.contains("hud-control-bar--ready")).toBe(true);
  });

  it("reflects a deterministic attack target, lock, CTA, and field charge state", () => {
    hud.setVisualFixtureAttackState({
      targetId: 42,
      skin: { kind: "illustrated", id: "figure" },
      progress: 0.68,
    });

    expect(hud.getCurrentSubjectId()).toBe(42);
    expect(hud.getLockedSubjectId()).toBe(42);
    expect((q("[data-control-attack]") as HTMLButtonElement).disabled).toBe(false);
    const charge = q(".hud-charge");
    expect(charge.dataset.visible).toBe("true");
    expect(charge.style.getPropertyValue("--charge")).toBe("0.680");
  });

  it("does not animate width or top (GPU-safe only)", () => {
    const css = readText("src/hud/hud.css");
    const banned = /transition[^;]*(width|top|left|right|height)\s/;
    expect(banned.test(css)).toBe(false);
  });

  it("anchors the control bar inside the overlay anchor", () => {
    expect(q(".overlay-anchor .control-bar")).not.toBeNull();
  });

  it("mounts the filter and gallery panels inside the overlay panels container", () => {
    expect(q(".overlay-panels .filter-panel")).not.toBeNull();
    expect(q(".overlay-panels .avatar-gallery")).not.toBeNull();
  });

  it("opens FilterPanel when the filter trigger is clicked", () => {
    q('[data-control-trigger="filter"]').click();
    expect(q(".filter-panel").hidden).toBe(false);
    expect(q(".filter-panel").inert).toBe(false);
  });

  it("opens AvatarGallery when the gallery trigger is clicked", () => {
    q('[data-control-trigger="gallery"]').click();
    expect(q(".avatar-gallery").hidden).toBe(false);
    expect(q(".avatar-gallery").inert).toBe(false);
  });

  it("fires onTextTool when the text trigger is clicked", () => {
    const onText = vi.fn();
    hud.onTextTool(onText);
    q('[data-control-trigger="text"]').click();
    expect(onText).toHaveBeenCalledTimes(1);
  });

  it("propagates subject lock state to the attack button", () => {
    const attack = q("[data-control-attack]") as HTMLButtonElement;
    expect(attack.disabled).toBe(true);
    hud.setCurrentSubjectId(7);
    expect(attack.disabled).toBe(false);
  });

  it("fires onAttackPress/onAttackRelease through the attack button", () => {
    const onPress = vi.fn();
    const onRelease = vi.fn();
    hud.onAttackPress(onPress);
    hud.onAttackRelease(onRelease);
    hud.setCurrentSubjectId(42);
    const attack = q("[data-control-attack]")!;
    attack.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
    expect(onPress).toHaveBeenCalledWith(42);
    attack.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }));
    expect(onRelease).toHaveBeenCalled();
  });

  it("ATTACK press is a no-op when no subject is set", () => {
    const onPress = vi.fn();
    hud.onAttackPress(onPress);
    hud.setCurrentSubjectId(null);
    const attack = q("[data-control-attack]") as HTMLButtonElement;
    expect(attack.disabled).toBe(true);
    attack.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("visibility toggle hides and shows the control bar", () => {
    const onToggle = vi.fn();
    hud.onVisibilityToggle(onToggle);
    const toggle = q(".hud-visibility-toggle");

    expect(hud.isHidden()).toBe(false);
    toggle.click();
    expect(hud.isHidden()).toBe(true);
    expect(q(".control-bar").dataset.hidden).toBe("true");
    expect(onToggle).toHaveBeenCalledWith(false);

    toggle.click();
    expect(hud.isHidden()).toBe(false);
    expect(q(".control-bar").dataset.hidden).toBe("false");
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("hand tool toggle fires callback and sets aria-pressed on ControlBar", () => {
    const onToggle = vi.fn();
    hud.onHandToolToggle(onToggle);
    const hand = q("[data-control-hand]");

    expect(hand.getAttribute("aria-pressed")).toBe("false");
    hand.click();
    expect(hand.getAttribute("aria-pressed")).toBe("true");
    expect(onToggle).toHaveBeenCalledWith(true);

    hand.click();
    expect(hand.getAttribute("aria-pressed")).toBe("false");
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("setHandToolActive reflects only on ControlBar", () => {
    hud.setHandToolActive(true);
    expect(q("[data-control-hand]").getAttribute("aria-pressed")).toBe("true");
    expect(hud.isHandToolActive()).toBe(true);
    hud.setHandToolActive(false);
    expect(q("[data-control-hand]").getAttribute("aria-pressed")).toBe("false");
  });

  it("cycles mode through mode buttons and fires onModeChange", () => {
    const onModeChange = vi.fn();
    hud.onModeChange(onModeChange);
    q('[data-control-mode="bugs"]').click();
    expect(onModeChange).toHaveBeenCalledWith("bugs");
    expect(q('[data-control-mode="bugs"]').getAttribute("aria-pressed")).toBe("true");
  });

  it("setSubjectCount stores count on the root dataset", () => {
    hud.setSubjectCount(3);
    expect(root.dataset.subjectCount).toBe("3");
    expect(hud.getSubjectCount()).toBe(3);
    hud.setSubjectCount(0);
    expect(root.dataset.subjectCount).toBe("0");
  });

  it("setActiveSubjectSkin selects matching avatar in gallery", () => {
    hud.setActiveSubjectSkin(7, { kind: "avatar", assetId: "frame-38" });
    const card = root.querySelector<HTMLButtonElement>('[data-avatar-card="frame-38"]');
    expect(card?.getAttribute("aria-pressed")).toBe("true");
  });

  it("setLockedSubjectId(null) clears lock without throwing", () => {
    hud.setActiveSubjectSkin(7, { kind: "text", value: "X", scale: 1 });
    hud.setLockedSubjectId(7);
    hud.setLockedSubjectId(null);
    expect(hud.getLockedSubjectId()).toBeNull();
  });

  it("mode-button click drives a 'mode' ControlEvent and locks the matching power", () => {
    const events: unknown[] = [];
    const onModeChange = vi.fn();
    hud.onControlEvent((e) => events.push(e));
    hud.onModeChange(onModeChange);
    q('[data-control-mode="pointedFinger"]').click();
    expect(onModeChange).toHaveBeenCalledWith("pointedFinger");
    expect(q(".control-bar").dataset.power).toBe("electricBurn");
    expect(events).toEqual([
      { type: "mode", mode: "pointedFinger", power: "electricBurn" },
    ]);
  });

  it("hand tool click drives a 'hand' ControlEvent and fires onHandToolToggle", () => {
    const events: unknown[] = [];
    const onHand = vi.fn();
    hud.onControlEvent((e) => events.push(e));
    hud.onHandToolToggle(onHand);
    const hand = q("[data-control-hand]");
    hand.click();
    hand.click();
    expect(onHand).toHaveBeenNthCalledWith(1, true);
    expect(onHand).toHaveBeenNthCalledWith(2, false);
    expect(events).toEqual([
      { type: "hand", active: true },
      { type: "hand", active: false },
    ]);
  });

  it("attack pointer events drive 'attack-press' and 'attack-release' ControlEvents", () => {
    const events: unknown[] = [];
    hud.onControlEvent((e) => events.push(e));
    hud.setCurrentSubjectId(99);
    const attack = q("[data-control-attack]")!;
    const opts = { bubbles: true, pointerId: 1, pointerType: "mouse" } as PointerEventInit;
    attack.dispatchEvent(new PointerEvent("pointerdown", opts));
    attack.dispatchEvent(new PointerEvent("pointerup", opts));
    expect(events).toEqual([
      { type: "attack-press", subjectId: 99 },
      { type: "attack-release" },
    ]);
  });

  it("attack pointercancel drives 'attack-release' (no synthetic MouseEvent needed)", () => {
    const events: unknown[] = [];
    hud.onControlEvent((e) => events.push(e));
    hud.setCurrentSubjectId(99);
    const attack = q("[data-control-attack]")!;
    const opts = { bubbles: true, pointerId: 1, pointerType: "mouse" } as PointerEventInit;
    attack.dispatchEvent(new PointerEvent("pointerdown", opts));
    attack.dispatchEvent(new PointerEvent("pointercancel", opts));
    expect(events).toEqual([
      { type: "attack-press", subjectId: 99 },
      { type: "attack-release" },
    ]);
  });

  it("visibility toggle also drives a 'visibility' ControlEvent", () => {
    const events: unknown[] = [];
    const onToggle = vi.fn();
    hud.onControlEvent((e) => events.push(e));
    hud.onVisibilityToggle(onToggle);
    const toggle = q(".hud-visibility-toggle");
    toggle.click();
    expect(events).toContainEqual({ type: "visibility", visible: false });
    toggle.click();
    expect(events).toContainEqual({ type: "visibility", visible: true });
  });

  it("attack button has a focus-visible outline rule defined in controlBar.css", () => {
    expect(readText("src/hud/controlBar.css")).toMatch(/\.control-bar__attack:focus-visible/);
  });

  it("mode/trigger/hand buttons share a 46px well (Figma control.well token)", () => {
    const css = readText("src/hud/controlBar.css");
    expect(css).toMatch(/\.control-bar__mode-btn[\s\S]{0,160}?width:\s*46px[\s\S]{0,80}?height:\s*46px/);
  });
});
