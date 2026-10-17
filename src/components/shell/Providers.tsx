"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {/* "user" = honor prefers-reduced-motion for every Motion animation. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
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
