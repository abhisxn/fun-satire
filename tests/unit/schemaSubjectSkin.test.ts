import { describe, it, expect } from "vitest";
import type { ManifestEntry, IllustratedSubjectId } from "../../src/content/schema";

describe("IllustratedSubjectId", () => {
  it("accepts all five registry ids", () => {
    const ids: IllustratedSubjectId[] = ["figure", "lotus", "scribe", "herald", "jester"];
    expect(ids).toHaveLength(5);
  });

  it("ManifestEntry.subjectSkin is optional and typed as IllustratedSubjectId", () => {
    const partial: Pick<ManifestEntry, "subjectSkin"> = { subjectSkin: "scribe" };
    expect(partial.subjectSkin).toBe("scribe");
  });
});
