import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
// @vitest-environment happy-dom

const ROOT = resolve(__dirname, "..", "..");

describe("boot/main integration smoke (T23)", () => {
  it("index.html mounts #stage and #hud-root before loading main.ts", () => {
    const html = readFileSync(resolve(ROOT, "index.html"), "utf8");
    expect(html).toMatch(/<canvas[^>]*id=["']stage["']/);
    expect(html).toMatch(/<div[^>]*id=["']hud-root["']/);
    expect(html).toMatch(/<script[^>]*type=["']module["'][^>]*src=["']\/src\/main\.ts["']/);
  });

  it("main.ts wires Engine + EntityStore + Manifest + Effects + Particles + HUD + Renderer", () => {
    const main = readFileSync(resolve(ROOT, "src/main.ts"), "utf8");
    expect(main).toMatch(/new Engine\(\)/);
    expect(main).toMatch(/new EntityStore\(\)/);
    expect(main).toMatch(/loadManifestFromText/);
    expect(main).toMatch(/spawnEyes/);
    expect(main).toMatch(/new EffectSystem/);
    expect(main).toMatch(/new ParticleSystem/);
    expect(main).toMatch(/new PowerController/);
    expect(main).toMatch(/new Hud/);
    expect(main).toMatch(/renderFrame/);
    expect(main).toMatch(/createViewport/);
    expect(main).toMatch(/engine\.start\(\)/);
  });

  it("keeps normal startup while gating deterministic visual fixture readiness", () => {
    const main = readFileSync(resolve(ROOT, "src/main.ts"), "utf8");
    expect(main).toMatch(/readVisualFixture\(window\.location\.search\)/);
    expect(main).toMatch(/visualFixture\s*\?\s*new Engine/);
    expect(main).toMatch(/:\s*new Engine\(\)/);
    expect(main).toMatch(/completeVisualFixtureBoot/);
    expect(main).toMatch(/document\.fonts\.ready/);
    expect(main).toMatch(/__FUN_SATIRE_VISUAL__/);
    expect(main).toMatch(/failedAssets/);
  });

  it("Renderer.draw calls drawCursor and computeCursorState so the custom cursor is visible", () => {
    const renderer = readFileSync(resolve(ROOT, "src/render/Renderer.ts"), "utf8");
    expect(renderer).toMatch(/drawCursor/);
    expect(renderer).toMatch(/computeCursorState/);
  });

  it("main.ts wires the pointer sink through both power and drag controllers", () => {
    const main = readFileSync(resolve(ROOT, "src/main.ts"), "utf8");
    expect(main).toMatch(/powerCtrl\.tryPress/);
    expect(main).toMatch(/powerCtrl\.release/);
    expect(main).toMatch(/dragCtrl\.tryStart/);
    expect(main).toMatch(/dragCtrl\.release/);
    expect(main).toMatch(/dragCtrl\.move/);
  });

  it("laserBurn effect routes through WorldAPI for markDying and startRespawn", () => {
    const eff = readFileSync(resolve(ROOT, "src/effects/effectDefs/laserBurn.ts"), "utf8");
    expect(eff).toMatch(/world\.markDying/);
    expect(eff).toMatch(/world\.startRespawn/);
    expect(eff).not.toMatch(/lifecycle\.dying\s*=\s*true/);
  });

  it("RespawnScheduler.schedule accepts an explicit delay override", () => {
    const src = readFileSync(resolve(ROOT, "src/effects/RespawnScheduler.ts"), "utf8");
    expect(src).toMatch(/overrideDelayMs/);
    expect(src).toMatch(/setSize/);
  });

  it("main.ts sets document title to Fun Satire", () => {
    const html = readFileSync(resolve(ROOT, "index.html"), "utf8");
    expect(html).toMatch(/<title>Fun Satire<\/title>/);
  });

  it("main.ts does not paint grain into every canvas frame", () => {
    const main = readFileSync(resolve(ROOT, "src/main.ts"), "utf8");
    expect(main).not.toMatch(/drawImage.*grain/);
    expect(main).not.toMatch(/fillText.*grain/);
  });

  it("main.ts creates the grain layer element with aria-hidden", () => {
    const main = readFileSync(resolve(ROOT, "src/main.ts"), "utf8");
    expect(main).toMatch(/id\s*=\s*["']grain-layer["']/);
    expect(main).toMatch(/aria-hidden/);
  });

  it("main.ts has no console.error or TODO/FIXME in production paths", () => {
    const main = readFileSync(resolve(ROOT, "src/main.ts"), "utf8");
    expect(main).not.toMatch(/console\.error/);
    expect(main).not.toMatch(/TODO|FIXME|XXX/);
  });

  it("no external font CDN anywhere in src/", () => {
    const offenders: string[] = [];
    const walk = (rel: string) => {
      const abs = resolve(ROOT, rel);
      let entries: string[] = [];
      try {
        entries = require("node:fs").readdirSync(abs);
      } catch {
        return;
      }
      for (const name of entries) {
        const childRel = `${rel}/${name}`;
        const childAbs = resolve(ROOT, childRel);
        let isDir = false;
        try {
          isDir = statSync(childAbs).isDirectory();
        } catch {
          isDir = false;
        }
        if (isDir) {
          walk(childRel);
          continue;
        }
        if (!/\.(ts|css|tsx|js|mjs|cjs|html|json)$/i.test(name)) continue;
        let text: string;
        try {
          text = readFileSync(childAbs, "utf8");
        } catch {
          continue;
        }
        for (const bad of ["fonts.googleapis.com", "fonts.gstatic.com", "use.typekit.net", "fonts.adobe.com"]) {
          if (text.includes(bad)) offenders.push(`${childRel}: ${bad}`);
        }
      }
    };
    walk("src");
    walk("index.html");
    expect(offenders).toEqual([]);
  });
});
