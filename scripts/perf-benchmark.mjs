// Frame-time benchmark for the creature crowd. Not part of the build or the unit suite.
//
// Playwright is deliberately NOT a project dependency (it pulls a large browser download).
// Install it in a scratch directory and point PLAYWRIGHT_DIR at that directory:
//
//   mkdir /tmp/pw && cd /tmp/pw && npm init -y && npm install playwright
//   PLAYWRIGHT_DIR=/tmp/pw node scripts/perf-benchmark.mjs
//
// If Playwright's pinned Chromium is not installed, pass a Chrome/Chromium binary with
// CHROME_PATH or --chrome. Serve a production build for representative numbers:
//
//   npm run build && npm run preview -- --port 4173
//
// Usage: node scripts/perf-benchmark.mjs [--url http://localhost:4173] [--counts 200,500,900]
//        [--duration 10] [--settle 3] [--throttle 1] [--width 1440] [--height 900]
//        [--out perf-results.json] [--chrome <path>]

import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function parseArgs(argv) {
  const opts = {
    url: "http://localhost:4173",
    counts: [200, 500, 900],
    duration: 10,
    settle: 3,
    throttle: 1,
    width: 1440,
    height: 900,
    out: "",
    chrome: process.env.CHROME_PATH ?? "",
  };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const val = argv[i + 1];
    switch (key) {
      case "--url": opts.url = val; i++; break;
      case "--counts": opts.counts = val.split(",").map((n) => Number.parseInt(n, 10)); i++; break;
      case "--duration": opts.duration = Number(val); i++; break;
      case "--settle": opts.settle = Number(val); i++; break;
      case "--throttle": opts.throttle = Number(val); i++; break;
      case "--width": opts.width = Number(val); i++; break;
      case "--height": opts.height = Number(val); i++; break;
      case "--out": opts.out = val; i++; break;
      case "--chrome": opts.chrome = val; i++; break;
      default: throw new Error(`Unknown argument: ${key}`);
    }
  }
  return opts;
}

/** Pure: percentile of an ascending-sorted array, linear interpolation. */
export function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Pure: summarises raw frame deltas (ms) into the reported metrics. */
export function summarise(deltas, longTasks) {
  const sorted = [...deltas].sort((a, b) => a - b);
  const total = deltas.reduce((a, b) => a + b, 0);
  const over = (ms) => deltas.filter((d) => d > ms).length;
  return {
    frames: deltas.length,
    fpsAvg: total > 0 ? +((deltas.length / total) * 1000).toFixed(1) : 0,
    frameMsP50: +percentile(sorted, 0.5).toFixed(1),
    frameMsP95: +percentile(sorted, 0.95).toFixed(1),
    frameMsP99: +percentile(sorted, 0.99).toFixed(1),
    frameMsMax: +(sorted[sorted.length - 1] ?? 0).toFixed(1),
    pctOver33ms: deltas.length ? +((over(33.4) / deltas.length) * 100).toFixed(1) : 0,
    pctOver50ms: deltas.length ? +((over(50) / deltas.length) * 100).toFixed(1) : 0,
    longTasks: longTasks.count,
    longTaskMs: +longTasks.totalMs.toFixed(0),
  };
}

const RECORDER = `(() => {
  window.__perf = { deltas: [], long: { count: 0, totalMs: 0 }, running: true };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) { window.__perf.long.count++; window.__perf.long.totalMs += e.duration; }
    }).observe({ entryTypes: ["longtask"] });
  } catch {}
  let last = performance.now();
  const tick = (t) => {
    if (!window.__perf.running) return;
    window.__perf.deltas.push(t - last);
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})()`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const pwDir = process.env.PLAYWRIGHT_DIR;
  if (!pwDir) throw new Error("Set PLAYWRIGHT_DIR to a directory where `npm install playwright` was run.");
  const { chromium } = createRequire(resolve(pwDir, "package.json"))("playwright");

  const browser = await chromium.launch({
    headless: true,
    executablePath: opts.chrome || undefined,
    args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
  });
  const context = await browser.newContext({
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (opts.throttle > 1) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: opts.throttle });
  }
  await cdp.send("Performance.enable");
  const readMetrics = async () => {
    const { metrics } = await cdp.send("Performance.getMetrics");
    return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
  };

  await page.goto(opts.url, { waitUntil: "networkidle" });
  const skip = page.locator(".onb-skip");
  if (await skip.count()) {
    await skip.click();
    await page.locator(".onb-card").waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
  }
  // The HUD (and with it the quantity slider) is only attached once onboarding completes.
  await page.locator("[data-filter-qty]").waitFor({ state: "attached", timeout: 30000 });

  const results = [];
  for (const count of opts.counts) {
    await page.evaluate((n) => {
      const slider = document.querySelector("[data-filter-qty]");
      slider.value = String(n);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }, count);
    await page.waitForTimeout(opts.settle * 1000);

    const domCreatures = await page.evaluate(() => document.querySelectorAll("#stage > .wrap").length);
    await page.evaluate(RECORDER);
    const metricsBefore = await readMetrics();
    const wallStart = Date.now();

    // Sweep the pointer on a circle so the repel field is working during the measurement.
    const cx = opts.width / 2;
    const cy = opts.height / 2;
    const r = Math.min(opts.width, opts.height) * 0.3;
    const end = Date.now() + opts.duration * 1000;
    let angle = 0;
    while (Date.now() < end) {
      await page.mouse.move(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      angle += 0.08;
      await page.waitForTimeout(16);
    }

    const metricsAfter = await readMetrics();
    const wallS = (Date.now() - wallStart) / 1000;
    const pct = (key) => +(((metricsAfter[key] - metricsBefore[key]) / wallS) * 100).toFixed(1);
    const mainThread = {
      busyPct: pct("TaskDuration"),
      scriptPct: pct("ScriptDuration"),
      stylePct: pct("RecalcStyleDuration"),
      layoutPct: pct("LayoutDuration"),
    };
    const raw = await page.evaluate(() => {
      window.__perf.running = false;
      const heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      return { deltas: window.__perf.deltas, long: window.__perf.long, heapMb: heap, nodes: document.getElementsByTagName("*").length };
    });
    // The first delta spans recorder start; drop it.
    results.push({ count, domCreatures, heapMb: raw.heapMb, domNodes: raw.nodes, ...mainThread, ...summarise(raw.deltas.slice(1), raw.long) });
  }
  await browser.close();

  const meta = { url: opts.url, viewport: `${opts.width}x${opts.height}`, cpuThrottle: opts.throttle, durationS: opts.duration, date: new Date().toISOString() };
  const header = "| count | dom creatures | fps | p50 ms | p95 ms | p99 ms | max ms | >33ms % | >50ms % | long tasks | heap MB | DOM nodes | busy % | script % | style % | layout % |";
  console.log(`\n${JSON.stringify(meta)}\n\n${header}\n|${"---|".repeat(16)}`);
  for (const r of results) {
    console.log(`| ${r.count} | ${r.domCreatures} | ${r.fpsAvg} | ${r.frameMsP50} | ${r.frameMsP95} | ${r.frameMsP99} | ${r.frameMsMax} | ${r.pctOver33ms} | ${r.pctOver50ms} | ${r.longTasks} (${r.longTaskMs} ms) | ${r.heapMb ?? "n/a"} | ${r.domNodes} | ${r.busyPct} | ${r.scriptPct} | ${r.stylePct} | ${r.layoutPct} |`);
  }
  if (opts.out) await writeFile(opts.out, JSON.stringify({ meta, results }, null, 2));
}

// Only run when executed directly, so the pure helpers can be imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
