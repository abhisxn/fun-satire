import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

function readText(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}
function exists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel));
}
function byteLen(rel: string): number {
  return statSync(resolve(ROOT, rel)).size;
}

describe("grain overlay (T3)", () => {
  it("ships a public/textures/grain.png asset", () => {
    expect(exists("public/textures/grain.png")).toBe(true);
    expect(byteLen("public/textures/grain.png")).toBeGreaterThan(100);
    expect(byteLen("public/textures/grain.png")).toBeLessThan(50000);
  });

  it("grain.png is a valid 8-bit RGBA PNG", () => {
    const buf = readFileSync(resolve(ROOT, "public/textures/grain.png"));
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
    expect(buf.subarray(12, 16).toString("ascii")).toBe("IHDR");
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBeGreaterThanOrEqual(64);
    expect(width).toBeLessThanOrEqual(512);
    expect(height).toBe(width);
    expect(buf.readUInt8(24)).toBe(8);
    expect(buf.readUInt8(25)).toBe(6);
  });

  it("has a grain build script under scripts/", () => {
    expect(exists("scripts/build-grain.py")).toBe(true);
    const script = readText("scripts/build-grain.py");
    expect(script).toMatch(/grain\.png/);
  });

  it("global.css styles the grain as a fixed full-viewport overlay with pointer-events: none", () => {
    const css = readText("src/styles/global.css");
    expect(css).toMatch(/#grain-layer/);
    expect(css).toMatch(/position\s*:\s*fixed/);
    expect(css).toMatch(/inset\s*:\s*0/);
    expect(css).toMatch(/pointer-events\s*:\s*none/);
    expect(css).toMatch(/z-index\s*:\s*var\(--z-grain\)/);
    expect(css).toMatch(/opacity\s*:\s*var\(--grain-opacity\)/);
  });

  it("styles the grain opacity and tile url as CSS custom properties on :root", () => {
    const tokens = readText("src/styles/tokens.css");
    expect(tokens).toMatch(/--grain-opacity:\s*0\.04/);
    expect(tokens).toMatch(/--grain-tile-url:\s*url\(.+grain\.png.\)/);
  });

  it("layer order is canvas (z 20) -> grain (z 40) -> hud (z 60)", () => {
    const tokens = readText("src/styles/tokens.css");
    expect(tokens).toMatch(/--z-canvas:\s*20/);
    expect(tokens).toMatch(/--z-grain:\s*40/);
    expect(tokens).toMatch(/--z-hud:\s*60/);
  });

  it("main.ts creates the grain layer element and tags canvas/grain/hud", () => {
    const main = readText("src/main.ts");
    expect(main).toMatch(/grain-layer/);
    expect(main).toMatch(/dataset\.layer\s*=\s*["']canvas["']/);
    expect(main).toMatch(/dataset\.layer\s*=\s*["']grain["']/);
    expect(main).toMatch(/dataset\.layer\s*=\s*["']hud["']/);
  });

  it("does not paint grain into every canvas frame", () => {
    const offenders: string[] = [];
    const files = ["src/main.ts", "src/render/Renderer.ts", "src/render/CanvasUtils.ts"].filter((f) => exists(f));
    for (const f of files) {
      const text = readText(f);
      if (/drawImage.*grain|fillText.*grain/i.test(text)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
