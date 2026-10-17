// Turns a part-list spec (from Gemini) into a GLB buffer sized to real-world dimensions.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

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

export const MAX_PARTS = 40;
const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const size = (v) => Math.max(0.2, Math.min(500, num(v, 1)));

export function sanitizeSpec(spec) {
  const parts = (Array.isArray(spec?.parts) ? spec.parts : []).slice(0, MAX_PARTS).map((p) => ({
    shape: p.shape === 'cylinder' ? 'cylinder' : 'box',
    w: size(p.w), d: size(p.d), h: size(p.h),
    radiusTop: size(p.radiusTop ?? p.radiusBottom ?? 1), radiusBottom: size(p.radiusBottom ?? p.radiusTop ?? 1),
    x: num(p.x), y: num(p.y), z: num(p.z), rotationY: num(p.rotationY),
    color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#999999',
    glow: Boolean(p.glow), metallic: Boolean(p.metallic),
  }));
  if (!parts.length) throw new Error('Spec has no usable parts');
  return parts;
}

function buildGroup(parts) {
  const g = new THREE.Group();
  for (const p of parts) {
    const material = new THREE.MeshStandardMaterial({
      color: p.color, roughness: p.metallic ? 0.25 : 0.7, metalness: p.metallic ? 0.9 : 0,
      ...(p.glow ? { emissive: p.color, emissiveIntensity: 0.8 } : {}),
    });
    const geo = p.shape === 'cylinder'
      ? new THREE.CylinderGeometry(p.radiusTop / 100, p.radiusBottom / 100, p.h / 100, 32)
      : new THREE.BoxGeometry(p.w / 100, p.h / 100, p.d / 100);
    const mesh = new THREE.Mesh(geo, material);
    // (x, y, z) is the bottom-center of the part, in cm.
    mesh.position.set(p.x / 100, p.y / 100 + p.h / 200, p.z / 100);
    mesh.rotation.y = THREE.MathUtils.degToRad(p.rotationY);
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
