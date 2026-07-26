import { describe, expect, it } from "vitest";
import { registerAudioCue, getAudioCue, listAudioCueIds } from "../../src/audio/audioCueRegistry";

describe("audio/audioCueRegistry", () => {
  it("registers and retrieves a cue by id", () => {
    registerAudioCue({ id: "test.registry.one", synth: () => {} });
    const entry = getAudioCue("test.registry.one");
    expect(entry.id).toBe("test.registry.one");
    expect(typeof entry.synth).toBe("function");
  });

  it("throws a descriptive error for an unknown cue id", () => {
    expect(() => getAudioCue("test.registry.missing")).toThrow(/unknown cue id/);
  });

  it("lists every registered cue id", () => {
    registerAudioCue({ id: "test.registry.two", synth: () => {} });
    expect(listAudioCueIds()).toContain("test.registry.two");
  });
});
