/**
 * Turns an AR spec (list of primitive parts, cm) into a GLB, scaled to real-world dimensions.
 * Isomorphic: runs on the server (the public model route) and in the browser (live preview while selling).
 */
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MAX_PARTS, type ArDims, type ArPart, type ArSpec } from "./spec";

// GLTFExporter expects a browser FileReader; Node doesn't have one.
if (typeof globalThis.FileReader === "undefined") {
  (globalThis as unknown as { FileReader: unknown }).FileReader = class {
    result: ArrayBuffer | string | null = null;
    onloadend: (() => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then((b) => {
        this.result = b;
        this.onloadend?.();
      });
    }
    readAsDataURL(blob: Blob) {
      void blob.arrayBuffer().then((b) => {
        this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(b).toString("base64")}`;
        this.onloadend?.();
      });
    }
  };
}

const GROUND_SNAP_CM = 3; // parts starting this close to the floor are put on it
const STACK_SNAP_CM = 2; // parts hovering this close above a part below are lowered onto it

const MATERIAL_LOOK = {
  wood: { roughness: 0.65, metalness: 0 },
  fabric: { roughness: 0.95, metalness: 0 },
  plastic: { roughness: 0.4, metalness: 0 },
  ceramic: { roughness: 0.25, metalness: 0 },
  metal: { roughness: 0.3, metalness: 0.9 },
  glass: { roughness: 0.08, metalness: 0.75 }, // mirror-like but not black
} as const;

const num = (v: unknown, fallback = 0) =>
  v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : fallback;
const size = (v: unknown) => Math.max(0.2, Math.min(500, num(v, 1)));
const angle = (v: unknown) => Math.max(-180, Math.min(180, num(v)));

/** Accepts "#668cb8", "668cb8" and "#6bc"; anything else becomes gray. */
export function cleanColor(c: unknown): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c ?? "").trim());
  if (!m) return "#999999";
  const hex = m[1].length === 3 ? [...m[1]].map((ch) => ch + ch).join("") : m[1];
  return `#${hex.toLowerCase()}`;
}

type Loose = Partial<Record<keyof ArPart, unknown>>;

/** Clamps and fills one part. Accepts loose (AI-produced) input. */
export function cleanPart(p: Loose): ArPart {
  const shape = p.shape === "cylinder" || p.shape === "sphere" ? p.shape : "box";
  const rMax = Math.max(num(p.radiusTop), num(p.radiusBottom), num(p.w) / 2, num(p.d) / 2) || 1;
  const rTop = size(num(p.radiusTop) || num(p.radiusBottom) || rMax);
  const rBot = size(num(p.radiusBottom) || num(p.radiusTop) || rMax);
  const round = shape === "cylinder" ? Math.max(rTop, rBot) * 2 : 1;
  const material =
    typeof p.material === "string" && p.material in MATERIAL_LOOK ? (p.material as ArPart["material"]) : "plastic";
  const mirror = p.mirror === "x" || p.mirror === "z" || p.mirror === "xz" ? p.mirror : "none";
  return {
    shape,
    w: size(num(p.w) || round),
    d: size(num(p.d) || round),
    h: size(p.h),
    radiusTop: rTop,
    radiusBottom: rBot,
    x: num(p.x),
    y: num(p.y),
    z: num(p.z),
    rotationX: angle(p.rotationX),
    rotationY: angle(p.rotationY),
    rotationZ: angle(p.rotationZ),
    bevelCm: Math.max(0, Math.min(5, num(p.bevelCm, 0.5))),
    material,
    color: cleanColor(p.color),
    glow: Boolean(p.glow),
    mirror,
  };
}

/** Duplicates a part across the x and/or z axis, flipping its tilt so the copy is a true mirror image. */
function expandMirror(p: ArPart): ArPart[] {
  const out = [p];
  const flipX = (q: ArPart): ArPart => ({ ...q, x: -q.x, rotationY: -q.rotationY, rotationZ: -q.rotationZ });
  const flipZ = (q: ArPart): ArPart => ({ ...q, z: -q.z, rotationY: -q.rotationY, rotationX: -q.rotationX });
  const offX = Math.abs(p.x) > 0.5;
  const offZ = Math.abs(p.z) > 0.5;
  if (p.mirror.includes("x") && offX) out.push(flipX(p));
  if (p.mirror.includes("z") && offZ) out.push(flipZ(p));
  if (p.mirror === "xz" && offX && offZ) out.push(flipZ(flipX(p)));
  return out.map((q) => ({ ...q, mirror: "none" as const }));
}

const tilted = (p: ArPart) => p.rotationX !== 0 || p.rotationY % 90 !== 0 || p.rotationZ !== 0;
const footprint = (p: ArPart): [number, number] =>
  p.shape === "cylinder"
    ? [Math.max(p.radiusTop, p.radiusBottom), Math.max(p.radiusTop, p.radiusBottom)]
    : [p.w / 2, p.d / 2];

/** Fixes small AI mistakes: parts under or hovering just above the floor, or hovering just above a part below. */
function snapParts(parts: ArPart[]): ArPart[] {
  for (const p of parts) {
    if (!tilted(p) && p.y <= GROUND_SNAP_CM) {
      p.h = Math.max(0.2, p.h + p.y); // keep the top where it was
      p.y = 0;
    } else if (p.y < 0) {
      p.y = 0;
    }
  }
  const byHeight = [...parts].sort((a, b) => a.y - b.y);
  for (const p of byHeight) {
    if (p.y <= 0 || tilted(p)) continue;
    const [px, pz] = footprint(p);
    let best: { top: number; gap: number } | null = null;
    for (const q of byHeight) {
      if (q === p || tilted(q)) continue;
      const [qx, qz] = footprint(q);
      const overlaps = Math.abs(p.x - q.x) < px + qx && Math.abs(p.z - q.z) < pz + qz;
      const gap = p.y - (q.y + q.h);
      if (overlaps && gap > 0 && gap <= STACK_SNAP_CM && (!best || gap < best.gap)) best = { top: q.y + q.h, gap };
    }
    if (best) p.y = best.top;
  }
  return parts;
}

/** Normalizes a loose spec into the canonical stored form (mirrors expanded, parts snapped). Throws if empty. */
export function normalizeSpec(spec: { parts?: unknown }): ArSpec {
  const raw = (Array.isArray(spec?.parts) ? (spec.parts as Loose[]) : []).slice(0, MAX_PARTS).map(cleanPart);
  const parts = raw.flatMap(expandMirror).slice(0, MAX_PARTS);
  if (!parts.length) throw new Error("The model has no usable parts");
  return { parts: snapParts(parts) };
}

const materials = new Map<string, THREE.MeshStandardMaterial>();
function materialFor(p: ArPart) {
  const key = `${p.material}|${p.color}|${p.glow}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: p.color,
      ...MATERIAL_LOOK[p.material],
      ...(p.glow ? { emissive: new THREE.Color(p.color), emissiveIntensity: 0.8 } : {}),
    });
    materials.set(key, m);
  }
  return m;
}

function geometryFor(p: ArPart): THREE.BufferGeometry {
  if (p.shape === "cylinder") return new THREE.CylinderGeometry(p.radiusTop / 100, p.radiusBottom / 100, p.h / 100, 32);
  if (p.shape === "sphere") {
    const g = new THREE.SphereGeometry(0.5, 32, 20);
    g.scale(p.w / 100, p.h / 100, p.d / 100);
    return g;
  }
  const radius = Math.min(p.bevelCm, Math.min(p.w, p.h, p.d) / 2 - 0.05) / 100;
  return radius > 0.0005
    ? new RoundedBoxGeometry(p.w / 100, p.h / 100, p.d / 100, 1, radius)
    : new THREE.BoxGeometry(p.w / 100, p.h / 100, p.d / 100);
}

function buildGroup(parts: ArPart[]) {
  const g = new THREE.Group();
  for (const p of parts) {
    const mesh = new THREE.Mesh(geometryFor(p), materialFor(p));
    mesh.position.set(p.x / 100, p.y / 100 + p.h / 200, p.z / 100);
    mesh.rotation.set(
      THREE.MathUtils.degToRad(p.rotationX),
      THREE.MathUtils.degToRad(p.rotationY),
      THREE.MathUtils.degToRad(p.rotationZ),
      "YXZ",
    );
    g.add(mesh);
  }
  return g;
}

/** Builds the GLB, centered on the floor and scaled so the model is exactly `dims` centimeters. */
export async function specToGlb(spec: ArSpec, dims: ArDims, name = "item"): Promise<ArrayBuffer> {
  const raw = buildGroup(normalizeSpec(spec).parts);
  const bb = new THREE.Box3().setFromObject(raw);
  const s = bb.getSize(new THREE.Vector3());
  if (!(s.x > 0 && s.y > 0 && s.z > 0)) throw new Error("The model has zero size");
  raw.position.set(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);

  const root = new THREE.Group();
  root.name = name;
  root.scale.set(dims.w / 100 / s.x, dims.h / 100 / s.y, dims.d / 100 / s.z);
  root.add(raw);

  const out = await new Promise<ArrayBuffer | object>((resolve, reject) =>
    new GLTFExporter().parse(root, resolve, reject, { binary: true }),
  );
  if (!(out instanceof ArrayBuffer)) throw new Error("GLB export failed");
  return out;
}
