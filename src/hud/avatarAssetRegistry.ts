// src/hud/avatarAssetRegistry.ts
export type AvatarAssetEntry = {
  id: string;
  label: string;
  url: string;
  aspect: number;
};

export const AVATAR_ASSET_REGISTRY: readonly AvatarAssetEntry[] = [
  { id: "sticker-1", label: "Sticker 1", url: "/avatars/sticker-1.png", aspect: 1 },
  { id: "sticker-2", label: "Sticker 2", url: "/avatars/sticker-2.png", aspect: 1 },
];

export function getAvatarAssetEntry(id: string): AvatarAssetEntry | null {
  return AVATAR_ASSET_REGISTRY.find((e) => e.id === id) ?? null;
}
