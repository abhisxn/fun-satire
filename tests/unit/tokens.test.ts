import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

function readText(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  try {
    statSync(resolve(ROOT, rel));
    return true;
  } catch {
    return false;
  }
}

describe("config tokens (T2)", () => {
  it("exposes a frozen palette that mirrors src/styles/tokens.css", async () => {
    const mod = await import("../../src/config/tokens");
    const { PALETTE, COLOR_HEX } = mod;
    expect(PALETTE.cream).toBe("#EDE7DD");
    expect(PALETTE.slate).toBe("#5B7A8C");
    expect(PALETTE.sage).toBe("#6D7A5E");
    expect(PALETTE.ink).toBe("#2A2420");
    expect(PALETTE.coral).toBe("#E8A9A0");
    expect(Object.isFrozen(PALETTE)).toBe(true);
    expect(COLOR_HEX.cream).toBe(PALETTE.cream);
  });

  it("exposes font, easing, duration, and motion tokens", async () => {
    const mod = await import("../../src/config/tokens");
    expect(mod.FONT.display).toMatch(/Fraunces/);
    expect(mod.FONT.mono).toMatch(/Space Mono/);
    expect(typeof mod.EASE.protest).toBe("string");
    expect(typeof mod.EASE.charge).toBe("string");
    expect(mod.EASE.protest).not.toBe("linear");
    expect(mod.EASE.protest).not.toBe("ease-in-out");
    expect(mod.DURATION.fast).toBe(120);
    expect(mod.DURATION.base).toBe(200);
    expect(mod.DURATION.slow).toBe(360);
  });

  it("throws a descriptive error on an unknown palette key", async () => {
    const mod = await import("../../src/config/tokens");
    expect(() => mod.assertPaletteKey("purple")).toThrowError(/palette/);
  });

  it("listAcceptedPaletteKeys returns the locked five keys in a stable order", async () => {
    const mod = await import("../../src/config/tokens");
    expect(mod.listAcceptedPaletteKeys()).toEqual([
      "cream",
      "slate",
      "sage",
      "ink",
      "coral",
    ]);
  });

  describe("self-hosted fonts", () => {
    it("does not declare any external font URL anywhere in src", () => {
      const offenders: string[] = [];
      const walk = (rel: string) => {
        if (!exists(rel)) return;
        const stat = statSync(resolve(ROOT, rel));
        if (!stat.isDirectory()) return;
        for (const name of readdirSync(resolve(ROOT, rel))) {
          const child = `${rel}/${name}`;
          const childStat = statSync(resolve(ROOT, child));
          if (childStat.isDirectory()) {
            walk(child);
          } else if (/\.(ts|css|tsx|js|mjs|cjs|html)$/i.test(name)) {
            const text = readText(child);
            for (const bad of ["fonts.googleapis.com", "fonts.gstatic.com", "use.typekit.net", "fonts.adobe.com"]) {
              if (text.includes(bad)) offenders.push(`${child}: ${bad}`);
            }
          }
        }
      };
      walk("src");
      walk("index.html");
      expect(offenders).toEqual([]);
    });

    it("imports the local fontsource css in main.ts before paint", () => {
      const main = readText("src/main.ts");
      expect(main).toMatch(/@fontsource-variable\/fraunces/);
      expect(main).toMatch(/@fontsource\/space-mono/);
      const tokensImport = main.indexOf("./styles/global.css");
      const frauncesImport = main.indexOf("@fontsource-variable/fraunces");
      const spaceMonoImport = main.indexOf("@fontsource/space-mono");
      expect(frauncesImport).toBeGreaterThan(-1);
      expect(spaceMonoImport).toBeGreaterThan(-1);
      expect(tokensImport).toBeGreaterThan(-1);
    });

    it("keeps only the fonts main actually uses loaded", () => {
      const main = readText("src/main.ts");
      expect(main).not.toMatch(/fonts\.googleapis\.com/);
      expect(main).not.toMatch(/fonts\.gstatic\.com/);
    });
  });

  it("keeps only the locked five colors as literals in CSS and TS", () => {
    const css = readText("src/styles/tokens.css");
    const ts = readText("src/config/tokens.ts");
    for (const bad of ["#aa3bff", "#646cff", "#ffffff", "#000000", "system-ui"]) {
      expect(css.toLowerCase()).not.toContain(bad.toLowerCase());
      expect(ts.toLowerCase()).not.toContain(bad.toLowerCase());
    }
  });
});

describe("EASE.spring (T5)", () => {
  it("is a cubic-bezier string with an overshoot (a y-value above 1)", async () => {
    const { EASE } = await import("../../src/config/tokens");
    expect(EASE.spring).toMatch(/^cubic-bezier\(/);
    const nums = (EASE.spring.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    // cubic-bezier(x1, y1, x2, y2) — overshoot means y1 or y2 exceeds 1.
    expect(nums[1] > 1 || nums[3] > 1).toBe(true);
  });

  it("matches the CSS --ease-spring custom property", async () => {
    const { EASE } = await import("../../src/config/tokens");
    const css = readText("src/styles/tokens.css");
    expect(css).toContain(`--ease-spring: ${EASE.spring}`);
  });
});
