import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

function exists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel));
}

function isDir(rel: string): boolean {
  return exists(rel) && statSync(resolve(ROOT, rel)).isDirectory();
}

function readText(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("scaffold cleanup (T2a)", () => {
  it("removes the Vite starter counter file", () => {
    expect(exists("src/counter.ts")).toBe(false);
  });

  it("removes the Vite starter TypeScript asset from the approved assets directory", () => {
    expect(exists("src/assets/typescript.svg")).toBe(false);
  });

  it("removes the Vite starter icons.svg from public", () => {
    expect(exists("public/icons.svg")).toBe(false);
  });

  it("removes the Vite starter default stylesheet at src/style.css", () => {
    expect(exists("src/style.css")).toBe(false);
  });

  it("removes the legacy src/main.css if it ever existed", () => {
    expect(exists("src/main.css")).toBe(false);
  });

  it("keeps a single-color coral favicon in place of the Vite one", () => {
    expect(exists("public/favicon.svg")).toBe(true);
    const favicon = readText("public/favicon.svg");
    expect(favicon.toLowerCase()).toContain("#e8a9a0");
    expect(favicon.toLowerCase()).not.toContain("#646cff");
  });

  it("replaces the Vite starter index.html shell with a stage canvas + HUD root", () => {
    const html = readText("index.html");
    expect(html).not.toContain("vite-scaffold");
    expect(html).toMatch(/<title>Fun Satire<\/title>/);
    expect(html).toMatch(/<canvas[^>]*id=["']stage["']/);
    expect(html).toMatch(/<div[^>]*id=["']hud-root["']/);
    expect(html).not.toMatch(/<div[^>]*id=["']app["']/);
  });

  it("imports the boot module from src/main.ts via type=module", () => {
    const html = readText("index.html");
    expect(html).toMatch(/<script[^>]*type=["']module["'][^>]*src=["']\/src\/main\.ts["']/);
  });

  it("replaces src/main.ts with a no-op boot module that imports only the global stylesheet", () => {
    const main = readText("src/main.ts");
    expect(main).not.toContain("setupCounter");
    expect(main).not.toContain("typescript.svg");
    expect(main).not.toContain("vite.svg");
    expect(main).not.toMatch(/<canvas/i);
    expect(main).not.toMatch(/<div/i);
    expect(main).toMatch(/import .*styles\/global\.css/);
  });

  it("replaces the Vite starter stylesheet with a thin reset and a tokens import", () => {
    const css = readText("src/styles/global.css");
    expect(css).toMatch(/@import .*tokens\.css/);
    expect(css).not.toContain("system-ui");
    expect(css).not.toMatch(/--accent:\s*#aa3bff/i);
    expect(css).not.toMatch(/prefers-color-scheme:\s*dark/);
  });

  it("declares the five locked Paper-Cut Protest colors as CSS custom properties", () => {
    const tokens = readText("src/styles/tokens.css");
    expect(tokens.toLowerCase()).toContain("#ede7dd");
    expect(tokens.toLowerCase()).toContain("#5b7a8c");
    expect(tokens.toLowerCase()).toContain("#6d7a5e");
    expect(tokens.toLowerCase()).toContain("#2a2420");
    expect(tokens.toLowerCase()).toContain("#e8a9a0");
  });

  it("declares a prefers-reduced-motion block in tokens.css", () => {
    const tokens = readText("src/styles/tokens.css");
    expect(tokens).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
  });

  it("leaves no Vite brand assets behind under src or public", () => {
    const offenders: string[] = [];
    const walk = (rel: string) => {
      if (!isDir(rel)) return;
      for (const name of readdirSync(resolve(ROOT, rel))) {
        const child = `${rel}/${name}`;
        if (isDir(child)) {
          walk(child);
        } else if (/\.(svg|png|jpe?g)$/i.test(name)) {
          offenders.push(child);
        }
      }
    };
    for (const top of ["src", "public"]) {
      if (isDir(top)) walk(top);
    }
    const blocked = offenders.filter((path) => {
      if (/\/(?:typescript|vite)\.svg$/i.test(path)) return true;
      if (!path.endsWith(".svg")) return false;
      const source = readText(path);
      return /#646cff|vite logo|typescript logo/i.test(source);
    });
    expect(blocked).toEqual([]);
  });

  it("leaves no legacy stylesheet at the old src root path", () => {
    const legacy = ["src/style.css", "src/main.css", "src/index.css"].filter((p) => exists(p));
    expect(legacy).toEqual([]);
  });
});
