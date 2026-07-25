// tests/unit/hudIcons.test.ts
import { describe, it, expect } from "vitest";
import { hudIcons, MODE_POWER_MAP, type HudMode, type HudSkin, type HudPower } from "../../src/hud/hudIcons";

describe("hudIcons", () => {
  const modes: HudMode[] = ["eyes", "bugs", "pointedFinger"];
  const skins: HudSkin[] = ["figure", "lotus"];
  const powers: HudPower[] = ["laserBurn", "electricBurn", "bugEat"];

  it("has a modeIcon entry for every HudMode", () => {
    for (const m of modes) {
      expect(typeof hudIcons.modeIcon[m]).toBe("string");
      expect(hudIcons.modeIcon[m].length).toBeGreaterThan(0);
    }
  });

  it("has a skinIcon entry for every HudSkin", () => {
    for (const s of skins) {
      expect(typeof hudIcons.skinIcon[s]).toBe("string");
      expect(hudIcons.skinIcon[s].length).toBeGreaterThan(0);
    }
  });

  it("leaves existing power icons untouched", () => {
    for (const p of powers) {
      expect(typeof hudIcons.powerIcon[p]).toBe("string");
      expect(hudIcons.powerIcon[p].length).toBeGreaterThan(0);
    }
  });
});

describe("MODE_POWER_MAP", () => {
  it("locks eyes to laserBurn, pointedFinger to electricBurn, bugs to bugEat", () => {
    expect(MODE_POWER_MAP.eyes).toBe("laserBurn");
    expect(MODE_POWER_MAP.pointedFinger).toBe("electricBurn");
    expect(MODE_POWER_MAP.bugs).toBe("bugEat");
  });

  it("has exactly one power per mode, covering every HudMode", () => {
    const modes: HudMode[] = ["eyes", "bugs", "pointedFinger"];
    for (const m of modes) {
      expect(typeof MODE_POWER_MAP[m]).toBe("string");
    }
    expect(Object.keys(MODE_POWER_MAP).sort()).toEqual([...modes].sort());
  });
});
