import { inflateSync, deflateSync } from "node:zlib";
import { readdir } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { SaxesParser } from "saxes";

export const APPROVED_SOURCE_NODES = Object.freeze([
  { id: "18:113", name: "eyes-default", width: 1280, height: 832 },
  { id: "103:2490", name: "control-icons", width: 200, height: 99 },
  { id: "103:3579", name: "filter-panel", width: 139, height: 170 },
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
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
const SVG_ELEMENTS = new Set([
  "circle", "clipPath", "defs", "feBlend", "feColorMatrix", "feComposite", "feFlood",
  "feGaussianBlur", "feMorphology", "feOffset", "filter", "g", "line", "linearGradient",
  "mask", "path", "rect", "stop", "svg",
]);
const SVG_ATTRIBUTES = new Set([
  "clip-path", "clip-rule", "color-interpolation-filters", "cx", "cy", "d", "dy", "fill",
  "fill-rule", "filter", "filterUnits", "flood-opacity", "gradientUnits", "height", "href",
  "id", "in", "in2", "mask", "maskUnits", "mode", "offset", "opacity", "operator",
  "overflow", "preserveAspectRatio", "r", "radius", "result", "stdDeviation", "stop-color",
  "stroke", "stroke-linecap", "stroke-linejoin", "stroke-width", "style", "type", "values",
  "viewBox", "width", "x", "x1", "x2", "y", "y1", "y2",
]);
const INTERNAL_SVG_URL = "url\\(#[A-Za-z_][\\w:.-]*\\)";
const PRESENTATION_GRAMMARS = new Map([
  ["fill", new RegExp(`^(?:none|white|${INTERNAL_SVG_URL}|var\\(--fill-0, (?:#[0-9A-F]{6}|black|white)\\))$`)],
  ["stroke", /^var\(--stroke-0, (?:#[0-9A-F]{6}|black)\)$/],
  ["filter", new RegExp(`^${INTERNAL_SVG_URL}$`)],
  ["mask", new RegExp(`^${INTERNAL_SVG_URL}$`)],
  ["clip-path", new RegExp(`^${INTERNAL_SVG_URL}$`)],
  ["stop-color", /^#[0-9A-F]{6}$/],
  ["opacity", /^(?:0(?:\.\d+)?|1)$/],
  ["flood-opacity", /^(?:0(?:\.\d+)?|1)$/],
  ["stroke-width", /^\d+(?:\.\d+)?$/],
  ["stroke-linecap", /^round$/],
  ["stroke-linejoin", /^round$/],
  ["fill-rule", /^evenodd$/],
  ["clip-rule", /^evenodd$/],
  ["color-interpolation-filters", /^sRGB$/],
]);

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
  const parser = new SaxesParser({ xmlns: true });
  let rootSeen = false;

  parser.on("opentag", (element) => {
    if (element.uri !== SVG_NAMESPACE || !SVG_ELEMENTS.has(element.local)) {
      throw new Error(`Unsafe SVG element: {${element.uri}}${element.local}`);
    }
    if (!rootSeen) {
      rootSeen = true;
      if (element.local !== "svg") throw new Error("Unsafe SVG root element");
    }

    for (const attribute of Object.values(element.attributes)) {
      if (attribute.uri === XMLNS_NAMESPACE) {
        if (attribute.value !== SVG_NAMESPACE && attribute.value !== XLINK_NAMESPACE) {
          throw new Error(`Unsafe SVG namespace declaration: ${attribute.value}`);
        }
        continue;
      }
      if (attribute.uri === XLINK_NAMESPACE) {
        if (attribute.local !== "href") throw new Error(`Unsafe SVG xlink attribute: ${attribute.local}`);
      } else if (attribute.uri !== "" || !SVG_ATTRIBUTES.has(attribute.local)) {
        throw new Error(`Unsafe SVG attribute: {${attribute.uri}}${attribute.local}`);
      }
      assertSafeSvgAttribute(attribute.local, attribute.value);
    }
  });
  parser.on("doctype", () => { throw new Error("Unsafe SVG doctype"); });
  parser.on("processinginstruction", () => { throw new Error("Unsafe SVG processing instruction"); });
  parser.on("cdata", () => { throw new Error("Unsafe SVG CDATA"); });

  try {
    parser.write(svg).close();
  } catch (error) {
    throw new Error(`Malformed XML or unsafe SVG: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!rootSeen) throw new Error("Malformed XML or unsafe SVG: missing root element");
}

function assertSafeSvgAttribute(name, value) {
  if (/^on/i.test(name)) throw new Error(`Unsafe SVG event attribute: ${name}`);
  if (/[\\]|\/\*/.test(value)) throw new Error(`Unsafe SVG escaped or commented attribute value: ${name}`);
  const presentationGrammar = PRESENTATION_GRAMMARS.get(name);
  if (presentationGrammar && !presentationGrammar.test(value)) {
    throw new Error(`Unsafe SVG presentation value: ${name}`);
  }
  if (/(?:javascript\s*:|data\s*:|@import\b|expression\s*\(|behavior\s*:|-moz-binding\s*:)/i.test(value)) {
    throw new Error(`Unsafe SVG attribute value: ${name}`);
  }
  if (name === "href" && !/^#[A-Za-z_][\w:.-]*$/.test(value)) {
    throw new Error("Unsafe SVG external reference");
  }
  for (const match of value.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)) {
    if (!/^#[A-Za-z_][\w:.-]*$/.test(match[1])) throw new Error("Unsafe SVG external URL");
  }
  if (/url\s*\(/i.test(value) && !/url\(\s*["']?#[A-Za-z_][\w:.-]*["']?\s*\)/i.test(value)) {
    throw new Error("Unsafe SVG malformed URL");
  }
  if (name === "style") {
    for (const declaration of value.split(";").map((part) => part.trim()).filter(Boolean)) {
      const [property, styleValue, ...extra] = declaration.split(":").map((part) => part.trim());
      const allowed = (property === "display" && styleValue === "block")
        || (property === "mask-type" && (styleValue === "alpha" || styleValue === "luminance"));
      if (!allowed || extra.length > 0) throw new Error(`Unsafe SVG style declaration: ${declaration}`);
    }
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

function paeth(left, up, upperLeft) {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  return leftDistance <= upDistance && leftDistance <= upperLeftDistance ? left : upDistance <= upperLeftDistance ? up : upperLeft;
}

function decodeRgbaPng(bytes) {
  const chunks = pngChunks(bytes);
  const ihdr = chunks.find((chunk) => chunk.type === "IHDR")?.data;
  if (!ihdr || ihdr[8] !== 8 || ihdr[9] !== 6 || ihdr[12] !== 0) {
    throw new Error("Scene normalization requires non-interlaced 8-bit RGBA PNG input");
  }
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const stride = width * 4;
  const filtered = inflateSync(Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data)));
  if (filtered.length !== (stride + 1) * height) throw new Error("Unexpected RGBA PNG scanline length");
  const pixels = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    const filter = filtered[y * (stride + 1)];
    for (let x = 0; x < stride; x += 1) {
      const encoded = filtered[y * (stride + 1) + x + 1];
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? up
            : filter === 3 ? Math.floor((left + up) / 2)
              : filter === 4 ? paeth(left, up, upperLeft)
                : -1;
      if (predictor < 0) throw new Error(`Unsupported PNG filter: ${filter}`);
      pixels[y * stride + x] = (encoded + predictor) & 0xff;
    }
  }
  return { chunks, width, height, pixels };
}

function encodeRgbaPng(source, width, height, pixels) {
  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) pixels.copy(scanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const compressed = deflateSync(scanlines, { level: 9 });
  const outputChunks = [];
  let wroteImageData = false;
  for (const chunk of source.chunks) {
    if (chunk.type === "IHDR") {
      const ihdr = Buffer.from(chunk.data);
      ihdr.writeUInt32BE(width, 0);
      ihdr.writeUInt32BE(height, 4);
      outputChunks.push(pngChunk("IHDR", ihdr));
    } else if (chunk.type === "IDAT") {
      if (!wroteImageData) outputChunks.push(pngChunk("IDAT", compressed));
      wroteImageData = true;
    } else {
      outputChunks.push(pngChunk(chunk.type, chunk.data));
    }
  }
  return Buffer.concat([PNG_SIGNATURE, ...outputChunks]);
}

export function normalizeSceneReference(bytes) {
  const targetWidth = 1020;
  const targetHeight = 663;
  const source = decodeRgbaPng(bytes);
  if (source.width === targetWidth && source.height === targetHeight) return bytes;
  const pixels = resampleRgbaSrgb(source.pixels, source.width, source.height, targetWidth, targetHeight);
  return encodeRgbaPng(source, targetWidth, targetHeight, pixels);
}

function srgbToLinear(value) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value) {
  const channel = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, channel)) * 255);
}

export function resampleRgbaSrgb(source, sourceWidth, sourceHeight, targetWidth, targetHeight) {
  if (source.length !== sourceWidth * sourceHeight * 4) throw new Error("RGBA source dimensions do not match payload");
  const output = Buffer.alloc(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = (y + 0.5) * sourceHeight / targetHeight - 0.5;
    const yFloor = Math.floor(sourceY);
    const y0 = Math.max(0, Math.min(sourceHeight - 1, yFloor));
    const y1 = Math.max(0, Math.min(sourceHeight - 1, yFloor + 1));
    const yFraction = Math.max(0, Math.min(1, sourceY - yFloor));
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = (x + 0.5) * sourceWidth / targetWidth - 0.5;
      const xFloor = Math.floor(sourceX);
      const x0 = Math.max(0, Math.min(sourceWidth - 1, xFloor));
      const x1 = Math.max(0, Math.min(sourceWidth - 1, xFloor + 1));
      const xFraction = Math.max(0, Math.min(1, sourceX - xFloor));
      const samples = [
        [x0, y0, (1 - xFraction) * (1 - yFraction)],
        [x1, y0, xFraction * (1 - yFraction)],
        [x0, y1, (1 - xFraction) * yFraction],
        [x1, y1, xFraction * yFraction],
      ];
      let alpha = 0;
      const linear = [0, 0, 0];
      for (const [sampleX, sampleY, weight] of samples) {
        const offset = (sampleY * sourceWidth + sampleX) * 4;
        const sampleAlpha = source[offset + 3] / 255;
        const alphaWeight = weight * sampleAlpha;
        alpha += alphaWeight;
        for (let channel = 0; channel < 3; channel += 1) linear[channel] += srgbToLinear(source[offset + channel]) * alphaWeight;
      }
      const outputOffset = (y * targetWidth + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) output[outputOffset + channel] = alpha > 0 ? linearToSrgb(linear[channel] / alpha) : 0;
      output[outputOffset + 3] = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    }
  }
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
  const capturedAt = manifest.exportProvenance.capturedAt;
  const capturedAtTime = typeof capturedAt === "string" ? Date.parse(capturedAt) : Number.NaN;
  if (!Number.isFinite(capturedAtTime) || new Date(capturedAtTime).toISOString() !== capturedAt) {
    throw new Error("exportProvenance.capturedAt must be a canonical ISO timestamp");
  }
  if (JSON.stringify(manifest.sourceNodes) !== JSON.stringify(APPROVED_SOURCE_NODES)) {
    throw new Error("Approved-node inventory is incomplete or has drifted");
  }

  const canonicalIds = canonicalizeAssets(manifest.assets).map((entry) => entry.id);
  if (JSON.stringify(manifest.assets.map((entry) => entry.id)) !== JSON.stringify(canonicalIds)) {
    throw new Error("Manifest assets are not in canonical asset order");
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
    const requiredFor = [...new Set(entry.requiredFor)].sort((left, right) => {
      return APPROVED_SOURCE_NODES.findIndex((node) => node.id === left) - APPROVED_SOURCE_NODES.findIndex((node) => node.id === right);
    });
    if (JSON.stringify(entry.requiredFor) !== JSON.stringify(requiredFor)) {
      throw new Error(`${entry.id}: requiredFor must be unique and canonically ordered`);
    }
    if (!(entry.width > 0) || !(entry.height > 0) || !(entry.byteLength > 0) || !(entry.sourceByteLength > 0) || !(entry.maxBytes > 0)) {
      throw new Error(`${entry.id}: invalid dimensions or payload provenance`);
    }
    if (!/^[a-f0-9]{64}$/.test(entry.sha256) || !/^[a-f0-9]{64}$/.test(entry.sourceSha256)) {
      throw new Error(`${entry.id}: invalid SHA-256 provenance`);
    }
    if (entry.provenance?.fileKey !== manifest.figmaFile.key
      || entry.provenance?.pageNodeId !== manifest.figmaFile.pageNodeId
      || entry.provenance?.sourceNodeId !== entry.nodeId
      || entry.provenance?.sourceVersion !== manifest.exportProvenance.sourceVersion) {
      throw new Error(`${entry.id}: incomplete export provenance`);
    }
    if (entry.role === "reference") {
      const sourceNode = APPROVED_SOURCE_NODES.find((node) => node.id === entry.nodeId);
      if (entry.sourceKind !== "figma-mcp-screenshot" || entry.provenance.captureMethod !== "get_screenshot") {
        throw new Error(`${entry.id}: invalid screenshot source kind or provenance`);
      }
      if (entry.sourceHash !== entry.sourceSha256) {
        throw new Error(`${entry.id}: screenshot hash provenance drift`);
      }
      validateParityMapping(entry, sourceNode);
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

function sameDimensions(left, right) {
  return left?.width === right?.width && left?.height === right?.height;
}

function validateParityMapping(entry, sourceNode) {
  const provenance = entry.provenance;
  const mapping = provenance.parityMapping;
  const sourceDimensions = { width: sourceNode?.width, height: sourceNode?.height };
  if (!sameDimensions(provenance.sourceDimensions, sourceDimensions)
    || !sameDimensions(mapping?.sourceCrop, { width: sourceDimensions.width, height: sourceDimensions.height })
    || mapping.sourceCrop.x !== 0 || mapping.sourceCrop.y !== 0
    || !sameDimensions(mapping.captureCrop, provenance.originalCaptureDimensions)
    || mapping.captureCrop.x !== 0 || mapping.captureCrop.y !== 0
    || !sameDimensions(mapping.normalizedDimensions, { width: entry.width, height: entry.height })) {
    throw new Error(`${entry.id}: parity crop or normalized mapping mismatch`);
  }
  if (mapping.scaleX !== mapping.scaleY) throw new Error(`${entry.id}: parity mapping must use a uniform scale`);

  const isFullScene = entry.nodeId === "18:113" || entry.nodeId === "109:3669";
  const expectedBrowserCapture = {
    width: mapping.normalizedDimensions.width,
    height: mapping.normalizedDimensions.height,
    scale: mapping.scaleX,
    sourceCrop: mapping.sourceCrop,
    transform: mapping.transform,
    resampling: mapping.resampling,
  };
  if (JSON.stringify(mapping.browserCapture) !== JSON.stringify(expectedBrowserCapture)) {
    throw new Error(`${entry.id}: parity browser capture mapping drift`);
  }

  if (isFullScene) {
    if (!sameDimensions(provenance.originalCaptureDimensions, { width: 1024, height: 666 })
      || !sameDimensions(mapping.normalizedDimensions, { width: 1020, height: 663 })
      || mapping.normalizedDimensions.width * sourceDimensions.height !== mapping.normalizedDimensions.height * sourceDimensions.width
      || mapping.scaleX !== 0.796875
      || mapping.kind !== "full-scene-normalized"
      || mapping.transform !== "full-crop-resample-srgb"
      || mapping.resampling !== "linear-light-bilinear-premultiplied-alpha") {
      throw new Error(`${entry.id}: invalid full-scene normalized mapping`);
    }
  } else if (!sameDimensions(provenance.originalCaptureDimensions, sourceDimensions)
    || !sameDimensions(mapping.normalizedDimensions, sourceDimensions)
    || mapping.scaleX !== 1
    || mapping.kind !== "intrinsic"
    || mapping.transform !== "identity"
    || mapping.resampling !== "none") {
    throw new Error(`${entry.id}: component reference must use intrinsic identity mapping`);
  }
}

export function validateGoldenInventory(manifest, goldenInventory) {
  if (goldenInventory?.schemaVersion !== 1 || goldenInventory?.figmaFileKey !== manifest.figmaFile.key) {
    throw new Error("Invalid reviewed golden inventory metadata");
  }
  const project = (entry) => ({
    id: entry.id,
    sourceNodeId: entry.nodeId,
    sourceHash: entry.sourceHash,
    role: entry.role,
    requiredFor: entry.requiredFor,
  });
  const actual = manifest.assets.filter((entry) => entry.role !== "reference").map(project);
  if (JSON.stringify(actual) !== JSON.stringify(goldenInventory.assets)) {
    throw new Error("Figma non-reference assets drifted from the reviewed golden inventory");
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
