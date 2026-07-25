import { describe, it, expect } from "vitest";
import { Rng } from "../../src/core/Rng";
import { spawnOneCrowdMember, pickCrowdMemberToDespawn } from "../../src/entities/EntityFactory";
import type { ManifestEntry } from "../../src/content/schema";
import type { Entity } from "../../src/entities/Entity";

const roster: ManifestEntry[] = [
  {
    id: "eye-a",
    rig: "eye",
    renderType: "eye",
    visual: { styleGuardrail: "flat-illustrated", shapeVariant: "almond" },
    colors: { sclera: "cream", iris: "slate", pupil: "ink", highlight: "cream", outline: "ink" },
    physics: { baseSizePx: 60 },
    behavior: { blinkIntervalMinMs: 2000, blinkIntervalMaxMs: 5000, blinkDurationMs: 140, pupilTrackMs: 120 },
  },
];

describe("spawnOneCrowdMember", () => {
  it("returns a new Entity placed within the given viewport", () => {
    const rng = new Rng(1);
    const entity = spawnOneCrowdMember({ rng, width: 800, height: 600, manifest: roster, existing: [], nextId: 5000 });
    expect(entity).not.toBeNull();
    expect(entity!.id).toBe(5000);
    expect(entity!.physics.pos.x).toBeGreaterThanOrEqual(0);
    expect(entity!.physics.pos.x).toBeLessThanOrEqual(800);
  });

  it("cycles through the roster by existing.length modulo roster length", () => {
    const rng = new Rng(2);
    const wideRoster: ManifestEntry[] = [roster[0]!, { ...roster[0]!, id: "eye-b" }];
    const first = spawnOneCrowdMember({ rng, width: 800, height: 600, manifest: wideRoster, existing: [], nextId: 1 })!;
    const second = spawnOneCrowdMember({
      rng,
      width: 800,
      height: 600,
      manifest: wideRoster,
      existing: [first],
      nextId: 2,
    })!;
    expect(first.content.manifestId).toBe("eye-a");
    expect(second.content.manifestId).toBe("eye-b");
  });
});

describe("pickCrowdMemberToDespawn", () => {
  it("returns null for an empty crowd", () => {
    expect(pickCrowdMemberToDespawn([])).toBeNull();
  });

  it("returns the entity with the highest id", () => {
    const members = [{ id: 1 }, { id: 7 }, { id: 3 }] as Entity[];
    const result = pickCrowdMemberToDespawn(members);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(7);
  });
});
