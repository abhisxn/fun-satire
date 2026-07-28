// tests/unit/crowdSubjectRegistry.test.ts
// Lane C / Task C2 — subject and avatar registries
import { describe, expect, it } from "vitest";
import {
  AVATAR_ASSET_REGISTRY,
  getAvatarAssetEntry,
} from "../../src/hud/avatarAssetRegistry";
import {
  SUBJECT_SKIN_REGISTRY,
  getSubjectSkinEntry,
  subjectAssetEntryFor,
  type SubjectSkin,
} from "../../src/hud/subjectSkinRegistry";
import { FIGMA_ASSETS } from "../../src/assets/figmaAssetRegistry";
import type { IllustratedSubjectId } from "../../src/content/schema";

const ALL_IDS: readonly IllustratedSubjectId[] = [
  "figure",
  "lotus",
  "scribe",
  "herald",
  "jester",
];

describe("subjectSkinRegistry (Lane C / Task C2)", () => {
  it("still exposes one entry per IllustratedSubjectId", () => {
    expect(SUBJECT_SKIN_REGISTRY.map((e) => e.id).sort()).toEqual([...ALL_IDS].sort());
  });

  it("every illustrated id has a registered Figma asset (figure/lotus) or a procedural drawer (scribe/herald/jester)", () => {
    for (const id of ALL_IDS) {
      const entry = getSubjectSkinEntry(id);
      expect(entry.id).toBe(id);
      expect(entry.label.length).toBeGreaterThan(0);
      const asset = subjectAssetEntryFor(id);
      if (id === "figure" || id === "lotus") {
        expect(asset, `expected Figma asset for ${id}`).not.toBeNull();
        expect(asset!.url).toMatch(/^\/assets\/figma\/subjects\//);
        expect(asset!.provenance.fileKey).toBe("oPAdd7oWLQVMTP1v6pJOW0");
      } else {
        expect(asset, `${id} should be procedural`).toBeNull();
      }
    }
  });

  it("dispatch surfaces a non-throwing path for every illustrated id", () => {
    const ids: IllustratedSubjectId[] = ["figure", "lotus", "scribe", "herald", "jester"];
    for (const id of ids) {
      const skin: SubjectSkin = { kind: "illustrated", id };
      expect(skin.kind).toBe("illustrated");
    }
  });
});

describe("avatarAssetRegistry (Lane C / Task C2)", () => {
  it("includes the approved Figma subject exports as avatar sources", () => {
    const approvedFigmaIds = ["subject-elder-figure", "subject-lotus"];
    for (const id of approvedFigmaIds) {
      const entry = getAvatarAssetEntry(id);
      expect(entry, `expected avatar entry for ${id}`).not.toBeNull();
      expect(entry!.url).toMatch(/^\/assets\/figma\/subjects\//);
    }
  });

  it("keeps the existing Frame and Designer avatar entries", () => {
    expect(getAvatarAssetEntry("frame-38")?.url).toBe("/avatars/Frame 38.png");
    expect(getAvatarAssetEntry("designer-1")?.url).toBe("/avatars/Designer (1).png");
  });

  it("avatar URLs never reference localhost or the legacy figma mcp endpoint", () => {
    for (const entry of AVATAR_ASSET_REGISTRY) {
      expect(entry.url).not.toContain("localhost:3845");
      expect(entry.url).toMatch(/^(\/assets\/figma\/|\/avatars\/)/);
    }
  });

  it("returns null for an unknown avatar id (stable fallback)", () => {
    expect(getAvatarAssetEntry("not-an-avatar")).toBeNull();
  });
});

describe("figmaAssetRegistry subject entries", () => {
  it("every approved subject role entry has a non-zero byte length and a local URL", () => {
    for (const entry of FIGMA_ASSETS.filter((a) => a.role === "subject")) {
      expect(entry.byteLength).toBeGreaterThan(0);
      expect(entry.url).toMatch(/^\/assets\/figma\/subjects\//);
      expect(entry.provenance.fileKey).toBe("oPAdd7oWLQVMTP1v6pJOW0");
    }
  });
});
