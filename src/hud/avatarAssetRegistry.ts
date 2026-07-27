// src/hud/avatarAssetRegistry.ts
export type AvatarAssetEntry = {
  id: string;
  label: string;
  url: string;
  aspect: number;
};

export const AVATAR_ASSET_REGISTRY: readonly AvatarAssetEntry[] = [
  // Frame exports (lightweight, web-ready)
  { id: "frame-38", label: "Frame 38", url: "/avatars/Frame 38.png", aspect: 1 },
  { id: "frame-39", label: "Frame 39", url: "/avatars/Frame 39.png", aspect: 1 },
  { id: "frame-40", label: "Frame 40", url: "/avatars/Frame 40.png", aspect: 1 },
  { id: "frame-41", label: "Frame 41", url: "/avatars/Frame 41.png", aspect: 1 },
  { id: "frame-42", label: "Frame 42", url: "/avatars/Frame 42.png", aspect: 1 },
  { id: "frame-43", label: "Frame 43", url: "/avatars/Frame 43.png", aspect: 1 },
  { id: "frame-44", label: "Frame 44", url: "/avatars/Frame 44.png", aspect: 1 },
  { id: "frame-45", label: "Frame 45", url: "/avatars/Frame 45.png", aspect: 1 },
  { id: "frame-46", label: "Frame 46", url: "/avatars/Frame 46.png", aspect: 1 },
  { id: "frame-47", label: "Frame 47", url: "/avatars/Frame 47.png", aspect: 1 },
  { id: "frame-48", label: "Frame 48", url: "/avatars/Frame 48.png", aspect: 1 },
  // High-res Designer exports (large PNGs — consider optimizing for production)
  { id: "designer-1", label: "Designer 1", url: "/avatars/Designer (1).png", aspect: 1 },
  { id: "designer-2", label: "Designer 2", url: "/avatars/Designer (2).png", aspect: 1 },
  { id: "designer-3", label: "Designer 3", url: "/avatars/Designer (3).png", aspect: 1 },
  { id: "designer-4", label: "Designer 4", url: "/avatars/Designer (4).png", aspect: 1 },
  { id: "designer-5", label: "Designer 5", url: "/avatars/Designer (5).png", aspect: 1 },
];

export function getAvatarAssetEntry(id: string): AvatarAssetEntry | null {
  return AVATAR_ASSET_REGISTRY.find((e) => e.id === id) ?? null;
}
