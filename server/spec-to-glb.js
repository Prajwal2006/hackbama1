// Turns a part-list spec (from Gemini) into a GLB buffer sized to real-world dimensions.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// GLTFExporter expects a browser FileReader; provide a minimal Node version.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); }); }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(b).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

export const MAX_PARTS = 60;
const GROUND_SNAP_CM = 3; // parts starting this close to the floor are put on it
const STACK_SNAP_CM = 2; // parts this close to the top of a part below them are put on it

// One lookup table for how each material looks.
const MATERIALS = {
  wood: { roughness: 0.65, metalness: 0 },
  fabric: { roughness: 0.95, metalness: 0 },
  plastic: { roughness: 0.4, metalness: 0 },
  ceramic: { roughness: 0.25, metalness: 0 },
  metal: { roughness: 0.3, metalness: 0.9 },
  glass: { roughness: 0.08, metalness: 0.75 }, // mirror-like but not black
};

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) && v !== null ? Number(v) : fallback);
const size = (v) => Math.max(0.2, Math.min(500, num(v, 1)));
const angle = (v) => Math.max(-180, Math.min(180, num(v)));

// Accepts "#668cb8", "668cb8" and "#6bc"; anything else becomes gray.
function cleanColor(c) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c ?? '').trim());
  if (!m) return '#999999';
  const hex = m[1].length === 3 ? [...m[1]].map((ch) => ch + ch).join('') : m[1];
  return '#' + hex.toLowerCase();
}

function cleanPart(p) {
  const shape = ['cylinder', 'sphere'].includes(p.shape) ? p.shape : 'box';
  const rTop = size(p.radiusTop || p.radiusBottom || Math.max(num(p.w), num(p.d)) / 2 || 1);
  const rBot = size(p.radiusBottom || p.radiusTop || Math.max(num(p.w), num(p.d)) / 2 || 1);
  return {
    shape,
    w: size(p.w || (shape === 'cylinder' ? Math.max(rTop, rBot) * 2 : 1)),
    d: size(p.d || (shape === 'cylinder' ? Math.max(rTop, rBot) * 2 : 1)),
    h: size(p.h),
    radiusTop: rTop, radiusBottom: rBot,
    x: num(p.x), y: num(p.y), z: num(p.z),
    rotationX: angle(p.rotationX), rotationY: angle(p.rotationY), rotationZ: angle(p.rotationZ),
    bevelCm: Math.max(0, Math.min(5, num(p.bevelCm, 0.5))),
    material: MATERIALS[p.material] ? p.material : 'plastic',
    color: cleanColor(p.color),
    glow: Boolean(p.glow),
    mirror: ['x', 'z', 'xz'].includes(p.mirror) ? p.mirror : '',
  };
}

// Duplicates a part across the x and/or z axis, flipping its tilt so the copy is a true mirror image.
function expandMirror(p) {
  const out = [p];
  const flipX = (q) => ({ ...q, x: -q.x, rotationY: -q.rotationY, rotationZ: -q.rotationZ });
  const flipZ = (q) => ({ ...q, z: -q.z, rotationY: -q.rotationY, rotationX: -q.rotationX });
  const offX = Math.abs(p.x) > 0.5, offZ = Math.abs(p.z) > 0.5;
  if (p.mirror.includes('x') && offX) out.push(flipX(p));
  if (p.mirror.includes('z') && offZ) out.push(flipZ(p));
  if (p.mirror === 'xz' && offX && offZ) out.push(flipZ(flipX(p)));
  return out.map((q) => ({ ...q, mirror: '' }));
}

const tilted = (p) => p.rotationX !== 0 || p.rotationY % 90 !== 0 || p.rotationZ !== 0;
// Half-extent of a part's footprint on the floor (x, z).
const footprint = (p) => (p.shape === 'cylinder'
  ? [Math.max(p.radiusTop, p.radiusBottom), Math.max(p.radiusTop, p.radiusBottom)]
  : [p.w / 2, p.d / 2]);

