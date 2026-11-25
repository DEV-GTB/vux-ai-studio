// Simple 3D model generator — produces a GLB file from a text prompt.
// No external API, no local model hosting. Generates basic 3D shapes
// (cube, sphere, pyramid) based on prompt keywords.
//
// This is a free fallback for when external 3D APIs are unavailable.

import { Buffer } from 'node:buffer';

const MAX_GLB_BYTES = 100 * 1024 * 1024;

// Shape definitions: vertices and indices
const SHAPES = {
  cube: {
    vertices: [
      -1,-1,1, 1,-1,1, 1,1,1, -1,1,1,
      -1,-1,-1, -1,1,-1, 1,1,-1, 1,-1,-1,
      -1,1,-1, -1,1,1, 1,1,1, 1,1,-1,
      -1,-1,-1, 1,-1,-1, 1,-1,1, -1,-1,1,
      1,-1,-1, 1,1,-1, 1,1,1, 1,-1,1,
      -1,-1,-1, -1,-1,1, -1,1,1, -1,1,-1,
    ],
    indices: [
      0,1,2, 0,2,3, 4,5,6, 4,6,7,
      8,9,10, 8,10,11, 12,13,14, 12,14,15,
      16,17,18, 16,18,19, 20,21,22, 20,22,23,
    ],
  },
  pyramid: {
    vertices: [
      -1,-1,-1, 1,-1,-1, 1,-1,1, -1,-1,1,
      0,1,0,
    ],
    indices: [
      0,1,2, 0,2,3,
      0,1,4, 1,2,4, 2,3,4, 3,0,4,
    ],
  },
};

function generateSphere(radius = 1, segments = 12) {
  const vertices = [];
  const indices = [];
  const rings = segments;
  const sectors = segments;
  for (let r = 0; r <= rings; r++) {
    const phi = (Math.PI * r) / rings;
    for (let s = 0; s <= sectors; s++) {
      const theta = (2 * Math.PI * s) / sectors;
      vertices.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sectors; s++) {
      const first = r * (sectors + 1) + s;
      const second = first + sectors + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }
  return { vertices, indices };
}

function pickShape(prompt) {
  const p = String(prompt || '').toLowerCase();
  if (/sphere|ball|globe|planet|round|orb/.test(p)) return 'sphere';
  if (/pyramid|cone|triangle|tent|roof/.test(p)) return 'pyramid';
  return 'cube';
}

function buildGlb(vertices, indices) {
  const vertexCount = vertices.length / 3;
  const indexCount = indices.length;

  const positionBuffer = new Float32Array(vertices);
  const indexBuffer = new Uint16Array(indices);

  const posBytes = positionBuffer.byteLength;
  const idxBytes = indexBuffer.byteLength;
  const posPadded = Math.ceil(posBytes / 4) * 4;
  const idxPadded = Math.ceil(idxBytes / 4) * 4;

  const gltf = {
    asset: { version: '2.0', generator: 'VUX AI Terra' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }],
    accessors: [
      { bufferView: 0, byteOffset: 0, componentType: 5126, count: vertexCount, type: 'VEC3', min: [-1, -1, -1], max: [1, 1, 1] },
      { bufferView: 1, byteOffset: 0, componentType: 5123, count: indexCount, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: posPadded, byteLength: idxBytes, target: 34963 },
    ],
    buffers: [{ byteLength: posPadded + idxPadded }],
  };

  const jsonStr = JSON.stringify(gltf);
  const jsonBytes = Buffer.from(jsonStr, 'utf8');
  const jsonPadded = Math.ceil(jsonBytes.length / 4) * 4;
  const jsonPadding = jsonPadded - jsonBytes.length;

  const binBuffer = Buffer.alloc(posPadded + idxPadded);
  Buffer.from(positionBuffer.buffer).copy(binBuffer, 0);
  Buffer.from(indexBuffer.buffer).copy(binBuffer, posPadded);

  const totalLength = 12 + 8 + jsonPadded + 8 + (posPadded + idxPadded);
  const glb = Buffer.alloc(totalLength);

  glb.writeUInt32LE(0x46546C67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(totalLength, 8);

  let offset = 12;
  glb.writeUInt32LE(jsonPadded, offset);
  glb.writeUInt32LE(0x4E4F534A, offset + 4);
  jsonBytes.copy(glb, offset + 8);
  for (let i = 0; i < jsonPadding; i++) {
    glb.writeUInt8(0x20, offset + 8 + jsonBytes.length + i);
  }
  offset += 8 + jsonPadded;

  glb.writeUInt32LE(posPadded + idxPadded, offset);
  glb.writeUInt32LE(0x004E4942, offset + 4);
  binBuffer.copy(glb, offset + 8);

  return glb;
}

export function generateSimple3DModel(prompt) {
  const shape = pickShape(prompt);
  let vertices, indices;

  if (shape === 'sphere') {
    const sphere = generateSphere(1, 12);
    vertices = sphere.vertices;
    indices = sphere.indices;
  } else {
    const s = SHAPES[shape];
    vertices = s.vertices;
    indices = s.indices;
  }

  const glb = buildGlb(vertices, indices);
  if (glb.length > MAX_GLB_BYTES) throw new Error('Generated model exceeds the 100 MB limit.');
  return glb;
}

export function pickShapeFromPrompt(prompt) {
  return pickShape(prompt);
}
