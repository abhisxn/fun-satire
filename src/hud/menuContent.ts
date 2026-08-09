export interface VideoEntry {
  readonly kind: "video";
  readonly videoId: string;
  readonly title: string;
  readonly channel: string;
}

export interface SourceEntry {
  readonly kind: "source";
  readonly href: string;
  readonly label: string;
  readonly icon: string;
}

export type GalleryEntry = VideoEntry | SourceEntry;

export function buildYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function buildYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// CONTENT DEPENDENCY: videoId values below are placeholders (REPLACE_ME_*).
// Swap each for the real YouTube video id before shipping — see Task 7 of
// docs/superpowers/plans/2026-08-09-protest-panel-visual-redesign.md.
export const HERO_VIDEO: VideoEntry = {
  kind: "video",
  videoId: "REPLACE_ME_SARTHAK_GOSWAMI",
  title: "Placeholder — replace with real video title",
  channel: "Sarthak Goswami",
};

export const GALLERY_ENTRIES: readonly GalleryEntry[] = [
  {
    kind: "video",
    videoId: "REPLACE_ME_UNFILTERED_SAMDISH",
    title: "Placeholder — replace with real video title",
    channel: "Unfiltered by Samdish",
  },
  {
    kind: "video",
    videoId: "REPLACE_ME_JIST_NEWS_MEDIA",
    title: "Placeholder — replace with real video title",
    channel: "Jist News Media",
  },
  {
    kind: "video",
    videoId: "REPLACE_ME_DESHBHAKT",
    title: "Placeholder — replace with real video title",
    channel: "The Deshbhakt",
  },
  {
    kind: "video",
    videoId: "REPLACE_ME_BEING_HONEST",
    title: "Placeholder — replace with real video title",
    channel: "Being Honest",
  },
  {
    kind: "video",
    videoId: "REPLACE_ME_RAVISH_KUMAR",
    title: "Placeholder — replace with real video title",
    channel: "Ravish Kumar",
  },
  {
    kind: "source",
    href: "https://www.newslaundry.com/",
    label: "Newslaundry",
    icon: "N",
  },
  {
    kind: "source",
    href: "https://www.thecockroachjantaparty.org.in/voice",
    label: "Voice of the Swarm (CJP)",
    icon: "🪳",
  },
  {
    kind: "source",
    href: "https://andhbhakt.org/",
    label: "Andhbhakt — PIB vs CAG tracker",
    icon: "🐊",
  },
];
