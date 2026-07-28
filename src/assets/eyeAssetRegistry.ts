import { FIGMA_ASSETS } from "./figmaAssetRegistry";

type RegisteredFigmaAsset = (typeof FIGMA_ASSETS)[number];
export type EyeAssetEntry = Extract<RegisteredFigmaAsset, Readonly<{ role: "eye" }>>;

export const EYE_ASSET_IDS = Object.freeze([
  "eye-compact-01",
  "eye-compact-02",
  "eye-compact-02-attack",
  "eye-compact-03",
  "eye-compact-04",
  "eye-compact-05",
  "eye-compact-06",
  "eye-compact-07",
  "eye-compact-08",
  "eye-compact-09",
  "eye-giant-01",
  "eye-giant-02",
  "eye-giant-03",
  "eye-giant-04",
  "eye-large-01",
  "eye-large-02",
  "eye-large-03",
  "eye-large-04",
  "eye-large-05",
  "eye-large-06",
  "eye-large-07",
  "eye-large-08",
  "eye-medium-01",
  "eye-medium-02",
  "eye-medium-03",
  "eye-medium-04",
  "eye-medium-05",
  "eye-medium-06",
  "eye-small-01",
  "eye-small-02",
  "eye-small-03",
  "eye-small-04",
  "eye-small-05"
] as const);

const eyeAssetsById = new Map(FIGMA_ASSETS.filter((entry): entry is EyeAssetEntry => entry.role === "eye").map((entry) => [entry.id, entry]));

export function getEyeAssetEntry(id: string): EyeAssetEntry | null {
  return eyeAssetsById.get(id) ?? null;
}

export const EYE_ASSETS = Object.freeze(EYE_ASSET_IDS.map((id) => {
  const asset = eyeAssetsById.get(id);
  if (!asset) throw new Error(`Missing golden eye asset: ${id}`);
  return asset;
}));

export function eyeAssetForEntity(entityId: string): EyeAssetEntry {
  let hash = 2166136261;
  for (let index = 0; index < entityId.length; index += 1) {
    hash ^= entityId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return EYE_ASSETS[(hash >>> 0) % EYE_ASSETS.length];
}
