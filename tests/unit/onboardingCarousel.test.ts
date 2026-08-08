// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OnboardingCarousel } from "../../src/hud/onboarding/OnboardingCarousel";
import { BEATS } from "../../src/hud/onboarding/beats";

const h = vi.hoisted(() => ({
  calls: [] as string[],
  engines: [] as Array<{ tick: () => void }>,
  resolvePoof: { fn: null as (() => void) | null },
}));

vi.mock("../../src/core/Engine", () => ({
  Engine: class {
    private tickCb: () => void = () => {};
    onTick(cb: () => void): void {
      this.tickCb = cb;
    }
    start(): void {}
    tick(): void {
      this.tickCb();
    }
    constructor() {
      h.engines.push(this as never);
    }
  },
}));

vi.mock("../../src/creatures/CreatureGrid", () => ({
  CreatureGrid: class {
    constructor(opts: { mode: string; initialQuantity: number }) {
      h.calls.push(`grid:new:${opts.mode}:${opts.initialQuantity}`);
    }
    async init(): Promise<void> {}
    update(x: number, y: number): void {
      h.calls.push(`grid:update:${x},${y}`);
    }
    setQuantity(n: number): void {
      h.calls.push(`grid:setQuantity:${n}`);
    }
    setRepulsor(x: number, y: number): void {
      h.calls.push(`grid:setRepulsor:${x},${y}`);
    }
    clearRepulsor(): void {
      h.calls.push("grid:clearRepulsor");
    }
    setRepelMultiplier(): void {}
    switchMode(): void {}
    respawn(): void {}
  },
}));

vi.mock("../../src/creatures/poofEffect", () => ({
  spawnPoof: vi.fn((x: number, y: number) => {
    h.calls.push(`poof:${x},${y}`);
    let resolveCovered: () => void = () => {};
    let resolveDone: () => void = () => {};
    const covered = new Promise<void>((resolve) => {
      resolveCovered = resolve;
    });
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });
    h.resolvePoof.fn = () => {
      resolveCovered();
      resolveDone();
    };
    return { covered, done };
  }),
}));

vi.mock("../../src/creatures/StickerOverlay", () => ({
  StickerOverlay: class {
    el: HTMLElement;
    constructor(src: string, x: number, y: number) {
      h.calls.push(`sticker:${src}:${x},${y}`);
      this.el = document.createElement("div");
    }
    getCenter(): { x: number; y: number } {
      return { x: 0, y: 0 };
    }
    destroy(): void {}
    setImage(): void {}
  },
}));

vi.mock("../../src/hud/Hud", () => ({
  Hud: class {
    attachTo(): void {
      h.calls.push("hud:attach");
    }
    getSettingsButton(): HTMLElement {
      return document.createElement("button");
    }
    getGalleryButton(): HTMLElement {
      return document.createElement("button");
    }
    getAttackButton(): HTMLElement {
      return document.createElement("button");
    }
    onModeChange(): void {}
    onAttackPress(): void {}
    onAttackRelease(): void {}
    destroy(): void {}
  },
}));

vi.mock("../../src/hud/GalleryPanel", () => ({
  GalleryPanel: class {
    attachTo(): void {}
    close(): void {}
    toggle(): void {}
    open(): void {}
    onStickerSelect(): void {}
    onTextSelect(): void {}
    destroy(): void {}
  },
  getStickerDefs: () => [{ src: "/avatars/test.png", label: "Test" }],
}));

vi.mock("../../src/creatures/TextOverlay", () => ({
  TextOverlay: class {
    el: HTMLElement;
    constructor() {
      this.el = document.createElement("div");
    }
    getCenter(): { x: number; y: number } {
      return { x: 0, y: 0 };
    }
    destroy(): void {}
    setFont(): void {}
  },
}));

vi.mock("../../src/creatures/BugSwarm", () => ({
  BugSwarm: class {
    constructor() {}
    setActive(): void {}
  },
}));

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 260));
}

