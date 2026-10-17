// Vite dev-server middleware: /api/analyze (photos -> Gemini -> spec) and /api/build (spec -> GLB + catalog entry).
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { specToGlb } from './spec-to-glb.js';
import { EXAMPLES } from './examples.js';

const PROMPT = `You are a 3D furniture modeler. The attached photo(s) show ONE piece of furniture or home item from different angles.
Describe it as a simple 3D model made of primitive parts so it can be built in code.

Coordinate system (centimeters): origin is the center of the item's footprint on the floor.
x = left/right, y = up (floor is y=0), z = front/back. Each part's (x, y, z) is the CENTER OF ITS BOTTOM FACE.
Shapes:
- "box": uses w (x-size), d (z-size), h (y-size) and bevelCm (edge rounding, 0.3-2 for furniture; 0 for sharp edges).
- "cylinder": uses radiusTop, radiusBottom (different values make a cone/tapered shape) and h; set w and d to 2x the larger radius.
- "sphere": an ellipsoid of size w, d, h.
rotationX/Y/Z (degrees) tilt a part around its own center, e.g. a leaning mirror or an angled backrest. Use 0 when upright.
material: wood, fabric, plastic, ceramic, metal or glass (glass = mirrors/reflective panels). color: hex sampled from the photo. glow=true for lit parts (lamp shades, screens).
mirror: "x", "z" or "xz" duplicates the part across the item's center plane(s). Use it for symmetric pairs/quads (legs, armrests, drawer handles): describe ONE part at its real position and set mirror, instead of listing each copy. Use "none" when the part is not repeated.

Rules:
- Model EVERY visible component with 6-30 parts, e.g. a desk = top + drawers/shelves + legs; a sofa = base + seat cushions + back + armrests + feet.
- Fill in EVERY field of every part. Never leave a size at 0 or null (for a box set radiusTop and radiusBottom to 0).
- Parts that rest on the floor must start at y=0. Stacked parts must touch (the bottom of the upper part equals the top of the lower part), neither floating nor deeply overlapping.
- Get proportions right: measure each part relative to the whole item.
- In "reasoning", write 2-4 sentences first: list the components, their rough proportions and which ones repeat symmetrically.
- Give a short friendly name, a one-sentence description, and the realistic real-world overall size in cm (w=width, d=depth, h=height) for this kind of item.

Here are three correct examples of the exact JSON format, for different items (do not copy them, model what is in the photos):
${EXAMPLES.map((e) => JSON.stringify(e)).join('\n')}`;

const PART = {
  type: 'OBJECT',
  properties: {
    shape: { type: 'STRING', enum: ['box', 'cylinder', 'sphere'] },
    x: { type: 'NUMBER' }, y: { type: 'NUMBER' }, z: { type: 'NUMBER' },
    w: { type: 'NUMBER' }, d: { type: 'NUMBER' }, h: { type: 'NUMBER' },
    radiusTop: { type: 'NUMBER' }, radiusBottom: { type: 'NUMBER' },
    rotationX: { type: 'NUMBER' }, rotationY: { type: 'NUMBER' }, rotationZ: { type: 'NUMBER' },
    bevelCm: { type: 'NUMBER' },
    material: { type: 'STRING', enum: ['wood', 'fabric', 'plastic', 'ceramic', 'metal', 'glass'] },
    color: { type: 'STRING' }, glow: { type: 'BOOLEAN' },
    mirror: { type: 'STRING', enum: ['none', 'x', 'z', 'xz'] },
  },
  required: ['shape', 'x', 'y', 'z', 'w', 'd', 'h', 'radiusTop', 'radiusBottom', 'rotationX', 'rotationY', 'rotationZ', 'bevelCm', 'material', 'color', 'glow', 'mirror'],
};
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    reasoning: { type: 'STRING' },
    name: { type: 'STRING' }, description: { type: 'STRING' },
    dimensionsCm: { type: 'OBJECT', properties: { w: { type: 'NUMBER' }, d: { type: 'NUMBER' }, h: { type: 'NUMBER' } }, required: ['w', 'd', 'h'] },
    parts: { type: 'ARRAY', items: PART },
  },
  propertyOrdering: ['reasoning', 'name', 'description', 'dimensionsCm', 'parts'],
  required: ['reasoning', 'name', 'description', 'dimensionsCm', 'parts'],
};

