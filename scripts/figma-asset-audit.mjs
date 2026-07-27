import { inflateSync, deflateSync } from "node:zlib";
import { readdir } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const APPROVED_SOURCE_NODES = Object.freeze([
  { id: "18:113", name: "eyes-default", width: 1280, height: 832 },
  { id: "103:2490", name: "control-icons", width: 200, height: 99 },
  { id: "103:3579", name: "filter-panel", width: 139, height: 170.00010681152344 },
  { id: "103:3593", name: "avatar-gallery", width: 284, height: 700 },
  { id: "109:3669", name: "eyes-attack", width: 1280, height: 832 },
]);

const ROLE_POLICY = Object.freeze({
  eye: { category: "eyes", format: "svg", id: /^eye-/ },
  subject: { category: "subjects", format: "png", id: /^subject-/ },
  "control-icon": { category: "icons", format: "svg", id: /^(?:control|filter|scene-control)-/ },
  crowd: { category: "crowd", format: "svg", id: /^crowd-/ },
  effect: { category: "effects", format: "svg", id: /^effect-/ },
  reference: { category: "references", format: "png", id: /^reference-/ },
});

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");

export function sha256(createHash, bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function safeOutputPath(root, destination) {
  const outputRoot = resolve(root, "public/assets/figma");
  const outputPath = resolve(root, destination);
  const pathFromOutput = relative(outputRoot, outputPath);
  if (pathFromOutput === "" || pathFromOutput === ".." || pathFromOutput.startsWith(`..${sep}`) || isAbsolute(pathFromOutput)) {
    throw new Error(`${destination}: destination resolves outside public/assets/figma`);
  }
  return outputPath;
}

export function dimensionsOf(bytes, format) {
  if (format === "png") {
    if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE) || bytes.toString("ascii", 12, 16) !== "IHDR") {
      throw new Error("Invalid PNG payload");
    }
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }

  const svg = bytes.toString("utf8");
  const viewBox = svg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  if (viewBox) return { width: Number(viewBox[3]), height: Number(viewBox[4]) };
  const width = svg.match(/\bwidth=["']([\d.]+)(?:px)?["']/i);
  const height = svg.match(/\bheight=["']([\d.]+)(?:px)?["']/i);
  if (!width || !height) throw new Error("SVG has no intrinsic dimensions");
  return { width: Number(width[1]), height: Number(height[1]) };
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`));
  if (!match) throw new Error(`Eye SVG is missing ${name}`);
  return match[1];
}

export function eyeGeometryOf(bytes) {
  const svg = bytes.toString("utf8");
  const svgTag = svg.match(/<svg\b[^>]*>/)?.[0];
  const socketTag = svg.match(/<path\b[^>]*id=["']Ellipse 1["'][^>]*>/)?.[0];
  const maskBody = svg.match(/<mask\b[^>]*>([\s\S]*?)<\/mask>/)?.[1];
  const clipTag = maskBody?.match(/<path\b[^>]*>/)?.[0] ?? socketTag;
  const irisTag = svg.match(/<circle\b[^>]*id=["']Ellipse 2["'][^>]*>/)?.[0];
  const cropBody = svg.match(/<clipPath\b[^>]*>([\s\S]*?)<\/clipPath>/)?.[1];
  const cropTag = cropBody?.match(/<rect\b[^>]*>/)?.[0];
  if (!svgTag || !socketTag || !clipTag || !irisTag || !cropTag) {
    throw new Error("Eye SVG does not expose socket, clip, iris, and crop geometry");
  }

  const [x, y, width, height] = attribute(svgTag, "viewBox").split(/\s+/).map(Number);
  const centerX = Number(attribute(irisTag, "cx"));
  const centerY = Number(attribute(irisTag, "cy"));
  const fill = attribute(irisTag, "fill").match(/#[0-9a-f]{6}/i)?.[0];
  if (!fill) throw new Error("Eye SVG iris has no exact fallback fill");

  return {
    viewBox: { x, y, width, height },
    crop: {
      x: Number(cropTag.match(/\bx=["']([^"']+)/)?.[1] ?? 0),
      y: Number(cropTag.match(/\by=["']([^"']+)/)?.[1] ?? 0),
      width: Number(attribute(cropTag, "width")),
      height: Number(attribute(cropTag, "height")),
    },
    socketPath: attribute(socketTag, "d"),
    clipPath: attribute(clipTag, "d"),
    iris: { centerX, centerY, radius: Number(attribute(irisTag, "r")), fill },
    irisSourceOffset: { x: centerX - (x + width / 2), y: centerY - (y + height / 2) },
  };
}

export function assertSafeSvg(bytes) {
  const svg = bytes.toString("utf8");
  const unsafe = [
    /<\s*script\b/i,
    /<\s*foreignObject\b/i,
    /<\s*!DOCTYPE\b/i,
    /<\s*!ENTITY\b/i,
    /@import\b/i,
    /\son[a-z]+\s*=/i,
  ];
  if (unsafe.some((pattern) => pattern.test(svg))) throw new Error("Unsafe SVG executable content");

  for (const match of svg.matchAll(/(?:href|xlink:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    if (!match[1].startsWith("#")) throw new Error("Unsafe SVG external reference");
  }
  for (const match of svg.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)) {
    if (!match[1].startsWith("#")) throw new Error("Unsafe SVG external URL");
  }
}

function pngChunks(bytes) {
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("Invalid PNG payload");
  const chunks = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += length + 12;
  }
  return chunks;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  typeBytes.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8);
  return output;
}

export function optimizePngLosslessly(bytes) {
  const chunks = pngChunks(bytes);
  const sourceImageData = inflateSync(Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data)));
  const compressed = deflateSync(sourceImageData, { level: 9 });
  const outputChunks = [];
  let wroteImageData = false;
  for (const chunk of chunks) {
    if (chunk.type === "IDAT") {
      if (!wroteImageData) outputChunks.push(pngChunk("IDAT", compressed));
      wroteImageData = true;
    } else {
      outputChunks.push(pngChunk(chunk.type, chunk.data));
    }
  }
  const optimized = Buffer.concat([PNG_SIGNATURE, ...outputChunks]);
  const optimizedImageData = inflateSync(Buffer.concat(pngChunks(optimized).filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data)));
  if (!optimizedImageData.equals(sourceImageData)) throw new Error("Lossless PNG optimization changed image data");
  return optimized.length < bytes.length ? optimized : bytes;
}

export function assertPayloadBudget(entry, bytes) {
  if (!Number.isInteger(entry.maxBytes) || entry.maxBytes <= 0 || bytes.length > entry.maxBytes) {
    throw new Error(`${entry.id}: payload exceeds budget (${bytes.length}/${entry.maxBytes})`);
  }
}

export function canonicalizeAssets(assets) {
  return [...assets].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

export function validateManifest(manifest) {
  if (manifest.schemaVersion !== 2) throw new Error("Unsupported Figma manifest schema");
  if (manifest.figmaFile?.key !== "oPAdd7oWLQVMTP1v6pJOW0") throw new Error("Unexpected Figma file key");
  if (manifest.exportProvenance?.sourceVersion !== "figma-dev-mode-mcp@1.0.0") {
    throw new Error("Missing Figma export source version");
  }
  if (JSON.stringify(manifest.sourceNodes) !== JSON.stringify(APPROVED_SOURCE_NODES)) {
    throw new Error("Approved-node inventory is incomplete or has drifted");
  }

  for (const field of ["id", "destination", "sourceHash"]) {
    const values = manifest.assets.map((entry) => entry[field]);
    if (new Set(values).size !== values.length) throw new Error(`Duplicate asset ${field}`);
  }

  const approvedIds = new Set(APPROVED_SOURCE_NODES.map((node) => node.id));
  for (const entry of manifest.assets) {
    const policy = ROLE_POLICY[entry.role];
    if (!policy || entry.category !== policy.category || entry.format !== policy.format) {
      throw new Error(`${entry.id}: disallowed role, category, or format`);
    }
    if (!policy.id.test(entry.id)) throw new Error(`${entry.id}: semantic ID does not match role`);
    const expectedDestination = `public/assets/figma/${policy.category}/${entry.id}.${policy.format}`;
    if (entry.destination !== expectedDestination) throw new Error(`${entry.id}: destination is not canonical`);
    safeOutputPath("/manifest-root", entry.destination);
    if (!/^\d+:\d+$/.test(entry.nodeId) || !/^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(entry.sourceHash)) {
      throw new Error(`${entry.id}: invalid source node or hash provenance`);
    }
    if (!Array.isArray(entry.requiredFor) || entry.requiredFor.length === 0 || entry.requiredFor.some((id) => !approvedIds.has(id))) {
      throw new Error(`${entry.id}: invalid approved-node requirement`);
    }
    if (!(entry.width > 0) || !(entry.height > 0) || !(entry.byteLength > 0) || !(entry.sourceByteLength > 0) || !(entry.maxBytes > 0)) {
      throw new Error(`${entry.id}: invalid dimensions or payload provenance`);
    }
    if (!/^[a-f0-9]{64}$/.test(entry.sha256) || !/^[a-f0-9]{64}$/.test(entry.sourceSha256)) {
      throw new Error(`${entry.id}: invalid SHA-256 provenance`);
    }
    if (entry.provenance?.fileKey !== manifest.figmaFile.key || entry.provenance?.sourceVersion !== manifest.exportProvenance.sourceVersion) {
      throw new Error(`${entry.id}: incomplete export provenance`);
    }
    if (entry.role === "reference") {
      const sourceNode = APPROVED_SOURCE_NODES.find((node) => node.id === entry.nodeId);
      if (entry.sourceKind !== "figma-mcp-screenshot" || entry.provenance.captureMethod !== "get_screenshot") {
        throw new Error(`${entry.id}: invalid screenshot source kind or provenance`);
      }
      if (entry.sourceHash !== entry.sourceSha256 || JSON.stringify(entry.provenance.nodeDimensions) !== JSON.stringify({ width: sourceNode?.width, height: sourceNode?.height })) {
        throw new Error(`${entry.id}: screenshot hash or node-dimension provenance drift`);
      }
    } else {
      const expectedSourceUrl = `http://localhost:3845/assets/${entry.sourceHash}.${entry.format}`;
      if (entry.sourceKind !== "figma-asset-endpoint" || entry.provenance.captureMethod !== "asset-endpoint" || entry.sourceUrl !== expectedSourceUrl) {
        throw new Error(`${entry.id}: source URL or endpoint provenance drift`);
      }
    }
    if (entry.role === "eye" && !entry.geometry) throw new Error(`${entry.id}: missing eye geometry`);
  }

  const totalBytes = manifest.assets.reduce((total, entry) => total + entry.byteLength, 0);
  if (!Number.isInteger(manifest.payloadBudgetBytes) || totalBytes > manifest.payloadBudgetBytes) {
    throw new Error(`Figma inventory exceeds total payload budget (${totalBytes}/${manifest.payloadBudgetBytes})`);
  }

  const references = manifest.assets.filter((entry) => entry.role === "reference");
  if (references.length !== APPROVED_SOURCE_NODES.length) throw new Error("Exactly one parity reference per approved node is required");
  for (const node of APPROVED_SOURCE_NODES) {
    const matches = references.filter((entry) => entry.nodeId === node.id);
    if (matches.length !== 1 || matches[0].requiredFor.length !== 1 || matches[0].requiredFor[0] !== node.id) {
      throw new Error(`${node.id}: parity reference completeness failure`);
    }
  }
}

async function walkFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await walkFiles(resolve(directory, entry.name), relativePath));
    else files.push(relativePath);
  }
  return files;
}

export async function verifyNoUnlistedFiles(root, entries) {
  const outputRoot = resolve(root, "public/assets/figma");
  const actual = (await walkFiles(outputRoot)).map((path) => `public/assets/figma/${path}`).sort();
  const expected = entries.map((entry) => entry.destination).sort();
  const unlisted = actual.filter((path) => !expected.includes(path));
  const missing = expected.filter((path) => !actual.includes(path));
  if (unlisted.length > 0 || missing.length > 0) {
    throw new Error(`Figma inventory mismatch; unlisted=[${unlisted.join(", ")}], missing=[${missing.join(", ")}]`);
  }
}
