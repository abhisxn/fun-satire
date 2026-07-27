// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "../../src/entities/Entity";
import {
  completeVisualFixtureBoot,
  installVisualFixtureDocumentState,
  readVisualFixture,
  requiredAssetUrlsForVisualFixture,
} from "../../src/testing/visualFixture";
import { applyEyesFixtureState } from "../../src/testing/eyesFixtures";

const FIXTURE_IDS = [
  "eyes-default",
  "eyes-filter",
  "eyes-gallery",
  "eyes-attack",
] as const;

function makeEye(id: number): Entity {
  return {
    id,
    content: { manifestId: `eye-${id}`, rig: "eye", renderType: "eye" },
    physics: {
      pos: { x: id * 13, y: id * 17 },
      home: { x: 0, y: 0 },
      vel: { x: 4, y: -2 },
      scale: 1,
      rotation: 0.5,
    },
    behavior: { data: {} },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("visual fixture query contract", () => {
  it("returns null when visual fixture mode is absent", () => {
    expect(readVisualFixture("?seed=7")).toBeNull();
  });

  it.each(FIXTURE_IDS)("parses the explicit %s fixture", (id) => {
    expect(readVisualFixture(`?visualFixture=${id}`)?.id).toBe(id);
  });

  it("maps fixture states to fixed seed, time, quantity, panel, and attack progress", () => {
    const fixtures = FIXTURE_IDS.map((id) => readVisualFixture(`?visualFixture=${id}`)!);

    expect(fixtures.map(({ seed }) => seed)).toEqual([20260728, 20260728, 20260728, 20260728]);
    expect(fixtures.map(({ nowMs }) => nowMs)).toEqual([4200, 4200, 4200, 4200]);
    expect(fixtures.map(({ quantity }) => quantity)).toEqual([18, 18, 18, 18]);
    expect(fixtures.map(({ panel }) => panel)).toEqual(["none", "filter", "gallery", "none"]);
    expect(fixtures.map(({ attackProgress }) => attackProgress)).toEqual([null, null, null, 0.68]);
  });

  it("rejects unknown fixture IDs instead of silently booting a random state", () => {
    expect(() => readVisualFixture("?visualFixture=eyes-typo")).toThrow(
      'Unknown visual fixture "eyes-typo"',
    );
  });

  it("selects a unique local audited asset set for every fixture", () => {
    for (const id of FIXTURE_IDS) {
      const config = readVisualFixture(`?visualFixture=${id}`)!;
      const urls = requiredAssetUrlsForVisualFixture(config);
      expect(urls.length).toBeGreaterThan(0);
      expect(new Set(urls).size).toBe(urls.length);
      expect(urls.every((url) => url.startsWith("/assets/figma/"))).toBe(true);
    }
  });

  it("marks fixture state and disables unfinished transitions", () => {
    const config = readVisualFixture("?visualFixture=eyes-filter")!;
    installVisualFixtureDocumentState(document, config);

    expect(document.documentElement.dataset.visualFixture).toBe("eyes-filter");
    expect(document.documentElement.dataset.visualPanel).toBe("filter");
    expect(document.documentElement.dataset.visualReady).toBe("pending");
    expect(document.querySelector("style[data-visual-fixture-motion]")?.textContent)
      .toContain("transition-duration: 0s");
  });
});

describe("eyes fixture state", () => {
  it("sets repeatable positions, homes, velocities, rotations, and fresh pupil offsets", () => {
    const first = [makeEye(1), makeEye(2), makeEye(3), makeEye(4)];
    const second = [makeEye(1), makeEye(2), makeEye(3), makeEye(4)];
    const firstPupils = new Map([[99, { x: 5, y: 6 }]]);
    const secondPupils = new Map([[1, { x: 9, y: 9 }]]);

    applyEyesFixtureState(first, firstPupils, { width: 1280, height: 832 });
    applyEyesFixtureState(second, secondPupils, { width: 1280, height: 832 });

    expect(first.map(({ physics }) => physics)).toEqual(second.map(({ physics }) => physics));
    expect([...firstPupils]).toEqual([...secondPupils]);
    expect([...firstPupils.values()].every(({ x, y }) => x === 0 && y === 0)).toBe(true);
    expect(first.every(({ physics }) => physics.pos.x === physics.home.x)).toBe(true);
    expect(first.every(({ physics }) => physics.pos.y === physics.home.y)).toBe(true);
    expect(first.every(({ physics }) => physics.vel.x === 0 && physics.vel.y === 0)).toBe(true);
    expect(first.every(({ physics }) => physics.rotation === 0)).toBe(true);
  });
});

describe("visual fixture readiness", () => {
  it("awaits audited assets and fonts, records failures, then completes one render", async () => {
    const calls: string[] = [];
    const preload = vi.fn(async () => {
      calls.push("assets");
      return [
        { url: "/ready.svg", status: "ready" as const, image: {} as HTMLImageElement },
        { url: "/failed.svg", status: "error" as const, error: new Error("decode failed") },
      ];
    });
    const fontsReady = Promise.resolve().then(() => { calls.push("fonts"); });
    const renderOnce = vi.fn(() => { calls.push("render"); });

    const result = await completeVisualFixtureBoot({
      assetUrls: ["/ready.svg", "/failed.svg"],
      preload,
      fontsReady,
      renderOnce,
    });

    expect(preload).toHaveBeenCalledWith(["/ready.svg", "/failed.svg"]);
    expect(calls.at(-1)).toBe("render");
    expect(renderOnce).toHaveBeenCalledOnce();
    expect(result.failedAssets).toEqual(["/failed.svg"]);
  });
});
