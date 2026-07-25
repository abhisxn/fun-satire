import { describe, it, expect } from "vitest";
import type { SubjectSkin } from "../../src/hud/subjectSkinRegistry";

function applySubjectSkinSwap(data: Record<string, unknown>, skin: SubjectSkin): void {
  data.subjectSkin = skin;
}

describe("subject skin swap data shape", () => {
  it("writes an illustrated skin verbatim onto behavior.data.subjectSkin", () => {
    const data: Record<string, unknown> = {};
    applySubjectSkinSwap(data, { kind: "illustrated", id: "jester" });
    expect(data.subjectSkin).toEqual({ kind: "illustrated", id: "jester" });
  });

  it("writes a text skin verbatim onto behavior.data.subjectSkin", () => {
    const data: Record<string, unknown> = {};
    applySubjectSkinSwap(data, { kind: "text", value: "No Kings", scale: 1.35 });
    expect(data.subjectSkin).toEqual({ kind: "text", value: "No Kings", scale: 1.35 });
  });
});
