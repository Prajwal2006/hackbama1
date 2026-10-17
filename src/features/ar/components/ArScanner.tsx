"use client";

import { Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { analyzeArPhotosAction } from "../actions";
import type { ArDims, ArModelInput, ArSpec } from "../spec";
import { ArViewer } from "./ArViewer";

type Suggest = { name: string; description: string };

/** Live preview of an unsaved model: the GLB is built in the browser, no upload needed. */
function useGlbPreview(spec: ArSpec | null, dims: ArDims | null) {
  const [url, setUrl] = useState<string | null>(null);
  const key = spec && dims ? JSON.stringify([spec, dims]) : null;
  useEffect(() => {
    if (!spec || !dims) return;
    let alive = true;
    let blobUrl: string | null = null;
    void import("../build").then(async ({ specToGlb }) => {
      try {
        const glb = await specToGlb(spec, dims, "preview");
        if (!alive) return;
        blobUrl = URL.createObjectURL(new Blob([glb], { type: "model/gltf-binary" }));
        setUrl(blobUrl);
      } catch {
        if (alive) setUrl(null);
      }
    });
    return () => {
      alive = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures spec + dims by value
  }, [key]);
  return key ? url : null;
}

/**
 * Seller step on the sell form: turn the listing photos into a real-size 3D model buyers can place in their room.
 * `value` is what gets saved with the listing; the form owns it.
 */
export function ArScanner({
  campus,
  images,
  enabled,
  value,
  onChange,
  onSuggest,
}: {
  campus: string;
  images: string[];
  enabled: boolean;
  value: ArModelInput | null;
  onChange: (v: ArModelInput | null) => void;
  onSuggest?: (s: Suggest) => void;
}) {
  const [pending, start] = useTransition();
  const preview = useGlbPreview(value?.spec ?? null, value?.dimensionsCm ?? null);

  const generate = () =>
    start(async () => {
      const r = await analyzeArPhotosAction(campus, images);
      if (!r.ok) {
        toast.error("Couldn't make the 3D model", { description: r.message });
        return;
      }
      onChange({ spec: r.data.spec, dimensionsCm: r.data.dimensionsCm });
      onSuggest?.({ name: r.data.name, description: r.data.description });
      toast.success("3D model ready", { description: "Check the size below, then keep going." });
    });

  const setDim = (k: keyof ArDims, raw: string) => {
    if (!value) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    onChange({ ...value, dimensionsCm: { ...value.dimensionsCm, [k]: Math.max(5, Math.min(400, n)) } });
  };

  return (
    <section className="rounded-2xl border border-line p-5" aria-label="3D and AR model" data-testid="ar-scanner">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold">
        <Sparkles className="size-5 text-accent" /> Let buyers try it in their room{" "}
        <span className="text-sm font-normal text-ink-3">(optional)</span>
      </h3>
      <p className="mt-1 text-sm text-ink-2">
        We turn your photos into a 3D model at the item&apos;s real size. Buyers can place it anywhere in their space with their phone camera.
      </p>

      {!enabled ? (
        <p className="mt-3 text-sm text-ink-3">3D models aren&apos;t enabled on this deployment yet.</p>
      ) : !value ? (
        <div className="mt-4">
          <Button type="button" variant="outline" disabled={pending || images.length === 0} onClick={generate} data-testid="ar-generate">
            {pending ? "Building your 3D model…" : "Make a 3D model from my photos"}
          </Button>
          <p className="mt-2 text-xs text-ink-3">
            {images.length === 0
              ? "Add 1–4 photos above first. Photos from different angles work best."
              : pending
                ? "This takes about 10 seconds."
                : `Uses your ${images.length} photo${images.length > 1 ? "s" : ""}.`}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {preview ? <ArViewer src={preview} name="your item" allowAr={false} /> : null}
          <div>
            <Label>Real size in centimeters — buyers see it at exactly this size</Label>
            <div className="grid grid-cols-3 gap-3">
              {(["w", "d", "h"] as const).map((k) => (
                <label key={k} className="text-sm text-ink-2">
                  {{ w: "Width", d: "Depth", h: "Height" }[k]}
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={5}
                    max={400}
                    value={Math.round(value.dimensionsCm[k])}
                    onChange={(e) => setDim(k, e.target.value)}
                    aria-label={`${k} in cm`}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-3">Measure with a tape measure for the best result. The first guess is based on similar items.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="soft" size="sm" disabled={pending} onClick={generate}>
              {pending ? "Rebuilding…" : "Try again"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <Trash2 /> Remove 3D model
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
