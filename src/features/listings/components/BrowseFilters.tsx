"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, MoneyInput, Select } from "@/components/ui/field";
import { Chip } from "@/components/ui/misc";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { PickupSpot } from "@/config/campuses";
import { CATEGORIES, CATEGORY_LABEL, PICKUP_LABEL, PICKUP_MODES, type ListingSort } from "@/data/types";
import { cn } from "@/lib/utils";
import { SORT_LABEL } from "../filters";

const MODES = [
  { v: "", label: "All" },
  { v: "fixed", label: "Buy now" },
  { v: "auction", label: "Auctions" },
  { v: "free", label: "Free" },
] as const;

/** URL-backed filters. Every change is a navigation, so results are shareable and back-button friendly. */
export function BrowseFilters({
  spots,
  partnerNames,
  canNearby,
}: {
  spots: PickupSpot[];
  partnerNames: string[];
  canNearby: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [open, setOpen] = useState(false);

  // Keep the box in sync when the URL changes elsewhere (back button, "clear").
  const urlQ = sp.get("q") ?? "";
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setQ(urlQ);
  }

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Debounced search-as-you-type.
  useEffect(() => {
    if ((sp.get("q") ?? "") === q) return;
    const t = setTimeout(() => update({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const mode = sp.get("mode") ?? "";
  const active = ["category", "pickup", "spot", "min", "max", "nearby"].filter((k) => sp.get(k)).length;

  const advanced = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="f-category">Category</Label>
        <Select id="f-category" value={sp.get("category") ?? ""} onChange={(e) => update({ category: e.target.value })}>
          <option value="">Any category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="f-spot">Hall / pickup spot</Label>
        <Select id="f-spot" value={sp.get("spot") ?? ""} onChange={(e) => update({ spot: e.target.value })}>
          <option value="">Anywhere on campus</option>
          {spots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="f-pickup">Pickup</Label>
        <Select id="f-pickup" value={sp.get("pickup") ?? ""} onChange={(e) => update({ pickup: e.target.value })}>
          <option value="">Any pickup</option>
          {PICKUP_MODES.map((p) => (
            <option key={p} value={p}>
              {PICKUP_LABEL[p]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Price</Label>
        <div className="flex items-center gap-2">
          <MoneyInput
            aria-label="Minimum price"
            placeholder="Min"
            defaultValue={sp.get("min") ?? ""}
            onBlur={(e) => update({ min: e.target.value })}
          />
          <span className="text-ink-3">–</span>
          <MoneyInput
            aria-label="Maximum price"
            placeholder="Max"
            defaultValue={sp.get("max") ?? ""}
            onBlur={(e) => update({ max: e.target.value })}
          />
        </div>
      </div>
      {canNearby && partnerNames.length ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line-strong px-3.5 sm:col-span-2">
          <input
            type="checkbox"
            className="size-5 accent-[var(--accent)]"
            checked={sp.get("nearby") === "1"}
            onChange={(e) => update({ nearby: e.target.checked ? "1" : null })}
          />
          <span className="text-sm">
            <strong>Include partner campuses</strong>
            <span className="block text-ink-3">{partnerNames.join(", ")} share listings with you (view only).</span>
          </span>
        </label>
      ) : null}
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-3 transition-opacity", pending && "opacity-70")} aria-busy={pending}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search mini-fridges, lamps, textbooks…"
            className="h-12 rounded-full pl-10"
            aria-label="Search listings"
          />
        </div>
        <Select
          aria-label="Sort"
          value={sp.get("sort") ?? "newest"}
          onChange={(e) => update({ sort: e.target.value === "newest" ? null : e.target.value })}
          className="hidden h-12 w-48 rounded-full md:block"
        >
          {(Object.keys(SORT_LABEL) as ListingSort[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABEL[s]}
            </option>
          ))}
        </Select>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-12 shrink-0 px-4" aria-label="Filters">
              <SlidersHorizontal />
              <span className="hidden sm:inline">Filters</span>
              {active ? <span className="grid size-5 place-items-center rounded-full bg-accent text-[0.7rem] text-accent-ink">{active}</span> : null}
            </Button>
          </SheetTrigger>
          <SheetContent title="Filters" description="Results update as you change them.">
            {advanced}
            <div className="mt-5 md:hidden">
              <Label htmlFor="f-sort">Sort</Label>
              <Select id="f-sort" value={sp.get("sort") ?? "newest"} onChange={(e) => update({ sort: e.target.value === "newest" ? null : e.target.value })}>
                {(Object.keys(SORT_LABEL) as ListingSort[]).map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-6 flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setQ("");
                  start(() => router.replace(pathname, { scroll: false }));
                }}
              >
                Clear all
              </Button>
              <Button className="flex-1" onClick={() => setOpen(false)}>
                Show results
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:px-0" role="group" aria-label="Sale mode">
        {MODES.map((m) => (
          <Chip key={m.v} active={mode === m.v} onClick={() => update({ mode: m.v || null })}>
            {m.label}
          </Chip>
        ))}
        {sp.size > 0 ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              start(() => router.replace(pathname, { scroll: false }));
            }}
            className="ml-1 inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ink-3 hover:text-ink"
          >
            <X className="size-4" /> Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
