// src/hud/avatarAssetRegistry.ts
// The avatar gallery mixes legacy Frame/Designer exports with the approved
// Figma subject artwork. The Figma entries point at the same local URLs as
// FIGMA_ASSETS (no re-export, no localhost reference). The labels are
// product-safe metadata only; no "Frame 38" or "Designer 1" appears in the
// visible UI per the visual-style-guide.
export type AvatarAssetEntry = {
  id: string;
  label: string;
  url: string;
  aspect: number;
  source: "figma" | "legacy";
};

export const AVATAR_ASSET_REGISTRY: readonly AvatarAssetEntry[] = [
  // Approved Figma subject exports — same local URLs as FIGMA_ASSETS.
  {
    id: "subject-elder-figure",
    label: "Elder figure",
    url: "/assets/figma/subjects/subject-elder-figure.png",
    aspect: 642 / 350,
    source: "figma",
  },
  {
    id: "subject-lotus",
    label: "Lotus",
    url: "/assets/figma/subjects/subject-lotus.png",
    aspect: 852 / 868,
    source: "figma",
  },
  // Frame exports (lightweight, web-ready)
  { id: "frame-38", label: "Frame 38", url: "/avatars/Frame 38.png", aspect: 1, source: "legacy" },
  { id: "frame-39", label: "Frame 39", url: "/avatars/Frame 39.png", aspect: 1, source: "legacy" },
  { id: "frame-40", label: "Frame 40", url: "/avatars/Frame 40.png", aspect: 1, source: "legacy" },
  { id: "frame-41", label: "Frame 41", url: "/avatars/Frame 41.png", aspect: 1, source: "legacy" },
  { id: "frame-42", label: "Frame 42", url: "/avatars/Frame 42.png", aspect: 1, source: "legacy" },
  { id: "frame-43", label: "Frame 43", url: "/avatars/Frame 43.png", aspect: 1, source: "legacy" },
  { id: "frame-44", label: "Frame 44", url: "/avatars/Frame 44.png", aspect: 1, source: "legacy" },
  { id: "frame-45", label: "Frame 45", url: "/avatars/Frame 45.png", aspect: 1, source: "legacy" },
  { id: "frame-46", label: "Frame 46", url: "/avatars/Frame 46.png", aspect: 1, source: "legacy" },
  { id: "frame-47", label: "Frame 47", url: "/avatars/Frame 47.png", aspect: 1, source: "legacy" },
  { id: "frame-48", label: "Frame 48", url: "/avatars/Frame 48.png", aspect: 1, source: "legacy" },
  // High-res Designer exports
  { id: "designer-1", label: "Designer 1", url: "/avatars/Designer (1).png", aspect: 1, source: "legacy" },
  { id: "designer-2", label: "Designer 2", url: "/avatars/Designer (2).png", aspect: 1, source: "legacy" },
  { id: "designer-3", label: "Designer 3", url: "/avatars/Designer (3).png", aspect: 1, source: "legacy" },
  { id: "designer-4", label: "Designer 4", url: "/avatars/Designer (4).png", aspect: 1, source: "legacy" },
  { id: "designer-5", label: "Designer 5", url: "/avatars/Designer (5).png", aspect: 1, source: "legacy" },
];

export function getAvatarAssetEntry(id: string): AvatarAssetEntry | null {
  return AVATAR_ASSET_REGISTRY.find((e) => e.id === id) ?? null;
}
