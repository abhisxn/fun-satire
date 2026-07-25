// tests/unit/subjectManifest.test.ts
import { describe, expect, it } from "vitest";
import { loadManifestFromText } from "../../src/content/manifestLoader";
import subjectRoster from "../../src/content/manifests/subject.roster.json";

describe("content/manifestLoader subject rig (T26)", () => {
  it("loads the subject roster with exactly one entry shaped for the subject rig", () => {
    const manifest = loadManifestFromText(JSON.stringify(subjectRoster));
    expect(manifest.entries.length).toBe(1);
    const entry = manifest.entries[0];
    expect(entry.rig).toBe("subject");
    expect(entry.renderType).toBe("subject");
    expect(entry.visual.styleGuardrail).toBe("flat-illustrated");
  });

  it("rejects a subject entry with an invalid colors.suit value", () => {
    const bad = {
      schemaVersion: "1.0.0",
      name: "bad-subject",
      entries: [
        {
          id: "subject-bad",
          rig: "subject",
          renderType: "subject",
          visual: { styleGuardrail: "flat-illustrated" },
          colors: { suit: "coral", shirt: "cream", outline: "ink" },
          physics: { baseSizePx: 96 },
        },
      ],
    };
    expect(() => loadManifestFromText(JSON.stringify(bad))).toThrowError();
  });

  it("still loads the existing eyes roster unchanged (regression)", () => {
    const eyesRosterText = require("fs").readFileSync(
      require("path").join(__dirname, "../../src/content/manifests/eyes.roster.json"),
      "utf-8",
    );
    const manifest = loadManifestFromText(eyesRosterText);
    expect(manifest.entries.length).toBe(18);
    expect(manifest.entries[0].rig).toBe("eye");
  });
});
