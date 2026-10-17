import "server-only";
import { env } from "@/lib/env";
import { normalizeSpec } from "./build";
import { AR_EXAMPLES } from "./examples";
import { MATERIALS, SHAPES, type ArDims, type ArSpec } from "./spec";

/**
 * Photos -> part list. Gemini can't output a mesh, so it describes the item as simple parts
 * (boxes, cylinders, spheres) and `build.ts` turns that into a real-size GLB.
 */
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
${Object.values(AR_EXAMPLES).map((e) => JSON.stringify(e)).join("\n")}`;

const PART_SCHEMA = {
  type: "OBJECT",
  properties: {
    shape: { type: "STRING", enum: [...SHAPES] },
    x: { type: "NUMBER" }, y: { type: "NUMBER" }, z: { type: "NUMBER" },
    w: { type: "NUMBER" }, d: { type: "NUMBER" }, h: { type: "NUMBER" },
    radiusTop: { type: "NUMBER" }, radiusBottom: { type: "NUMBER" },
    rotationX: { type: "NUMBER" }, rotationY: { type: "NUMBER" }, rotationZ: { type: "NUMBER" },
    bevelCm: { type: "NUMBER" },
    material: { type: "STRING", enum: [...MATERIALS] },
    color: { type: "STRING" },
    glow: { type: "BOOLEAN" },
    mirror: { type: "STRING", enum: ["none", "x", "z", "xz"] },
  },
  required: ["shape", "x", "y", "z", "w", "d", "h", "radiusTop", "radiusBottom", "rotationX", "rotationY", "rotationZ", "bevelCm", "material", "color", "glow", "mirror"],
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reasoning: { type: "STRING" },
    name: { type: "STRING" },
    description: { type: "STRING" },
    dimensionsCm: {
      type: "OBJECT",
      properties: { w: { type: "NUMBER" }, d: { type: "NUMBER" }, h: { type: "NUMBER" } },
      required: ["w", "d", "h"],
    },
    parts: { type: "ARRAY", items: PART_SCHEMA },
  },
  propertyOrdering: ["reasoning", "name", "description", "dimensionsCm", "parts"],
  required: ["reasoning", "name", "description", "dimensionsCm", "parts"],
};

export type ArAnalysis = { name: string; description: string; dimensionsCm: ArDims; spec: ArSpec };

export class GeminiError extends Error {
  constructor(
    message: string,
    public code: "not_configured" | "rate_limited" | "failed",
  ) {
    super(message);
  }
}

const DEFAULT_MODELS = "gemini-3.5-flash,gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-3.1-flash-lite";
// A model that returned 429 (quota) is skipped for a minute instead of being retried.
const cooldown = new Map<string, number>();
// Vercel kills the function at 60 s (maxDuration on the sell page), so every call must finish well before that.
const CALL_TIMEOUT_MS = 30_000;
const TOTAL_BUDGET_MS = 48_000;

const clampDim = (v: unknown) => Math.max(5, Math.min(400, Number(v) || 50));

/** `images` are data URLs (jpeg/png/webp). */
export async function analyzePhotos(images: string[]): Promise<ArAnalysis> {
  if (!env.geminiKey) throw new GeminiError("3D scanning isn't set up on this server (no GEMINI_API_KEY).", "not_configured");
  const parts = [
    { text: PROMPT },
    ...images.slice(0, 4).map((u) => {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(u);
      if (!m) throw new GeminiError("Unsupported photo format.", "failed");
      return { inline_data: { mime_type: m[1], data: m[2] } };
    }),
  ];

  const models = env.geminiModels.length ? env.geminiModels : DEFAULT_MODELS.split(",");
  const started = Date.now();
  let res: Response | null = null;
  let lastStatus = 0;

  for (const [i, model] of models.entries()) {
    const last = i === models.length - 1;
    if (!last && (cooldown.get(model) ?? 0) > Date.now()) continue;
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
    if (remaining < 5_000) break;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiKey },
          signal: AbortSignal.timeout(Math.min(CALL_TIMEOUT_MS, TOTAL_BUDGET_MS - (Date.now() - started))),
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
              temperature: 0.4,
              // Only the first (newest) model takes a thinking level.
              ...(i === 0 ? { thinkingConfig: { thinkingLevel: env.geminiThinking } } : {}),
            },
          }),
        });
      } catch {
        res = null; // timed out or network error: move on to the next model
        break;
      }
      if (res.status !== 503 || TOTAL_BUDGET_MS - (Date.now() - started) < 8_000) break; // 503 = temporary demand, retry once if time allows
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (res?.ok) break;
    lastStatus = res?.status ?? 0;
    if (res?.status === 429) cooldown.set(model, Date.now() + 60_000);
  }

  if (!res?.ok) {
    if (lastStatus === 429) throw new GeminiError("Too many scans right now. Wait a minute and try again.", "rate_limited");
    throw new GeminiError("The 3D scan took too long. Please try again.", "failed");
  }

  let body: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  try {
    body = await res.json();
  } catch {
    throw new GeminiError("The scan result was garbled. Please try again.", "failed");
  }
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new GeminiError("Gemini couldn't read those photos. Try clearer ones.", "failed");

  let raw: { name?: string; description?: string; dimensionsCm?: Partial<ArDims>; parts?: unknown };
  try {
    raw = JSON.parse(text);
  } catch {
    throw new GeminiError("The scan result was garbled. Please try again.", "failed");
  }
  let spec: ArSpec;
  try {
    spec = normalizeSpec(raw);
  } catch {
    throw new GeminiError("Couldn't find the item in those photos. Try again from another angle.", "failed");
  }
  return {
    name: String(raw.name ?? "Scanned item").slice(0, 80),
    description: String(raw.description ?? "").slice(0, 300),
    dimensionsCm: { w: clampDim(raw.dimensionsCm?.w), d: clampDim(raw.dimensionsCm?.d), h: clampDim(raw.dimensionsCm?.h) },
    spec,
  };
}
