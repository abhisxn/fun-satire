# Mobile Pinch-Scale, Audio Crossfade, and Text-Edit HUD-Overlap Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three mobile issues reported on iPhone 13: (1) sticker/text resize handles are invisible and undiscoverable on touch, replace/augment with two-finger pinch-to-scale; (2) the HUD toolbar visually overlaps the on-screen keyboard/text editor while editing text, making typed text unreadable; (3) the background audio bed sometimes plays two loops on top of each other.

**Architecture:** Task A is a pure root-cause bug fix in `AudioManager`'s crossfade scheduler (a `requestAnimationFrame`-driven fade silently freezes when the tab is backgrounded, since rAF callbacks stop firing while `document.hidden`, leaving both audio beds partially audible until the page regains focus). Task B hides the HUD toolbar and menu button while the text editor has focus, mirroring the existing pattern that already hides the menu button while a panel is open. Task C adds a new shared `pinchZoom.ts` gesture utility (two-finger distance ratio → scale factor), wires it into `StickerOverlay` and `TextOverlay`, and makes the existing resize handles visible by default on touch devices (they currently only appear on `mouseenter`, which never fires on touch).

**Tech Stack:** TypeScript, native DOM Touch/Pointer events, Vitest + happy-dom for unit tests (this codebase already dispatches `new TouchEvent(...)` / `new Touch(...)` in happy-dom — see `tests/unit/makeDraggable.test.ts`).

---

## Root cause summary (read before starting)

- **Audio double-loop (Task A):** `AudioManager.startCrossfade()` (`src/audio/AudioManager.ts`) starts both `<audio>` beds playing and schedules a `requestAnimationFrame` loop (`tickCrossfade()`) that ramps their volumes over 2.5s. Browsers stop firing `requestAnimationFrame` callbacks while the document is hidden (tab backgrounded / app switched away / phone locked), but the underlying `<audio>` elements keep playing regardless. If the user backgrounds the page during that 2.5s window, the fade freezes at whatever partial mix it was at (e.g. both beds at ~50% volume) and stays frozen — both loops audible together — until the user returns to the page and the next rAF tick fires. This is the "sometimes I hear multiple audio loops playing on top of each other" report: it only happens when backgrounding coincides with the ~2.5s crossfade window near a loop boundary.
- **Text edit HUD overlap (Task B):** `.premium-hud` and `.hud-menu-btn` are `position: fixed`, always visible. Nothing hides them while a `TextOverlay`'s `contenteditable` editor is focused, so on mobile (where the on-screen keyboard shrinks the visible area) the HUD toolbar sits on top of the area the user is typing into. `main.ts` already has a precedent for this exact pattern — `syncMenuButtonVisibility()` hides the menu button while a panel is open — this task extends the same idea to text editing.
- **Invisible scale handles (Task C):** `StickerOverlay`'s `.sticker-overlay-resize` and `TextOverlay`'s `.text-overlay-resize` handles start at `opacity: 0` and only reveal via `mouseenter`/`mouseleave` listeners on the parent element (`src/creatures/StickerOverlay.ts:89-94`, `src/creatures/TextOverlay.ts:118-125`). Touch devices never fire `mouseenter`, so the handles are permanently invisible there — confirmed by the user ("scale handles also not visible"). The only way to resize today is a blind drag on an invisible 14px circle. This task adds two-finger pinch-to-scale (the natural mobile gesture) and makes the handles visible by default on touch devices as a visible fallback.

---

## Task A: Fix audio crossfade freezing (and playing two loops) when the page is backgrounded

