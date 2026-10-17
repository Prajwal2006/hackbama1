"use client";

import { Box, Camera } from "lucide-react";
import { useEffect, useRef, useState, type ElementType } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Placement = "floor" | "wall";

// <model-viewer> is a web component registered at runtime; this avoids declaring global JSX typings.
const ModelViewer = "model-viewer" as unknown as ElementType;

/**
 * 3D viewer + "place it in your room" AR, using Google's <model-viewer>.
 * - Android: WebXR / Scene Viewer (real surface tracking). iPhone: AR Quick Look (full-screen handoff).
 * - `ar-scale="fixed"` keeps the real-world size. Buyers can place on the floor or on a wall.
 * - Camera and AR need HTTPS (Vercel provides it).
 */
export function ArViewer({
  src,
  name,
  dimensionsLabel,
  allowAr = true,
  className,
}: {
  src: string;
  name: string;
  dimensionsLabel?: string;
  /** false = plain 3D preview (used while selling, where the model isn't hosted yet). */
  allowAr?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [avail, setAvail] = useState<{ canAr: boolean; inApp: boolean } | null>(null);
  const [placement, setPlacement] = useState<Placement>("floor");

  useEffect(() => {
    let alive = true;
    void import("@google/model-viewer").then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current as (HTMLElement & { canActivateAR?: boolean }) | null;
    if (!ready || !el || !allowAr) return;
    let t: ReturnType<typeof setTimeout>;
    const onLoad = () => {
      // canActivateAR resolves asynchronously after the model loads.
      t = setTimeout(
        () =>
          setAvail({
            canAr: Boolean(el.canActivateAR),
            inApp: /FBAN|FBAV|Instagram|Snapchat|MicroMessenger|TikTok/i.test(navigator.userAgent),
          }),
        1200,
      );
    };
    el.addEventListener("load", onLoad);
    return () => {
      el.removeEventListener("load", onLoad);
      clearTimeout(t);
    };
  }, [ready, allowAr, src]);

  const mv = ready ? (
    <ModelViewer
      ref={ref}
      src={src}
      alt={`3D model of ${name}`}
      camera-controls
      touch-action="pan-y"
      shadow-intensity="1"
      environment-image="neutral"
      exposure="1"
      {...(allowAr ? { ar: true, "ar-modes": "webxr scene-viewer quick-look", "ar-scale": "fixed", "ar-placement": placement } : {})}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      {allowAr ? (
        <button
          slot="ar-button"
          type="button"
          className={cn(buttonVariants({ size: "lg" }), "absolute bottom-4 left-1/2 -translate-x-1/2")}
          data-testid="ar-button"
        >
          View in your room
        </button>
      ) : null}
    </ModelViewer>
  ) : null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-line bg-surface-2 shadow-card">
        {mv ?? (
          <div className="grid h-full place-items-center text-ink-3">
            <Box className="size-8 animate-pulse" aria-label="Loading 3D model" />
          </div>
        )}
      </div>

      {allowAr ? (
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Where to place it">
            {(["floor", "wall"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={placement === p}
                onClick={() => setPlacement(p)}
                className={cn(
                  "h-9 rounded-full border px-4 font-semibold",
                  placement === p ? "border-accent bg-accent/10 text-ink" : "border-line-strong text-ink-2 hover:bg-surface-2",
                )}
              >
                {p === "floor" ? "Place on floor" : "Hang on wall"}
              </button>
            ))}
          </div>
          <p className="flex items-start gap-2">
            <Camera className="mt-0.5 size-4 shrink-0" />
            <span>
              {dimensionsLabel ? <strong className="text-ink">Shown at real size ({dimensionsLabel}). </strong> : null}
              Tap <em>View in your room</em>, allow the camera, point at the {placement} and move your phone slowly.
            </span>
          </p>
          {avail && !avail.canAr ? (
            <p className="rounded-xl bg-warn/12 px-3 py-2 text-ink-2" data-testid="ar-unavailable">
              {avail.inApp
                ? "This in-app browser can't open AR. Open this page in Safari (iPhone) or Chrome (Android)."
                : "AR needs a phone with AR support (iPhone, or Android with Google Play Services for AR). You can still rotate the 3D model here."}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
