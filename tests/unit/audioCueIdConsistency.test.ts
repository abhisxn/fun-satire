import { describe, expect, it } from "vitest";
import "../../src/audio/cues/hudCues";
import "../../src/audio/cues/chargeRespawnCues";
import "../../src/audio/cues/laserBurnCues";
import "../../src/audio/cues/electricBurnCues";
import "../../src/audio/cues/bugEatCues";
import { listAudioCueIds } from "../../src/audio/audioCueRegistry";
import { laserBurnEffect } from "../../src/effects/effectDefs/laserBurn";
import { electricBurnEffect } from "../../src/effects/effectDefs/electricBurn";
import { bugEatEffect } from "../../src/effects/effectDefs/bugEat";

describe("audio cue id consistency (def <-> registry)", () => {
  const registeredIds = new Set(listAudioCueIds());
  const defs = [
    { name: "laserBurn", def: laserBurnEffect },
    { name: "electricBurn", def: electricBurnEffect },
    { name: "bugEat", def: bugEatEffect },
  ];

  for (const { name, def } of defs) {
    const cueStages = def.stages.filter((s) => s.cue !== undefined);

    it(`${name} references at least one cue`, () => {
      expect(cueStages.length).toBeGreaterThan(0);
    });

    it.each(cueStages.map((s) => s.cue!))(`${name} stage cue "%s" resolves in the audio cue registry`, (cueId) => {
      expect(registeredIds.has(cueId)).toBe(true);
    });
  }
});
