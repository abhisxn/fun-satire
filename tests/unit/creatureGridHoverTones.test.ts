// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreatureGrid,
  computeHoverEdge,
  hoverRadiusFor,
  canPlayHoverTone,
  HOVER_TONE_COOLDOWN_MS,
} from '../../src/creatures/CreatureGrid';
import type { CreatureGridConfig } from '../../src/creatures/CreatureGrid';

const { triggerEyeHoverTone, triggerFingerHoverTone, triggerCockroachHoverTone, triggerPlacardHoverTone } = vi.hoisted(
  () => ({
    triggerEyeHoverTone: vi.fn(),
    triggerFingerHoverTone: vi.fn(),
    triggerCockroachHoverTone: vi.fn(),
    triggerPlacardHoverTone: vi.fn(),
  }),
);

vi.mock('../../src/creatures/EyeCreature', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/creatures/EyeCreature')>();
  return {
    ...actual,
    triggerEyeHoverTone,
    createEyeCreature: (hx: number, hy: number, scale: number) => {
      const el = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '40.25');
      circle.setAttribute('cy', '28.75');
      svg.appendChild(circle);
      el.appendChild(svg);
      return {
        el,
        pupil: circle,
        hx,
        hy,
        x: hx,
        y: hy,
        vx: 0,
        vy: 0,
        scale,
        w: 115 * scale,
        h: 57 * scale,
        spawnPopAtMs: 0,
        spawnDone: false,
        fadeStartMs: 0,
        waitingRespawn: false,
        nextBlink: Date.now() + 10000,
        blinking: false,
        blinkStart: 0,
        rotFactor: 0.1,
      };
    },
  };
});
vi.mock('../../src/creatures/FingerCreature', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/creatures/FingerCreature')>();
  return { ...actual, triggerFingerHoverTone };
});
vi.mock('../../src/creatures/CockroachCreature', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/creatures/CockroachCreature')>();
  return { ...actual, triggerCockroachHoverTone };
});
vi.mock('../../src/creatures/PlacardCreature', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/creatures/PlacardCreature')>();
  return { ...actual, triggerPlacardHoverTone };
});

describe('hover edge-detection helpers (pure)', () => {
  describe('computeHoverEdge', () => {
    it('is not hovered when distance exceeds the radius', () => {
      expect(computeHoverEdge(100, 50, false)).toEqual({ hovered: false, entered: false });
    });

    it('enters hover when distance is within radius and was not previously hovered', () => {
      expect(computeHoverEdge(10, 50, false)).toEqual({ hovered: true, entered: true });
    });

    it('does not re-enter on subsequent frames while still hovered', () => {
      expect(computeHoverEdge(10, 50, true)).toEqual({ hovered: true, entered: false });
    });

    it('is not an enter event on the frame hover ends', () => {
      expect(computeHoverEdge(100, 50, true)).toEqual({ hovered: false, entered: false });
    });

    it('treats the radius boundary itself as not-hovered (strict less-than)', () => {
      expect(computeHoverEdge(50, 50, false)).toEqual({ hovered: false, entered: false });
    });
  });

  describe('hoverRadiusFor', () => {
    it("scales with the creature's own rendered size plus padding", () => {
      const creature = { w: 100, h: 40 } as { w: number; h: number };
      expect(hoverRadiusFor(creature as never)).toBe(100 / 2 + 20);
    });

    it('uses the larger of width/height', () => {
      const creature = { w: 40, h: 100 } as { w: number; h: number };
      expect(hoverRadiusFor(creature as never)).toBe(100 / 2 + 20);
    });
  });

  describe('canPlayHoverTone', () => {
    it('blocks a tone within the cooldown window', () => {
      expect(canPlayHoverTone(1000, 1000 + HOVER_TONE_COOLDOWN_MS - 1, HOVER_TONE_COOLDOWN_MS)).toBe(false);
    });

    it('allows a tone once the cooldown has fully elapsed', () => {
      expect(canPlayHoverTone(1000, 1000 + HOVER_TONE_COOLDOWN_MS, HOVER_TONE_COOLDOWN_MS)).toBe(true);
    });

    it('always allows the very first tone (lastPlayedAtMs = -Infinity)', () => {
      expect(canPlayHoverTone(-Infinity, 0, HOVER_TONE_COOLDOWN_MS)).toBe(true);
    });

    it('defaults its cooldown to HOVER_TONE_COOLDOWN_MS when not passed explicitly', () => {
      expect(canPlayHoverTone(1000, 1000 + HOVER_TONE_COOLDOWN_MS - 1)).toBe(false);
      expect(canPlayHoverTone(1000, 1000 + HOVER_TONE_COOLDOWN_MS)).toBe(true);
    });
  });
});

