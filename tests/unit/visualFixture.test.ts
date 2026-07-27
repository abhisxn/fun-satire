// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "../../src/entities/Entity";
import {
  collectVisibleFixtureResourceUrls,
  completeVisualFixtureBoot,
  installVisualFixtureDocumentState,
  readVisualFixture,
  requiredAssetUrlsForVisualFixture,
} from "../../src/testing/visualFixture";
import { applyEyesFixtureState, materializeEyesAttackFixture } from "../../src/testing/eyesFixtures";
import { Hud } from "../../src/hud/Hud";
import { AVATAR_ASSET_REGISTRY } from "../../src/hud/avatarAssetRegistry";
import { EntityStore } from "../../src/entities/EntityStore";
import { ParticleSystem } from "../../src/effects/ParticleSystem";
import { EffectSystem } from "../../src/effects/EffectSystem";
import { laserBurnEffect, LASER_BURN } from "../../src/effects/effectDefs/laserBurn";
import { Rng } from "../../src/core/Rng";
import { loadManifestFromText } from "../../src/content/manifestLoader";
import type { SubjectManifestEntry } from "../../src/content/schema";
import subjectRoster from "../../src/content/manifests/subject.roster.json";

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

  it("discovers visible DOM images and CSS image resources but excludes closed panels", () => {
    document.body.innerHTML = `
      <img src="/visible.png" />
      <div hidden><img src="/hidden.png" /></div>
      <div class="subject-drawer" data-open="false"><img src="/closed.png" /></div>
      <div id="painted" style="background-image: url('/texture.png')"></div>
      <div aria-hidden="true" style="background-image: url('/decorative.png')"></div>
    `;

    expect(collectVisibleFixtureResourceUrls(document)).toEqual([
      "/visible.png",
      "/texture.png",
      "/decorative.png",
    ]);
  });

  it("includes every avatar image when the gallery fixture opens the real drawer", () => {
    document.body.innerHTML = '<div id="hud"></div>';
    const hud = new Hud(document.querySelector<HTMLElement>("#hud")!);
    hud.setVisualFixturePanel("gallery");

    const urls = collectVisibleFixtureResourceUrls(document);
    expect(AVATAR_ASSET_REGISTRY.every(({ url }) => urls.includes(url))).toBe(true);
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

  it("materializes a central target with contributors and active laser lifecycle progress", () => {
    const store = new EntityStore();
    const eyes = [makeEye(1), makeEye(2), makeEye(3), makeEye(4)];
    eyes.forEach((eye) => store.insert(eye));
    applyEyesFixtureState(eyes, new Map(), { width: 1280, height: 832 });
    const rng = new Rng(20260728);
    const particles = new ParticleSystem(rng, 64);
    const effects = new EffectSystem(particles, rng, {
      getEntity: (id) => store.get(id, { live: true }),
      markDying: (id) => store.markDying(id),
      startRespawn: () => {},
    }, { play: () => {} });
    effects.register(laserBurnEffect);
    const manifest = loadManifestFromText(JSON.stringify(subjectRoster)).entries.filter(
      (entry): entry is SubjectManifestEntry => entry.rig === "subject",
    );

    const scenario = materializeEyesAttackFixture({
      store,
      effects,
      subjectManifest: manifest,
      nextId: 5,
      viewport: { width: 1280, height: 832 },
      nowMs: 4200,
      progress: 0.68,
    });

    const subject = store.get(scenario.targetId, { live: true })!;
    const active = effects.liveEffects()[0]!;
    expect(subject.content.renderType).toBe("subject");
    expect(subject.physics.pos).toEqual({ x: 640, y: 416 });
    expect(subject.lifecycle).toMatchObject({ alive: false, dying: true });
    expect(scenario.contributorIds).toEqual([1, 2, 3, 4]);
    expect(active.defId).toBe("laserBurn");
    expect(active.entityId).toBe(subject.id);
    expect(active.stageIndex).toBe(4);
    expect((4200 - active.startedAtMs) / LASER_BURN.totalDurationMs).toBeCloseTo(0.68);
  });
});

describe("visual fixture readiness", () => {
  it("awaits audited assets and fonts, records failures, then completes one render", async () => {
    const calls: string[] = [];
    let completedRenderCount = 0;
    const preload = vi.fn(async () => {
      calls.push("assets");
      return [
        { url: "/ready.svg", status: "ready" as const, image: {} as HTMLImageElement },
        { url: "/failed.svg", status: "error" as const, error: new Error("decode failed") },
      ];
    });
    const fontsReady = Promise.resolve().then(() => { calls.push("fonts"); });
    const finishEntranceTransitions = vi.fn(async () => { calls.push("entrance"); });
    const renderOnce = vi.fn(() => {
      calls.push("render");
      completedRenderCount += 1;
    });

    const result = await completeVisualFixtureBoot({
      assetUrls: ["/ready.svg", "/failed.svg"],
      preload,
      fontsReady,
      finishEntranceTransitions,
      renderOnce,
      completedRenderCount: () => completedRenderCount,
      renderError: () => null,
    });

    expect(preload).toHaveBeenCalledWith(["/ready.svg", "/failed.svg"]);
    expect(calls.at(-1)).toBe("render");
    expect(finishEntranceTransitions).toHaveBeenCalledOnce();
    expect(renderOnce).toHaveBeenCalledOnce();
    expect(result.failedAssets).toEqual(["/failed.svg"]);
  });

  it("rejects readiness when the render callback returns without a completion marker", async () => {
    await expect(completeVisualFixtureBoot({
      assetUrls: [],
      preload: async () => [],
      fontsReady: Promise.resolve(),
      finishEntranceTransitions: async () => {},
      renderOnce: () => {},
      completedRenderCount: () => 0,
      renderError: () => null,
    })).rejects.toThrow("did not complete exactly one render");
  });

  it("rejects readiness with render errors captured outside EventBus", async () => {
    const renderFailure = new Error("canvas exploded");
    await expect(completeVisualFixtureBoot({
      assetUrls: [],
      preload: async () => [],
      fontsReady: Promise.resolve(),
      finishEntranceTransitions: async () => {},
      renderOnce: () => {},
      completedRenderCount: () => 0,
      renderError: () => renderFailure,
    })).rejects.toThrow("canvas exploded");
  });
});
