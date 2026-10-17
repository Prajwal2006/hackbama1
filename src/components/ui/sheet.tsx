"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Dialog that becomes a bottom sheet on phones and a centered panel on larger screens. */
export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetClose = D.Close;

export function SheetContent({
  className,
  children,
  title,
  description,
  side = "auto",
  ...props
}: React.ComponentProps<typeof D.Content> & { title: string; description?: string; side?: "auto" | "right" }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
      <D.Content
        className={cn(
          "fixed z-50 flex max-h-[92dvh] flex-col overflow-hidden border border-line-strong bg-surface text-ink shadow-2xl outline-none",
          side === "auto"
            ? "inset-x-0 bottom-0 rounded-t-[1.75rem] pb-safe sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(92vw,30rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:pb-0"
            : "inset-y-0 right-0 w-[min(92vw,24rem)] rounded-l-[1.75rem]",
          className,
        )}
        {...props}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-2">
          <div>
            <D.Title className="font-display text-xl font-bold">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-ink-2">{description}</D.Description> : null}
          </div>
          <D.Close className="grid size-11 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2" aria-label="Close">
            <X className="size-5" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
