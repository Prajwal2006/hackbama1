"use client";

import { Menu } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SideNav } from "./Nav";

/** Phones don't have the sidebar: this sheet shows every registry feature (Furniture Bank, Handoffs, Labs…). */
export function MobileMenu({ campus, unread }: { campus: string; unread: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // Close after navigating (state adjusted during render, not in an effect).
  const [lastLoc, setLastLoc] = useState(pathname + search);
  if (lastLoc !== pathname + search) {
    setLastLoc(pathname + search);
    if (open) setOpen(false);
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" aria-label="All features" data-testid="mobile-menu" className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-surface-2 md:hidden">
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent title="Everything on Dibs" description="Marketplace, Furniture Bank, handoffs and Labs.">
        <SideNav campus={campus} unread={unread} />
      </SheetContent>
    </Sheet>
  );
}