**Files:**
- Modify: `src/audio/AudioManager.ts`
- Test: `tests/unit/audioManager.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `tests/unit/audioManager.test.ts` (inside the existing `describe("AudioManager", ...)` block, after the last `it(...)`):

```ts
  it("completes an in-progress crossfade immediately when the page is backgrounded, instead of leaving both beds audible", async () => {
    const manager = new AudioManager();
    await manager.play();

    const internals = manager as unknown as {
      beds: readonly [HTMLAudioElement, HTMLAudioElement];
      activeIndex: 0 | 1;
      crossfadeState: { readonly standbyIndex: 0 | 1; readonly startedAtMs: number } | null;
      startCrossfade(): void;
    };

    internals.startCrossfade();
    expect(internals.crossfadeState).not.toBeNull();
    const standbyIndex = internals.crossfadeState!.standbyIndex;
    const outgoingIndex = internals.activeIndex;

    // Simulate the fade being mid-flight when the tab is backgrounded: both
    // beds partially audible (as tickCrossfade() would have left them).
    internals.beds[outgoingIndex].volume = 0.08;
    internals.beds[standbyIndex].volume = 0.08;

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    // Crossfade must resolve synchronously on backgrounding: exactly one bed
    // left audible, the other paused and reset, no lingering fade state.
    expect(internals.crossfadeState).toBeNull();
    expect(internals.activeIndex).toBe(standbyIndex);
    expect(internals.beds[standbyIndex].volume).toBeCloseTo(manager.getVolume());
    expect(internals.beds[outgoingIndex].paused).toBe(true);
    expect(internals.beds[outgoingIndex].volume).toBe(0);

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/audioManager.test.ts -t "completes an in-progress crossfade"`
Expected: FAIL — `crossfadeState` is still non-null (nothing currently listens for `visibilitychange`), or `startCrossfade`/`crossfadeState` typing errors if not accessible (they are private but accessible via the same `as unknown as {...}` cast pattern already used elsewhere in this file, so it should compile).

- [ ] **Step 3: Implement the fix**

In `src/audio/AudioManager.ts`, the constructor currently ends with:

```ts
  constructor(options: AudioManagerOptions = {}) {
    const src = options.src ?? AUDIO_BED_SRC;
    this.volume = clampVolume(options.volume ?? 0.5);
    this.beds = [this.createBed(src), this.createBed(src)];
  }
```

Replace it with (adds a bound handler field + registration):

```ts
  constructor(options: AudioManagerOptions = {}) {
    const src = options.src ?? AUDIO_BED_SRC;
    this.volume = clampVolume(options.volume ?? 0.5);
    this.beds = [this.createBed(src), this.createBed(src)];
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }
```

Add the bound handler as a field, next to the existing `onTimeUpdate`/`retryContextResume` field declarations near the top of the class:

```ts
  private readonly onTimeUpdate = (): void => this.checkCrossfadeTrigger();
  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.resolveCrossfadeImmediately();
  };
```

(Insert `onVisibilityChange` directly below the existing `onTimeUpdate` field — both are instance fields using the same "bound arrow function property" pattern already used in this file.)

Add the new private method, placed right after `tickCrossfade()`:

```ts
  /**
   * Snaps an in-progress crossfade straight to its end state instead of
   * leaving it to the next requestAnimationFrame tick — rAF stops firing
   * while the document is hidden, so without this an in-flight fade freezes
   * mid-mix (both beds partially audible) for as long as the tab stays
   * backgrounded.
   */
  private resolveCrossfadeImmediately(): void {
    const state = this.crossfadeState;
    if (!state) return;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.cancelVolumeRamp();

    const outgoing = this.beds[this.activeIndex];
    outgoing.pause();
    outgoing.currentTime = 0;
    outgoing.volume = 0;

    this.beds[state.standbyIndex].volume = this.effectiveVolume();
    this.activeIndex = state.standbyIndex;
    this.crossfadeState = null;
  }
```

Finally, register cleanup in `destroy()`. Find:

```ts
  destroy(): void {
    this.disarmContextResumeRetry();
    this.cancelCrossfade();
    this.cancelVolumeRamp();
```

Replace with:

```ts
  destroy(): void {
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.disarmContextResumeRetry();
    this.cancelCrossfade();
    this.cancelVolumeRamp();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/audioManager.test.ts`
Expected: PASS — all tests in the file, including the new one.

- [ ] **Step 5: Run full unit suite to check for regressions**

Run: `npm test`
Expected: same pass/fail counts as the pre-existing baseline on `main` (17 unrelated pre-existing failures in `onboardingCarousel.test.ts` about beat copy/exit-sequence ordering — do not touch those). No new failures.

- [ ] **Step 6: Commit**

```bash
git add src/audio/AudioManager.ts tests/unit/audioManager.test.ts
git commit -m "fix: resolve audio crossfade freeze that caused overlapping loops when backgrounded"
```

---

## Task B: Hide the HUD toolbar and menu button while the text editor is focused

**Files:**
- Modify: `src/hud/Hud.ts`
- Modify: `src/hud/hud.css`
- Modify: `src/main.ts`
- Test: `tests/unit/hud.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `tests/unit/hud.test.ts`. First check the file's existing structure (it has a top-level `describe("Hud", ...)` with nested `describe("DOM structure", ...)` etc. — add a new nested `describe` block at the same level, right before the final closing `});` of the outer `describe("Hud", ...)`):

```ts
  describe("hide/show", () => {
    it("hides the toolbar via a CSS class and reports it back through the API", () => {
      const root = host.querySelector<HTMLElement>(".premium-hud")!;
      expect(root.classList.contains("hidden")).toBe(false);

      hud.hide();
      expect(root.classList.contains("hidden")).toBe(true);

      hud.show();
      expect(root.classList.contains("hidden")).toBe(false);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/hud.test.ts -t "hides the toolbar"`
Expected: FAIL with `hud.hide is not a function`.

- [ ] **Step 3: Add hide()/show() to Hud**

In `src/hud/Hud.ts`, find the existing `destroy()` method:

```ts
  destroy(): void {
    this.detachDragListeners();
    this.root.remove();
  }
```

Add two new public methods directly after it (mirrors `MenuButton.hide()`/`show()` in `src/hud/MenuButton.ts:40-46`):

```ts
  hide(): void {
    this.root.classList.add("hidden");
  }

  show(): void {
    this.root.classList.remove("hidden");
  }
```

- [ ] **Step 4: Add the CSS**

In `src/hud/hud.css`, find the drag-state rules near the bottom:

```css
.premium-hud.hud--dragging,
.premium-hud.hud--dragging:hover {
  transform: none;
  transition: none;
  animation: none;
}
```

Add a new rule directly above it:

```css
/* Hidden while the text editor (TextOverlay) has focus on mobile — the
   fixed-position toolbar would otherwise sit on top of the on-screen
   keyboard/typed text. Mirrors .hud-menu-btn.hidden in menuButton.css. */
.premium-hud.hidden {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s var(--hud-ease-smooth);
}

.premium-hud.hud--dragging,
.premium-hud.hud--dragging:hover {
  transform: none;
  transition: none;
  animation: none;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/hud.test.ts`
Expected: PASS — all tests in the file.

- [ ] **Step 6: Wire hide/show to text-editor focus/blur in main.ts**

In `src/main.ts`, inside `mountPostOnboarding()`, find the `galleryPanel.onTextSelect` handler:

```ts
    galleryPanel.onTextSelect((font) => {
      if (activeOverlay instanceof TextOverlay) {
        const overlay = activeOverlay;
        const poof = poofElement(overlay.el);
        void poof.covered.then(() => {
          overlay.el.style.visibility = "hidden";
        });
        void poof.done.then(() => {
          overlay.setFont(font);
          overlay.el.style.visibility = "visible";
        });
        return;
      }
      const text = new TextOverlay(
        font,
        undefined,
        undefined,
        onOverlayDragStart,
        onOverlayDragEnd,
        onOverlayDragMove,
      );
      void replaceOverlay(text);
    });
```

Replace the `const text = new TextOverlay(...)` branch with a version that wires focus/blur on the new overlay's editor:

```ts
      const text = new TextOverlay(
        font,
        undefined,
        undefined,
        onOverlayDragStart,
        onOverlayDragEnd,
        onOverlayDragMove,
      );
      const editor = text.getEditor();
      editor.addEventListener("focus", () => {
        hud.hide();
        menuButton.hide();
      });
      editor.addEventListener("blur", () => {
        hud.show();
        syncMenuButtonVisibility();
      });
      void replaceOverlay(text);
```

(`hud`, `menuButton`, and `syncMenuButtonVisibility` are all already in scope inside `mountPostOnboarding()` — no new imports needed. `blur` calls `syncMenuButtonVisibility()` rather than `menuButton.show()` directly so the menu button correctly stays hidden if a gallery/menu panel happens to be open at the same time.)

- [ ] **Step 7: Verify no regressions in the mocked onboarding wiring test**

Run: `npx vitest run tests/unit/onboardingCarousel.test.ts`
Expected: same result as the pre-existing baseline (the `TextOverlay` mock in that file never has its `onTextSelect` callback actually invoked, since `GalleryPanel`'s mock `onTextSelect(): void {}` is a no-op that doesn't store/call the callback — so this new code path inside the callback body never executes during that test, and it should pass/fail exactly as it did before this change).

- [ ] **Step 8: Human test in browser (required — this touches `hud/`)**

Run `npm run dev`, open the app in a mobile-width browser (or actual phone), drop a text sticker, tap into the text editor, and confirm the HUD toolbar and hamburger menu button disappear while typing and reappear when you tap away/blur. Also confirm the resize/drag handles and existing text editing still work.

- [ ] **Step 9: Commit**

```bash
git add src/hud/Hud.ts src/hud/hud.css src/main.ts tests/unit/hud.test.ts
git commit -m "fix: hide HUD toolbar while text editor is focused to stop it overlapping typed text on mobile"
```

---

## Task C: Two-finger pinch-to-scale for stickers and text, plus always-visible resize handles on touch

**Files:**
- Create: `src/creatures/pinchZoom.ts`
- Create: `src/creatures/touchSupport.ts`
- Test: `tests/unit/pinchZoom.test.ts`
- Test: `tests/unit/touchSupport.test.ts`
- Modify: `src/creatures/makeDraggable.ts`
- Modify: `src/creatures/StickerOverlay.ts`
- Modify: `src/creatures/TextOverlay.ts`
- Modify: `tests/unit/makeDraggable.test.ts`
- Modify: `tests/unit/stickerOverlay.test.ts`
- Modify: `tests/unit/textOverlay.test.ts`

### Step 1: `touchSupport.ts` — shared touch-device detection

- [ ] **Write the failing test**

Create `tests/unit/touchSupport.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { isTouchDevice } from "../../src/creatures/touchSupport";

describe("touchSupport/isTouchDevice", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "ontouchstart");
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, configurable: true });
  });

  it("returns true when the window exposes ontouchstart", () => {
    Object.defineProperty(window, "ontouchstart", { value: null, configurable: true });
    expect(isTouchDevice()).toBe(true);
  });

  it("returns true when navigator.maxTouchPoints is greater than 0", () => {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    expect(isTouchDevice()).toBe(true);
  });

  it("returns false when neither touch signal is present", () => {
    expect(isTouchDevice()).toBe(false);
  });
});
```

- [ ] **Run test to verify it fails**

Run: `npx vitest run tests/unit/touchSupport.test.ts`
Expected: FAIL — module `../../src/creatures/touchSupport` does not exist.

- [ ] **Implement**

Create `src/creatures/touchSupport.ts`:

```ts
/** True on touch-capable devices (phones/tablets), where hover-only affordances (mouseenter/mouseleave) never fire. */
export function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
```

- [ ] **Run test to verify it passes**

Run: `npx vitest run tests/unit/touchSupport.test.ts`
Expected: PASS.

- [ ] **Commit**

```bash
git add src/creatures/touchSupport.ts tests/unit/touchSupport.test.ts
git commit -m "feat: add isTouchDevice helper for touch-only UI affordances"
```

### Step 2: `pinchZoom.ts` — shared two-finger scale gesture

- [ ] **Write the failing test**

Create `tests/unit/pinchZoom.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { attachPinchZoom } from "../../src/creatures/pinchZoom";

function touch(id: number, target: EventTarget, clientX: number, clientY: number): Touch {
  return new Touch({ identifier: id, target, clientX, clientY });
}

describe("pinchZoom/attachPinchZoom", () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    el = document.createElement("div");
    document.body.appendChild(el);
  });

  it("ignores a single-finger touchstart (leaves it for drag handling)", () => {
    const onScale = vi.fn();
    const onPinchStart = vi.fn();
    const handle = attachPinchZoom(el, onScale, onPinchStart);
    handle.attach();

    el.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [touch(0, el, 0, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onPinchStart).not.toHaveBeenCalled();
    handle.detach();
  });

  it("reports a scale factor of 2 when the two-finger distance doubles", () => {
    const onScale = vi.fn();
    const onPinchStart = vi.fn();
    const handle = attachPinchZoom(el, onScale, onPinchStart);
    handle.attach();

    // Start 100px apart (distance = 100).
    el.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [touch(0, el, 0, 0), touch(1, el, 100, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onPinchStart).toHaveBeenCalledTimes(1);

    // Move to 200px apart (distance = 200 -> factor 2).
    document.dispatchEvent(
      new TouchEvent("touchmove", {
        touches: [touch(0, el, 0, 0), touch(1, el, 200, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onScale).toHaveBeenCalledTimes(1);
    expect(onScale.mock.calls[0]![0]).toBeCloseTo(2);
    handle.detach();
  });

  it("ends the pinch (and fires onPinchEnd) when a finger lifts", () => {
    const onScale = vi.fn();
    const onPinchEnd = vi.fn();
    const handle = attachPinchZoom(el, onScale, undefined, onPinchEnd);
    handle.attach();

    el.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [touch(0, el, 0, 0), touch(1, el, 100, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );
    document.dispatchEvent(
      new TouchEvent("touchend", {
        touches: [touch(0, el, 0, 0)],
        changedTouches: [touch(1, el, 100, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onPinchEnd).toHaveBeenCalledTimes(1);
    handle.detach();
  });

  it("stops firing onScale after detach", () => {
    const onScale = vi.fn();
    const handle = attachPinchZoom(el, onScale);
    handle.attach();
    handle.detach();

    el.dispatchEvent(
      new TouchEvent("touchstart", {
        touches: [touch(0, el, 0, 0), touch(1, el, 100, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );
    document.dispatchEvent(
      new TouchEvent("touchmove", {
        touches: [touch(0, el, 0, 0), touch(1, el, 300, 0)],
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onScale).not.toHaveBeenCalled();
  });
});
```

- [ ] **Run test to verify it fails**

Run: `npx vitest run tests/unit/pinchZoom.test.ts`
Expected: FAIL — module `../../src/creatures/pinchZoom` does not exist.

- [ ] **Implement**

Create `src/creatures/pinchZoom.ts`:

```ts
export interface PinchZoomHandle {
  attach(): void;
  detach(): void;
}

function distance(a: Touch, b: Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

/**
 * Two-finger pinch-to-scale gesture. Calls onScale(factor) on every
 * touchmove with exactly two fingers down, where factor is the current
 * inter-finger distance divided by the distance when the pinch started (so
 * 2 means "twice as far apart as the start of the gesture", not a delta
 * since the last event) — callers multiply their own start-of-gesture size
 * by this factor, same shape as the existing corner-handle resize drag.
 * Single-finger touches are ignored entirely so this can coexist with a
 * one-finger drag gesture registered on the same or a related element.
 */
export function attachPinchZoom(
  el: HTMLElement,
  onScale: (factor: number) => void,
  onPinchStart?: () => void,
  onPinchEnd?: () => void,
): PinchZoomHandle {
  let pinching = false;
  let startDistance = 0;

  const handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    pinching = true;
    startDistance = distance(e.touches[0]!, e.touches[1]!);
    onPinchStart?.();
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (!pinching) return;
    if (e.touches.length !== 2) {
      pinching = false;
      onPinchEnd?.();
      return;
    }
    e.preventDefault();
    if (startDistance <= 0) return;
    const current = distance(e.touches[0]!, e.touches[1]!);
    onScale(current / startDistance);
  };

  const handleTouchEnd = (e: TouchEvent): void => {
    if (!pinching) return;
    if (e.touches.length < 2) {
      pinching = false;
      onPinchEnd?.();
    }
  };

  return {
    attach(): void {
      el.addEventListener("touchstart", handleTouchStart, { passive: false });
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
      document.addEventListener("touchcancel", handleTouchEnd);
    },
    detach(): void {
      el.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
    },
  };
}
```

- [ ] **Run test to verify it passes**

Run: `npx vitest run tests/unit/pinchZoom.test.ts`
Expected: PASS — all 4 tests.

- [ ] **Commit**

```bash
git add src/creatures/pinchZoom.ts tests/unit/pinchZoom.test.ts
git commit -m "feat: add attachPinchZoom two-finger scale gesture utility"
```

### Step 3: Make `makeDraggable.ts` yield to a second finger

Single-finger drag and two-finger pinch will both be registered on `StickerOverlay`'s root element (`this.el`). Without this change, `attachDrag`'s touch handlers don't check finger count, so a second finger landing mid-drag would corrupt the drag position (it only ever reads `e.touches[0]`, silently ignoring the rest) instead of cleanly handing off to the pinch gesture.

- [ ] **Write the failing test**

Add this test to `tests/unit/makeDraggable.test.ts`, inside the existing `describe('touch drag', ...)` block, after the existing test:

```ts
    it('cancels the drag when a second finger touches down mid-drag', () => {
      const onMove = vi.fn();
      const handle = attachDrag(el, { x: 100, y: 200 }, onMove);
      handle.attach();

      const mockRect = { left: 100, top: 200, right: 240, bottom: 340, width: 140, height: 140, x: 100, y: 200, toJSON: () => ({}) };
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(mockRect);

      el.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: el, clientX: 120, clientY: 220 })],
        bubbles: true,
        cancelable: true,
      }));
      expect(handle.isDragging()).toBe(true);

      // A second finger joins: drag must cancel, not silently keep tracking touches[0].
      document.dispatchEvent(new TouchEvent('touchmove', {
        touches: [
          new Touch({ identifier: 0, target: el, clientX: 150, clientY: 250 }),
          new Touch({ identifier: 1, target: el, clientX: 300, clientY: 250 }),
        ],
        bubbles: true,
        cancelable: true,
      }));

      expect(handle.isDragging()).toBe(false);
      expect(el.classList.contains('dragging')).toBe(false);

      handle.detach();
    });

    it('ignores touchstart when two fingers land at once', () => {
      const handle = attachDrag(el, { x: 0, y: 0 });
      handle.attach();

      el.dispatchEvent(new TouchEvent('touchstart', {
        touches: [
          new Touch({ identifier: 0, target: el, clientX: 0, clientY: 0 }),
          new Touch({ identifier: 1, target: el, clientX: 100, clientY: 0 }),
        ],
        bubbles: true,
        cancelable: true,
      }));

      expect(handle.isDragging()).toBe(false);
      handle.detach();
    });
```

- [ ] **Run test to verify it fails**

Run: `npx vitest run tests/unit/makeDraggable.test.ts -t "second finger"`
Expected: FAIL — `handleTouchStart`/`handleTouchMove` currently start/continue dragging regardless of finger count.

- [ ] **Implement**

In `src/creatures/makeDraggable.ts`, find:

```ts
  const handleTouchStart = (e: TouchEvent): void => {
    dragging = true;
    target.classList.add('dragging');
    const rect = target.getBoundingClientRect();
    const t = e.touches[0];
    if (!t) return;
    offsetX = t.clientX - rect.left;
    offsetY = t.clientY - rect.top;
    e.preventDefault();
    dragStartCb();
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (!dragging) return;
    const t = e.touches[0];
    if (!t) return;
    x = t.clientX - offsetX;
    y = t.clientY - offsetY;
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    updateSnapGuides(target);
    moveCb(x, y);
  };
```

Replace with:

```ts
  const handleTouchStart = (e: TouchEvent): void => {
    // A second finger means the user is pinching (see pinchZoom.ts), not
    // dragging — leave multi-touch starts alone.
    if (e.touches.length !== 1) return;
    dragging = true;
    target.classList.add('dragging');
    const rect = target.getBoundingClientRect();
    const t = e.touches[0];
    if (!t) return;
    offsetX = t.clientX - rect.left;
    offsetY = t.clientY - rect.top;
    e.preventDefault();
    dragStartCb();
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (!dragging) return;
    // A second finger joined mid-drag: hand off to the pinch gesture
    // instead of silently tracking only touches[0].
    if (e.touches.length !== 1) {
      finalize();
      return;
    }
    const t = e.touches[0];
    if (!t) return;
    x = t.clientX - offsetX;
    y = t.clientY - offsetY;
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    updateSnapGuides(target);
    moveCb(x, y);
  };
```

- [ ] **Run test to verify it passes**

Run: `npx vitest run tests/unit/makeDraggable.test.ts`
Expected: PASS — all tests in the file (including the pre-existing single-finger drag test, unaffected since it always dispatches exactly one touch).

- [ ] **Commit**

```bash
git add src/creatures/makeDraggable.ts tests/unit/makeDraggable.test.ts
git commit -m "fix: cancel drag instead of misreading position when a second finger joins mid-drag"
```

### Step 4: Wire pinch-to-scale + always-visible handles into `StickerOverlay`

- [ ] **Write the failing test**

Add these tests to `tests/unit/stickerOverlay.test.ts`, after the existing `'resize handle clamps width within bounds'` test:

```ts
  it('scales via two-finger pinch, clamped within bounds', () => {
    const s = new StickerOverlay('/avatars/ethanol.png', 100, 100);

    s.el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [
        new Touch({ identifier: 0, target: s.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: s.el, clientX: 100, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));
    document.dispatchEvent(new TouchEvent('touchmove', {
      touches: [
        new Touch({ identifier: 0, target: s.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: s.el, clientX: 200, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));

    // Default width is 160; pinch factor 2 -> 320, within [48, 480].
    expect(parseFloat(s.el.querySelector('img')!.style.width)).toBeCloseTo(320);
  });

  it('clamps pinch scaling within MIN_WIDTH/MAX_WIDTH bounds', () => {
    const s = new StickerOverlay('/avatars/ethanol.png', 100, 100);

    s.el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [
        new Touch({ identifier: 0, target: s.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: s.el, clientX: 100, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));
    document.dispatchEvent(new TouchEvent('touchmove', {
      touches: [
        new Touch({ identifier: 0, target: s.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: s.el, clientX: 10000, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));

    expect(parseFloat(s.el.querySelector('img')!.style.width)).toBeLessThanOrEqual(480);
  });

  it('shows the resize handle by default on touch devices instead of relying on hover', () => {
    Object.defineProperty(window, 'ontouchstart', { value: null, configurable: true });
    const s = new StickerOverlay('/avatars/ethanol.png');
    const handle = s.el.querySelector<HTMLElement>('.sticker-overlay-resize')!;
    expect(handle.style.opacity).toBe('1');
    Reflect.deleteProperty(window, 'ontouchstart');
  });
```

- [ ] **Run test to verify it fails**

Run: `npx vitest run tests/unit/stickerOverlay.test.ts`
Expected: FAIL — pinch tests fail because no pinch listener exists yet; handle-visibility test fails because opacity starts at `'0'`.

- [ ] **Implement**

In `src/creatures/StickerOverlay.ts`, update the imports at the top:

```ts
import { attachDrag } from "./makeDraggable";
import type { DragHandle } from "./makeDraggable";
```

Replace with:

```ts
import { attachDrag } from "./makeDraggable";
import type { DragHandle } from "./makeDraggable";
import { attachPinchZoom } from "./pinchZoom";
import type { PinchZoomHandle } from "./pinchZoom";
import { isTouchDevice } from "./touchSupport";
```

Add a new field next to the existing `private readonly drag: DragHandle;`:

```ts
  private readonly drag: DragHandle;
  private readonly pinch: PinchZoomHandle;
  private pinchStartWidth = 0;
```

Find the handle's `opacity:0` in the style array:

```ts
    this.handle = document.createElement("div");
    this.handle.className = "sticker-overlay-resize";
    this.handle.style.cssText = [
      "position:absolute",
      `width:${HANDLE_SIZE}px`,
      `height:${HANDLE_SIZE}px`,
      "right:-7px",
      "bottom:-7px",
      "background:#fff",
      "border:1px solid rgba(0,0,0,0.25)",
      "border-radius:50%",
      "cursor:nwse-resize",
      "box-shadow:0 1px 3px rgba(0,0,0,0.2)",
      "opacity:0",
      "transition:opacity 0.15s",
      "touch-action:none",
      "z-index:1",
    ].join(";");
    this.el.appendChild(this.handle);
```

Replace the `"opacity:0",` line so the handle starts visible on touch devices (where hover can never reveal it) and hidden-until-hover elsewhere (unchanged desktop behavior):

```ts
    this.handle = document.createElement("div");
    this.handle.className = "sticker-overlay-resize";
    this.handle.style.cssText = [
      "position:absolute",
      `width:${HANDLE_SIZE}px`,
      `height:${HANDLE_SIZE}px`,
      "right:-7px",
      "bottom:-7px",
      "background:#fff",
      "border:1px solid rgba(0,0,0,0.25)",
      "border-radius:50%",
      "cursor:nwse-resize",
      "box-shadow:0 1px 3px rgba(0,0,0,0.2)",
      `opacity:${isTouchDevice() ? "1" : "0"}`,
      "transition:opacity 0.15s",
      "touch-action:none",
      "z-index:1",
    ].join(";");
    this.el.appendChild(this.handle);
```

Find the end of the constructor:

```ts
    this.drag = attachDrag(
      this.el,
      { x, y },
      onDragMove,
      undefined,
      () => {
        this.hideDragHint();
        onDragStart?.();
      },
      onDragEnd,
    );
    this.drag.attach();
    this.attachResize();
  }
```

Replace with (adds pinch attach right after drag attach):

```ts
    this.drag = attachDrag(
      this.el,
      { x, y },
      onDragMove,
      undefined,
      () => {
        this.hideDragHint();
        onDragStart?.();
      },
      onDragEnd,
    );
    this.drag.attach();
    this.attachResize();

    this.pinch = attachPinchZoom(
      this.el,
      (factor) => {
        const next = clamp(this.pinchStartWidth * factor, MIN_WIDTH, MAX_WIDTH);
        this.width = next;
        this.img.style.width = `${next}px`;
      },
      () => {
        this.hideDragHint();
        this.pinchStartWidth = this.width;
      },
    );
    this.pinch.attach();
  }
```

Find `destroy()`:

```ts
  destroy(): void {
    clearTimeout(this.dragHintTimeout);
    this.drag.detach();
    this.handle.removeEventListener("mousedown", this.handleResizeStart);
    this.handle.removeEventListener("touchstart", this.handleResizeStart);
    this.el.remove();
  }
```

Replace with:

```ts
  destroy(): void {
    clearTimeout(this.dragHintTimeout);
    this.drag.detach();
    this.pinch.detach();
    this.handle.removeEventListener("mousedown", this.handleResizeStart);
    this.handle.removeEventListener("touchstart", this.handleResizeStart);
    this.el.remove();
  }
```

- [ ] **Run test to verify it passes**

Run: `npx vitest run tests/unit/stickerOverlay.test.ts`
Expected: PASS — all tests in the file.

- [ ] **Commit**

```bash
git add src/creatures/StickerOverlay.ts tests/unit/stickerOverlay.test.ts
git commit -m "feat: two-finger pinch-to-scale for stickers, always-visible resize handle on touch"
```

### Step 5: Wire pinch-to-scale + always-visible handles into `TextOverlay`

- [ ] **Write the failing test**

Add these tests to `tests/unit/textOverlay.test.ts`, after the existing `'resize handle clamps font-size within bounds'` test:

```ts
  it('scales font size via two-finger pinch, clamped within bounds', () => {
    const t = new TextOverlay('"Anton", sans-serif', 100, 100);

    t.el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [
        new Touch({ identifier: 0, target: t.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: t.el, clientX: 100, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));
    document.dispatchEvent(new TouchEvent('touchmove', {
      touches: [
        new Touch({ identifier: 0, target: t.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: t.el, clientX: 200, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));

    // Default font size is 56; pinch factor 2 -> 112, within [16, 240].
    expect(parseFloat(t.getEditor().style.fontSize)).toBeCloseTo(112);
  });

  it('clamps pinch scaling within MIN_FONT_SIZE/MAX_FONT_SIZE bounds', () => {
    const t = new TextOverlay('"Anton", sans-serif', 100, 100);

    t.el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [
        new Touch({ identifier: 0, target: t.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: t.el, clientX: 100, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));
    document.dispatchEvent(new TouchEvent('touchmove', {
      touches: [
        new Touch({ identifier: 0, target: t.el, clientX: 0, clientY: 0 }),
        new Touch({ identifier: 1, target: t.el, clientX: 10000, clientY: 0 }),
      ],
      bubbles: true,
      cancelable: true,
    }));

    expect(parseFloat(t.getEditor().style.fontSize)).toBeLessThanOrEqual(240);
  });

  it('shows the resize handle by default on touch devices instead of relying on hover', () => {
    Object.defineProperty(window, 'ontouchstart', { value: null, configurable: true });
    const t = new TextOverlay('"Anton", sans-serif');
    const handle = t.el.querySelector<HTMLElement>('.text-overlay-resize')!;
    expect(handle.style.opacity).toBe('1');
    Reflect.deleteProperty(window, 'ontouchstart');
  });
```

- [ ] **Run test to verify it fails**

Run: `npx vitest run tests/unit/textOverlay.test.ts`
Expected: FAIL — same reasons as Step 4.

- [ ] **Implement**

In `src/creatures/TextOverlay.ts`, update the imports at the top:

```ts
import { attachDrag } from "./makeDraggable";
import type { DragHandle } from "./makeDraggable";
```

Replace with:

```ts
import { attachDrag } from "./makeDraggable";
import type { DragHandle } from "./makeDraggable";
import { attachPinchZoom } from "./pinchZoom";
import type { PinchZoomHandle } from "./pinchZoom";
import { isTouchDevice } from "./touchSupport";
```

Add a new field next to the existing `private readonly drag: DragHandle;`:

```ts
  private readonly drag: DragHandle;
  private readonly pinch: PinchZoomHandle;
  private pinchStartFontSize = 0;
```

Find the resize handle's style block:

```ts
    this.handle = document.createElement("div");
    this.handle.className = "text-overlay-resize";
    this.handle.style.cssText = [
      "position:absolute",
      `width:${HANDLE_SIZE}px`,
      `height:${HANDLE_SIZE}px`,
      "right:-7px",
      "bottom:-7px",
      "background:#fff",
      "border:1px solid rgba(0,0,0,0.25)",
      "border-radius:50%",
      "cursor:nwse-resize",
      "box-shadow:0 1px 3px rgba(0,0,0,0.2)",
      "opacity:0",
      "transition:opacity 0.15s",
      "touch-action:none",
      "z-index:1",
    ].join(";");
    this.el.appendChild(this.handle);
```

Replace the `"opacity:0",` line, same as Task C Step 4:

```ts
    this.handle = document.createElement("div");
    this.handle.className = "text-overlay-resize";
    this.handle.style.cssText = [
      "position:absolute",
      `width:${HANDLE_SIZE}px`,
      `height:${HANDLE_SIZE}px`,
      "right:-7px",
      "bottom:-7px",
      "background:#fff",
      "border:1px solid rgba(0,0,0,0.25)",
      "border-radius:50%",
      "cursor:nwse-resize",
      "box-shadow:0 1px 3px rgba(0,0,0,0.2)",
      `opacity:${isTouchDevice() ? "1" : "0"}`,
      "transition:opacity 0.15s",
      "touch-action:none",
      "z-index:1",
    ].join(";");
    this.el.appendChild(this.handle);
```

Also apply the same touch-visible treatment to the drag handle (`.text-overlay-drag`), since it has the identical hover-only visibility problem — find:

```ts
    this.dragHandle = document.createElement("div");
    this.dragHandle.className = "text-overlay-drag";
    this.dragHandle.style.cssText = [
      "position:absolute",
      `width:${DRAG_HANDLE_SIZE}px`,
      `height:${DRAG_HANDLE_SIZE}px`,
      "left:-9px",
      "top:-9px",
      "border-radius:50%",
      "background:#fff",
      "border:1px solid rgba(0,0,0,0.25)",
      "cursor:grab",
      "box-shadow:0 1px 3px rgba(0,0,0,0.2)",
      "opacity:0",
      "transition:opacity 0.15s",
      "z-index:2",
    ].join(";");
    this.el.appendChild(this.dragHandle);
```

Replace with:

```ts
    this.dragHandle = document.createElement("div");
    this.dragHandle.className = "text-overlay-drag";
    this.dragHandle.style.cssText = [
      "position:absolute",
      `width:${DRAG_HANDLE_SIZE}px`,
      `height:${DRAG_HANDLE_SIZE}px`,
      "left:-9px",
      "top:-9px",
      "border-radius:50%",
      "background:#fff",
      "border:1px solid rgba(0,0,0,0.25)",
      "cursor:grab",
      "box-shadow:0 1px 3px rgba(0,0,0,0.2)",
      `opacity:${isTouchDevice() ? "1" : "0"}`,
      "transition:opacity 0.15s",
      "z-index:2",
    ].join(";");
    this.el.appendChild(this.dragHandle);
```

Find the end of the constructor:

```ts
    this.drag = attachDrag(this.dragHandle, { x, y }, onDragMove, this.el, onDragStart, onDragEnd);
    this.drag.attach();
    this.attachResize();
  }
```

Replace with:

```ts
    this.drag = attachDrag(this.dragHandle, { x, y }, onDragMove, this.el, onDragStart, onDragEnd);
    this.drag.attach();
    this.attachResize();

    this.pinch = attachPinchZoom(
      this.el,
      (factor) => {
        const next = clamp(this.pinchStartFontSize * factor, MIN_FONT_SIZE, MAX_FONT_SIZE);
        this.fontSize = next;
        this.editor.style.fontSize = fontSize(next);
      },
      () => {
        this.pinchStartFontSize = this.fontSize;
      },
    );
    this.pinch.attach();
  }
```

Find `destroy()`:

```ts
  destroy(): void {
    this.drag.detach();
    this.handle.removeEventListener("mousedown", this.handleResizeStart);
    this.handle.removeEventListener("touchstart", this.handleResizeStart);
    this.el.remove();
  }
```

Replace with:

```ts
  destroy(): void {
    this.drag.detach();
    this.pinch.detach();
    this.handle.removeEventListener("mousedown", this.handleResizeStart);
    this.handle.removeEventListener("touchstart", this.handleResizeStart);
    this.el.remove();
  }
```

- [ ] **Run test to verify it passes**

Run: `npx vitest run tests/unit/textOverlay.test.ts`
Expected: PASS — all tests in the file.

- [ ] **Run full unit suite to check for regressions**

Run: `npm test`
Expected: same pre-existing baseline (17 unrelated `onboardingCarousel.test.ts` failures), no new failures.

- [ ] **Human test in browser (required — this touches `creatures/`)**

Run `npm run dev`. In a touch-emulated mobile browser (or a real phone/tablet), drop a sticker and a text overlay, and verify:
- The resize handle is visible without hovering.
- Two-finger pinch on the sticker/text smoothly scales it, clamped at the same min/max bounds as the existing corner-drag resize.
- Starting a pinch mid-single-finger-drag cleanly hands off (drag stops, pinch takes over) without the element jumping.
- Desktop mouse drag-to-resize on the corner handle still works unchanged.

- [ ] **Commit**

```bash
git add src/creatures/TextOverlay.ts tests/unit/textOverlay.test.ts
git commit -m "feat: two-finger pinch-to-scale for text overlays, always-visible resize/drag handles on touch"
```

---

## Final Step: Full verification

- [ ] Run `npm run build` — expect: typecheck + production build succeed with no errors.
- [ ] Run `npm test` — expect: no new failures beyond the pre-existing 17 in `onboardingCarousel.test.ts` (confirm via `git stash` comparison if unsure which failures are pre-existing).
- [ ] Manually retest all three original reports end-to-end in a mobile-width browser per the Human Test steps in Tasks B and C, plus: leave the crossfade-audio bed running, background the tab for 5+ seconds during playback, return, and confirm only one loop is audible (Task A can't be triggered on demand from the UI — this is a spot-check, not a substitute for the unit test's precise simulation).