describe('CreatureGrid hover-enter tone triggering', () => {
  let container: HTMLElement;
  let config: CreatureGridConfig;

  beforeEach(() => {
    triggerEyeHoverTone.mockClear();
    triggerFingerHoverTone.mockClear();
    triggerCockroachHoverTone.mockClear();
    triggerPlacardHoverTone.mockClear();

    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);

    config = { container, mode: 'cockroach', initialQuantity: 1 };
  });

  it('does nothing when no AudioContext has been set', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach');
    const creature = (grid as unknown as { creatures: Array<{ x: number; y: number }> }).creatures[0];

    grid.update(creature.x, creature.y);

    expect(triggerCockroachHoverTone).not.toHaveBeenCalled();
  });

  it('fires the mode-specific tone once on hover-enter', () => {
    const grid = new CreatureGrid(config);
    grid.setAudioContext({} as AudioContext);
    grid.spawn('cockroach');
    const creature = (grid as unknown as { creatures: Array<{ x: number; y: number }> }).creatures[0];

    grid.update(creature.x, creature.y);

    expect(triggerCockroachHoverTone).toHaveBeenCalledTimes(1);
    expect(triggerEyeHoverTone).not.toHaveBeenCalled();
    expect(triggerFingerHoverTone).not.toHaveBeenCalled();
    expect(triggerPlacardHoverTone).not.toHaveBeenCalled();
  });

  it('routes to the eye tone when the grid is in eyes mode', () => {
    const grid = new CreatureGrid({ container, mode: 'eyes', initialQuantity: 1 });
    grid.setAudioContext({} as AudioContext);
    grid.spawn('eyes');
    const creature = (grid as unknown as { creatures: Array<{ x: number; y: number }> }).creatures[0];

    grid.update(creature.x, creature.y);

    expect(triggerEyeHoverTone).toHaveBeenCalledTimes(1);
  });

  it('does not fire when the cursor is outside the hover radius', () => {
    const grid = new CreatureGrid(config);
    grid.setAudioContext({} as AudioContext);
    grid.spawn('cockroach');
    const creature = (grid as unknown as { creatures: Array<{ x: number; y: number }> }).creatures[0];

    grid.update(creature.x + 10000, creature.y + 10000);

    expect(triggerCockroachHoverTone).not.toHaveBeenCalled();
  });

  it('does not re-fire every frame while the cursor stays over the same creature', () => {
    const grid = new CreatureGrid(config);
    grid.setAudioContext({} as AudioContext);
    grid.spawn('cockroach');
    const creature = (grid as unknown as { creatures: Array<{ x: number; y: number }> }).creatures[0];

    grid.update(creature.x, creature.y);
    grid.update(creature.x, creature.y);
    grid.update(creature.x, creature.y);

    expect(triggerCockroachHoverTone).toHaveBeenCalledTimes(1);
  });

  it('fires again after leaving and re-entering hover past the cooldown window', () => {
    vi.useFakeTimers();
    try {
      const grid = new CreatureGrid(config);
      grid.setAudioContext({} as AudioContext);
      grid.spawn('cockroach');
      const creature = (grid as unknown as { creatures: Array<{ x: number; y: number }> }).creatures[0];

      grid.update(creature.x, creature.y);
      expect(triggerCockroachHoverTone).toHaveBeenCalledTimes(1);

      // Move far away: hover ends (no tone on exit).
      grid.update(creature.x + 10000, creature.y + 10000);
      expect(triggerCockroachHoverTone).toHaveBeenCalledTimes(1);

      // Advance past the cooldown window before re-entering.
      vi.advanceTimersByTime(HOVER_TONE_COOLDOWN_MS + 10);

      // Move back: hover re-enters.
      grid.update(creature.x, creature.y);
      expect(triggerCockroachHoverTone).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('caps tones to one per cooldown window even when many creatures enter hover in the same burst', () => {
    const burstConfig: CreatureGridConfig = { container, mode: 'cockroach', initialQuantity: 5 };
    const grid = new CreatureGrid(burstConfig);
    grid.setAudioContext({} as AudioContext);
    grid.spawn('cockroach');
    const creatures = (grid as unknown as { creatures: Array<{ x: number; y: number }> }).creatures;
    expect(creatures.length).toBe(5);

    // Force every creature onto the exact same point as the avatar so all
    // five cross into hover on the same update() call — a worst-case
    // simultaneous burst.
    for (const c of creatures) {
      c.x = 400;
      c.y = 300;
    }

    grid.update(400, 300);

    expect(triggerCockroachHoverTone).toHaveBeenCalledTimes(1);
  });
});
