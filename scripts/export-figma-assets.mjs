import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPROVED_SOURCE_NODES,
  assertPayloadBudget,
  assertSafeSvg,
  canonicalizeAssets,
  dimensionsOf,
  eyeGeometryOf,
  normalizeSceneReference,
  optimizePngLosslessly,
  safeOutputPath,
  validateManifest,
  verifyNoUnlistedFiles,
} from "./figma-asset-audit.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "figma-assets.source.json");
const outputRoot = resolve(root, "public/assets/figma");
const registryPath = resolve(root, "src/assets/figmaAssetRegistry.ts");
const eyeRegistryPath = resolve(root, "src/assets/eyeAssetRegistry.ts");
const mode = process.argv[2];
const SOURCE_VERSION = "figma-dev-mode-mcp@1.0.0";

if (mode !== "--write" && mode !== "--verify") {
  throw new Error("Usage: node scripts/export-figma-assets.mjs --write|--verify");
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function maxBytesFor(entry) {
  if (entry.id === "subject-lotus") return 700_000;
  if (entry.role === "subject") return 160_000;
  if (entry.role === "reference") return 4 * 1024 * 1024;
  if (entry.role === "eye") return 16_384;
  return 65_536;
}

function prepareManifest(rawManifest) {
  const manifest = structuredClone(rawManifest);
  manifest.schemaVersion = 2;
  manifest.sourceNodes = APPROVED_SOURCE_NODES;
  manifest.payloadBudgetBytes = 12 * 1024 * 1024;
  manifest.exportProvenance = {
    sourceVersion: SOURCE_VERSION,
    capturedAt: new Date().toISOString(),
  };

  const renames = {
    "scene-bug-left": { id: "crowd-bug-left", role: "crowd", category: "crowd" },
    "scene-bug-right": { id: "crowd-bug-right", role: "crowd", category: "crowd" },
    "scene-bug-upright": { id: "crowd-bug-upright", role: "crowd", category: "crowd" },
    "attack-target-glow": { id: "effect-attack-target-glow", role: "effect", category: "effects" },
  };

  manifest.assets = manifest.assets
    .filter((entry) => !entry.id.startsWith("reference-"))
    .map((sourceEntry) => {
      const entry = { ...sourceEntry, ...(renames[sourceEntry.id] ?? {}) };
      entry.sourceKind = "figma-asset-endpoint";
      entry.destination = `public/assets/figma/${entry.category}/${entry.id}.${entry.format}`;
      entry.maxBytes = maxBytesFor(entry);
      entry.optimization = entry.id === "subject-lotus" ? "lossless-deflate" : "source-bytes";
      entry.provenance = {
        fileKey: manifest.figmaFile.key,
        pageNodeId: manifest.figmaFile.pageNodeId,
        sourceNodeId: entry.nodeId,
        sourceVersion: SOURCE_VERSION,
        captureMethod: "asset-endpoint",
      };
      return entry;
    });

  for (const node of APPROVED_SOURCE_NODES) {
    manifest.assets.push({
      id: `reference-${node.name}`,
      role: "reference",
      category: "references",
      nodeId: node.id,
      sourceHash: "0".repeat(64),
      sourceKind: "figma-mcp-screenshot",
      format: "png",
      destination: `public/assets/figma/references/reference-${node.name}.png`,
      requiredFor: [node.id],
      maxBytes: 4 * 1024 * 1024,
      optimization: "source-bytes",
      provenance: {
        fileKey: manifest.figmaFile.key,
        pageNodeId: manifest.figmaFile.pageNodeId,
        sourceNodeId: node.id,
        sourceVersion: SOURCE_VERSION,
        captureMethod: "get_screenshot",
      },
    });
  }
  manifest.assets = canonicalizeAssets(manifest.assets);
  return manifest;
}

function parityMappingFor(node, originalCaptureDimensions) {
  const sourceDimensions = { width: node.width, height: node.height };
  const sourceCrop = { x: 0, y: 0, ...sourceDimensions };
  const captureCrop = { x: 0, y: 0, ...originalCaptureDimensions };
  const isFullScene = node.id === "18:113" || node.id === "109:3669";
  const normalizedDimensions = isFullScene ? { width: 1020, height: 663 } : sourceDimensions;
  const scale = isFullScene ? 0.796875 : 1;
  const transform = isFullScene ? "full-crop-resample" : "identity";
  const resampling = isFullScene ? "nearest-neighbor" : "none";
  return {
    sourceDimensions,
    originalCaptureDimensions,
    parityMapping: {
      kind: isFullScene ? "full-scene-normalized" : "intrinsic",
      normalizedDimensions,
      sourceCrop,
      captureCrop,
      scaleX: scale,
      scaleY: scale,
      transform,
      resampling,
      browserCapture: { width: normalizedDimensions.width, height: normalizedDimensions.height, scale, sourceCrop, transform, resampling },
    },
  };
}

function parseSse(text) {
  const data = text.split("\n").filter((line) => line.startsWith("data: ")).map((line) => line.slice(6));
  if (data.length === 0) throw new Error("Figma MCP returned no SSE data");
  return JSON.parse(data.at(-1));
}

async function postMcp(body, sessionId) {
  const response = await fetch("http://localhost:3845/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Figma MCP failed with HTTP ${response.status}`);
  return { payload: parseSse(await response.text()), sessionId: response.headers.get("mcp-session-id") ?? sessionId };
}

async function createScreenshotClient() {
  const initialized = await postMcp({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "fun-satire-figma-export", version: "1.0.0" },
    },
  });
  const server = initialized.payload.result?.serverInfo;
  if (`${server?.name}@${server?.version}` !== "Figma Dev Mode MCP Server@1.0.0") {
    throw new Error(`Unexpected Figma MCP source version: ${server?.name}@${server?.version}`);
  }
  let requestId = 2;
  return async (nodeId) => {
    const result = await postMcp({
      jsonrpc: "2.0",
      id: requestId++,
      method: "tools/call",
      params: { name: "get_screenshot", arguments: { nodeId, contentsOnly: false } },
    }, initialized.sessionId);
    const image = result.payload.result?.content?.find((item) => item.type === "image" && item.mimeType === "image/png");
    if (!image?.data) throw new Error(`${nodeId}: Figma MCP returned no PNG screenshot`);
    return Buffer.from(image.data, "base64");
  };
}

