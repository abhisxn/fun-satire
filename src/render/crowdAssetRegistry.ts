// src/render/crowdAssetRegistry.ts
// Render-local typed wrapper over the frozen FIGMA_ASSETS table for crowd-role
// assets. Mirrors the eyeAssetRegistry pattern (golden order, deterministic
// per-entity selection) but scoped to crowd artwork used by drawBug and the
// pointed-finger fallback. Pointed-finger scene assets are not yet exported
// from Figma (per docs/superpowers/visual-style-guide-assets.md#not-yet-registered);
// the wrapper therefore only carries the registered crowd-bug-* entries.
import { FIGMA_ASSETS } from "../assets/figmaAssetRegistry";

type RegisteredFigmaAsset = (typeof FIGMA_ASSETS)[number];
export type CrowdAssetEntry = Extract<RegisteredFigmaAsset, Readonly<{ role: "crowd" }>>;

export const CROWD_ASSET_IDS = Object.freeze(
  FIGMA_ASSETS
    .filter((entry): entry is CrowdAssetEntry => entry.role === "crowd")
    .map((entry) => entry.id),
) as readonly string[];

const crowdAssetsById = new Map<string, CrowdAssetEntry>(
  FIGMA_ASSETS
    .filter((entry): entry is CrowdAssetEntry => entry.role === "crowd")
    .map((entry) => [entry.id, entry]),
);

export const CROWD_ASSETS: readonly CrowdAssetEntry[] = Object.freeze(
  CROWD_ASSET_IDS.map((id) => {
    const entry = crowdAssetsById.get(id);
    if (!entry) throw new Error(`Missing crowd asset: ${id}`);
    return entry;
  }),
);

export function getCrowdAssetEntry(id: string): CrowdAssetEntry | null {
  return crowdAssetsById.get(id) ?? null;
}

export function crowdAssetForEntity(entityId: string | number): CrowdAssetEntry {
  const key = typeof entityId === "number" ? `bug-${entityId}` : entityId;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = (hash >>> 0) % CROWD_ASSETS.length;
  return CROWD_ASSETS[index]!;
}
