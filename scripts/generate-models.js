// Builds simple furniture models in real-world meters and exports them as GLB.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync } from 'node:fs';

// GLTFExporter expects a browser FileReader; provide a minimal Node version.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(b).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...opts });

// Box with its base at (x, y, z) in meters; y is the bottom edge.
function box(w, h, d, x, y, z, material, name) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.name = name;
  return m;
}
function cyl(rTop, rBot, h, x, y, z, material, name, seg = 32) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
  m.position.set(x, y + h / 2, z);
  m.name = name;
  return m;
}

const builders = {
  // 1.2 x 0.6 x 0.75 m
  desk() {
    const g = new THREE.Group();
    const wood = mat(0xb5834f), dark = mat(0x3b3b3f);
    const top = 0.04, legH = 0.75 - top, leg = 0.05;
    g.add(box(1.2, top, 0.6, 0, legH, 0, wood, 'top'));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(box(leg, legH, leg, sx * (0.6 - 0.05), 0, sz * (0.3 - 0.05), dark, 'leg'));
    }
    g.add(box(0.4, 0.15, 0.5, 0.35, legH - 0.15, 0, wood, 'drawer'));
    return g;
  },

  // 0.5 x 0.05 x 1.5 m standing mirror (slightly angled prop is not baked in; stands upright on feet)
  mirror() {
    const g = new THREE.Group();
    const frame = mat(0x2d2a26), glass = mat(0xcfe3ea, { roughness: 0.05, metalness: 1 });
    const W = 0.5, H = 1.5, D = 0.05, f = 0.04;
    g.add(box(W, f, D, 0, 0, 0, frame, 'frame-bottom'));
    g.add(box(W, f, D, 0, H - f, 0, frame, 'frame-top'));
    g.add(box(f, H - 2 * f, D, -(W - f) / 2, f, 0, frame, 'frame-left'));
    g.add(box(f, H - 2 * f, D, (W - f) / 2, f, 0, frame, 'frame-right'));
    g.add(box(W - 2 * f, H - 2 * f, 0.01, 0, f, D / 2 - 0.01, glass, 'glass'));
    return g;
  },
  // 0.25 x 0.25 x 0.45 m
  lamp() {
    const g = new THREE.Group();
    const base = mat(0x5a4636), shade = mat(0xfff1c9, { emissive: 0xffd27a, emissiveIntensity: 0.8 });
    g.add(cyl(0.09, 0.11, 0.03, 0, 0, 0, base, 'base'));
    g.add(cyl(0.012, 0.012, 0.25, 0, 0.03, 0, base, 'stem'));
    g.add(cyl(0.08, 0.125, 0.17, 0, 0.28, 0, shade, 'shade'));
    return g;
  },
  // 0.45 x 0.45 x 0.9 m chair
  chair() {
    const g = new THREE.Group();
    const wood = mat(0x8a5a33), seat = mat(0x4a6fa5);
    const S = 0.45, legH = 0.45, leg = 0.04;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const h = sz < 0 ? 0.9 : legH; // rear legs run up into the backrest
      g.add(box(leg, h, leg, sx * (S / 2 - leg / 2), 0, sz * (S / 2 - leg / 2), wood, 'leg'));
    }
    g.add(box(S, 0.05, S, 0, legH, 0, seat, 'seat'));
    g.add(box(S - 2 * leg, 0.2, 0.03, 0, 0.65, -(S / 2 - 0.02), seat, 'back'));
    return g;
  },
};

function exportGlb(object) {
  return new Promise((resolve, reject) =>
    new GLTFExporter().parse(object, resolve, reject, { binary: true }));
}

mkdirSync('public/models', { recursive: true });
for (const [name, build] of Object.entries(builders)) {
  const obj = build();
  obj.name = name;
  const buf = Buffer.from(await exportGlb(obj));
  writeFileSync(`public/models/${name}.glb`, buf);
  const bb = new THREE.Box3().setFromObject(obj);
  const s = bb.getSize(new THREE.Vector3());
  console.log(`${name}.glb  ${buf.length} bytes  size ${s.x.toFixed(2)} x ${s.z.toFixed(2)} x ${s.y.toFixed(2)} m  minY=${bb.min.y.toFixed(3)}`);
}
