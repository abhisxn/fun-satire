// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioWidget } from "../../src/audio/AudioWidget";
import type { SoundBedControl } from "../../src/audio/AudioWidget";

function createFakeControl(overrides: Partial<SoundBedControl> = {}): SoundBedControl {
  let playing = false;
  let muted = false;
  let volume = 0.5;

  return {
    play: vi.fn(async () => {
      playing = true;
    }),
    pause: vi.fn(() => {
      playing = false;
    }),
    isPlaying: vi.fn(() => playing),
    setVolume: vi.fn((v: number) => {
      volume = v;
    }),
    getVolume: vi.fn(() => volume),
    setMuted: vi.fn((m: boolean) => {
      muted = m;
    }),
    isMuted: vi.fn(() => muted),
    ...overrides,
  };
}

describe("AudioWidget", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it("renders a toggle button and a volume slider", () => {
    const control = createFakeControl();
    const widget = new AudioWidget(control);
    widget.attachTo(host);

    expect(host.querySelector(".audio-widget")).toBeTruthy();
    expect(widget.getToggleButton()).toBeTruthy();
    expect(host.querySelector('input[type="range"]')).toBeTruthy();
  });

  it("initializes the volume slider from the control's current volume", () => {
    const control = createFakeControl({ getVolume: vi.fn(() => 0.73) });
    const widget = new AudioWidget(control);
    widget.attachTo(host);

    const input = host.querySelector('input[type="range"]') as HTMLInputElement;
    expect(input.value).toBe("0.73");
  });

  it("forwards volume slider input to the control", () => {
    const control = createFakeControl();
    const widget = new AudioWidget(control);
    widget.attachTo(host);

    const input = host.querySelector('input[type="range"]') as HTMLInputElement;
    input.value = "0.9";
    input.dispatchEvent(new Event("input"));

    expect(control.setVolume).toHaveBeenCalledWith(0.9);
  });

  it("shows the off icon and aria-pressed=false when playback never started", () => {
    const control = createFakeControl();
    const widget = new AudioWidget(control);
    widget.attachTo(host);

    expect(widget.getToggleButton().getAttribute("aria-pressed")).toBe("false");
  });

  describe("attemptAutoplay", () => {
    it("reflects playing=true when autoplay succeeds", async () => {
      const control = createFakeControl();
      const widget = new AudioWidget(control);
      widget.attachTo(host);

      await widget.attemptAutoplay();

      expect(control.play).toHaveBeenCalledTimes(1);
      expect(widget.getToggleButton().getAttribute("aria-pressed")).toBe("true");
    });

    it("stays off and arms a gesture retry when autoplay is blocked", async () => {
      const control = createFakeControl({ play: vi.fn(async () => { throw new Error("blocked"); }) });
      const widget = new AudioWidget(control);
      widget.attachTo(host);

      await widget.attemptAutoplay();

      expect(widget.getToggleButton().getAttribute("aria-pressed")).toBe("false");
    });

    it("retries playback on the next pointerdown after a blocked autoplay attempt", async () => {
      let shouldBlock = true;
      let playingState = false;
      const control = createFakeControl({
        play: vi.fn(async () => {
          if (shouldBlock) throw new Error("blocked");
          playingState = true;
        }),
        isPlaying: vi.fn(() => playingState),
      });
      const widget = new AudioWidget(control);
      widget.attachTo(host);

      await widget.attemptAutoplay();
      expect(widget.getToggleButton().getAttribute("aria-pressed")).toBe("false");

      shouldBlock = false;
      window.dispatchEvent(new Event("pointerdown"));
      // Let the retry's promise chain resolve.
      await Promise.resolve();
      await Promise.resolve();

      expect(control.play).toHaveBeenCalledTimes(2);
      expect(widget.getToggleButton().getAttribute("aria-pressed")).toBe("true");
    });
  });

  describe("toggle click", () => {
    it("mutes (keeps playing) when clicked while audibly on", async () => {
      const control = createFakeControl();
      await control.play();
      const widget = new AudioWidget(control);
      widget.attachTo(host);
      widget.getToggleButton().dispatchEvent(new Event("click", { bubbles: true }));
      await Promise.resolve();

      expect(control.setMuted).toHaveBeenCalledWith(true);
      expect(control.pause).not.toHaveBeenCalled();
      expect(widget.getToggleButton().getAttribute("aria-pressed")).toBe("false");
    });

    it("unmutes when clicked while playing-but-muted", async () => {
      const control = createFakeControl();
      await control.play();
      control.setMuted(true);
      const widget = new AudioWidget(control);
      widget.attachTo(host);

      widget.getToggleButton().dispatchEvent(new Event("click", { bubbles: true }));
      await Promise.resolve();

      expect(control.setMuted).toHaveBeenLastCalledWith(false);
      expect(widget.getToggleButton().getAttribute("aria-pressed")).toBe("true");
    });

    it("starts playback (a real user gesture) when clicked before autoplay ever succeeded", async () => {
      const control = createFakeControl();
      const widget = new AudioWidget(control);
      widget.attachTo(host);

      widget.getToggleButton().dispatchEvent(new Event("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();

      expect(control.play).toHaveBeenCalledTimes(1);
      expect(widget.getToggleButton().getAttribute("aria-pressed")).toBe("true");
    });

    it("never reports playing when the control itself is not actually playing (icon never lies)", async () => {
      const control = createFakeControl({
        play: vi.fn(async () => {
          throw new Error("still blocked, e.g. no real user gesture reached the browser");
        }),
      });
      const widget = new AudioWidget(control);
      widget.attachTo(host);

      widget.getToggleButton().dispatchEvent(new Event("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();

      expect(widget.getToggleButton().getAttribute("aria-pressed")).toBe("false");
    });
  });

  it("destroy() removes the widget from the DOM", () => {
    const control = createFakeControl();
    const widget = new AudioWidget(control);
    widget.attachTo(host);

    widget.destroy();

    expect(host.querySelector(".audio-widget")).toBeNull();
  });
});
