import { requiredAssetsFor } from "../assets/figmaAssetRegistry";
import type { AssetLoadResult } from "../render/imageAssets";

export type VisualFixtureId = "eyes-default" | "eyes-filter" | "eyes-gallery" | "eyes-attack";

export type VisualFixtureConfig = Readonly<{
  id: VisualFixtureId;
  seed: number;
  nowMs: number;
  quantity: number;
  panel: "none" | "filter" | "gallery";
  attackProgress: number | null;
}>;

export type VisualFixtureStatus = Readonly<{
  ready: boolean;
  error: string | null;
  failedAssets: readonly string[];
}>;

const FIXED_SEED = 20260728;
const FIXED_NOW_MS = 4200;
const FIXED_QUANTITY = 18;

const VISUAL_FIXTURES: Readonly<Record<VisualFixtureId, VisualFixtureConfig>> = Object.freeze({
  "eyes-default": Object.freeze({
    id: "eyes-default",
    seed: FIXED_SEED,
    nowMs: FIXED_NOW_MS,
    quantity: FIXED_QUANTITY,
    panel: "none",
    attackProgress: null,
  }),
  "eyes-filter": Object.freeze({
    id: "eyes-filter",
    seed: FIXED_SEED,
    nowMs: FIXED_NOW_MS,
    quantity: FIXED_QUANTITY,
    panel: "filter",
    attackProgress: null,
  }),
  "eyes-gallery": Object.freeze({
    id: "eyes-gallery",
    seed: FIXED_SEED,
    nowMs: FIXED_NOW_MS,
    quantity: FIXED_QUANTITY,
    panel: "gallery",
    attackProgress: null,
  }),
  "eyes-attack": Object.freeze({
    id: "eyes-attack",
    seed: FIXED_SEED,
    nowMs: FIXED_NOW_MS,
    quantity: FIXED_QUANTITY,
    panel: "none",
    attackProgress: 0.68,
  }),
});

const REQUIRED_NODES = Object.freeze({
  common: ["103:2490", "109:3669"],
  filter: ["103:3579"],
  gallery: ["103:3593"],
} as const);

export function readVisualFixture(search: string): VisualFixtureConfig | null {
  const raw = new URLSearchParams(search).get("visualFixture");
  if (raw === null) return null;
  if (Object.hasOwn(VISUAL_FIXTURES, raw)) {
    return VISUAL_FIXTURES[raw as VisualFixtureId];
  }
  throw new Error(`Unknown visual fixture "${raw}"`);
}

export function requiredAssetUrlsForVisualFixture(config: VisualFixtureConfig): readonly string[] {
  const nodeIds = [
    ...REQUIRED_NODES.common,
    ...(config.panel === "filter" ? REQUIRED_NODES.filter : []),
    ...(config.panel === "gallery" ? REQUIRED_NODES.gallery : []),
  ];
  const urls = new Set<string>();
  for (const nodeId of nodeIds) {
    for (const asset of requiredAssetsFor(nodeId)) {
      if (asset.role !== "reference") urls.add(asset.url);
    }
  }
  return [...urls];
}

export function installVisualFixtureDocumentState(
  target: Document,
  config: VisualFixtureConfig,
): void {
  const root = target.documentElement;
  root.dataset.visualFixture = config.id;
  root.dataset.visualPanel = config.panel;
  root.dataset.visualReady = "pending";

  const style = target.createElement("style");
  style.dataset.visualFixtureMotion = "true";
  style.textContent = `
    [data-visual-fixture] *, [data-visual-fixture] *::before, [data-visual-fixture] *::after {
      animation: none !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      scroll-behavior: auto !important;
    }
  `;
  target.head.appendChild(style);
}

export async function completeVisualFixtureBoot(input: Readonly<{
  assetUrls: readonly string[];
  preload: (urls: readonly string[]) => Promise<readonly AssetLoadResult[]>;
  fontsReady: Promise<unknown>;
  renderOnce: () => void;
}>): Promise<Pick<VisualFixtureStatus, "failedAssets">> {
  const [assets] = await Promise.all([
    input.preload(input.assetUrls),
    input.fontsReady,
  ]);
  input.renderOnce();
  return {
    failedAssets: assets
      .filter((asset) => asset.status === "error")
      .map((asset) => asset.url),
  };
}
