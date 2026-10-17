import type { ArPart } from "./spec";

/**
 * Worked examples. They are shown to Gemini so it knows the target level of detail,
 * and they also back the AR models of a few seeded demo listings.
 */
const part = (o: Partial<ArPart>): ArPart => ({
  shape: "box", x: 0, y: 0, z: 0, w: 0, d: 0, h: 0, radiusTop: 0, radiusBottom: 0,
  rotationX: 0, rotationY: 0, rotationZ: 0, bevelCm: 0.5, material: "wood", color: "#999999", glow: false, mirror: "none",
  ...o,
});

export type ArExample = {
  reasoning: string;
  name: string;
  description: string;
  dimensionsCm: { w: number; d: number; h: number };
  parts: ArPart[];
};

export const AR_EXAMPLES: Record<"desk" | "chair" | "lamp", ArExample> = {
  desk: {
    reasoning:
      "A desk: one wide tabletop, a drawer unit hanging under its right side, and four identical thin legs at the corners (one leg described, mirrored across x and z).",
    name: "Study Desk",
    description: "Wooden desk with a side drawer and dark metal legs.",
    dimensionsCm: { w: 120, d: 60, h: 75 },
    parts: [
      part({ w: 120, d: 60, h: 4, y: 71, color: "#b5834f", bevelCm: 0.8 }),
      part({ w: 40, d: 50, h: 15, x: 35, y: 56, color: "#a07040" }),
      part({ w: 5, d: 5, h: 71, x: 55, z: 25, color: "#3b3b3f", material: "metal", bevelCm: 0.3, mirror: "xz" }),
    ],
  },
  chair: {
    reasoning:
      "A chair: a padded seat, a padded backrest, two short front legs and two tall rear legs that continue up behind the backrest (each pair described once and mirrored across x).",
    name: "Desk Chair",
    description: "Simple chair with a blue padded seat and back.",
    dimensionsCm: { w: 45, d: 45, h: 90 },
    parts: [
      part({ w: 45, d: 45, h: 5, y: 45, color: "#4a6fa5", material: "fabric", bevelCm: 1.5 }),
      part({ w: 41, d: 3, h: 22, y: 63, z: -20, color: "#4a6fa5", material: "fabric", bevelCm: 1 }),
      part({ w: 4, d: 4, h: 45, x: 20, z: 20, color: "#8a5a33", mirror: "x" }),
      part({ w: 4, d: 4, h: 90, x: 20, z: -20, color: "#8a5a33", mirror: "x" }),
    ],
  },
  lamp: {
    reasoning:
      "A table lamp: a round base, a thin stem, and a glowing conical shade that is wider at the bottom (cylinder with different top and bottom radii).",
    name: "Table Lamp",
    description: "Warm glowing lamp with a round wooden base.",
    dimensionsCm: { w: 25, d: 25, h: 45 },
    parts: [
      part({ shape: "cylinder", radiusTop: 9, radiusBottom: 11, w: 22, d: 22, h: 3, color: "#5a4636", bevelCm: 0 }),
      part({ shape: "cylinder", radiusTop: 1.2, radiusBottom: 1.2, w: 2.4, d: 2.4, h: 25, y: 3, color: "#5a4636", material: "metal", bevelCm: 0 }),
      part({ shape: "cylinder", radiusTop: 8, radiusBottom: 12.5, w: 25, d: 25, h: 17, y: 28, color: "#fff1c9", material: "fabric", glow: true, bevelCm: 0 }),
    ],
  },
};

/** Seeded demo listings that ship with a 3D model, so the buyer-side AR works straight away. */
export const AR_SEEDED_LISTINGS: Record<string, keyof typeof AR_EXAMPLES> = {
  lst_ua_desk: "desk",
  lst_ua_chair: "chair",
  lst_rb_chair: "chair",
  lst_ua_lamp: "lamp",
  lst_rb_lamp: "lamp",
};
