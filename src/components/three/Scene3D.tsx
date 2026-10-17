"use client";

/**
 * Scene3D — reusable R3F canvas wrapper (landing hero today, Room Fit later).
 * Handles: WebGL detection + fallback, error boundary, DPR caps on mobile,
 * pausing when offscreen or the tab is hidden, and reduced motion.
 */
import { Canvas } from "@react-three/fiber";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";

export type SceneQuality = { dpr: [number, number]; mobile: boolean; reducedMotion: boolean };

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("[Scene3D] falling back:", e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Scene3D({
  children,
  fallback,
  className,
  camera = { position: [0, 0, 7], fov: 40 },
}: {
  children: (q: SceneQuality) => ReactNode;
  fallback: ReactNode;
  className?: string;
  camera?: { position: [number, number, number]; fov: number };
}) {
  const host = useRef<HTMLDivElement>(null);
  // Client-only component (loaded with ssr:false), so lazy initializers can read the browser.
  const [supported] = useState(hasWebGL);
  const [visible, setVisible] = useState(true);
  const [quality] = useState<SceneQuality>(() => {
    const mobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return { dpr: mobile ? [1, 1.25] : [1, 1.75], mobile, reducedMotion };
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    const onVis = () => setVisible(document.visibilityState === "visible" && el.getBoundingClientRect().bottom > 0);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div ref={host} className={className}>
      {supported === false ? (
        fallback
      ) : (
        <Boundary fallback={fallback}>
          <Canvas
            dpr={quality.dpr}
            camera={camera}
            gl={{ antialias: !quality.mobile, alpha: true, powerPreference: "low-power" }}
            // Offscreen → stop rendering. Reduced motion → render only on change.
            frameloop={!visible ? "never" : quality.reducedMotion ? "demand" : "always"}
            shadows={false}
            aria-hidden
          >
            {children(quality)}
          </Canvas>
        </Boundary>
      )}
    </div>
  );
}
