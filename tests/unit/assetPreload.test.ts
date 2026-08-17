// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { preloadImages } from "../../src/core/assetPreload";

describe("preloadImages", () => {
  let originalImage: typeof Image;

  beforeEach(() => {
    originalImage = globalThis.Image;
  });

  afterEach(() => {
    globalThis.Image = originalImage;
    vi.restoreAllMocks();
  });

  it("resolves immediately for an empty array", async () => {
    await expect(preloadImages([])).resolves.toBeUndefined();
  });

  it("resolves immediately for array containing only null, undefined, or empty strings", async () => {
    await expect(preloadImages([null, undefined, ""])).resolves.toBeUndefined();
  });

  it("preloads valid image URLs and resolves when all images load", async () => {
    const loadedUrls: string[] = [];
    class MockImage {
      private _src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      get src() {
        return this._src;
      }

      set src(url: string) {
        this._src = url;
        loadedUrls.push(url);
        setTimeout(() => {
          this.onload?.();
        }, 0);
      }
    }

    globalThis.Image = MockImage as unknown as typeof Image;

    const urls = ["/avatars/grin/grin_kaleshi.webp", "/avatars/normal/kaleshi.webp"];
    await expect(preloadImages(urls)).resolves.toBeUndefined();
    expect(loadedUrls).toEqual(urls);
  });

  it("filters out invalid entries while loading valid URLs", async () => {
    const loadedUrls: string[] = [];
    class MockImage {
      private _src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      get src() {
        return this._src;
      }

      set src(url: string) {
        this._src = url;
        loadedUrls.push(url);
        setTimeout(() => {
          this.onload?.();
        }, 0);
      }
    }

    globalThis.Image = MockImage as unknown as typeof Image;

    const urls = [null, "/avatars/grin/grin_kaleshi.webp", undefined, "", "/avatars/normal/kaleshi.webp"];
    await expect(preloadImages(urls)).resolves.toBeUndefined();
    expect(loadedUrls).toEqual(["/avatars/grin/grin_kaleshi.webp", "/avatars/normal/kaleshi.webp"]);
  });

  it("resolves without throwing when images fail to load (onerror)", async () => {
    class MockFailingImage {
      private _src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      get src() {
        return this._src;
      }

      set src(url: string) {
        this._src = url;
        setTimeout(() => {
          this.onerror?.();
        }, 0);
      }
    }

    globalThis.Image = MockFailingImage as unknown as typeof Image;

    const urls = ["/avatars/non_existent_1.webp", "/avatars/non_existent_2.webp"];
    await expect(preloadImages(urls)).resolves.toBeUndefined();
  });

  it("resolves when some images succeed and some fail", async () => {
    class MixedImage {
      private _src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      get src() {
        return this._src;
      }

      set src(url: string) {
        this._src = url;
        setTimeout(() => {
          if (url.includes("fail")) {
            this.onerror?.();
          } else {
            this.onload?.();
          }
        }, 0);
      }
    }

    globalThis.Image = MixedImage as unknown as typeof Image;

    const urls = ["/avatars/good.webp", "/avatars/fail.webp"];
    await expect(preloadImages(urls)).resolves.toBeUndefined();
  });
});
