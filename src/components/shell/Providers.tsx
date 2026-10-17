"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Toaster } from "sonner";

// Tour state lives in sessionStorage, so the overlay is client-only (no SSR, no hydration mismatch).
const TourOverlay = dynamic(() => import("@/features/tour/TourOverlay").then((m) => m.TourOverlay), { ssr: false });

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {/* "user" = honor prefers-reduced-motion for every Motion animation. */}
      <MotionConfig reducedMotion="user">
        {children}
        <Suspense>
          <TourOverlay />
        </Suspense>
      </MotionConfig>
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast: "!bg-surface-2 !text-ink !border-line-strong !rounded-2xl !font-sans",
            description: "!text-ink-2",
          },
        }}
      />
    </ThemeProvider>
  );
}
