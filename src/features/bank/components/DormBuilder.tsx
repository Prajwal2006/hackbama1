"use client";

import { Check, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Chip } from "@/components/ui/misc";
import { BANK_CATEGORIES, BANK_CATEGORY_LABEL, type BankCategory, type BankItem } from "@/data/bank-types";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { reserveBundleAction } from "../actions";
import { buildBundle } from "../domain";

export function DormBuilder({
  campus,
  inventory,
  meId,
  moveInDate,
  signedIn,
}: {
  campus: string;
  inventory: BankItem[];
  meId: string | null;
  moveInDate: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [budget, setBudget] = useState(200);
  const [cats, setCats] = useState<BankCategory[]>(["desk", "chair", "lamp", "fridge", "rug"]);
  const [picked, setPicked] = useState<string[]>([]);
  const [date, setDate] = useState(moveInDate);

  const byId = useMemo(() => new Map(inventory.map((i) => [i.id, i])), [inventory]);
  const items = picked.map((i) => byId.get(i)).filter((x): x is BankItem => !!x);
  const total = items.reduce((s, i) => s + i.priceCents, 0);
  const retail = items.reduce((s, i) => s + (i.retailCents ?? i.priceCents), 0);
  const available = inventory.filter((i) => i.status === "available" && i.consignorId !== meId);

  const setBundle = (ids: string[]) => setPicked(ids);

  const build = () => {
    const b = buildBundle(inventory, cats, budget * 100, meId ?? undefined);
    setBundle(b.items.map((i) => i.id));
    const missing = b.skipped.map((s) => BANK_CATEGORY_LABEL[s.category]);
    toast.success(`Bundle: ${formatCents(b.totalCents)} of $${budget}`, {
      description: missing.length ? `Couldn't fit: ${missing.join(", ")}` : "Every category covered. Review it, then reserve for move-in.",
    });
  };

  const toggle = (id: string) => (picked.includes(id) ? setBundle(picked.filter((x) => x !== id)) : setBundle([...picked, id]));

  return (
    <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0" data-tour="bank-builder">
      <div className="flex flex-col gap-4">
        <div className="rounded-[1.5rem] border border-line bg-surface p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-48 flex-1">
              <Label htmlFor="budget">
                Budget <span className="font-mono text-ink">${budget}</span>
              </Label>
              <input id="budget" type="range" min={50} max={400} step={10} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
            </div>
            <Button onClick={build} data-testid="build-bundle">
              <Wand2 /> Build my ${budget} dorm
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {BANK_CATEGORIES.map((c) => (
              <Chip key={c} active={cats.includes(c)} onClick={() => setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))} className="h-9 px-3 text-xs">
                {BANK_CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>
        </div>

      </div>

      <aside className="flex flex-col gap-3">
        <div className="rounded-[1.5rem] border border-line-strong bg-surface p-4">
          <p className="font-mono text-xs tracking-[0.15em] text-ink-3 uppercase">Your bundle</p>
          {items.length ? (
            <ul className="mt-2 flex flex-col gap-2">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 rounded-xl p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.imageUrl ? <img src={i.imageUrl} alt="" className="size-11 rounded-lg object-cover" /> : <span className="size-11 rounded-lg bg-surface-2" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{i.title}</span>
                    <span className="block font-mono text-[0.68rem] text-ink-3">
                      {i.inventoryCode} · {i.widthCm}×{i.depthCm} cm
                    </span>
                  </span>
                  <span className="font-mono text-sm font-bold">{formatCents(i.priceCents, { compact: true })}</span>
                  <button type="button" aria-label={`Remove ${i.title}`} onClick={() => toggle(i.id)} className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-3">Nothing yet.</p>
          )}
          <div className="mt-3 border-t border-line pt-3">
            <p className="flex justify-between text-sm">
              <span>Total</span>
              <span className={cn("font-mono font-bold", total > budget * 100 && "text-danger")}>
                {formatCents(total)} / ${budget}
              </span>
            </p>
            {retail > total ? <p className="flex justify-between text-xs text-ink-3"><span>vs. buying new (est.)</span><span className="font-mono">{formatCents(retail)}</span></p> : null}
          </div>
          {/* overflow-hidden: mobile Chrome draws native date inputs taller than their box. */}
          <div className="mt-3 overflow-hidden">
            <Label htmlFor="movein">Deliver for move-in on</Label>
            <Input id="movein" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block min-w-0 appearance-none" />
          </div>
          <Button
            className="relative z-10 mt-4 w-full"
            size="lg"
            disabled={pending || !items.length || !signedIn}
            data-testid="reserve-bundle"
            onClick={() =>
              start(async () => {
                const r = await reserveBundleAction(campus, picked, date);
                if (!r.ok) {
                  toast.error("Couldn't reserve", { description: r.message });
                  router.refresh();
                  return;
                }
                toast.success("Reserved from the future 🛋️", { description: `${items.length} real items held in storage for ${date}.` });
                setBundle([]);
                router.refresh();
              })
            }
          >
            <Check /> {signedIn ? `Reserve for move-in · ${formatCents(total)}` : "Sign in to reserve"}
          </Button>
          <p className="mt-2 text-center text-xs text-ink-3">Pay the consignors outside Dibs. Storage &amp; delivery are simulated in this prototype.</p>
        </div>

        <div className="rounded-[1.5rem] border border-line p-3">
          <p className="mb-2 flex items-center gap-1.5 px-1 font-mono text-xs tracking-[0.15em] text-ink-3 uppercase">
            <Sparkles className="size-3.5" /> In storage now · {available.length}
          </p>
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {available.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => toggle(i.id)} className={cn("flex w-full items-center gap-2 rounded-xl p-1.5 text-left hover:bg-surface-2", picked.includes(i.id) && "bg-accent/10")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.imageUrl ? <img src={i.imageUrl} alt="" className="size-9 rounded-lg object-cover" /> : <span className="size-9 rounded-lg bg-surface-2" />}
                  <span className="min-w-0 flex-1 truncate text-sm">{i.title}</span>
                  <span className="font-mono text-xs font-bold">{formatCents(i.priceCents, { compact: true })}</span>
                  {picked.includes(i.id) ? <Check className="size-4 text-accent" /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
