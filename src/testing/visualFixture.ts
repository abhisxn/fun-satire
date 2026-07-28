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

const CSS_IMAGE_PROPERTIES = [
  "background-image",
  "border-image-source",
  "content",
  "list-style-image",
  "mask-image",
  "-webkit-mask-image",
] as const;

function isFixtureResourceVisible(element: Element): boolean {
  return element.closest('[hidden], .subject-drawer[data-open="false"]') === null;
}

function addCssUrls(value: string, urls: Set<string>): void {
  const matches = value.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g);
  for (const match of matches) {
    const url = match[1];
    if (url && !url.startsWith("data:")) urls.add(url);
  }
}

export function collectVisibleFixtureResourceUrls(target: Document): readonly string[] {
  const urls = new Set<string>();
  for (const image of target.querySelectorAll<HTMLImageElement>("img[src]")) {
    if (isFixtureResourceVisible(image)) urls.add(image.getAttribute("src")!);
  }
  for (const element of target.querySelectorAll<HTMLElement>("*")) {
    if (!isFixtureResourceVisible(element)) continue;
    const style = target.defaultView?.getComputedStyle(element);
    if (!style) continue;
    for (const property of CSS_IMAGE_PROPERTIES) {
      addCssUrls(style.getPropertyValue(property), urls);
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
  finishEntranceTransitions: () => Promise<void>;
  renderOnce: () => void;
  completedRenderCount: () => number;
  renderError: () => unknown;
}>): Promise<Pick<VisualFixtureStatus, "failedAssets">> {
  const [assets] = await Promise.all([
    input.preload(input.assetUrls),
    input.fontsReady,
    input.finishEntranceTransitions(),
  ]);
  const completedBefore = input.completedRenderCount();
  input.renderOnce();
  const renderError = input.renderError();
  if (renderError) {
    throw renderError instanceof Error ? renderError : new Error(String(renderError));
  }
  if (input.completedRenderCount() !== completedBefore + 1) {
    throw new Error("Visual fixture did not complete exactly one render");
  }
  return {
    failedAssets: assets
      .filter((asset) => asset.status === "error")
      .map((asset) => asset.url),
  };
}
