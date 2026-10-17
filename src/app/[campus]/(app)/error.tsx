"use client";

import { Button } from "@/components/ui/button";

export default function CampusError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grain mx-auto mt-10 max-w-lg rounded-[1.75rem] border border-line bg-surface p-8 text-center">
      <span className="stamp text-3xl">oops</span>
      <h1 className="mt-6 font-display text-2xl font-extrabold">Something dropped.</h1>
      <p className="mt-2 text-ink-2">{error.message || "We couldn't load this page."}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
