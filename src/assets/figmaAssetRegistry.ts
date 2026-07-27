export type FigmaAssetRole = "eye" | "subject" | "control-icon" | "crowd" | "effect" | "reference";

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

export const FIGMA_ASSETS = Object.freeze([
  {
    "id": "control-bug-body",
    "role": "control-icon",
    "nodeId": "102:2472",
    "sourceHash": "30cf425a670063ffb9cc20dfee2b471e4541ea9b",
    "sourceSha256": "b0c36e9cde76013a18d62c299471749bf74d72f33bf4986c1f82cea8715ff1ee",
    "sha256": "b0c36e9cde76013a18d62c299471749bf74d72f33bf4986c1f82cea8715ff1ee",
    "format": "svg",
    "url": "/assets/figma/icons/control-bug-body.svg",
    "width": 7,
    "height": 17.5823,
    "sourceByteLength": 444,
    "byteLength": 444,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2472",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-bug-outline",
    "role": "control-icon",
    "nodeId": "102:2471",
    "sourceHash": "35ad6140416e29d0823f3a3e1c2fd3f415d9570f",
    "sourceSha256": "22dae1a534d97052d19052a305d247d7635682f3342eafb017a0a0df036ac36b",
    "sha256": "22dae1a534d97052d19052a305d247d7635682f3342eafb017a0a0df036ac36b",
    "format": "svg",
    "url": "/assets/figma/icons/control-bug-outline.svg",
    "width": 15,
    "height": 21.126,
    "sourceByteLength": 552,
    "byteLength": 552,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2471",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-drag-handle",
    "role": "control-icon",
    "nodeId": "103:3210",
    "sourceHash": "658aaa5274c383c8d4d344cfaee41de3691f76f2",
    "sourceSha256": "7b4c4824de4aad8701acb250dc40aa1274cc9bc369dd55dfb47c9e0ea8f8a84b",
    "sha256": "7b4c4824de4aad8701acb250dc40aa1274cc9bc369dd55dfb47c9e0ea8f8a84b",
    "format": "svg",
    "url": "/assets/figma/icons/control-drag-handle.svg",
    "width": 13,
    "height": 18,
    "sourceByteLength": 1031,
    "byteLength": 1031,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:3210",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-eye-outline",
    "role": "control-icon",
    "nodeId": "102:2482",
    "sourceHash": "6d9c3eae243c8ff1493995e322ef4c01015df388",
    "sourceSha256": "c113ae9b497e94d675e093661c887770bde1f4c16ca866b21e6cafdb42889d9f",
    "sha256": "c113ae9b497e94d675e093661c887770bde1f4c16ca866b21e6cafdb42889d9f",
    "format": "svg",
    "url": "/assets/figma/icons/control-eye-outline.svg",
    "width": 11,
    "height": 19.2114,
    "sourceByteLength": 436,
    "byteLength": 436,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2482",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-eye-pupil",
    "role": "control-icon",
    "nodeId": "102:2483",
    "sourceHash": "de1f69f1201c8f0c04ffc2867d16309834a19002",
    "sourceSha256": "ad106ae2c96ebb6693d24239967daeee5a17eb96bd1bc130cda0609ee844bc00",
    "sha256": "ad106ae2c96ebb6693d24239967daeee5a17eb96bd1bc130cda0609ee844bc00",
    "format": "svg",
    "url": "/assets/figma/icons/control-eye-pupil.svg",
    "width": 7,
    "height": 7,
    "sourceByteLength": 273,
    "byteLength": 273,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2483",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-filter-knob",
    "role": "control-icon",
    "nodeId": "103:2537",
    "sourceHash": "ca89bb906cfc6377b290f6cdb973353e75f51c9d",
    "sourceSha256": "3b9f51d8d3b633a5954554dd7050abc2f4ad78fda2e9f20b8fa8996543d6d388",
    "sha256": "3b9f51d8d3b633a5954554dd7050abc2f4ad78fda2e9f20b8fa8996543d6d388",
    "format": "svg",
    "url": "/assets/figma/icons/control-filter-knob.svg",
    "width": 5,
    "height": 5,
    "sourceByteLength": 301,
    "byteLength": 301,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2537",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-filter-lines",
    "role": "control-icon",
    "nodeId": "103:2526",
    "sourceHash": "44df96a719b21cd5b830b355fa7986f1710662e0",
    "sourceSha256": "48560fcdf4a30bd8657157a98b02e33c0b3ecb281920b721f2bc0351ddb348aa",
    "sha256": "48560fcdf4a30bd8657157a98b02e33c0b3ecb281920b721f2bc0351ddb348aa",
    "format": "svg",
    "url": "/assets/figma/icons/control-filter-lines.svg",
    "width": 19,
    "height": 1,
    "sourceByteLength": 264,
    "byteLength": 264,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2526",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-gallery-tile-primary",
    "role": "control-icon",
    "nodeId": "103:2527",
    "sourceHash": "ffe45b1d71c1d67a3749798a2c9934c1d5b6c98d",
    "sourceSha256": "bd331f86b9de8b0a86d6023a457d34a93c00ae10e501a19b67b520f6f517b3ed",
    "sha256": "bd331f86b9de8b0a86d6023a457d34a93c00ae10e501a19b67b520f6f517b3ed",
    "format": "svg",
    "url": "/assets/figma/icons/control-gallery-tile-primary.svg",
    "width": 7,
    "height": 7,
    "sourceByteLength": 367,
    "byteLength": 367,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2527",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-gallery-tile-secondary",
    "role": "control-icon",
    "nodeId": "103:2530",
    "sourceHash": "4e00ff42ae4e9f675e9bfc57710be7bc6e852778",
    "sourceSha256": "5e5eaacc7f3b90e1f1c828825d68cd93dc219c80d62102c7ec5e76bf826535a3",
    "sha256": "5e5eaacc7f3b90e1f1c828825d68cd93dc219c80d62102c7ec5e76bf826535a3",
    "format": "svg",
    "url": "/assets/figma/icons/control-gallery-tile-secondary.svg",
    "width": 7,
    "height": 7,
    "sourceByteLength": 367,
    "byteLength": 367,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2530",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-gallery-tile-tertiary",
    "role": "control-icon",
    "nodeId": "103:2532",
    "sourceHash": "db36c1f6b99314f837c52cfd6f9c78e202ae3968",
    "sourceSha256": "10bb5afa4001cfaad43f090ede3c2c7dfdf13c2ac1fc969d215b2c79b983c4bf",
    "sha256": "10bb5afa4001cfaad43f090ede3c2c7dfdf13c2ac1fc969d215b2c79b983c4bf",
    "format": "svg",
    "url": "/assets/figma/icons/control-gallery-tile-tertiary.svg",
    "width": 7,
    "height": 7,
    "sourceByteLength": 367,
    "byteLength": 367,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2532",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-hand-finger",
    "role": "control-icon",
    "nodeId": "102:2448",
    "sourceHash": "3d9f1dc0e0032542d8ed5fe54e6a86042dca67af",
    "sourceSha256": "f58de42ca97a7e58c4710ce59c7547eb912943a4ccb1c483d759f1a7e0b4d9a6",
    "sha256": "f58de42ca97a7e58c4710ce59c7547eb912943a4ccb1c483d759f1a7e0b4d9a6",
    "format": "svg",
    "url": "/assets/figma/icons/control-hand-finger.svg",
    "width": 4,
    "height": 5.5,
    "sourceByteLength": 335,
    "byteLength": 335,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2448",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-hand-index",
    "role": "control-icon",
    "nodeId": "102:2452",
    "sourceHash": "4bb23cf5262d3d4c3e46b6508c39d76969a75c78",
    "sourceSha256": "e8a4585a625281862d7289a89db6a38ba9e6d882825b63a59c3e1d449837ce08",
    "sha256": "e8a4585a625281862d7289a89db6a38ba9e6d882825b63a59c3e1d449837ce08",
    "format": "svg",
    "url": "/assets/figma/icons/control-hand-index.svg",
    "width": 4,
    "height": 5,
    "sourceByteLength": 351,
    "byteLength": 351,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2452",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-hand-palm",
    "role": "control-icon",
    "nodeId": "102:2453",
    "sourceHash": "5079d44080c3ad9094ee7df2a073ab766ece56a4",
    "sourceSha256": "a2f78bf0c5910c51c42408e0e7d140a72a1b8bd48c1a8fae57bb25b01a2526f1",
    "sha256": "a2f78bf0c5910c51c42408e0e7d140a72a1b8bd48c1a8fae57bb25b01a2526f1",
    "format": "svg",
    "url": "/assets/figma/icons/control-hand-palm.svg",
    "width": 4,
    "height": 13,
    "sourceByteLength": 341,
    "byteLength": 341,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2453",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-hand-thumb",
    "role": "control-icon",
    "nodeId": "102:2451",
    "sourceHash": "f28a5f466d1b965d1876d300414cd61546fa325a",
    "sourceSha256": "974dd0e7c8eaf65598b628a7b2a80cb0e30ada88191b96428396f41f534c9bc4",
    "sha256": "974dd0e7c8eaf65598b628a7b2a80cb0e30ada88191b96428396f41f534c9bc4",
    "format": "svg",
    "url": "/assets/figma/icons/control-hand-thumb.svg",
    "width": 4,
    "height": 5.5,
    "sourceByteLength": 339,
    "byteLength": 339,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2451",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-hand-wrist",
    "role": "control-icon",
    "nodeId": "102:2447",
    "sourceHash": "4cfa98e696e3249526ad971ab7e05a52542d6b8e",
    "sourceSha256": "72da73e0d5a2824dc1338a0bcc42f231d5ea12bcb717b5b05033ca6eb9cb24bc",
    "sha256": "72da73e0d5a2824dc1338a0bcc42f231d5ea12bcb717b5b05033ca6eb9cb24bc",
    "format": "svg",
    "url": "/assets/figma/icons/control-hand-wrist.svg",
    "width": 15.9999,
    "height": 11,
    "sourceByteLength": 443,
    "byteLength": 443,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2447",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-horizontal-stroke",
    "role": "control-icon",
    "nodeId": "103:2514",
    "sourceHash": "e3db442d36d2f3b2a3bfa034f1e5338f9c09fbe8",
    "sourceSha256": "3987a081c5841e8f3928f78a9565cc4ae208bdc3866418d4231d3a687af1ce12",
    "sha256": "3987a081c5841e8f3928f78a9565cc4ae208bdc3866418d4231d3a687af1ce12",
    "format": "svg",
    "url": "/assets/figma/icons/control-horizontal-stroke.svg",
    "width": 15,
    "height": 1,
    "sourceByteLength": 264,
    "byteLength": 264,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490",
      "103:3579"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2514",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-quantity-plus",
    "role": "control-icon",
    "nodeId": "103:2513",
    "sourceHash": "046667a30fe2030d8493116304374a51298c6e71",
    "sourceSha256": "5f7f8e1770a0c7446dee26b140e02946b08f73da0d01614c46a8e8d17bacd0fe",
    "sha256": "5f7f8e1770a0c7446dee26b140e02946b08f73da0d01614c46a8e8d17bacd0fe",
    "format": "svg",
    "url": "/assets/figma/icons/control-quantity-plus.svg",
    "width": 15,
    "height": 1,
    "sourceByteLength": 264,
    "byteLength": 264,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490",
      "103:3579"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2513",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "control-text-subject",
    "role": "control-icon",
    "nodeId": "103:3201",
    "sourceHash": "52805754dbad3047f7310b4a5f1dc350affd2b74",
    "sourceSha256": "630134384e4171dcfc80fa89eb1eb1ba3d922a2821d380086828df0936711978",
    "sha256": "630134384e4171dcfc80fa89eb1eb1ba3d922a2821d380086828df0936711978",
    "format": "svg",
    "url": "/assets/figma/icons/control-text-subject.svg",
    "width": 22,
    "height": 19,
    "sourceByteLength": 818,
    "byteLength": 818,
    "maxBytes": 65536,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:3201",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "crowd-bug-left",
    "role": "crowd",
    "nodeId": "18:239",
    "sourceHash": "c7c2c5f2ae0a5e6593f612b946b8813289af87a5",
    "sourceSha256": "46aa41153375a8b6e46db8afe0ae85a07a8f1c385dd86314d786452b7164fb37",
    "sha256": "46aa41153375a8b6e46db8afe0ae85a07a8f1c385dd86314d786452b7164fb37",
    "format": "svg",
    "url": "/assets/figma/crowd/crowd-bug-left.svg",
    "width": 32.9016,
    "height": 66.7512,
    "sourceByteLength": 1302,
    "byteLength": 1302,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:239",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "crowd-bug-right",
    "role": "crowd",
    "nodeId": "18:251",
    "sourceHash": "eedcb964037d655677603d6cd326179183ea4b13",
    "sourceSha256": "5e9032fe484b2cf3024dcb0c3c37b49b377109c8ea5a0772dd819f782f01b669",
    "sha256": "5e9032fe484b2cf3024dcb0c3c37b49b377109c8ea5a0772dd819f782f01b669",
    "format": "svg",
    "url": "/assets/figma/crowd/crowd-bug-right.svg",
    "width": 32.9016,
    "height": 66.7512,
    "sourceByteLength": 1302,
    "byteLength": 1302,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:251",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "crowd-bug-upright",
    "role": "crowd",
    "nodeId": "18:257",
    "sourceHash": "c1a32b19f72ef00ffac94ab6f56725de9bdd4516",
    "sourceSha256": "0916729f6f461813cd783058f87fa789470c247261dabd8de012b057baf6bebd",
    "sha256": "0916729f6f461813cd783058f87fa789470c247261dabd8de012b057baf6bebd",
    "format": "svg",
    "url": "/assets/figma/crowd/crowd-bug-upright.svg",
    "width": 32.9016,
    "height": 66.7512,
    "sourceByteLength": 1302,
    "byteLength": 1302,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:257",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "effect-attack-target-glow",
    "role": "effect",
    "nodeId": "109:3958",
    "sourceHash": "ac7e49780f8858d3995fe4def1b8cd6afad882c4",
    "sourceSha256": "5b675e005b9969ec569c6ebb261c29902079a499dba393bc24b3d571887637ba",
    "sha256": "5b675e005b9969ec569c6ebb261c29902079a499dba393bc24b3d571887637ba",
    "format": "svg",
    "url": "/assets/figma/effects/effect-attack-target-glow.svg",
    "width": 189,
    "height": 189,
    "sourceByteLength": 1697,
    "byteLength": 1697,
    "maxBytes": 65536,
    "requiredFor": [
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "109:3958",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "eye-compact-01",
    "role": "eye",
    "nodeId": "18:207",
    "sourceHash": "6b5884fa49a91a4a3213caeb3bbeba2815a43c82",
    "sourceSha256": "bd142b0b0d5d3ef3085ea56139542c6a43fa9e3951b94cb1e41162b4286e6367",
    "sha256": "bd142b0b0d5d3ef3085ea56139542c6a43fa9e3951b94cb1e41162b4286e6367",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-compact-01.svg",
    "width": 131,
    "height": 66.9556,
    "sourceByteLength": 1153,
    "byteLength": 1153,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:207",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "socketPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "clipPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "iris": {
        "centerX": 84.4707,
        "centerY": 34.0664,
        "radius": 26.9278,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 18.970699999999994,
        "y": 0.5885999999999996
      }
    }
  },
  {
    "id": "eye-compact-02",
    "role": "eye",
    "nodeId": "18:211",
    "sourceHash": "83f9460d22b34d6a44d6f5a24e83429b39b3912b",
    "sourceSha256": "d8c1e0f22ce86efdef266c9ab7cd6786a7a59a288f9b592f3948c1dfe9ca3754",
    "sha256": "d8c1e0f22ce86efdef266c9ab7cd6786a7a59a288f9b592f3948c1dfe9ca3754",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-compact-02.svg",
    "width": 131,
    "height": 66.9556,
    "sourceByteLength": 716,
    "byteLength": 716,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:211",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "socketPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "clipPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "iris": {
        "centerX": 85.15,
        "centerY": 40.0278,
        "radius": 26.9278,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 19.650000000000006,
        "y": 6.549999999999997
      }
    }
  },
  {
    "id": "eye-compact-02-attack",
    "role": "eye",
    "nodeId": "109:3767",
    "sourceHash": "c9257da6bb1cbceb6428346621286a8ba41b4d9a",
    "sourceSha256": "1cf883dc278b918816fb68474b3ae96e0a10b5ddf1d9a0c43631b268bc2d4716",
    "sha256": "1cf883dc278b918816fb68474b3ae96e0a10b5ddf1d9a0c43631b268bc2d4716",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-compact-02-attack.svg",
    "width": 131,
    "height": 66.9556,
    "sourceByteLength": 1156,
    "byteLength": 1156,
    "maxBytes": 16384,
    "requiredFor": [
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "109:3767",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "socketPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "clipPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "iris": {
        "centerX": 85.15,
        "centerY": 40.0278,
        "radius": 26.9278,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 19.650000000000006,
        "y": 6.549999999999997
      }
    }
  },
  {
    "id": "eye-compact-03",
    "role": "eye",
    "nodeId": "18:214",
    "sourceHash": "a7c0018da5eba670de8eae02cec47b7f24c45de9",
    "sourceSha256": "8807620847686a814b4b0ce0a16b965d8328db7644fca6d900d35270d3f208ac",
    "sha256": "8807620847686a814b4b0ce0a16b965d8328db7644fca6d900d35270d3f208ac",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-compact-03.svg",
    "width": 131,
    "height": 66.9556,
    "sourceByteLength": 1154,
    "byteLength": 1154,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:214",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "socketPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "clipPath": "M65.5 6.62749e-06C101.675 5.02075e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -3.40731e-06 30.5667 -3.40731e-06 30.5667C-3.40731e-06 30.5667 29.3253 8.23423e-06 65.5 6.62749e-06Z",
      "iris": {
        "centerX": 83.6157,
        "centerY": 44.2285,
        "radius": 26.9278,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 18.115700000000004,
        "y": 10.750699999999995
      }
    }
  },
  {
    "id": "eye-compact-04",
    "role": "eye",
    "nodeId": "18:218",
    "sourceHash": "fe3f335d0a99d7ab52d30b19c07606422f81b016",
    "sourceSha256": "b26e83dc00449f6419a45f308ca934601eb3f7d3cbd0443ebeaf610c464d2fb3",
    "sha256": "b26e83dc00449f6419a45f308ca934601eb3f7d3cbd0443ebeaf610c464d2fb3",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-compact-04.svg",
    "width": 131,
    "height": 66.9556,
    "sourceByteLength": 1152,
    "byteLength": 1152,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:218",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "socketPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "clipPath": "M65.5 2.19324e-05C101.675 2.03512e-05 131 30.5667 131 30.5667C131 30.5667 101.675 61.1334 65.5 61.1334C29.3253 61.1334 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 2.35137e-05 65.5 2.19324e-05Z",
      "iris": {
        "centerX": 85.15,
        "centerY": 30.0278,
        "radius": 26.9278,
        "fill": "#907E72"
      },
      "irisSourceOffset": {
        "x": 19.650000000000006,
        "y": -3.450000000000003
      }
    }
  },
  {
    "id": "eye-compact-05",
    "role": "eye",
    "nodeId": "18:222",
    "sourceHash": "0cf32dbfc5ca5585bda4b9387e024f07dd177c35",
    "sourceSha256": "22407978f7e42e99e58eca04d3e6003768c042fa3cb3aef635eb23ea79d4248a",
    "sha256": "22407978f7e42e99e58eca04d3e6003768c042fa3cb3aef635eb23ea79d4248a",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-compact-05.svg",
    "width": 131,
    "height": 66.9556,
    "sourceByteLength": 1154,
    "byteLength": 1154,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:222",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "socketPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "clipPath": "M65.5 2.19324e-05C101.675 2.03512e-05 131 30.5667 131 30.5667C131 30.5667 101.675 61.1334 65.5 61.1334C29.3253 61.1334 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 2.35137e-05 65.5 2.19324e-05Z",
      "iris": {
        "centerX": 85.1499,
        "centerY": 32.0278,
        "radius": 26.9278,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 19.649900000000002,
        "y": -1.4500000000000028
      }
    }
  },
  {
    "id": "eye-compact-06",
    "role": "eye",
    "nodeId": "18:226",
    "sourceHash": "42258226c2eb96506dc1db63aafe3be4a93677c7",
    "sourceSha256": "790b3ee381495cddfd4af771bcf14a5bae9c5bf639c1d761d8477e4d398a5d9d",
    "sha256": "790b3ee381495cddfd4af771bcf14a5bae9c5bf639c1d761d8477e4d398a5d9d",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-compact-06.svg",
    "width": 131,
    "height": 66.9556,
    "sourceByteLength": 1147,
    "byteLength": 1147,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:226",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "socketPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "clipPath": "M65.5 1.53432e-05C101.675 1.43365e-05 131 30.5667 131 30.5667C131 30.5667 101.675 61.1334 65.5 61.1334C29.3254 61.1334 2.01714e-05 30.5667 2.01714e-05 30.5667C2.01714e-05 30.5667 29.3254 1.635e-05 65.5 1.53432e-05Z",
      "iris": {
        "centerX": 85.15,
        "centerY": 40.0278,
        "radius": 26.9278,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 19.650000000000006,
        "y": 6.549999999999997
      }
    }
  },
  {
    "id": "eye-compact-07",
    "role": "eye",
    "nodeId": "18:234",
    "sourceHash": "804f72d99b0a9be2d56e23701245d5b242902bf3",
    "sourceSha256": "221c4679e07d2edae68b1c17b5b92c298c0e3d7877ac587861c2c8c1a22378f0",
    "sha256": "221c4679e07d2edae68b1c17b5b92c298c0e3d7877ac587861c2c8c1a22378f0",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-compact-07.svg",
    "width": 131,
    "height": 66.9556,
    "sourceByteLength": 1155,
    "byteLength": 1155,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:234",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "socketPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "clipPath": "M65.5 -1.13431e-05C101.675 -1.23407e-05 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3254 61.1333 9.09115e-06 30.5667 9.09115e-06 30.5667C9.09115e-06 30.5667 29.3254 -1.03455e-05 65.5 -1.13431e-05Z",
      "iris": {
        "centerX": 83.6335,
        "centerY": 36.3264,
        "radius": 26.9278,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 18.133499999999998,
        "y": 2.8485999999999976
      }
    }
  },
  {
    "id": "eye-compact-08",
    "role": "eye",
    "nodeId": "18:268",
    "sourceHash": "b262404ff8d69aeae77829c8911af1ae832f0145",
    "sourceSha256": "99f1e44161704c121ab0e378dc08c411a969e811cbffd7fd92b6e8849d8dce2a",
    "sha256": "99f1e44161704c121ab0e378dc08c411a969e811cbffd7fd92b6e8849d8dce2a",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-compact-08.svg",
    "width": 131,
    "height": 66.9556,
    "sourceByteLength": 1149,
    "byteLength": 1149,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:268",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "socketPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "clipPath": "M65.5 1.53432e-05C101.675 1.43365e-05 131 30.5667 131 30.5667C131 30.5667 101.675 61.1334 65.5 61.1334C29.3254 61.1334 2.01714e-05 30.5667 2.01714e-05 30.5667C2.01714e-05 30.5667 29.3254 1.635e-05 65.5 1.53432e-05Z",
      "iris": {
        "centerX": 90.8731,
        "centerY": 25.0863,
        "radius": 26.9278,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 25.373099999999994,
        "y": -8.3915
      }
    }
  },
  {
    "id": "eye-compact-09",
    "role": "eye",
    "nodeId": "18:272",
    "sourceHash": "c5705d9a060c5fa55e3eea14cd19d6123b077e7d",
    "sourceSha256": "80c9191c086d41deb3f9b4b2a04c0b0a1a65c6b715ace8938deffc813ebaf947",
    "sha256": "80c9191c086d41deb3f9b4b2a04c0b0a1a65c6b715ace8938deffc813ebaf947",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-compact-09.svg",
    "width": 131,
    "height": 66.9556,
    "sourceByteLength": 1149,
    "byteLength": 1149,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:272",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 131,
        "height": 66.9556
      },
      "socketPath": "M65.5 6.67365e-06C101.675 5.0924e-06 131 30.5667 131 30.5667C131 30.5667 101.675 61.1333 65.5 61.1333C29.3253 61.1333 -1.33611e-06 30.5667 -1.33611e-06 30.5667C-1.33611e-06 30.5667 29.3253 8.25489e-06 65.5 6.67365e-06Z",
      "clipPath": "M65.5 1.53432e-05C101.675 1.43365e-05 131 30.5667 131 30.5667C131 30.5667 101.675 61.1334 65.5 61.1334C29.3254 61.1334 2.01714e-05 30.5667 2.01714e-05 30.5667C2.01714e-05 30.5667 29.3254 1.635e-05 65.5 1.53432e-05Z",
      "iris": {
        "centerX": 90.8731,
        "centerY": 25.0863,
        "radius": 26.9278,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 25.373099999999994,
        "y": -8.3915
      }
    }
  },
  {
    "id": "eye-giant-01",
    "role": "eye",
    "nodeId": "18:167",
    "sourceHash": "d489d9f77952f50f107efa67f9ca11d0975a9d5d",
    "sourceSha256": "214781b1c57c1b8633ff977e3ed6379eaa339037cd3ee51011187175e0a50b1c",
    "sha256": "214781b1c57c1b8633ff977e3ed6379eaa339037cd3ee51011187175e0a50b1c",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-giant-01.svg",
    "width": 320.293,
    "height": 163.705,
    "sourceByteLength": 1193,
    "byteLength": 1193,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:167",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 320.293,
        "height": 163.705
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 320.293,
        "height": 163.705
      },
      "socketPath": "M160.146 -7.87623e-05C248.593 -8.1179e-05 320.293 74.7349 320.293 74.7349C320.293 74.7349 248.593 149.47 160.146 149.47C71.7 149.47 5.10192e-06 74.7349 5.10192e-06 74.7349C5.10192e-06 74.7349 71.7 -7.63457e-05 160.146 -7.87623e-05Z",
      "clipPath": "M160.146 -6.35035e-05C248.593 -6.59202e-05 320.293 74.7349 320.293 74.7349C320.293 74.7349 248.593 149.47 160.146 149.47C71.7 149.47 3.14027e-07 74.7349 3.14027e-07 74.7349C3.14027e-07 74.7349 71.7 -6.10869e-05 160.146 -6.35035e-05Z",
      "iris": {
        "centerX": 216.176,
        "centerY": 79.5309,
        "radius": 65.8379,
        "fill": "#907E72"
      },
      "irisSourceOffset": {
        "x": 56.029499999999985,
        "y": -2.3216000000000037
      }
    }
  },
  {
    "id": "eye-giant-02",
    "role": "eye",
    "nodeId": "18:171",
    "sourceHash": "c18e1babf187c4eff399343439d5d79b7a2efd53",
    "sourceSha256": "20652c42849a4cd44155ea8d3ebabaee8447649c97c9c9b42211af107c69decb",
    "sha256": "20652c42849a4cd44155ea8d3ebabaee8447649c97c9c9b42211af107c69decb",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-giant-02.svg",
    "width": 320.293,
    "height": 163.705,
    "sourceByteLength": 1195,
    "byteLength": 1195,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:171",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 320.293,
        "height": 163.705
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 320.293,
        "height": 163.705
      },
      "socketPath": "M160.146 -7.87623e-05C248.593 -8.1179e-05 320.293 74.7349 320.293 74.7349C320.293 74.7349 248.593 149.47 160.146 149.47C71.7 149.47 5.10192e-06 74.7349 5.10192e-06 74.7349C5.10192e-06 74.7349 71.7 -7.63457e-05 160.146 -7.87623e-05Z",
      "clipPath": "M160.146 -7.89967e-05C248.593 -8.15428e-05 320.293 74.7349 320.293 74.7349C320.293 74.7349 248.593 149.47 160.146 149.47C71.7 149.47 -8.21475e-07 74.7349 -8.21475e-07 74.7349C-8.21475e-07 74.7349 71.7 -7.64506e-05 160.146 -7.89967e-05Z",
      "iris": {
        "centerX": 208.19,
        "centerY": 97.8672,
        "radius": 65.8379,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 48.043499999999995,
        "y": 16.01469999999999
      }
    }
  },
  {
    "id": "eye-giant-03",
    "role": "eye",
    "nodeId": "18:175",
    "sourceHash": "d4d8f4e166abf066da9132bfd4dfc57b37f186e5",
    "sourceSha256": "62842e932a6818cd7bc6517852b9a90dd9fe96be3398aca087aae6f678b8f996",
    "sha256": "62842e932a6818cd7bc6517852b9a90dd9fe96be3398aca087aae6f678b8f996",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-giant-03.svg",
    "width": 320.293,
    "height": 163.705,
    "sourceByteLength": 1195,
    "byteLength": 1195,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:175",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 320.293,
        "height": 163.705
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 320.293,
        "height": 163.705
      },
      "socketPath": "M160.146 -7.87623e-05C248.593 -8.1179e-05 320.293 74.7349 320.293 74.7349C320.293 74.7349 248.593 149.47 160.146 149.47C71.7 149.47 5.10192e-06 74.7349 5.10192e-06 74.7349C5.10192e-06 74.7349 71.7 -7.63457e-05 160.146 -7.87623e-05Z",
      "clipPath": "M160.146 -6.35035e-05C248.593 -6.59202e-05 320.293 74.7349 320.293 74.7349C320.293 74.7349 248.593 149.47 160.146 149.47C71.7 149.47 -3.18336e-06 74.7349 -3.18336e-06 74.7349C-3.18336e-06 74.7349 71.7 -6.10869e-05 160.146 -6.35035e-05Z",
      "iris": {
        "centerX": 208.19,
        "centerY": 97.8672,
        "radius": 65.8379,
        "fill": "#5F5046"
      },
      "irisSourceOffset": {
        "x": 48.043499999999995,
        "y": 16.01469999999999
      }
    }
  },
  {
    "id": "eye-giant-04",
    "role": "eye",
    "nodeId": "18:179",
    "sourceHash": "c3f2a9de9cc52dc6b140e9310efbd1bc687abbee",
    "sourceSha256": "6667b2898c7865e1367b60a1271836c30d115c92e7bf773d2d34c1d6dc17a1a9",
    "sha256": "6667b2898c7865e1367b60a1271836c30d115c92e7bf773d2d34c1d6dc17a1a9",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-giant-04.svg",
    "width": 320.293,
    "height": 163.705,
    "sourceByteLength": 1192,
    "byteLength": 1192,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:179",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 320.293,
        "height": 163.705
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 320.293,
        "height": 163.705
      },
      "socketPath": "M160.146 -7.87623e-05C248.593 -8.1179e-05 320.293 74.7349 320.293 74.7349C320.293 74.7349 248.593 149.47 160.146 149.47C71.7 149.47 5.10192e-06 74.7349 5.10192e-06 74.7349C5.10192e-06 74.7349 71.7 -7.63457e-05 160.146 -7.87623e-05Z",
      "clipPath": "M160.146 -9.42498e-05C248.593 -9.67928e-05 320.293 74.7349 320.293 74.7349C320.293 74.7349 248.593 149.47 160.146 149.47C71.7 149.47 4.66668e-05 74.7349 4.66668e-05 74.7349C4.66668e-05 74.7349 71.7 -9.17069e-05 160.146 -9.42498e-05Z",
      "iris": {
        "centerX": 208.19,
        "centerY": 97.8672,
        "radius": 65.8379,
        "fill": "#5B737E"
      },
      "irisSourceOffset": {
        "x": 48.043499999999995,
        "y": 16.01469999999999
      }
    }
  },
  {
    "id": "eye-large-01",
    "role": "eye",
    "nodeId": "18:139",
    "sourceHash": "e514b1099167e5455219ba491d85baacb97c1206",
    "sourceSha256": "8144a0c508cf532f9fa21090bf66415e11d5ba020cea4723c8a99574a1a16298",
    "sha256": "8144a0c508cf532f9fa21090bf66415e11d5ba020cea4723c8a99574a1a16298",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-large-01.svg",
    "width": 234.783,
    "height": 120,
    "sourceByteLength": 1202,
    "byteLength": 1202,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:139",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "socketPath": "M117.391 -1.79348e-06C182.225 -4.62744e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -2.39462e-06 54.7826 -2.39462e-06 54.7826C-2.39462e-06 54.7826 52.5579 1.04048e-06 117.391 -1.79348e-06Z",
      "clipPath": "M117.391 -1.79348e-06C182.225 -4.62744e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -2.39462e-06 54.7826 -2.39462e-06 54.7826C-2.39462e-06 54.7826 52.5579 1.04048e-06 117.391 -1.79348e-06Z",
      "iris": {
        "centerX": 152.609,
        "centerY": 71.7391,
        "radius": 48.2609,
        "fill": "#5B737E"
      },
      "irisSourceOffset": {
        "x": 35.217500000000015,
        "y": 11.739099999999993
      }
    }
  },
  {
    "id": "eye-large-02",
    "role": "eye",
    "nodeId": "18:143",
    "sourceHash": "71cfd4a2fe119f67b72986b1ae0b8f39fd7863f1",
    "sourceSha256": "394bc92e27e865b160b5b2ef2334c475bfd491314682b7b8e73fcf6a18925843",
    "sha256": "394bc92e27e865b160b5b2ef2334c475bfd491314682b7b8e73fcf6a18925843",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-large-02.svg",
    "width": 234.783,
    "height": 120,
    "sourceByteLength": 1197,
    "byteLength": 1197,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:143",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "socketPath": "M117.391 -1.79348e-06C182.225 -4.62744e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -2.39462e-06 54.7826 -2.39462e-06 54.7826C-2.39462e-06 54.7826 52.5579 1.04048e-06 117.391 -1.79348e-06Z",
      "clipPath": "M117.391 8.33949e-08C182.225 -1.714e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -4.3751e-06 54.7826 -4.3751e-06 54.7826C-4.3751e-06 54.7826 52.5579 1.88079e-06 117.391 8.33949e-08Z",
      "iris": {
        "centerX": 152.609,
        "centerY": 71.7391,
        "radius": 48.2609,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 35.217500000000015,
        "y": 11.739099999999993
      }
    }
  },
  {
    "id": "eye-large-03",
    "role": "eye",
    "nodeId": "18:147",
    "sourceHash": "82fca0f89c38c75cf0b4654cf8c5af0e585a7331",
    "sourceSha256": "cff8bd33f316891d6ee44e6be4874de47ddd424273375f4104fa5fcf29af67f7",
    "sha256": "cff8bd33f316891d6ee44e6be4874de47ddd424273375f4104fa5fcf29af67f7",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-large-03.svg",
    "width": 234.783,
    "height": 120,
    "sourceByteLength": 1197,
    "byteLength": 1197,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:147",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "socketPath": "M117.391 -1.79348e-06C182.225 -4.62744e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -2.39462e-06 54.7826 -2.39462e-06 54.7826C-2.39462e-06 54.7826 52.5579 1.04048e-06 117.391 -1.79348e-06Z",
      "clipPath": "M117.391 8.33949e-08C182.225 -1.714e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -4.3751e-06 54.7826 -4.3751e-06 54.7826C-4.3751e-06 54.7826 52.5579 1.88079e-06 117.391 8.33949e-08Z",
      "iris": {
        "centerX": 152.609,
        "centerY": 71.7391,
        "radius": 48.2609,
        "fill": "#596553"
      },
      "irisSourceOffset": {
        "x": 35.217500000000015,
        "y": 11.739099999999993
      }
    }
  },
  {
    "id": "eye-large-04",
    "role": "eye",
    "nodeId": "18:151",
    "sourceHash": "21e0709144e1d177e8cd5be2df233101de334df7",
    "sourceSha256": "ee80a07b4b98a44661caecddaa503d628a6f7891eb96412be722ec1820f6d834",
    "sha256": "ee80a07b4b98a44661caecddaa503d628a6f7891eb96412be722ec1820f6d834",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-large-04.svg",
    "width": 234.783,
    "height": 120,
    "sourceByteLength": 1200,
    "byteLength": 1200,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:151",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "socketPath": "M117.391 -1.79348e-06C182.225 -4.62744e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -2.39462e-06 54.7826 -2.39462e-06 54.7826C-2.39462e-06 54.7826 52.5579 1.04048e-06 117.391 -1.79348e-06Z",
      "clipPath": "M117.391 5.80577e-06C182.225 2.95515e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5578 109.565 -5.41495e-05 54.7826 -5.41495e-05 54.7826C-5.41495e-05 54.7826 52.5578 8.65638e-06 117.391 5.80577e-06Z",
      "iris": {
        "centerX": 152.609,
        "centerY": 71.7391,
        "radius": 48.2609,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 35.217500000000015,
        "y": 11.739099999999993
      }
    }
  },
  {
    "id": "eye-large-05",
    "role": "eye",
    "nodeId": "18:155",
    "sourceHash": "11e23f1099c19bd15b0e426b0a94f3c1a83f3275",
    "sourceSha256": "ae55267cea6405c930b26edca4fc7f11ce668a03e84b05d0184c9ca3fde3454e",
    "sha256": "ae55267cea6405c930b26edca4fc7f11ce668a03e84b05d0184c9ca3fde3454e",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-large-05.svg",
    "width": 234.783,
    "height": 120,
    "sourceByteLength": 1203,
    "byteLength": 1203,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:155",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "socketPath": "M117.391 -1.79348e-06C182.225 -4.62744e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -2.39462e-06 54.7826 -2.39462e-06 54.7826C-2.39462e-06 54.7826 52.5579 1.04048e-06 117.391 -1.79348e-06Z",
      "clipPath": "M117.391 -1.79348e-06C182.225 -4.62744e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -2.39462e-06 54.7826 -2.39462e-06 54.7826C-2.39462e-06 54.7826 52.5579 1.04048e-06 117.391 -1.79348e-06Z",
      "iris": {
        "centerX": 152.609,
        "centerY": 61.7391,
        "radius": 48.2609,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 35.217500000000015,
        "y": 1.7391000000000005
      }
    }
  },
  {
    "id": "eye-large-06",
    "role": "eye",
    "nodeId": "18:159",
    "sourceHash": "05cf6d9bfebb6c882b97352de8db7261c307d30e",
    "sourceSha256": "ef91b9b862267180c078599fa9b4b519b5129d4e559b3b31d2d602bee142d5f1",
    "sha256": "ef91b9b862267180c078599fa9b4b519b5129d4e559b3b31d2d602bee142d5f1",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-large-06.svg",
    "width": 234.783,
    "height": 120,
    "sourceByteLength": 1204,
    "byteLength": 1204,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:159",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "socketPath": "M117.391 -1.79348e-06C182.225 -4.62744e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -2.39462e-06 54.7826 -2.39462e-06 54.7826C-2.39462e-06 54.7826 52.5579 1.04048e-06 117.391 -1.79348e-06Z",
      "clipPath": "M117.391 -9.52693e-06C182.225 -1.24184e-05 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5578 109.565 -5.28878e-05 54.7826 -5.28878e-05 54.7826C-5.28878e-05 54.7826 52.5578 -6.6355e-06 117.391 -9.52693e-06Z",
      "iris": {
        "centerX": 151.922,
        "centerY": 61.7628,
        "radius": 48.2609,
        "fill": "#5B737E"
      },
      "irisSourceOffset": {
        "x": 34.5305,
        "y": 1.7627999999999986
      }
    }
  },
  {
    "id": "eye-large-07",
    "role": "eye",
    "nodeId": "18:163",
    "sourceHash": "9b203912b597687c5a76f7387e268d26139c0f84",
    "sourceSha256": "e3ae6db187b82d63967d5385c7520a02210e8ac1928c82902470eb36034bf6f4",
    "sha256": "e3ae6db187b82d63967d5385c7520a02210e8ac1928c82902470eb36034bf6f4",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-large-07.svg",
    "width": 234.783,
    "height": 120,
    "sourceByteLength": 1203,
    "byteLength": 1203,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:163",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "socketPath": "M117.391 -1.79348e-06C182.225 -4.62744e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -2.39462e-06 54.7826 -2.39462e-06 54.7826C-2.39462e-06 54.7826 52.5579 1.04048e-06 117.391 -1.79348e-06Z",
      "clipPath": "M117.391 -3.23111e-05C182.225 -3.5145e-05 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -2.39462e-06 54.7826 -2.39462e-06 54.7826C-2.39462e-06 54.7826 52.5579 -2.94771e-05 117.391 -3.23111e-05Z",
      "iris": {
        "centerX": 152.609,
        "centerY": 51.7391,
        "radius": 48.2609,
        "fill": "#5B737E"
      },
      "irisSourceOffset": {
        "x": 35.217500000000015,
        "y": -8.2609
      }
    }
  },
  {
    "id": "eye-large-08",
    "role": "eye",
    "nodeId": "18:183",
    "sourceHash": "938259a2f138f8286134a78496ac0b97f0bef50a",
    "sourceSha256": "6d368e31c44219df9919c444bef5175a33e5cd8cac1de654347a57e525bf7b09",
    "sha256": "6d368e31c44219df9919c444bef5175a33e5cd8cac1de654347a57e525bf7b09",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-large-08.svg",
    "width": 234.783,
    "height": 120,
    "sourceByteLength": 1198,
    "byteLength": 1198,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:183",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 234.783,
        "height": 120
      },
      "socketPath": "M117.391 -1.79348e-06C182.225 -4.62744e-06 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -2.39462e-06 54.7826 -2.39462e-06 54.7826C-2.39462e-06 54.7826 52.5579 1.04048e-06 117.391 -1.79348e-06Z",
      "clipPath": "M117.391 1.3371e-05C182.225 1.0485e-05 234.783 54.7826 234.783 54.7826C234.783 54.7826 182.225 109.565 117.391 109.565C52.5579 109.565 -1.57085e-05 54.7826 -1.57085e-05 54.7826C-1.57085e-05 54.7826 52.5579 1.62571e-05 117.391 1.3371e-05Z",
      "iris": {
        "centerX": 152.609,
        "centerY": 71.7391,
        "radius": 48.2609,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 35.217500000000015,
        "y": 11.739099999999993
      }
    }
  },
  {
    "id": "eye-medium-01",
    "role": "eye",
    "nodeId": "18:115",
    "sourceHash": "9991c6dbe685daa34d4054efca6024f54a6f0c56",
    "sourceSha256": "b463b982c0e8071657958f26220e54743e3fab7e55d002beb4437c22d518710e",
    "sha256": "b463b982c0e8071657958f26220e54743e3fab7e55d002beb4437c22d518710e",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-medium-01.svg",
    "width": 180,
    "height": 92,
    "sourceByteLength": 1024,
    "byteLength": 1024,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:115",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 180,
        "height": 92
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 180,
        "height": 92
      },
      "socketPath": "M90 3.33774e-06C139.706 1.16504e-06 180 42 180 42C180 42 139.706 84 90 84C40.2944 84 1.83588e-06 42 1.83588e-06 42C1.83588e-06 42 40.2944 5.51044e-06 90 3.33774e-06Z",
      "clipPath": "M90 -4.29165e-06C139.706 -6.46435e-06 180 42 180 42C180 42 139.706 84 90 84C40.2944 84 -1.83588e-06 42 -1.83588e-06 42C-1.83588e-06 42 40.2944 -2.11895e-06 90 -4.29165e-06Z",
      "iris": {
        "centerX": 127,
        "centerY": 43,
        "radius": 37,
        "fill": "#596553"
      },
      "irisSourceOffset": {
        "x": 37,
        "y": -3
      }
    }
  },
  {
    "id": "eye-medium-02",
    "role": "eye",
    "nodeId": "18:119",
    "sourceHash": "be7e2683c279305b6bd3bddf2033b31977c2b8da",
    "sourceSha256": "a761cf6f8a26c9d59ead5e83597f9712b38017de9e780cc98451a8f6fdc991c1",
    "sha256": "a761cf6f8a26c9d59ead5e83597f9712b38017de9e780cc98451a8f6fdc991c1",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-medium-02.svg",
    "width": 208.766,
    "height": 106.703,
    "sourceByteLength": 1217,
    "byteLength": 1217,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:119",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 208.766,
        "height": 106.703
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 208.766,
        "height": 106.703
      },
      "socketPath": "M104.383 -1.94416e-05C162.032 -2.10934e-05 208.766 48.7121 208.766 48.7121C208.766 48.7121 162.032 97.4243 104.383 97.4243C46.7339 97.4243 -1.68695e-05 48.7121 -1.68695e-05 48.7121C-1.68695e-05 48.7121 46.7339 -1.77899e-05 104.383 -1.94416e-05Z",
      "clipPath": "M104.383 -4.99345e-05C162.032 -5.15725e-05 208.766 48.7121 208.766 48.7121C208.766 48.7121 162.032 97.4242 104.383 97.4242C46.7339 97.4242 -9.20366e-06 48.7121 -9.20366e-06 48.7121C-9.20366e-06 48.7121 46.7339 -4.82964e-05 104.383 -4.99345e-05Z",
      "iris": {
        "centerX": 140.132,
        "centerY": 44.2873,
        "radius": 42.9131,
        "fill": "#5F5046"
      },
      "irisSourceOffset": {
        "x": 35.74900000000001,
        "y": -9.0642
      }
    }
  },
  {
    "id": "eye-medium-03",
    "role": "eye",
    "nodeId": "18:123",
    "sourceHash": "015e64fd8d9f94e59a9e4c3bee96fd2da8d47e08",
    "sourceSha256": "e0cb5ce305fe849573356d0809ca9392d4bb2e43386a60ecac28b7da68a2fa7b",
    "sha256": "e0cb5ce305fe849573356d0809ca9392d4bb2e43386a60ecac28b7da68a2fa7b",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-medium-03.svg",
    "width": 180,
    "height": 92,
    "sourceByteLength": 1020,
    "byteLength": 1020,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:123",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 180,
        "height": 92
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 180,
        "height": 92
      },
      "socketPath": "M90 3.33774e-06C139.706 1.16504e-06 180 42 180 42C180 42 139.706 84 90 84C40.2944 84 1.83588e-06 42 1.83588e-06 42C1.83588e-06 42 40.2944 5.51044e-06 90 3.33774e-06Z",
      "clipPath": "M90 4.68335e-06C139.706 3.2538e-06 180 42 180 42C180 42 139.706 84 90 84C40.2944 84 -4.48004e-06 42 -4.48004e-06 42C-4.48004e-06 42 40.2944 6.11289e-06 90 4.68335e-06Z",
      "iris": {
        "centerX": 117,
        "centerY": 55,
        "radius": 37,
        "fill": "#5F5046"
      },
      "irisSourceOffset": {
        "x": 27,
        "y": 9
      }
    }
  },
  {
    "id": "eye-medium-04",
    "role": "eye",
    "nodeId": "18:127",
    "sourceHash": "bafd916932299932bd5af9e0bce67afdcf461125",
    "sourceSha256": "62d4d5e031ae4c9271948b163b8c3c6cb8fb3b6e781b7706ce8224956ae6bb65",
    "sha256": "62d4d5e031ae4c9271948b163b8c3c6cb8fb3b6e781b7706ce8224956ae6bb65",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-medium-04.svg",
    "width": 180,
    "height": 92,
    "sourceByteLength": 1022,
    "byteLength": 1022,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:127",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 180,
        "height": 92
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 180,
        "height": 92
      },
      "socketPath": "M90 3.33774e-06C139.706 1.16504e-06 180 42 180 42C180 42 139.706 84 90 84C40.2944 84 1.83588e-06 42 1.83588e-06 42C1.83588e-06 42 40.2944 5.51044e-06 90 3.33774e-06Z",
      "clipPath": "M90 -4.29165e-06C139.706 -6.46435e-06 180 42 180 42C180 42 139.706 84 90 84C40.2944 84 1.97882e-06 42 1.97882e-06 42C1.97882e-06 42 40.2944 -2.11895e-06 90 -4.29165e-06Z",
      "iris": {
        "centerX": 117,
        "centerY": 55,
        "radius": 37,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 27,
        "y": 9
      }
    }
  },
  {
    "id": "eye-medium-05",
    "role": "eye",
    "nodeId": "18:131",
    "sourceHash": "2d4715f15d25ecaa96966c2a87dd8afdd9317c4f",
    "sourceSha256": "b4d3ba9aeb30fd728bf45ec7094a5c271edc61dc807ee16b535a203daf0c2ade",
    "sha256": "b4d3ba9aeb30fd728bf45ec7094a5c271edc61dc807ee16b535a203daf0c2ade",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-medium-05.svg",
    "width": 180,
    "height": 92,
    "sourceByteLength": 1024,
    "byteLength": 1024,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:131",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 180,
        "height": 92
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 180,
        "height": 92
      },
      "socketPath": "M90 3.33774e-06C139.706 1.16504e-06 180 42 180 42C180 42 139.706 84 90 84C40.2944 84 1.83588e-06 42 1.83588e-06 42C1.83588e-06 42 40.2944 5.51044e-06 90 3.33774e-06Z",
      "clipPath": "M90 -4.29165e-06C139.706 -6.46435e-06 180 42 180 42C180 42 139.706 84 90 84C40.2944 84 -1.83588e-06 42 -1.83588e-06 42C-1.83588e-06 42 40.2944 -2.11895e-06 90 -4.29165e-06Z",
      "iris": {
        "centerX": 117,
        "centerY": 45,
        "radius": 37,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 27,
        "y": -1
      }
    }
  },
  {
    "id": "eye-medium-06",
    "role": "eye",
    "nodeId": "18:135",
    "sourceHash": "5d75982c9e3ed410896cf75d96f0d7abee8698ad",
    "sourceSha256": "95542e3b4708dc6273bdb613d72d56c0b313c2ddde752cece1eb40f767d6dc03",
    "sha256": "95542e3b4708dc6273bdb613d72d56c0b313c2ddde752cece1eb40f767d6dc03",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-medium-06.svg",
    "width": 180,
    "height": 92,
    "sourceByteLength": 1025,
    "byteLength": 1025,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:135",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 180,
        "height": 92
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 180,
        "height": 92
      },
      "socketPath": "M90 3.33774e-06C139.706 1.16504e-06 180 42 180 42C180 42 139.706 84 90 84C40.2944 84 1.83588e-06 42 1.83588e-06 42C1.83588e-06 42 40.2944 5.51044e-06 90 3.33774e-06Z",
      "clipPath": "M90 -4.29165e-06C139.706 -6.46435e-06 180 42 180 42C180 42 139.706 84 90 84C40.2944 84 -1.83588e-06 42 -1.83588e-06 42C-1.83588e-06 42 40.2944 -2.11895e-06 90 -4.29165e-06Z",
      "iris": {
        "centerX": 117,
        "centerY": 55,
        "radius": 37,
        "fill": "#596553"
      },
      "irisSourceOffset": {
        "x": 27,
        "y": 9
      }
    }
  },
  {
    "id": "eye-small-01",
    "role": "eye",
    "nodeId": "18:187",
    "sourceHash": "ff70c7571d5532337a02fd5fdd5116985d62971d",
    "sourceSha256": "36c9740092ac7d08be3bfe8b8e808a63b4b720c986b5efa9c33b13822a3a201a",
    "sha256": "36c9740092ac7d08be3bfe8b8e808a63b4b720c986b5efa9c33b13822a3a201a",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-small-01.svg",
    "width": 148,
    "height": 75.6444,
    "sourceByteLength": 1146,
    "byteLength": 1146,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:187",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 148,
        "height": 75.6444
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 148,
        "height": 75.6444
      },
      "socketPath": "M74 -5.14199e-06C114.869 -6.92844e-06 148 34.5333 148 34.5333C148 34.5333 114.869 69.0667 74 69.0667C33.1309 69.0667 -1.5095e-06 34.5333 -1.5095e-06 34.5333C-1.5095e-06 34.5333 33.1309 -3.35555e-06 74 -5.14199e-06Z",
      "clipPath": "M74 -4.03997e-06C114.869 -5.21778e-06 148 34.5333 148 34.5333C148 34.5333 114.869 69.0667 74 69.0667C33.1309 69.0667 -1.33331e-05 34.5333 -1.33331e-05 34.5333C-1.33331e-05 34.5333 33.1309 -2.86216e-06 74 -4.03997e-06Z",
      "iris": {
        "centerX": 100.021,
        "centerY": 30.717,
        "radius": 30.4222,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 26.021,
        "y": -7.1052000000000035
      }
    }
  },
  {
    "id": "eye-small-02",
    "role": "eye",
    "nodeId": "18:191",
    "sourceHash": "0c52ff9bf302691c9d8fe73c3db47de053adf552",
    "sourceSha256": "fafa52d38f6773e8ddca999cbe686d5a0a435dc9a7fb4fc4b73e04443408d5af",
    "sha256": "fafa52d38f6773e8ddca999cbe686d5a0a435dc9a7fb4fc4b73e04443408d5af",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-small-02.svg",
    "width": 148,
    "height": 75.6444,
    "sourceByteLength": 1138,
    "byteLength": 1138,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:191",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 148,
        "height": 75.6444
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 148,
        "height": 75.6444
      },
      "socketPath": "M74 -5.14199e-06C114.869 -6.92844e-06 148 34.5333 148 34.5333C148 34.5333 114.869 69.0667 74 69.0667C33.1309 69.0667 -1.5095e-06 34.5333 -1.5095e-06 34.5333C-1.5095e-06 34.5333 33.1309 -3.35555e-06 74 -5.14199e-06Z",
      "clipPath": "M74 2.53735e-05C114.869 2.35858e-05 148 34.5334 148 34.5334C148 34.5334 114.869 69.0667 74 69.0667C33.1309 69.0667 8.0829e-06 34.5334 8.0829e-06 34.5334C8.0829e-06 34.5334 33.1309 2.71611e-05 74 2.53735e-05Z",
      "iris": {
        "centerX": 98.2648,
        "centerY": 35.4377,
        "radius": 30.4222,
        "fill": "#5F5046"
      },
      "irisSourceOffset": {
        "x": 24.264799999999994,
        "y": -2.3845000000000027
      }
    }
  },
  {
    "id": "eye-small-03",
    "role": "eye",
    "nodeId": "18:195",
    "sourceHash": "bbe738f8f1e65e6823699ecfb94275f5e7fc4b0b",
    "sourceSha256": "181a3d19e3a0582491c9da158887ee73efda30dbbfde017c079f17bc663b3112",
    "sha256": "181a3d19e3a0582491c9da158887ee73efda30dbbfde017c079f17bc663b3112",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-small-03.svg",
    "width": 148,
    "height": 75.6444,
    "sourceByteLength": 1145,
    "byteLength": 1145,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:195",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 148,
        "height": 75.6444
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 148,
        "height": 75.6444
      },
      "socketPath": "M74 -5.14199e-06C114.869 -6.92844e-06 148 34.5333 148 34.5333C148 34.5333 114.869 69.0667 74 69.0667C33.1309 69.0667 -1.5095e-06 34.5333 -1.5095e-06 34.5333C-1.5095e-06 34.5333 33.1309 -3.35555e-06 74 -5.14199e-06Z",
      "clipPath": "M74 -2.0399e-05C114.869 -2.21844e-05 148 34.5333 148 34.5333C148 34.5333 114.869 69.0666 74 69.0666C33.1309 69.0666 -5.57508e-06 34.5333 -5.57508e-06 34.5333C-5.57508e-06 34.5333 33.1309 -1.86135e-05 74 -2.0399e-05Z",
      "iris": {
        "centerX": 98.3207,
        "centerY": 35.4497,
        "radius": 30.4222,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 24.320700000000002,
        "y": -2.3725000000000023
      }
    }
  },
  {
    "id": "eye-small-04",
    "role": "eye",
    "nodeId": "18:199",
    "sourceHash": "fbb7cefd29fc25938e33ec6b77f0d39215657eb8",
    "sourceSha256": "0948887260003ded69919937134eef00e2777167c3fb13e4b15f6aa94253dc04",
    "sha256": "0948887260003ded69919937134eef00e2777167c3fb13e4b15f6aa94253dc04",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-small-04.svg",
    "width": 148,
    "height": 75.6444,
    "sourceByteLength": 1136,
    "byteLength": 1136,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:199",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 148,
        "height": 75.6444
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 148,
        "height": 75.6444
      },
      "socketPath": "M74 -5.14199e-06C114.869 -6.92844e-06 148 34.5333 148 34.5333C148 34.5333 114.869 69.0667 74 69.0667C33.1309 69.0667 -1.5095e-06 34.5333 -1.5095e-06 34.5333C-1.5095e-06 34.5333 33.1309 -3.35555e-06 74 -5.14199e-06Z",
      "clipPath": "M74 1.1288e-05C114.869 1.01484e-05 148 34.5333 148 34.5333C148 34.5333 114.869 69.0667 74 69.0667C33.1309 69.0667 8.5391e-06 34.5333 8.5391e-06 34.5333C8.5391e-06 34.5333 33.1309 1.24276e-05 74 1.1288e-05Z",
      "iris": {
        "centerX": 98.3207,
        "centerY": 35.4497,
        "radius": 30.4222,
        "fill": "#38332F"
      },
      "irisSourceOffset": {
        "x": 24.320700000000002,
        "y": -2.3725000000000023
      }
    }
  },
  {
    "id": "eye-small-05",
    "role": "eye",
    "nodeId": "18:203",
    "sourceHash": "4d94cafd924a104b07da4dab2522861ceffb9ffd",
    "sourceSha256": "cdb1879263a947eceb2a265522c0d8effab5bb627c44872ea2b6d51c911d72a0",
    "sha256": "cdb1879263a947eceb2a265522c0d8effab5bb627c44872ea2b6d51c911d72a0",
    "format": "svg",
    "url": "/assets/figma/eyes/eye-small-05.svg",
    "width": 148,
    "height": 75.6444,
    "sourceByteLength": 1148,
    "byteLength": 1148,
    "maxBytes": 16384,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:203",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    },
    "geometry": {
      "viewBox": {
        "x": 0,
        "y": 0,
        "width": 148,
        "height": 75.6444
      },
      "crop": {
        "x": 0,
        "y": 0,
        "width": 148,
        "height": 75.6444
      },
      "socketPath": "M74 -5.14199e-06C114.869 -6.92844e-06 148 34.5333 148 34.5333C148 34.5333 114.869 69.0667 74 69.0667C33.1309 69.0667 -1.5095e-06 34.5333 -1.5095e-06 34.5333C-1.5095e-06 34.5333 33.1309 -3.35555e-06 74 -5.14199e-06Z",
      "clipPath": "M74 -4.21816e-05C114.869 -4.33564e-05 148 34.5333 148 34.5333C148 34.5333 114.869 69.0666 74 69.0666C33.1309 69.0666 -3.79364e-05 34.5333 -3.79364e-05 34.5333C-3.79364e-05 34.5333 33.1309 -4.10067e-05 74 -4.21816e-05Z",
      "iris": {
        "centerX": 104.626,
        "centerY": 37.1595,
        "radius": 30.4222,
        "fill": "#596553"
      },
      "irisSourceOffset": {
        "x": 30.626000000000005,
        "y": -0.662700000000001
      }
    }
  },
  {
    "id": "filter-panel-divider",
    "role": "control-icon",
    "nodeId": "103:3587",
    "sourceHash": "06373f10968c5ccbc518bd2ba80465f882a9cb96",
    "sourceSha256": "1bb0aadaf7d13913be2074f4b8221b5547f6a1a4079cbd638671c3606f472ed9",
    "sha256": "1bb0aadaf7d13913be2074f4b8221b5547f6a1a4079cbd638671c3606f472ed9",
    "format": "svg",
    "url": "/assets/figma/icons/filter-panel-divider.svg",
    "width": 106,
    "height": 1,
    "sourceByteLength": 269,
    "byteLength": 269,
    "maxBytes": 65536,
    "requiredFor": [
      "103:3579"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:3587",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "filter-repel-thumb",
    "role": "control-icon",
    "nodeId": "103:3592",
    "sourceHash": "c31cd698d13f2b435c90d011f6d8f98ab359c6c4",
    "sourceSha256": "eacc6207f405b47ede0537c8254e224a12c97483583c69d59dc0a196f0a5992e",
    "sha256": "eacc6207f405b47ede0537c8254e224a12c97483583c69d59dc0a196f0a5992e",
    "format": "svg",
    "url": "/assets/figma/icons/filter-repel-thumb.svg",
    "width": 18,
    "height": 18,
    "sourceByteLength": 281,
    "byteLength": 281,
    "maxBytes": 65536,
    "requiredFor": [
      "103:3579"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:3592",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "filter-repel-track",
    "role": "control-icon",
    "nodeId": "103:3591",
    "sourceHash": "89b368c747a9f1cac858d748e5f4165565db429b",
    "sourceSha256": "e2fe3d2a0e95e4d34458dd110656fe259f7cfd2344b08abee416370896df5fa2",
    "sha256": "e2fe3d2a0e95e4d34458dd110656fe259f7cfd2344b08abee416370896df5fa2",
    "format": "svg",
    "url": "/assets/figma/icons/filter-repel-track.svg",
    "width": 95,
    "height": 1,
    "sourceByteLength": 249,
    "byteLength": 249,
    "maxBytes": 65536,
    "requiredFor": [
      "103:3579"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:3591",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "reference-avatar-gallery",
    "role": "reference",
    "nodeId": "103:3593",
    "sourceHash": "74f0cb3b774a1ea1fa016fb8e189a5bd49bf5bd986c44e2b620575e42e16e752",
    "sourceSha256": "74f0cb3b774a1ea1fa016fb8e189a5bd49bf5bd986c44e2b620575e42e16e752",
    "sha256": "74f0cb3b774a1ea1fa016fb8e189a5bd49bf5bd986c44e2b620575e42e16e752",
    "format": "png",
    "url": "/assets/figma/references/reference-avatar-gallery.png",
    "width": 284,
    "height": 700,
    "sourceByteLength": 131602,
    "byteLength": 131602,
    "maxBytes": 4194304,
    "requiredFor": [
      "103:3593"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:3593",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "get_screenshot",
      "sourceDimensions": {
        "width": 284,
        "height": 700
      },
      "originalCaptureDimensions": {
        "width": 284,
        "height": 700
      },
      "parityMapping": {
        "kind": "intrinsic",
        "normalizedDimensions": {
          "width": 284,
          "height": 700
        },
        "sourceCrop": {
          "x": 0,
          "y": 0,
          "width": 284,
          "height": 700
        },
        "captureCrop": {
          "x": 0,
          "y": 0,
          "width": 284,
          "height": 700
        },
        "scaleX": 1,
        "scaleY": 1,
        "transform": "identity",
        "resampling": "none",
        "browserCapture": {
          "width": 284,
          "height": 700,
          "scale": 1,
          "sourceCrop": {
            "x": 0,
            "y": 0,
            "width": 284,
            "height": 700
          },
          "transform": "identity",
          "resampling": "none"
        }
      }
    }
  },
  {
    "id": "reference-control-icons",
    "role": "reference",
    "nodeId": "103:2490",
    "sourceHash": "87d01dcac4663d5c5ed8efb3223be6d5acae48306240fdc57adbb5235b25cb11",
    "sourceSha256": "87d01dcac4663d5c5ed8efb3223be6d5acae48306240fdc57adbb5235b25cb11",
    "sha256": "87d01dcac4663d5c5ed8efb3223be6d5acae48306240fdc57adbb5235b25cb11",
    "format": "png",
    "url": "/assets/figma/references/reference-control-icons.png",
    "width": 200,
    "height": 99,
    "sourceByteLength": 2771,
    "byteLength": 2771,
    "maxBytes": 4194304,
    "requiredFor": [
      "103:2490"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2490",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "get_screenshot",
      "sourceDimensions": {
        "width": 200,
        "height": 99
      },
      "originalCaptureDimensions": {
        "width": 200,
        "height": 99
      },
      "parityMapping": {
        "kind": "intrinsic",
        "normalizedDimensions": {
          "width": 200,
          "height": 99
        },
        "sourceCrop": {
          "x": 0,
          "y": 0,
          "width": 200,
          "height": 99
        },
        "captureCrop": {
          "x": 0,
          "y": 0,
          "width": 200,
          "height": 99
        },
        "scaleX": 1,
        "scaleY": 1,
        "transform": "identity",
        "resampling": "none",
        "browserCapture": {
          "width": 200,
          "height": 99,
          "scale": 1,
          "sourceCrop": {
            "x": 0,
            "y": 0,
            "width": 200,
            "height": 99
          },
          "transform": "identity",
          "resampling": "none"
        }
      }
    }
  },
  {
    "id": "reference-eyes-attack",
    "role": "reference",
    "nodeId": "109:3669",
    "sourceHash": "9403e15a2fc71b00fbc0aebd649136f2f8d164f49814d456c8b9b2b8f88c2e7c",
    "sourceSha256": "9403e15a2fc71b00fbc0aebd649136f2f8d164f49814d456c8b9b2b8f88c2e7c",
    "sha256": "32babf66ced5565ce65ba0eb16fc939823caab25f75d5b2312409dbccd1444dd",
    "format": "png",
    "url": "/assets/figma/references/reference-eyes-attack.png",
    "width": 1020,
    "height": 663,
    "sourceByteLength": 621485,
    "byteLength": 698412,
    "maxBytes": 4194304,
    "requiredFor": [
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "109:3669",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "get_screenshot",
      "sourceDimensions": {
        "width": 1280,
        "height": 832
      },
      "originalCaptureDimensions": {
        "width": 1024,
        "height": 666
      },
      "parityMapping": {
        "kind": "full-scene-normalized",
        "normalizedDimensions": {
          "width": 1020,
          "height": 663
        },
        "sourceCrop": {
          "x": 0,
          "y": 0,
          "width": 1280,
          "height": 832
        },
        "captureCrop": {
          "x": 0,
          "y": 0,
          "width": 1024,
          "height": 666
        },
        "scaleX": 0.796875,
        "scaleY": 0.796875,
        "transform": "full-crop-resample",
        "resampling": "nearest-neighbor",
        "browserCapture": {
          "width": 1020,
          "height": 663,
          "scale": 0.796875,
          "sourceCrop": {
            "x": 0,
            "y": 0,
            "width": 1280,
            "height": 832
          },
          "transform": "full-crop-resample",
          "resampling": "nearest-neighbor"
        }
      }
    }
  },
  {
    "id": "reference-eyes-default",
    "role": "reference",
    "nodeId": "18:113",
    "sourceHash": "49e1f505732e9b8975932a2769f56067431907af4f4b6beb3795fd4e9bc6d9fa",
    "sourceSha256": "49e1f505732e9b8975932a2769f56067431907af4f4b6beb3795fd4e9bc6d9fa",
    "sha256": "85c79803cbdc9616eeba2b573959362e4b2fde55e620dc811c831ad369aa423e",
    "format": "png",
    "url": "/assets/figma/references/reference-eyes-default.png",
    "width": 1020,
    "height": 663,
    "sourceByteLength": 413469,
    "byteLength": 350071,
    "maxBytes": 4194304,
    "requiredFor": [
      "18:113"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "18:113",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "get_screenshot",
      "sourceDimensions": {
        "width": 1280,
        "height": 832
      },
      "originalCaptureDimensions": {
        "width": 1024,
        "height": 666
      },
      "parityMapping": {
        "kind": "full-scene-normalized",
        "normalizedDimensions": {
          "width": 1020,
          "height": 663
        },
        "sourceCrop": {
          "x": 0,
          "y": 0,
          "width": 1280,
          "height": 832
        },
        "captureCrop": {
          "x": 0,
          "y": 0,
          "width": 1024,
          "height": 666
        },
        "scaleX": 0.796875,
        "scaleY": 0.796875,
        "transform": "full-crop-resample",
        "resampling": "nearest-neighbor",
        "browserCapture": {
          "width": 1020,
          "height": 663,
          "scale": 0.796875,
          "sourceCrop": {
            "x": 0,
            "y": 0,
            "width": 1280,
            "height": 832
          },
          "transform": "full-crop-resample",
          "resampling": "nearest-neighbor"
        }
      }
    }
  },
  {
    "id": "reference-filter-panel",
    "role": "reference",
    "nodeId": "103:3579",
    "sourceHash": "31ca756866ccab76ef97375535772ed8ab0059e84502156b1e43aefb4655184e",
    "sourceSha256": "31ca756866ccab76ef97375535772ed8ab0059e84502156b1e43aefb4655184e",
    "sha256": "31ca756866ccab76ef97375535772ed8ab0059e84502156b1e43aefb4655184e",
    "format": "png",
    "url": "/assets/figma/references/reference-filter-panel.png",
    "width": 139,
    "height": 170,
    "sourceByteLength": 13038,
    "byteLength": 13038,
    "maxBytes": 4194304,
    "requiredFor": [
      "103:3579"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:3579",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "get_screenshot",
      "sourceDimensions": {
        "width": 139,
        "height": 170
      },
      "originalCaptureDimensions": {
        "width": 139,
        "height": 170
      },
      "parityMapping": {
        "kind": "intrinsic",
        "normalizedDimensions": {
          "width": 139,
          "height": 170
        },
        "sourceCrop": {
          "x": 0,
          "y": 0,
          "width": 139,
          "height": 170
        },
        "captureCrop": {
          "x": 0,
          "y": 0,
          "width": 139,
          "height": 170
        },
        "scaleX": 1,
        "scaleY": 1,
        "transform": "identity",
        "resampling": "none",
        "browserCapture": {
          "width": 139,
          "height": 170,
          "scale": 1,
          "sourceCrop": {
            "x": 0,
            "y": 0,
            "width": 139,
            "height": 170
          },
          "transform": "identity",
          "resampling": "none"
        }
      }
    }
  },
  {
    "id": "scene-control-bug-body",
    "role": "control-icon",
    "nodeId": "102:2472",
    "sourceHash": "3de42d0c77268212a485f7ad76dc86d31d56038a",
    "sourceSha256": "9d89318476696719b11cdd8dc07fed0bac421443f02561d598a84e70042f74e1",
    "sha256": "9d89318476696719b11cdd8dc07fed0bac421443f02561d598a84e70042f74e1",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-bug-body.svg",
    "width": 9.33333,
    "height": 23.4431,
    "sourceByteLength": 538,
    "byteLength": 538,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2472",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-bug-outline",
    "role": "control-icon",
    "nodeId": "102:2471",
    "sourceHash": "77b3bb28e0fd62a2a72864189eae1853a5e778d7",
    "sourceSha256": "1ef4aa1671babb636d885d30dab016e7e31753adafad88c3880ce9ef8d863afe",
    "sha256": "1ef4aa1671babb636d885d30dab016e7e31753adafad88c3880ce9ef8d863afe",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-bug-outline.svg",
    "width": 20,
    "height": 28.1681,
    "sourceByteLength": 596,
    "byteLength": 596,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2471",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-divider",
    "role": "control-icon",
    "nodeId": "152:9284",
    "sourceHash": "250ab7af244a81acf824ba1bbfa0443b55daf60d",
    "sourceSha256": "43e0bfed4e8bca6c13cc604fd0ac87c35949019463eeaf4b984a9ddeb99c90e3",
    "sha256": "43e0bfed4e8bca6c13cc604fd0ac87c35949019463eeaf4b984a9ddeb99c90e3",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-divider.svg",
    "width": 32,
    "height": 1,
    "sourceByteLength": 263,
    "byteLength": 263,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "152:9284",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-drag-handle",
    "role": "control-icon",
    "nodeId": "103:3210",
    "sourceHash": "ca3073ceb882dfc444360123f5fdc48e476e6770",
    "sourceSha256": "44cd032f38e406f40f0a1142a428f3e44bc5120ff58f152e5004712172b073af",
    "sha256": "44cd032f38e406f40f0a1142a428f3e44bc5120ff58f152e5004712172b073af",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-drag-handle.svg",
    "width": 17.3333,
    "height": 24,
    "sourceByteLength": 1440,
    "byteLength": 1440,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:3210",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-eye-outline",
    "role": "control-icon",
    "nodeId": "102:2482",
    "sourceHash": "23b6634745f75782d7a4cf6e35a56a930a51cb4b",
    "sourceSha256": "0ade07c9ee7f3cfc1f561c9bae68a48fca1cf9aed63395beac380a3c77bc37a6",
    "sha256": "0ade07c9ee7f3cfc1f561c9bae68a48fca1cf9aed63395beac380a3c77bc37a6",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-eye-outline.svg",
    "width": 14.6667,
    "height": 25.6151,
    "sourceByteLength": 487,
    "byteLength": 487,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2482",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-eye-pupil",
    "role": "control-icon",
    "nodeId": "102:2483",
    "sourceHash": "7c94ba2927e8ccae04feaa480eacd9df56b207c9",
    "sourceSha256": "0eba9317caca26e23af3d81f3d08ff59d3a9bb79a47e88df393f3fd15d60e136",
    "sha256": "0eba9317caca26e23af3d81f3d08ff59d3a9bb79a47e88df393f3fd15d60e136",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-eye-pupil.svg",
    "width": 9.33333,
    "height": 9.33333,
    "sourceByteLength": 328,
    "byteLength": 328,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2483",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-filter-knob",
    "role": "control-icon",
    "nodeId": "103:2537",
    "sourceHash": "7c6c2ca4a2259430dc76d92f610404a26c517245",
    "sourceSha256": "6f5adc839eadab5adeaed70553d4a029eba736b13708fe10dbbd7f1fea2c9c30",
    "sha256": "6f5adc839eadab5adeaed70553d4a029eba736b13708fe10dbbd7f1fea2c9c30",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-filter-knob.svg",
    "width": 6.66667,
    "height": 6.66667,
    "sourceByteLength": 362,
    "byteLength": 362,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2537",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-filter-lines",
    "role": "control-icon",
    "nodeId": "103:2526",
    "sourceHash": "8692073f643cd95bfb85217b0654f09da6a0f2c8",
    "sourceSha256": "bfffcd8d8a51d93c3f88365f5b40857de66af4d49d31afe1c026841587df9aae",
    "sha256": "bfffcd8d8a51d93c3f88365f5b40857de66af4d49d31afe1c026841587df9aae",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-filter-lines.svg",
    "width": 25.3333,
    "height": 1.33333,
    "sourceByteLength": 322,
    "byteLength": 322,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2526",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-gallery-tile-primary",
    "role": "control-icon",
    "nodeId": "103:2527",
    "sourceHash": "24bfd9e1c6ea37076fc3fc1270dbf1db2bd8f4c3",
    "sourceSha256": "b743fa6cc59e712f3095820b7dc0ba05b8b54cad8ca262508db205b80b4d8358",
    "sha256": "b743fa6cc59e712f3095820b7dc0ba05b8b54cad8ca262508db205b80b4d8358",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-gallery-tile-primary.svg",
    "width": 9.33333,
    "height": 9.33333,
    "sourceByteLength": 463,
    "byteLength": 463,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2527",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-gallery-tile-secondary",
    "role": "control-icon",
    "nodeId": "103:2530",
    "sourceHash": "ca1a648d497847b68f3932819eb8c07376ef932d",
    "sourceSha256": "490a78974e015c131b1c9cb3e1b9c380a6a29832bbf6c2f4eb8ae04b7eaf2212",
    "sha256": "490a78974e015c131b1c9cb3e1b9c380a6a29832bbf6c2f4eb8ae04b7eaf2212",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-gallery-tile-secondary.svg",
    "width": 9.33333,
    "height": 9.33333,
    "sourceByteLength": 464,
    "byteLength": 464,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2530",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-gallery-tile-tertiary",
    "role": "control-icon",
    "nodeId": "103:2532",
    "sourceHash": "d173e49d49f9427fb09db7d8edbb16df5aa155c0",
    "sourceSha256": "6b71e43239fd2cd9619028a73a355562a94e5552b22aef4ded62970a327d62bb",
    "sha256": "6b71e43239fd2cd9619028a73a355562a94e5552b22aef4ded62970a327d62bb",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-gallery-tile-tertiary.svg",
    "width": 9.33333,
    "height": 9.33333,
    "sourceByteLength": 464,
    "byteLength": 464,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:2532",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-hand-finger",
    "role": "control-icon",
    "nodeId": "102:2448",
    "sourceHash": "fd57738737b65455e120eb768cd99b03965290df",
    "sourceSha256": "64e384e1d4439c7a0e74bf342493819854df2837d264955723a6b995cd3626d9",
    "sha256": "64e384e1d4439c7a0e74bf342493819854df2837d264955723a6b995cd3626d9",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-hand-finger.svg",
    "width": 5.33333,
    "height": 7.33333,
    "sourceByteLength": 428,
    "byteLength": 428,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2448",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-hand-index",
    "role": "control-icon",
    "nodeId": "102:2452",
    "sourceHash": "a7267f188c1b8b4a562926d641325df1dcc67d29",
    "sourceSha256": "51c8e427c1b0c9e9777885065aabed6160c91ea85b42962f6817eceb6337fa50",
    "sha256": "51c8e427c1b0c9e9777885065aabed6160c91ea85b42962f6817eceb6337fa50",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-hand-index.svg",
    "width": 5.33334,
    "height": 6.66667,
    "sourceByteLength": 425,
    "byteLength": 425,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2452",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-hand-palm",
    "role": "control-icon",
    "nodeId": "102:2453",
    "sourceHash": "25dcb9df5df673b2db5b33e4ba2b9be2487465b8",
    "sourceSha256": "3d15e98d51316ea7b942fc2ad87695752a51e96b5afb44cecf14eb1afb229d10",
    "sha256": "3d15e98d51316ea7b942fc2ad87695752a51e96b5afb44cecf14eb1afb229d10",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-hand-palm.svg",
    "width": 5.33333,
    "height": 17.3333,
    "sourceByteLength": 437,
    "byteLength": 437,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2453",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-hand-thumb",
    "role": "control-icon",
    "nodeId": "102:2451",
    "sourceHash": "60ea7b103cdc2a9b9d3ec980e3fe4f80e9625106",
    "sourceSha256": "74575d3f9431f904a0ec2e3c683293f3aee936dfb0ef1b6622b0ecfd74366742",
    "sha256": "74575d3f9431f904a0ec2e3c683293f3aee936dfb0ef1b6622b0ecfd74366742",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-hand-thumb.svg",
    "width": 5.33333,
    "height": 7.33333,
    "sourceByteLength": 437,
    "byteLength": 437,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2451",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-hand-wrist",
    "role": "control-icon",
    "nodeId": "102:2447",
    "sourceHash": "9df69fb5f997b6ce44683e320d67c08015d8328e",
    "sourceSha256": "e50ae4a94d240269882439afbe2e4e5a42064f87ef38cade0dbe5d96fcf4483d",
    "sha256": "e50ae4a94d240269882439afbe2e4e5a42064f87ef38cade0dbe5d96fcf4483d",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-hand-wrist.svg",
    "width": 21.3332,
    "height": 14.6667,
    "sourceByteLength": 469,
    "byteLength": 469,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "102:2447",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-neutral-well",
    "role": "control-icon",
    "nodeId": "152:9286",
    "sourceHash": "f7b87a74f6126d0cf2628629e503afe3a82da96f",
    "sourceSha256": "61f068f112ebe935e73bc497fde484e056086002de93c52afdbc0ba38f2f5760",
    "sha256": "61f068f112ebe935e73bc497fde484e056086002de93c52afdbc0ba38f2f5760",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-neutral-well.svg",
    "width": 32,
    "height": 32,
    "sourceByteLength": 198,
    "byteLength": 198,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "152:9286",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-selected-well",
    "role": "control-icon",
    "nodeId": "152:9276",
    "sourceHash": "c775c85ade019499e81b4651295ac8b61fdbc3da",
    "sourceSha256": "ed15b93582af4b20d93605af23cbee3ab8000aa9c929cfa4ad360fa52c4a353b",
    "sha256": "ed15b93582af4b20d93605af23cbee3ab8000aa9c929cfa4ad360fa52c4a353b",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-selected-well.svg",
    "width": 46,
    "height": 50,
    "sourceByteLength": 1248,
    "byteLength": 1248,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "152:9276",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "scene-control-text-subject",
    "role": "control-icon",
    "nodeId": "103:3201",
    "sourceHash": "13bcb27a62495331f2469dd667a906b05ff9761e",
    "sourceSha256": "494b440167daccb221c5ca5c3db018eedf7d3aac0f7fd032b0b9fdd398d1af4e",
    "sha256": "494b440167daccb221c5ca5c3db018eedf7d3aac0f7fd032b0b9fdd398d1af4e",
    "format": "svg",
    "url": "/assets/figma/icons/scene-control-text-subject.svg",
    "width": 29,
    "height": 25,
    "sourceByteLength": 916,
    "byteLength": 916,
    "maxBytes": 65536,
    "requiredFor": [
      "18:113",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:3201",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "subject-elder-figure",
    "role": "subject",
    "nodeId": "103:3598",
    "sourceHash": "9e44f7d6a4d0d7d47a0093f25a4ece3ca09426ff",
    "sourceSha256": "37756daee9a07bff6c7db084ec71ecee7f732925d6e74b1c6e7ae4ccd14cba5b",
    "sha256": "37756daee9a07bff6c7db084ec71ecee7f732925d6e74b1c6e7ae4ccd14cba5b",
    "format": "png",
    "url": "/assets/figma/subjects/subject-elder-figure.png",
    "width": 642,
    "height": 350,
    "sourceByteLength": 79020,
    "byteLength": 79020,
    "maxBytes": 160000,
    "requiredFor": [
      "103:3593"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "103:3598",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  },
  {
    "id": "subject-lotus",
    "role": "subject",
    "nodeId": "57:4113",
    "sourceHash": "719d50b0198dbab7051f679039ac0d949e9d7ca7",
    "sourceSha256": "362832da8355d8a1b2bbf2af8639ec5d5c2c8dd511934bcdc19bcdd2442a5cc0",
    "sha256": "33abadf9cf06f2eddd03399501449da62f049e195b1f363a0cb234966a51132f",
    "format": "png",
    "url": "/assets/figma/subjects/subject-lotus.png",
    "width": 852,
    "height": 868,
    "sourceByteLength": 736550,
    "byteLength": 632349,
    "maxBytes": 700000,
    "requiredFor": [
      "18:113",
      "103:3593",
      "109:3669"
    ],
    "provenance": {
      "fileKey": "oPAdd7oWLQVMTP1v6pJOW0",
      "pageNodeId": "0:1",
      "sourceNodeId": "57:4113",
      "sourceVersion": "figma-dev-mode-mcp@1.0.0",
      "captureMethod": "asset-endpoint"
    }
  }
] satisfies readonly FigmaAssetEntry[]);

export function requiredAssetsFor(id: string): readonly FigmaAssetEntry[] {
  return FIGMA_ASSETS.filter((entry) => entry.requiredFor.includes(id));
}