describe("OnboardingCarousel", () => {
  let host: HTMLElement;
  let carousel: OnboardingCarousel;

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(Date.now()), 16),
    );
    host = document.createElement("div");
    document.body.appendChild(host);
    carousel = new OnboardingCarousel();
    carousel.attachTo(host);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  describe("structure", () => {
    it("renders a dialog card, four dots, skip link, and a Next action", () => {
      const card = host.querySelector<HTMLElement>(".onb-card");
      expect(card).toBeTruthy();
      expect(card?.getAttribute("role")).toBe("dialog");
      expect(card?.querySelectorAll(".onb-dot").length).toBe(4);
      const skip = card?.querySelector<HTMLButtonElement>(".onb-skip");
      expect(skip?.textContent).toBe("Skip intro");
      const action = card?.querySelector<HTMLButtonElement>(".onb-action");
      expect(action?.textContent).toBe("Next \u2192");
      expect(action?.classList.contains("onb-action--next")).toBe(true);
    });

    it("shows the first beat copy and a neutral active dot initially", () => {
      const lines = host.querySelectorAll<HTMLElement>(".onb-line");
      expect(lines[0]?.textContent).toBe(BEATS[0].lines[0]);
      expect(lines[1]?.textContent).toBe(BEATS[0].lines[1]);
      const dots = host.querySelectorAll<HTMLElement>(".onb-dot");
      expect(dots[0]?.classList.contains("onb-dot--active")).toBe(true);
      expect(dots[0]?.classList.contains("onb-dot--attack")).toBe(false);
      expect(dots[1]?.classList.contains("onb-dot--active")).toBe(false);
    });
  });

  describe("beat progression", () => {
    it("advances copy and the active dot, then swaps Next for Begin with an attack dot on the final beat", async () => {
      const action = host.querySelector<HTMLButtonElement>(".onb-action");
      const dots = host.querySelectorAll<HTMLElement>(".onb-dot");

      for (let i = 1; i < BEATS.length; i++) {
        action?.click();
        await settle();
        const lines = host.querySelectorAll<HTMLElement>(".onb-line");
        expect(lines[0]?.textContent).toBe(BEATS[i].lines[0]);
        expect(lines[1]?.textContent).toBe(BEATS[i].lines[1]);
        dots.forEach((d, di) => {
          const isActive = di === i;
          expect(d.classList.contains("onb-dot--active")).toBe(
            isActive && i !== BEATS.length - 1,
          );
          expect(d.classList.contains("onb-dot--attack")).toBe(isActive && i === BEATS.length - 1);
        });
      }

      expect(action?.textContent).toBe("Begin");
      expect(action?.classList.contains("onb-action--begin")).toBe(true);
    });

    it("keeps the card's own classes stable across beats", async () => {
      const card = host.querySelector<HTMLElement>(".onb-card");
      const before = card?.className;
      const action = host.querySelector<HTMLButtonElement>(".onb-action");
      action?.click();
      await settle();
      expect(card?.className).toBe(before);
      expect(card?.querySelector(".onb-line")).toBeTruthy();
    });

    it("matches the spec copy verbatim for all four beats", () => {
      expect(BEATS).toHaveLength(4);
      expect(BEATS[0].lines).toEqual([
        "Someone with a podium and a title looked down at all of us and picked a word.",
        "Small. Disposable. Something you step on.",
      ]);
      expect(BEATS[1].lines).toEqual([
        "We didn't argue. We didn't ask for the word back.",
        "We just... kept it. Turned out it fit better than they meant it to.",
      ]);
      expect(BEATS[2].lines).toEqual([
        "They're used to being watched from a distance \u2014 a podium, a headline, a screen.",
        "Not from this close. Not surrounded.",
      ]);
      expect(BEATS[3].lines).toEqual([
        "This is the crowd now. It doesn't have a face \u2014 it has thousands.",
        "Move. They'll notice.",
      ]);
    });
  });

  describe("completion", () => {
    it("Skip fires onComplete once with the card center and removes the card", () => {
      const card = host.querySelector<HTMLElement>(".onb-card");
      vi.spyOn(card!, "getBoundingClientRect").mockReturnValue(rect(100, 60, 520, 380));
      const callback = vi.fn();
      carousel.onComplete(callback);

      host.querySelector<HTMLButtonElement>(".onb-skip")?.click();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ x: 360, y: 250 });
      expect(host.querySelector(".onb-card")).toBeFalsy();
    });

    it("Begin on the final beat fires onComplete", async () => {
      const card = host.querySelector<HTMLElement>(".onb-card");
      vi.spyOn(card!, "getBoundingClientRect").mockReturnValue(rect(100, 60, 520, 380));
      const callback = vi.fn();
      carousel.onComplete(callback);

      const action = host.querySelector<HTMLButtonElement>(".onb-action");
      for (let i = 1; i < BEATS.length; i++) {
        action?.click();
        await settle();
      }
      action?.click();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ x: 360, y: 250 });
    });

    it("is one-shot: later clicks do not fire again", () => {
      vi.spyOn(host.querySelector<HTMLElement>(".onb-card")!, "getBoundingClientRect").mockReturnValue(
        rect(100, 60, 520, 380),
      );
      const callback = vi.fn();
      carousel.onComplete(callback);

      host.querySelector<HTMLButtonElement>(".onb-skip")?.click();
      host.querySelector<HTMLButtonElement>(".onb-skip")?.click();

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

describe("main.ts onboarding wiring (mocked modules)", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(Date.now()), 16),
    );
    h.calls.length = 0;
    h.engines.length = 0;
    h.resolvePoof.fn = null;
    document.body.innerHTML = '<div id="stage"></div><div id="hud-root"></div>';
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("seeds a small crowd at 60, sets the card repulsor, and defers the HUD", async () => {
    await import("../../src/main");
    await vi.waitFor(() => expect(document.querySelector(".onb-card")).toBeTruthy());

    expect(h.calls).toContain("grid:new:cockroach:60");
    expect(h.calls).toContain("grid:setRepulsor:512,384");
    expect(h.calls).not.toContain("hud:attach");
    expect(h.calls).not.toContain("grid:setQuantity");
  });

  it("crowd follows the pointer during onboarding", async () => {
    await import("../../src/main");
    await vi.waitFor(() => expect(document.querySelector(".onb-card")).toBeTruthy());

    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 123, clientY: 456 }));
    h.engines.at(-1)?.tick();

    expect(h.calls).toContain("grid:update:123,456");
  });

  it("runs the exit sequence in order: poof, sticker, HUD, then full crowd", async () => {
    await import("../../src/main");
    await vi.waitFor(() => expect(document.querySelector(".onb-card")).toBeTruthy());

    const card = document.querySelector<HTMLElement>(".onb-card")!;
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue(rect(100, 60, 360, 520));
    card.querySelector<HTMLButtonElement>(".onb-skip")?.click();

    await vi.waitFor(() => expect(h.calls).toContain("poof:280,320"));
    expect(h.calls.some((c) => c.startsWith("sticker:"))).toBe(false);
    expect(h.calls).not.toContain("hud:attach");

    h.resolvePoof.fn?.();
    await vi.waitFor(() => expect(h.calls).toContain("sticker:/avatars/test.png:200,240"));
    await vi.waitFor(() => expect(h.calls).toContain("hud:attach"));

    const poofIdx = h.calls.indexOf("poof:280,320");
    const stickerIdx = h.calls.findIndex((c) => c.startsWith("sticker:"));
    const hudIdx = h.calls.indexOf("hud:attach");
    const clearRepulsorIdx = h.calls.indexOf("grid:clearRepulsor");
    const setQuantityIdx = h.calls.indexOf("grid:setQuantity:300");
    expect(poofIdx).toBeLessThan(stickerIdx);
    expect(stickerIdx).toBeLessThan(hudIdx);
    expect(clearRepulsorIdx).toBeGreaterThan(hudIdx);
    expect(setQuantityIdx).toBeGreaterThan(clearRepulsorIdx);
    expect(document.querySelector(".onb-card")).toBeFalsy();
    expect(document.querySelector("img")).toBeFalsy();
  });
});
