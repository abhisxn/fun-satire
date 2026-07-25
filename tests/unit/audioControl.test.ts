import { describe, expect, it, beforeEach } from "vitest";
import { AudioControl, type AudioControlEngine } from "../../src/hud/AudioControl";
// @vitest-environment happy-dom

function makeFakeEngine(): AudioControlEngine & { muted: boolean; volume: number } {
  return {
    muted: false,
    volume: 0.8,
    isMuted() { return this.muted; },
    getMasterVolume() { return this.volume; },
    toggleMute() { this.muted = !this.muted; return this.muted; },
    setMasterVolume(v: number) { this.volume = v; },
  };
}

describe("hud/AudioControl", () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.querySelector<HTMLElement>("#host")!;
  });

  it("mounts a toggle button and a volume slider bound to the engine's current volume", () => {
    new AudioControl(host, makeFakeEngine());
    expect(host.querySelector(".audio-control__toggle")).not.toBeNull();
    expect(host.querySelector<HTMLInputElement>(".audio-control__slider")?.value).toBe("0.8");
  });

  it("clicking the toggle mutes the engine and flips the muted dataset", () => {
    const engine = makeFakeEngine();
    const control = new AudioControl(host, engine);
    host.querySelector<HTMLButtonElement>(".audio-control__toggle")!.click();
    expect(engine.muted).toBe(true);
    expect(control.isMuted()).toBe(true);
    expect(host.querySelector<HTMLElement>(".audio-control")!.dataset.muted).toBe("true");
  });

  it("moving the slider updates the engine's master volume", () => {
    const engine = makeFakeEngine();
    const control = new AudioControl(host, engine);
    const slider = host.querySelector<HTMLInputElement>(".audio-control__slider")!;
    slider.value = "0.3";
    slider.dispatchEvent(new Event("input"));
    expect(engine.volume).toBe(0.3);
    expect(control.getVolume()).toBe(0.3);
  });

  it("uses only the locked palette colors in the rendered HTML", () => {
    new AudioControl(host, makeFakeEngine());
    const html = host.innerHTML;
    const banned = ["#aa3bff", "#646cff", "#ffffff", "#000000", "system-ui", "Inter"];
    for (const b of banned) {
      expect(html.toLowerCase()).not.toContain(b.toLowerCase());
    }
  });
});
