import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import { playInflateTone } from "../../src/audio/inflateTone";
import { playDeflateTone } from "../../src/audio/deflateTone";

/** Minimal fake AudioContext/oscillator/gain graph sufficient to observe the tones' calls. */
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
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
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

describe("playInflateTone (oscillator wiring, mocked AudioContext)", () => {
  it("creates and connects a sine oscillator through a gain node to the destination", () => {
    const { context, oscillatorNode, gainNode } = createFakeAudioContext();

    playInflateTone(context as unknown as AudioContext);

    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    expect(context.createGain).toHaveBeenCalledTimes(1);
    expect(oscillatorNode.type).toBe("sine");
    expect(oscillatorNode.connect).toHaveBeenCalledWith(gainNode);
    expect(gainNode.connect).toHaveBeenCalledWith(context.destination);
  });

  it("sweeps the oscillator frequency upward, not downward", () => {
    const { context, oscillatorNode } = createFakeAudioContext();

    playInflateTone(context as unknown as AudioContext);

    const [startFreq] = oscillatorNode.frequency.setValueAtTime.mock.calls[0];
    const [endFreq] = oscillatorNode.frequency.exponentialRampToValueAtTime.mock.calls[0];
    expect(endFreq).toBeGreaterThan(startFreq);
  });

  it("shapes an attack/decay envelope and starts/stops the oscillator within a short window", () => {
    const { context, oscillatorNode, gainNode } = createFakeAudioContext();

    playInflateTone(context as unknown as AudioContext);

    expect(gainNode.gain.setValueAtTime).toHaveBeenCalled();
    expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(gainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    expect(oscillatorNode.start).toHaveBeenCalledTimes(1);
    expect(oscillatorNode.stop).toHaveBeenCalledTimes(1);
    const [stopAt] = oscillatorNode.stop.mock.calls[0];
    expect(stopAt).toBeGreaterThan(context.currentTime);
    expect(stopAt).toBeLessThan(context.currentTime + 1);
  });

  it("disconnects both nodes once the oscillator ends, so nothing leaks", () => {
    const { context, oscillatorNode, gainNode } = createFakeAudioContext();

    playInflateTone(context as unknown as AudioContext);
    oscillatorNode.onended?.();

    expect(oscillatorNode.disconnect).toHaveBeenCalledTimes(1);
    expect(gainNode.disconnect).toHaveBeenCalledTimes(1);
  });
});

describe("playDeflateTone (oscillator wiring, mocked AudioContext)", () => {
  it("creates and connects a sine oscillator through a gain node to the destination", () => {
    const { context, oscillatorNode, gainNode } = createFakeAudioContext();

    playDeflateTone(context as unknown as AudioContext);

    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    expect(context.createGain).toHaveBeenCalledTimes(1);
    expect(oscillatorNode.type).toBe("sine");
    expect(oscillatorNode.connect).toHaveBeenCalledWith(gainNode);
    expect(gainNode.connect).toHaveBeenCalledWith(context.destination);
  });

  it("sweeps the oscillator frequency downward — the mirror of playInflateTone", () => {
    const { context, oscillatorNode } = createFakeAudioContext();

    playDeflateTone(context as unknown as AudioContext);

    const [startFreq] = oscillatorNode.frequency.setValueAtTime.mock.calls[0];
    const [endFreq] = oscillatorNode.frequency.exponentialRampToValueAtTime.mock.calls[0];
    expect(endFreq).toBeLessThan(startFreq);
  });

  it("shapes an attack/decay envelope and starts/stops the oscillator within a short window", () => {
    const { context, oscillatorNode, gainNode } = createFakeAudioContext();

    playDeflateTone(context as unknown as AudioContext);

    expect(gainNode.gain.setValueAtTime).toHaveBeenCalled();
    expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(gainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    expect(oscillatorNode.start).toHaveBeenCalledTimes(1);
    expect(oscillatorNode.stop).toHaveBeenCalledTimes(1);
    const [stopAt] = oscillatorNode.stop.mock.calls[0];
    expect(stopAt).toBeGreaterThan(context.currentTime);
    expect(stopAt).toBeLessThan(context.currentTime + 1);
  });

  it("disconnects both nodes once the oscillator ends, so nothing leaks", () => {
    const { context, oscillatorNode, gainNode } = createFakeAudioContext();

    playDeflateTone(context as unknown as AudioContext);
    oscillatorNode.onended?.();

    expect(oscillatorNode.disconnect).toHaveBeenCalledTimes(1);
    expect(gainNode.disconnect).toHaveBeenCalledTimes(1);
  });
});
