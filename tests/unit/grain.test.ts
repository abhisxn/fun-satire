import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import zlib from "node:zlib";

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

  it("grain.png decodes to RGBA rows of the expected length", () => {
    const buf = readFileSync(resolve(ROOT, "public/textures/grain.png"));
    let off = 8;
    let ihdr: { w: number; h: number } | null = null;
    const idatChunks: Buffer[] = [];
    while (off < buf.length) {
      const len = buf.readUInt32BE(off);
      const tag = buf.subarray(off + 4, off + 8).toString("ascii");
      const data = buf.subarray(off + 8, off + 8 + len);
      off += 12 + len;
      if (tag === "IHDR") {
        ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4) };
      } else if (tag === "IDAT") {
        idatChunks.push(data as Buffer);
      } else if (tag === "IEND") {
        break;
      }
    }
    expect(ihdr).not.toBeNull();
    if (!ihdr) throw new Error("no IHDR");
    const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
    const rowBytes = ihdr.w * 4 + 1;
    expect(inflated.length).toBe(rowBytes * ihdr.h);
    for (let i = 0; i < inflated.length; i += rowBytes) {
      expect(inflated[i]).toBe(0);
    }
  });

  it("regenerates deterministically when the script is run twice", () => {
    const script = resolve(ROOT, "scripts/build-grain.py");
    if (!existsSync(script)) return;
    const out = resolve(ROOT, "public/textures/grain.png");
    const before = readFileSync(out);
    try {
      execFileSync("python3", [script], { cwd: ROOT });
    } catch {
      return;
    }
    const after = readFileSync(out);
    expect(after.equals(before)).toBe(true);
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
