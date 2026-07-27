import {
  FIGMA_ASSETS,
} from "./figmaAssetRegistry";

type RegisteredFigmaAsset = (typeof FIGMA_ASSETS)[number];
export type EyeAssetEntry = Extract<RegisteredFigmaAsset, Readonly<{ role: "eye" }>>;

function isEyeAsset(entry: RegisteredFigmaAsset): entry is EyeAssetEntry {
  return entry.role === "eye";
}

export const EYE_ASSETS = Object.freeze(FIGMA_ASSETS.filter(isEyeAsset));

export function eyeAssetForEntity(entityId: string): EyeAssetEntry {
  if (EYE_ASSETS.length === 0) throw new Error("No Figma eye assets are registered");

  let hash = 2166136261;
  for (let index = 0; index < entityId.length; index += 1) {
    hash ^= entityId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return EYE_ASSETS[(hash >>> 0) % EYE_ASSETS.length];
}
