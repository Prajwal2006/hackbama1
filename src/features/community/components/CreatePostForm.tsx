"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, MoneyInput, Select, Textarea } from "@/components/ui/field";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { parseDollarsToCents } from "@/lib/money";
import { createPostAction } from "../actions";

const LABEL = { sub: "Post a split", ride: "Offer a ride or trip", meal: "Share a batch" } as const;

function local(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function CreatePostForm({ campus, kind, spots }: { campus: string; kind: "sub" | "ride" | "meal"; spots: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Record<string, string | boolean>>(() => ({
    title: "",
    body: "",
    capacity: kind === "sub" ? "3" : kind === "ride" ? "3" : "6",
    price: "",
    when: local(new Date(Date.now() + 24 * 3_600_000)),
    service: "",
    cycle: "monthly",
    total: "",
    from: spots[0] ?? "",
    to: "",
    trip: false,
    luggage: "",
    dish: "",
    dietary: "",
    pickupSpot: spots[0] ?? "",
    trade: "",
  }));
  const set = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  const capacity = Number(f.capacity) || 0;
  const totalCents = parseDollarsToCents(String(f.total)) ?? 0;
  const perSeat = kind === "sub" && capacity > 0 ? Math.ceil(totalCents / (capacity + 1)) : null;

  const submit = () => {
    setError(null);
    const unit = kind === "sub" ? (perSeat ?? 0) : (parseDollarsToCents(String(f.price)) ?? 0);
    const data =
      kind === "sub"
        ? { service: f.service, cycle: f.cycle, totalCents }
        : kind === "ride"
          ? { from: f.from, to: f.to, trip: !!f.trip, returnAt: null, luggage: String(f.luggage).trim() || null }
          : {
              dish: f.dish || f.title,
              dietary: String(f.dietary).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
              pickupSpot: f.pickupSpot,
              trade: String(f.trade).trim() || null,
            };
    start(async () => {
      const r = await createPostAction(campus, {
        kind,
        title: f.title,
        body: f.body,
        capacity,
        unitPriceCents: unit,
        startsAt: kind === "sub" ? new Date().toISOString() : new Date(String(f.when)).toISOString(),
        data,
      });
      if (!r.ok) return setError(r.message);
      toast.success("Posted!");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button data-testid={`new-${kind}`}>
          <Plus /> {LABEL[kind]}
        </Button>
      </SheetTrigger>
      <SheetContent title={LABEL[kind]} description="Payments happen outside Dibs — people confirm when they've paid and been paid.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <Label htmlFor="p-title">Title</Label>
            <Input id="p-title" required value={String(f.title)} onChange={(e) => set("title", e.target.value)}
              placeholder={kind === "sub" ? "Spotify Family — 2 spots" : kind === "ride" ? "Tuscaloosa → Atlanta airport" : "Butter chicken, 8 portions"} />
          </div>
          {kind === "sub" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="p-service">Service</Label>
                <Input id="p-service" required value={String(f.service)} onChange={(e) => set("service", e.target.value)} placeholder="Spotify Premium Family" />
              </div>
              <div>
                <Label htmlFor="p-total">Plan price</Label>
                <MoneyInput id="p-total" value={String(f.total)} onChange={(e) => set("total", e.target.value)} placeholder="19.99" />
              </div>
              <div>
                <Label htmlFor="p-cycle">Billed</Label>
                <Select id="p-cycle" value={String(f.cycle)} onChange={(e) => set("cycle", e.target.value)}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
            </div>
          ) : null}
          {kind === "ride" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-from">From</Label>
                <Input id="p-from" list="spots" value={String(f.from)} onChange={(e) => set("from", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="p-to">To</Label>
                <Input id="p-to" required value={String(f.to)} onChange={(e) => set("to", e.target.value)} placeholder="ATL airport" />
              </div>
              <label className="col-span-2 flex min-h-11 items-center gap-3 rounded-xl border border-line-strong px-3 text-sm">
                <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={!!f.trip} onChange={(e) => set("trip", e.target.checked)} />
                It&apos;s a trip (split lodging + gas), not just a ride
              </label>
              <div className="col-span-2">
                <Label htmlFor="p-lug">Luggage room</Label>
                <Input id="p-lug" value={String(f.luggage)} onChange={(e) => set("luggage", e.target.value)} placeholder="2 big suitcases" />
              </div>
            </div>
          ) : null}
          {kind === "meal" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="p-dish">Dish</Label>
                <Input id="p-dish" value={String(f.dish)} onChange={(e) => set("dish", e.target.value)} placeholder="Butter chicken + rice" />
              </div>
              <div>
                <Label htmlFor="p-spot">Pickup spot</Label>
                <Input id="p-spot" list="spots" value={String(f.pickupSpot)} onChange={(e) => set("pickupSpot", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="p-diet">Dietary tags</Label>
                <Input id="p-diet" value={String(f.dietary)} onChange={(e) => set("dietary", e.target.value)} placeholder="halal, vegetarian" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="p-trade">Or trade for… <span className="font-normal text-ink-3">(optional)</span></Label>
                <Input id="p-trade" value={String(f.trade)} onChange={(e) => set("trade", e.target.value)} placeholder="A dessert, a ride to Publix…" />
              </div>
            </div>
          ) : null}
          <datalist id="spots">
            {spots.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-cap">{kind === "sub" ? "Open seats (not counting you)" : kind === "ride" ? "Seats" : "Portions"}</Label>
              <Input id="p-cap" type="number" min={1} max={50} value={String(f.capacity)} onChange={(e) => set("capacity", e.target.value)} />
            </div>
            {kind === "sub" ? (
              <div>
                <Label>Each person pays</Label>
                <p className="flex h-11 items-center font-mono text-lg font-bold">{perSeat ? `$${(perSeat / 100).toFixed(2)}` : "—"}</p>
              </div>
            ) : (
              <div>
                <Label htmlFor="p-price">{kind === "ride" ? "Per seat" : "Per portion"} <span className="font-normal text-ink-3">(0 = free)</span></Label>
                <MoneyInput id="p-price" value={String(f.price)} onChange={(e) => set("price", e.target.value)} placeholder="0" />
              </div>
            )}
          </div>
          {kind !== "sub" ? (
            <div>
              <Label htmlFor="p-when">{kind === "ride" ? "Leaving" : "Ready for pickup"}</Label>
              <Input id="p-when" type="datetime-local" value={String(f.when)} onChange={(e) => set("when", e.target.value)} />
            </div>
          ) : null}
          <div>
            <Label htmlFor="p-body">Details</Label>
            <Textarea id="p-body" className="min-h-20" value={String(f.body)} onChange={(e) => set("body", e.target.value)} />
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Posting…" : "Post it"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