function readJson(req, limit = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('Request too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

const clampDim = (v) => Math.max(5, Math.min(400, Number(v) || 50));

export default function scanPlugin(env) {
  const hits = new Map(); // ip -> timestamps, tiny rate limit
  const limited = (ip) => {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
    recent.push(now); hits.set(ip, recent);
    return recent.length > 12;
  };

  async function analyze(body) {
    const key = env.GEMINI_API_KEY;
    if (!key) throw Object.assign(new Error('GEMINI_API_KEY is not set in .env'), { status: 500 });
    const images = (body.images || []).slice(0, 4);
    if (!images.length) throw Object.assign(new Error('Send at least one photo'), { status: 400 });
    const parts = [{ text: PROMPT }, ...images.map((b64) => ({ inline_data: { mime_type: 'image/jpeg', data: String(b64).replace(/^data:image\/\w+;base64,/, '') } }))];
    const call = (model, thinking) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.4, ...(thinking ? { thinkingConfig: { thinkingLevel: env.GEMINI_THINKING || 'low' } } : {}) },
      }),
    });
    // Gemini sometimes reports temporary high demand (503/429): retry, then fall back to a second model.
    const models = [env.GEMINI_MODEL || 'gemini-3.5-flash', env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite'];
    let res;
    for (const [mi, model] of models.entries()) {
      for (let attempt = 0; attempt < 3; attempt++) {
        res = await call(model, mi === 0);
        if (res.status !== 503 && res.status !== 429) break;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
      if (res.ok) break;
      console.warn(`[scan] ${model} failed with ${res.status}${mi === 0 ? ', trying fallback model' : ''}`);
    }
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(`Gemini error: ${data?.error?.message || res.status}`), { status: 502 });
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    if (!text) throw Object.assign(new Error('Gemini returned no content (the photo may have been blocked)'), { status: 502 });
    return JSON.parse(text);
  }

  async function build(body) {
    const dims = { w: clampDim(body.dimensionsCm?.w), d: clampDim(body.dimensionsCm?.d), h: clampDim(body.dimensionsCm?.h) };
    const name = String(body.name || 'Scanned item').slice(0, 60);
    const id = 'scan-' + (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'item') + '-' + randomBytes(2).toString('hex');
    const { glb, sizeM } = await specToGlb(body.spec, dims, id);
    writeFileSync(`public/models/${id}.glb`, glb);
    const catalog = JSON.parse(readFileSync('public/catalog.json', 'utf8'));
    const item = { id, name, model: `/models/${id}.glb`, dimensionsCm: dims, placement: 'floor', description: String(body.description || '').slice(0, 200), scanned: true };
    catalog.push(item);
    writeFileSync('public/catalog.json', JSON.stringify(catalog, null, 2));
    console.log(`[scan] built ${id}.glb ${glb.length} bytes, ${(sizeM.x * 100).toFixed(0)}x${(sizeM.z * 100).toFixed(0)}x${(sizeM.y * 100).toFixed(0)} cm`);
    return item;
  }

  const handler = async (req, res) => {
        const send = (status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
        try {
          if (req.method !== 'POST') return send(405, { error: 'POST only' });
          if (env.SCAN_PASSCODE && req.headers['x-passcode'] !== env.SCAN_PASSCODE) return send(401, { error: 'Wrong or missing passcode' });
          if (limited(req.socket.remoteAddress)) return send(429, { error: 'Too many requests, wait a minute' });
          const body = await readJson(req);
          if (req.url === '/analyze') return send(200, await analyze(body));
          if (req.url === '/build') return send(200, await build(body));
          return send(404, { error: 'Not found' });
        } catch (e) {
          console.error('[scan]', e.message);
          send(e.status || 500, { error: e.message });
        }
  };

  // In preview mode the app is served from dist/, so new scans (written to public/) are served from there.
  const livePublic = (req, res, next) => {
    const url = req.url.split('?')[0];
    if (url !== '/catalog.json' && !/^\/models\/[\w.-]+\.glb$/.test(url)) return next();
    try {
      const buf = readFileSync('public' + url);
      res.setHeader('Content-Type', url.endsWith('.json') ? 'application/json' : 'model/gltf-binary');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(buf);
    } catch { next(); }
  };

  return {
    name: 'scan-api',
    configureServer(server) { server.middlewares.use('/api', handler); },
    configurePreviewServer(server) { server.middlewares.use(livePublic); server.middlewares.use('/api', handler); },
  };
}
