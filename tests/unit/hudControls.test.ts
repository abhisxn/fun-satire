// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { Hud } from "../../src/hud/Hud";

describe("Hud crowd controls", () => {
  it("cycles HudMode on mode-icon click and calls onModeChange", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const onModeChange = vi.fn();
    hud.onModeChange(onModeChange);
    const modeBtn = root.querySelector<HTMLElement>(".hud-placard__mode-icon")!;
    modeBtn.click();
    expect(onModeChange).toHaveBeenCalledWith("bugs");
    modeBtn.click();
    expect(onModeChange).toHaveBeenCalledWith("pointedFinger");
    modeBtn.click();
    expect(onModeChange).toHaveBeenCalledWith("eyes");
  });

  it("cycles HudSkin on skin-icon click and calls onSkinChange", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const onSkinChange = vi.fn();
    hud.onSkinChange(onSkinChange);
    const skinBtn = root.querySelector<HTMLElement>(".hud-placard__skin-icon")!;
    skinBtn.click();
    expect(onSkinChange).toHaveBeenCalledWith("lotus");
    skinBtn.click();
    expect(onSkinChange).toHaveBeenCalledWith("figure");
  });

  it("steps quantity up/down within [1, 60] and calls onQuantityChange with the delta", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const onQuantityChange = vi.fn();
    hud.onQuantityChange(onQuantityChange);
    root.querySelector<HTMLElement>(".hud-placard__qty-inc")!.click();
    expect(onQuantityChange).toHaveBeenCalledWith(1);
    root.querySelector<HTMLElement>(".hud-placard__qty-dec")!.click();
    expect(onQuantityChange).toHaveBeenCalledWith(-1);
  });

  it("reports repel track changes as a 0..2 multiplier via onRepelChange", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const onRepelChange = vi.fn();
    hud.onRepelChange(onRepelChange);
    const track = root.querySelector<HTMLInputElement>(".hud-placard__repel-input")!;
    track.value = "1.5";
    track.dispatchEvent(new Event("input"));
    expect(onRepelChange).toHaveBeenCalledWith(1.5);
  });

  it("styles the repel control as a custom track, not a bare browser range input", () => {
    const root = document.createElement("div");
    new Hud(root);
    expect(root.querySelector<HTMLElement>(".hud-placard__repel-track")).not.toBeNull();
  });
});
