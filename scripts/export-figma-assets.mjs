import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "figma-assets.source.json");
const registryPath = resolve(root, "src/assets/figmaAssetRegistry.ts");
const eyeRegistryPath = resolve(root, "src/assets/eyeAssetRegistry.ts");
const mode = process.argv[2];

if (mode !== "--write" && mode !== "--verify") {
  throw new Error("Usage: node scripts/export-figma-assets.mjs --write|--verify");
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function dimensionsOf(bytes, format) {
  if (format === "png") {
    const signature = bytes.subarray(0, 8).toString("hex");
    if (signature !== "89504e470d0a1a0a" || bytes.toString("ascii", 12, 16) !== "IHDR") {
      throw new Error("Invalid PNG payload");
    }
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }

  const svg = bytes.toString("utf8");
  const viewBox = svg.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };

  const width = svg.match(/\bwidth=["']([\d.]+)(?:px)?["']/i);
  const height = svg.match(/\bheight=["']([\d.]+)(?:px)?["']/i);
  if (!width || !height) throw new Error("SVG has no intrinsic dimensions");
  return { width: Number(width[1]), height: Number(height[1]) };
}

function validateEntry(entry) {
  const expectedSource = `http://localhost:3845/assets/${entry.sourceHash}.${entry.format}`;
  if (entry.sourceUrl !== expectedSource) {
    throw new Error(`${entry.id}: source URL does not match its source hash and format`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) {
    throw new Error(`${entry.id}: asset ID is not semantic kebab-case`);
  }
  if (!entry.destination.startsWith(`public/assets/figma/${entry.category}/`)) {
    throw new Error(`${entry.id}: destination does not match category ${entry.category}`);
  }
}

function runtimeEntry(entry) {
  return {
    id: entry.id,
    role: entry.role,
    nodeId: entry.nodeId,
    sourceHash: entry.sourceHash,
    sha256: entry.sha256,
    url: entry.destination.slice("public".length),
    width: entry.width,
    height: entry.height,
    requiredFor: entry.requiredFor,
  };
}

function generateRegistry(entries) {
  const body = JSON.stringify(entries.map(runtimeEntry), null, 2);
  return `export type FigmaAssetRole = "eye" | "subject" | "control-icon" | "reference";

export type FigmaAssetEntry = Readonly<{
  id: string;
  role: FigmaAssetRole;
  nodeId: string;
  sourceHash: string;
  sha256: string;
  url: string;
  width: number;
  height: number;
  requiredFor: readonly string[];
}>;

export const FIGMA_ASSETS = Object.freeze(${body} satisfies readonly FigmaAssetEntry[]);

export function requiredAssetsFor(id: string): readonly FigmaAssetEntry[] {
  return FIGMA_ASSETS.filter((entry) => entry.requiredFor.includes(id));
}
`;
}

function generateEyeRegistry() {
  return `import {
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
`;
}

for (const entry of manifest.assets) validateEntry(entry);

if (mode === "--write") {
  for (const entry of manifest.assets) {
    const response = await fetch(entry.sourceUrl);
    if (!response.ok) throw new Error(`${entry.id}: Figma export failed with HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const dimensions = dimensionsOf(bytes, entry.format);
    entry.width = dimensions.width;
    entry.height = dimensions.height;
    entry.sha256 = sha256(bytes);

    const outputPath = resolve(root, entry.destination);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, bytes);
  }

  await mkdir(dirname(registryPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(registryPath, generateRegistry(manifest.assets));
  await writeFile(eyeRegistryPath, generateEyeRegistry());
  console.log(`Exported and recorded ${manifest.assets.length} Figma assets.`);
} else {
  for (const entry of manifest.assets) {
    const bytes = await readFile(resolve(root, entry.destination));
    const dimensions = dimensionsOf(bytes, entry.format);
    if (sha256(bytes) !== entry.sha256) throw new Error(`${entry.id}: SHA-256 mismatch`);
    if (dimensions.width !== entry.width || dimensions.height !== entry.height) {
      throw new Error(`${entry.id}: intrinsic dimension mismatch`);
    }
  }

  const expectedRegistry = generateRegistry(manifest.assets);
  const expectedEyeRegistry = generateEyeRegistry();
  if (await readFile(registryPath, "utf8") !== expectedRegistry) {
    throw new Error("src/assets/figmaAssetRegistry.ts has drifted from the source manifest");
  }
  if (await readFile(eyeRegistryPath, "utf8") !== expectedEyeRegistry) {
    throw new Error("src/assets/eyeAssetRegistry.ts has drifted from the source manifest");
  }
  console.log(`Verified ${manifest.assets.length} Figma assets and generated registries.`);
}
