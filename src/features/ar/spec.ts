import { z } from "zod";

/** A 3D item described as a list of primitive parts. Lengths are centimeters; (x, y, z) is the bottom-center of a part. */
export const MATERIALS = ["wood", "fabric", "plastic", "ceramic", "metal", "glass"] as const;
export const SHAPES = ["box", "cylinder", "sphere"] as const;
export const MIRRORS = ["none", "x", "z", "xz"] as const;

export const MAX_PARTS = 60;

const len = z.number().finite().min(0).max(500);
const pos = z.number().finite().min(-500).max(500);
const deg = z.number().finite().min(-180).max(180);

export const arPartSchema = z.object({
  shape: z.enum(SHAPES),
  x: pos,
  y: pos,
  z: pos,
  w: len,
  d: len,
  h: len,
  radiusTop: len,
  radiusBottom: len,
  rotationX: deg,
  rotationY: deg,
  rotationZ: deg,
  bevelCm: z.number().finite().min(0).max(5),
  material: z.enum(MATERIALS),
  color: z.string().max(9),
  glow: z.boolean(),
  mirror: z.enum(MIRRORS),
});

export const arSpecSchema = z.object({ parts: z.array(arPartSchema).min(1).max(MAX_PARTS) });

export const arDimsSchema = z.object({
  w: z.number().finite().min(5).max(400),
  d: z.number().finite().min(5).max(400),
  h: z.number().finite().min(5).max(400),
});

export const arModelInputSchema = z.object({ spec: arSpecSchema, dimensionsCm: arDimsSchema });

export type ArPart = z.infer<typeof arPartSchema>;
export type ArSpec = z.infer<typeof arSpecSchema>;
export type ArDims = z.infer<typeof arDimsSchema>;
export type ArModelInput = z.infer<typeof arModelInputSchema>;