function runtimeEntry(entry) {
  return {
    id: entry.id,
    role: entry.role,
    nodeId: entry.nodeId,
    sourceHash: entry.sourceHash,
    sourceSha256: entry.sourceSha256,
    sha256: entry.sha256,
    format: entry.format,
    url: entry.destination.slice("public".length),
    width: entry.width,
    height: entry.height,
    sourceByteLength: entry.sourceByteLength,
    byteLength: entry.byteLength,
    maxBytes: entry.maxBytes,
    requiredFor: entry.requiredFor,
    provenance: entry.provenance,
    ...(entry.geometry ? { geometry: entry.geometry } : {}),
  };
}

function generateRegistry(entries) {
  const body = JSON.stringify(canonicalizeAssets(entries).map(runtimeEntry), null, 2);
  return `export type FigmaAssetRole = "eye" | "subject" | "control-icon" | "crowd" | "effect" | "reference";

export type FigmaAssetEntry = Readonly<{
  id: string;
  role: FigmaAssetRole;
  nodeId: string;
  sourceHash: string;
  sourceSha256: string;
  sha256: string;
  format: "svg" | "png";
  url: string;
  width: number;
  height: number;
  sourceByteLength: number;
  byteLength: number;
  maxBytes: number;
  requiredFor: readonly string[];
  provenance: Readonly<{
    fileKey: string;
    pageNodeId: string;
    sourceNodeId: string;
    sourceVersion: string;
    captureMethod: "asset-endpoint" | "get_screenshot";
    sourceDimensions?: Readonly<{ width: number; height: number }>;
    originalCaptureDimensions?: Readonly<{ width: number; height: number }>;
    parityMapping?: FigmaParityMapping;
  }>;
  geometry?: EyeAssetGeometry;
}>;

export type EyeAssetGeometry = Readonly<{
  viewBox: Readonly<{ x: number; y: number; width: number; height: number }>;
  crop: Readonly<{ x: number; y: number; width: number; height: number }>;
  socketPath: string;
  clipPath: string;
  iris: Readonly<{ centerX: number; centerY: number; radius: number; fill: string }>;
  irisSourceOffset: Readonly<{ x: number; y: number }>;
}>;

export type FigmaParityMapping = Readonly<{
  kind: "full-scene-normalized" | "intrinsic";
  normalizedDimensions: Readonly<{ width: number; height: number }>;
  sourceCrop: Readonly<{ x: number; y: number; width: number; height: number }>;
  captureCrop: Readonly<{ x: number; y: number; width: number; height: number }>;
  scaleX: number;
  scaleY: number;
  transform: "full-crop-resample" | "identity";
  resampling: "nearest-neighbor" | "none";
  browserCapture: Readonly<{
    width: number;
    height: number;
    scale: number;
    sourceCrop: Readonly<{ x: number; y: number; width: number; height: number }>;
    transform: "full-crop-resample" | "identity";
    resampling: "nearest-neighbor" | "none";
  }>;
}>;

export const FIGMA_ASSETS = Object.freeze(${body} satisfies readonly FigmaAssetEntry[]);

export function requiredAssetsFor(id: string): readonly FigmaAssetEntry[] {
  return FIGMA_ASSETS.filter((entry) => entry.requiredFor.includes(id));
}
`;
}

function generateEyeRegistry(entries) {
  const eyeIds = canonicalizeAssets(entries).filter((entry) => entry.role === "eye").map((entry) => entry.id);
  return `import { FIGMA_ASSETS } from "./figmaAssetRegistry";

type RegisteredFigmaAsset = (typeof FIGMA_ASSETS)[number];
export type EyeAssetEntry = Extract<RegisteredFigmaAsset, Readonly<{ role: "eye" }>>;

export const EYE_ASSET_IDS = Object.freeze(${JSON.stringify(eyeIds, null, 2)} as const);

const eyeAssetsById = new Map(FIGMA_ASSETS.filter((entry): entry is EyeAssetEntry => entry.role === "eye").map((entry) => [entry.id, entry]));
export const EYE_ASSETS = Object.freeze(EYE_ASSET_IDS.map((id) => {
  const asset = eyeAssetsById.get(id);
  if (!asset) throw new Error(\`Missing golden eye asset: \${id}\`);
  return asset;
}));

export function eyeAssetForEntity(entityId: string): EyeAssetEntry {
  let hash = 2166136261;
  for (let index = 0; index < entityId.length; index += 1) {
    hash ^= entityId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return EYE_ASSETS[(hash >>> 0) % EYE_ASSETS.length];
}
`;
}

const sourceManifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (mode === "--write") {
  const manifest = prepareManifest(sourceManifest);
  const payloads = new Map();
  let screenshot;

  for (const entry of manifest.assets) {
    let sourceBytes;
    if (entry.sourceKind === "figma-mcp-screenshot") {
      screenshot ??= await createScreenshotClient();
      sourceBytes = await screenshot(entry.nodeId);
      entry.sourceHash = digest(sourceBytes);
      const sourceNode = APPROVED_SOURCE_NODES.find((node) => node.id === entry.nodeId);
      if (!sourceNode) throw new Error(`${entry.id}: unapproved screenshot source node`);
      Object.assign(entry.provenance, parityMappingFor(sourceNode, dimensionsOf(sourceBytes, "png")));
    } else {
      const expectedSource = `http://localhost:3845/assets/${entry.sourceHash}.${entry.format}`;
      if (entry.sourceUrl !== expectedSource) throw new Error(`${entry.id}: source URL does not match hash and format`);
      const response = await fetch(entry.sourceUrl);
      if (!response.ok) throw new Error(`${entry.id}: Figma export failed with HTTP ${response.status}`);
      sourceBytes = Buffer.from(await response.arrayBuffer());
    }

    entry.sourceSha256 = digest(sourceBytes);
    entry.sourceByteLength = sourceBytes.length;
    const isNormalizedScene = entry.role === "reference" && entry.provenance.parityMapping.kind === "full-scene-normalized";
    entry.optimization = isNormalizedScene ? "nearest-neighbor-full-crop-normalization" : entry.optimization;
    const outputBytes = isNormalizedScene
      ? normalizeSceneReference(sourceBytes)
      : entry.optimization === "lossless-deflate" ? optimizePngLosslessly(sourceBytes) : sourceBytes;
    if (entry.format === "svg") assertSafeSvg(outputBytes);
    const dimensions = dimensionsOf(outputBytes, entry.format);
    entry.width = dimensions.width;
    entry.height = dimensions.height;
    entry.byteLength = outputBytes.length;
    entry.sha256 = digest(outputBytes);
    if (entry.role === "eye") entry.geometry = eyeGeometryOf(outputBytes);
    else delete entry.geometry;
    assertPayloadBudget(entry, outputBytes);
    payloads.set(entry.id, outputBytes);
  }

  manifest.assets = canonicalizeAssets(manifest.assets);
  if (manifest.assets.reduce((total, entry) => total + entry.byteLength, 0) > manifest.payloadBudgetBytes) {
    throw new Error("Figma asset inventory exceeds total payload budget");
  }
  validateManifest(manifest);

  await rm(outputRoot, { recursive: true, force: true });
  for (const entry of manifest.assets) {
    const outputPath = safeOutputPath(root, entry.destination);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, payloads.get(entry.id));
  }
  await mkdir(dirname(registryPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(registryPath, generateRegistry(manifest.assets));
  await writeFile(eyeRegistryPath, generateEyeRegistry(manifest.assets));
  await verifyNoUnlistedFiles(root, manifest.assets);
  console.log(`Exported and recorded ${manifest.assets.length} audited Figma assets.`);
} else {
  const manifest = sourceManifest;
  validateManifest(manifest);
  for (const entry of manifest.assets) {
    const bytes = await readFile(safeOutputPath(root, entry.destination));
    if (entry.format === "svg") assertSafeSvg(bytes);
    const dimensions = dimensionsOf(bytes, entry.format);
    if (digest(bytes) !== entry.sha256) throw new Error(`${entry.id}: SHA-256 mismatch`);
    if (bytes.length !== entry.byteLength) throw new Error(`${entry.id}: byte-length mismatch`);
    if (dimensions.width !== entry.width || dimensions.height !== entry.height) throw new Error(`${entry.id}: dimension mismatch`);
    if (entry.role === "eye" && JSON.stringify(eyeGeometryOf(bytes)) !== JSON.stringify(entry.geometry)) {
      throw new Error(`${entry.id}: eye geometry drift`);
    }
    assertPayloadBudget(entry, bytes);
  }
  await verifyNoUnlistedFiles(root, manifest.assets);
  if (await readFile(registryPath, "utf8") !== generateRegistry(manifest.assets)) throw new Error("General registry drift");
  if (await readFile(eyeRegistryPath, "utf8") !== generateEyeRegistry(manifest.assets)) throw new Error("Eye registry drift");
  console.log(`Verified ${manifest.assets.length} audited Figma assets and generated registries.`);
}
