import { describe, it, expect } from "vitest";
import {
  SUBJECT_SKIN_REGISTRY,
  getSubjectSkinEntry,
  type SubjectSkin,
} from "../../src/hud/subjectSkinRegistry";
import type { IllustratedSubjectId } from "../../src/content/schema";

describe("SUBJECT_SKIN_REGISTRY", () => {
  it("has exactly one entry per IllustratedSubjectId", () => {
    const ids: IllustratedSubjectId[] = ["figure", "lotus", "scribe", "herald", "jester"];
    expect(SUBJECT_SKIN_REGISTRY.map((e) => e.id).sort()).toEqual([...ids].sort());
  });

  it("every entry has a non-empty label and a callable drawer", () => {
    for (const entry of SUBJECT_SKIN_REGISTRY) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(typeof entry.drawer).toBe("function");
    }
  });

  it("getSubjectSkinEntry returns the matching entry", () => {
    expect(getSubjectSkinEntry("lotus").id).toBe("lotus");
  });

  it("getSubjectSkinEntry throws for an unknown id", () => {
    // @ts-expect-error intentionally invalid
    expect(() => getSubjectSkinEntry("not-an-id")).toThrow(/unknown illustrated subject id/);
  });

  it("SubjectSkin discriminates illustrated vs text", () => {
    const illustrated: SubjectSkin = { kind: "illustrated", id: "figure" };
    const text: SubjectSkin = { kind: "text", value: "Resign Now", scale: 1 };
    expect(illustrated.kind).toBe("illustrated");
    expect(text.kind).toBe("text");
  });
});