// Fixes the small errors Gemini makes: parts under the floor, hovering just above it, or hovering just above a part below.
function snapParts(parts) {
  for (const p of parts) {
    if (!tilted(p) && p.y <= GROUND_SNAP_CM) {
      p.h = Math.max(0.2, p.h + p.y); // keep the top where it was, extend/shorten the bottom
      p.y = 0;
    } else if (p.y < 0) {
      p.y = 0;
    }
  }
  const byHeight = [...parts].sort((a, b) => a.y - b.y);
  for (const p of byHeight) {
    if (p.y <= 0 || tilted(p)) continue;
    const [px, pz] = footprint(p);
    let best = null;
    for (const q of byHeight) {
      if (q === p || tilted(q)) continue;
      const [qx, qz] = footprint(q);
      const overlaps = Math.abs(p.x - q.x) < px + qx && Math.abs(p.z - q.z) < pz + qz;
      const gap = p.y - (q.y + q.h);
      if (overlaps && gap > 0 && gap <= STACK_SNAP_CM && (!best || gap < best.gap)) {
        best = { top: q.y + q.h, gap };
      }
    }
    if (best) p.y = best.top;
  }
  return parts;
}

export function sanitizeSpec(spec) {
  const raw = (Array.isArray(spec?.parts) ? spec.parts : []).slice(0, MAX_PARTS).map(cleanPart);
  const parts = raw.flatMap(expandMirror).slice(0, MAX_PARTS);
  if (!parts.length) throw new Error('Spec has no usable parts');
  return snapParts(parts);
}

const materialCache = new Map();
function materialFor(p) {
  const key = `${p.material}|${p.color}|${p.glow}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      color: p.color, ...MATERIALS[p.material],
      ...(p.glow ? { emissive: p.color, emissiveIntensity: 0.8 } : {}),
    }));
  }
  return materialCache.get(key);
}

function geometryFor(p) {
  if (p.shape === 'cylinder') return new THREE.CylinderGeometry(p.radiusTop / 100, p.radiusBottom / 100, p.h / 100, 32);
  if (p.shape === 'sphere') {
    const g = new THREE.SphereGeometry(0.5, 32, 20);
    g.scale(p.w / 100, p.h / 100, p.d / 100);
    return g;
  }
  const radius = Math.min(p.bevelCm, Math.min(p.w, p.h, p.d) / 2 - 0.05) / 100;
  return radius > 0.0005
    ? new RoundedBoxGeometry(p.w / 100, p.h / 100, p.d / 100, 1, radius)
    : new THREE.BoxGeometry(p.w / 100, p.h / 100, p.d / 100);
}

function buildGroup(parts) {
  const g = new THREE.Group();
  for (const p of parts) {
    const mesh = new THREE.Mesh(geometryFor(p), materialFor(p));
    // (x, y, z) is the bottom-center of the part, in cm; tilts turn the part around its own center.
    mesh.position.set(p.x / 100, p.y / 100 + p.h / 200, p.z / 100);
    mesh.rotation.set(
      THREE.MathUtils.degToRad(p.rotationX), THREE.MathUtils.degToRad(p.rotationY), THREE.MathUtils.degToRad(p.rotationZ), 'YXZ');
    g.add(mesh);
  }
  return g;
}

// Returns { glb: Buffer, sizeM: {x,y,z} }. Centers on the floor and scales to dimensionsCm.
export async function specToGlb(spec, dimensionsCm, name = 'item') {
  const raw = buildGroup(sanitizeSpec(spec));
  const bb = new THREE.Box3().setFromObject(raw);
  const s = bb.getSize(new THREE.Vector3());
  if (!(s.x > 0 && s.y > 0 && s.z > 0)) throw new Error('Model has zero size');
  raw.position.set(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);

  const root = new THREE.Group();
  root.name = name;
  root.scale.set(dimensionsCm.w / 100 / s.x, dimensionsCm.h / 100 / s.y, dimensionsCm.d / 100 / s.z);
  root.add(raw);

  const out = await new Promise((resolve, reject) =>
    new GLTFExporter().parse(root, resolve, reject, { binary: true }));
  const fin = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  return { glb: Buffer.from(out), sizeM: { x: fin.x, y: fin.y, z: fin.z } };
}
