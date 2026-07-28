// src/render/imageAssets.ts
export type ImageAssetEntry =
  | { status: "loading"; image?: undefined }
  | { status: "ready"; image: HTMLImageElement }
  | { status: "error"; image?: undefined };

export type AssetLoadResult =
  | { url: string; status: "ready"; image: HTMLImageElement }
  | { url: string; status: "error"; error: Error };

export type ImageCtor = new () => HTMLImageElement;

export class ImageAssetCache {
  private readonly entries = new Map<string, ImageAssetEntry>();
  private readonly loads = new Map<string, Promise<AssetLoadResult>>();
  private readonly diagnosedFailures = new Set<string>();
  private readonly ImageCtor: ImageCtor;

  constructor(imageCtor?: ImageCtor) {
    this.ImageCtor = imageCtor ?? (globalThis.Image as unknown as ImageCtor);
  }

  get(url: string): ImageAssetEntry {
    if (!this.entries.has(url)) this.startLoad(url);
    return this.entries.get(url)!;
  }

  load(url: string): Promise<AssetLoadResult> {
    return this.loads.get(url) ?? this.startLoad(url);
  }

  preload(urls: readonly string[]): Promise<readonly AssetLoadResult[]> {
    return Promise.all(urls.map((url) => this.load(url)));
  }

  hasFailure(url: string): boolean {
    return this.entries.get(url)?.status === "error";
  }

  private startLoad(url: string): Promise<AssetLoadResult> {
    const img = new this.ImageCtor();
    this.entries.set(url, { status: "loading" });

    let resolveLoad!: (result: AssetLoadResult) => void;
    const pending = new Promise<AssetLoadResult>((resolve) => {
      resolveLoad = resolve;
    });
    this.loads.set(url, pending);

    let settled = false;
    const fail = (reason: unknown) => {
      if (settled) return;
      settled = true;
      const error = reason instanceof Error
        ? reason
        : new Error(`Failed to load image asset "${url}"`);
      this.entries.set(url, { status: "error" });
      if (!this.diagnosedFailures.has(url)) {
        this.diagnosedFailures.add(url);
        console.warn(`Image asset failed: ${url}`, error);
      }
      resolveLoad({ url, status: "error", error });
    };

    img.onload = () => {
      const decode = img.decode;
      const decoded = typeof decode === "function"
        ? decode.call(img)
        : Promise.resolve();
      void decoded.then(() => {
        if (settled) return;
        settled = true;
        this.entries.set(url, { status: "ready", image: img });
        resolveLoad({ url, status: "ready", image: img });
      }, fail);
    };
    img.onerror = fail;
    img.src = url;
    return pending;
  }
}

let singleton: ImageAssetCache | null = null;

export function getImageAssetCache(): ImageAssetCache {
  if (singleton === null) singleton = new ImageAssetCache();
  return singleton;
}
