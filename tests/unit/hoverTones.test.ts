import { describe, it, expect, vi } from "vitest";
import { getHoverToneParams, playHoverTone } from "../../src/audio/hoverTones";
import type { CreatureMode } from "../../src/creatures/creatureTypes";

const MODES: CreatureMode[] = ["eyes", "pointedFinger", "cockroach", "placard"];

describe("getHoverToneParams (pure tone-parameter mapping)", () => {
  it("returns a distinct frequency for every creature mode", () => {
    const frequencies = MODES.map((mode) => getHoverToneParams(mode).frequency);
    expect(new Set(frequencies).size).toBe(MODES.length);
  });

  it("maps eyes to the root note", () => {
    const eyes = getHoverToneParams("eyes");
    expect(eyes.frequency).toBe(440);
  });

  it("maps pointedFinger to the major third above the root", () => {
    const eyes = getHoverToneParams("eyes");
    const finger = getHoverToneParams("pointedFinger");
    expect(finger.frequency).toBeCloseTo(eyes.frequency * (5 / 4));
  });

  it("maps cockroach to the perfect fifth above the root", () => {
    const eyes = getHoverToneParams("eyes");
    const cockroach = getHoverToneParams("cockroach");
    expect(cockroach.frequency).toBeCloseTo(eyes.frequency * (3 / 2));
  });

  it("maps placard to the octave above the root", () => {
    const eyes = getHoverToneParams("eyes");
    const placard = getHoverToneParams("placard");
    expect(placard.frequency).toBeCloseTo(eyes.frequency * 2);
  });

  it("keeps every tone short (<= 150ms) so it reads as a blip, not a note", () => {
    for (const mode of MODES) {
      expect(getHoverToneParams(mode).durationMs).toBeLessThanOrEqual(150);
    }
  });

  it("keeps every tone quiet (peak gain well under 1) to avoid audio spam", () => {
    for (const mode of MODES) {
      expect(getHoverToneParams(mode).peakGain).toBeGreaterThan(0);
      expect(getHoverToneParams(mode).peakGain).toBeLessThan(0.5);
    }
  });

  it("uses the same oscillator type across all modes so they read as one instrument", () => {
    const types = new Set(MODES.map((mode) => getHoverToneParams(mode).type));
    expect(types.size).toBe(1);
  });

  it("is a pure lookup — returns the same params object contents on repeated calls", () => {
    expect(getHoverToneParams("cockroach")).toEqual(getHoverToneParams("cockroach"));
  });
});

/** Minimal fake AudioContext/oscillator/gain graph sufficient to observe playHoverTone's calls. */
function createFakeAudioContext() {
  const gainParam = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });

  const gainNode = {
    gain: gainParam(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const oscillatorNode = {
    type: "sine" as OscillatorType,
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  };

  const context = {
    currentTime: 10,
    destination: {},
    createOscillator: vi.fn(() => oscillatorNode),
    createGain: vi.fn(() => gainNode),
  };

  return { context, oscillatorNode, gainNode };
}

describe("playHoverTone (oscillator wiring, mocked AudioContext)", () => {
  it("creates and connects an oscillator through a gain node to the destination", () => {
    const { context, oscillatorNode, gainNode } = createFakeAudioContext();

    playHoverTone(context as unknown as AudioContext, "eyes");

    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    expect(context.createGain).toHaveBeenCalledTimes(1);
    expect(oscillatorNode.connect).toHaveBeenCalledWith(gainNode);
    expect(gainNode.connect).toHaveBeenCalledWith(context.destination);
  });

  it("sets the oscillator frequency and type from getHoverToneParams for the given mode", () => {
    const { context, oscillatorNode } = createFakeAudioContext();

    playHoverTone(context as unknown as AudioContext, "cockroach");

    const params = getHoverToneParams("cockroach");
    expect(oscillatorNode.type).toBe(params.type);
    expect(oscillatorNode.frequency.setValueAtTime).toHaveBeenCalledWith(params.frequency, context.currentTime);
  });

  it("shapes an attack/decay envelope on the gain node instead of a hard on/off click", () => {
    const { context, gainNode } = createFakeAudioContext();

    playHoverTone(context as unknown as AudioContext, "placard");

    expect(gainNode.gain.setValueAtTime).toHaveBeenCalled();
    expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(gainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalled();

    const [peakValue] = gainNode.gain.linearRampToValueAtTime.mock.calls[0];
    expect(peakValue).toBe(getHoverToneParams("placard").peakGain);
  });

  it("starts and stops the oscillator within its short envelope window", () => {
    const { context, oscillatorNode } = createFakeAudioContext();

    playHoverTone(context as unknown as AudioContext, "pointedFinger");

    expect(oscillatorNode.start).toHaveBeenCalledTimes(1);
    expect(oscillatorNode.stop).toHaveBeenCalledTimes(1);
    const [stopAt] = oscillatorNode.stop.mock.calls[0];
    expect(stopAt).toBeGreaterThan(context.currentTime);
    expect(stopAt).toBeLessThan(context.currentTime + 1);
  });

  it("disconnects both nodes once the oscillator ends, so nothing leaks", () => {
    const { context, oscillatorNode, gainNode } = createFakeAudioContext();

    playHoverTone(context as unknown as AudioContext, "eyes");
    oscillatorNode.onended?.();

    expect(oscillatorNode.disconnect).toHaveBeenCalledTimes(1);
    expect(gainNode.disconnect).toHaveBeenCalledTimes(1);
  });
});
