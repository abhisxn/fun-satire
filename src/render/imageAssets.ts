// src/render/imageAssets.ts
export type ImageAssetEntry =
  | { status: "loading"; image?: undefined }
  | { status: "ready"; image: HTMLImageElement }
  | { status: "error"; image?: undefined };

export type ImageCtor = new () => HTMLImageElement;

export class ImageAssetCache {
  private readonly entries = new Map<string, ImageAssetEntry>();
  private readonly ImageCtor: ImageCtor;

  constructor(imageCtor?: ImageCtor) {
    this.ImageCtor = imageCtor ?? (globalThis.Image as unknown as ImageCtor);
  }

  get(url: string): ImageAssetEntry {
    const existing = this.entries.get(url);
    if (existing) return existing;
    const img = new this.ImageCtor();
    const entry: ImageAssetEntry = { status: "loading" };
    this.entries.set(url, entry);
    img.onload = () => {
      this.entries.set(url, { status: "ready", image: img });
    };
    img.onerror = () => {
      this.entries.set(url, { status: "error" });
    };
    img.src = url;
    return entry;
  }

  preload(urls: readonly string[]): void {
    for (const url of urls) this.get(url);
  }
}

let singleton: ImageAssetCache | null = null;

export function getImageAssetCache(): ImageAssetCache {
  if (singleton === null) singleton = new ImageAssetCache();
  return singleton;
}
