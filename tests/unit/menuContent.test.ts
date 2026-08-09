import { describe, it, expect } from "vitest";
import {
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  HERO_VIDEO,
  GALLERY_ENTRIES,
} from "../../src/hud/menuContent";

describe("hud/menuContent", () => {
  it("builds a YouTube thumbnail URL from a video id", () => {
    expect(buildYouTubeThumbnailUrl("abc123")).toBe(
      "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    );
  });

  it("builds a YouTube watch URL from a video id", () => {
    expect(buildYouTubeWatchUrl("abc123")).toBe("https://www.youtube.com/watch?v=abc123");
  });

  it("exposes a hero video entry", () => {
    expect(HERO_VIDEO.kind).toBe("video");
    expect(HERO_VIDEO.videoId.length).toBeGreaterThan(0);
    expect(HERO_VIDEO.title.length).toBeGreaterThan(0);
    expect(HERO_VIDEO.channel.length).toBeGreaterThan(0);
  });

  it("exposes gallery entries mixing video and source kinds", () => {
    expect(GALLERY_ENTRIES.length).toBeGreaterThan(0);
    const kinds = new Set(GALLERY_ENTRIES.map((e) => e.kind));
    expect(kinds.has("video")).toBe(true);
    expect(kinds.has("source")).toBe(true);
    for (const entry of GALLERY_ENTRIES) {
      if (entry.kind === "video") {
        expect(entry.videoId.length).toBeGreaterThan(0);
        expect(entry.title.length).toBeGreaterThan(0);
        expect(entry.channel.length).toBeGreaterThan(0);
      } else {
        expect(entry.href.startsWith("https://")).toBe(true);
        expect(entry.label.length).toBeGreaterThan(0);
        expect(entry.icon.length).toBeGreaterThan(0);
      }
    }
  });
});
