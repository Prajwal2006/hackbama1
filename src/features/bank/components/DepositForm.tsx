"use client";

import { ImagePlus, PackagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, MoneyInput, Select } from "@/components/ui/field";
import { BANK_CATEGORIES, BANK_CATEGORY_LABEL, type BankCategory } from "@/data/bank-types";
import { resizeImage } from "@/features/listings/image-resize";
import { parseDollarsToCents } from "@/lib/money";
import { depositAction } from "../actions";

/** Typical sizes so students don't have to measure everything. */
const PRESET: Record<BankCategory, [number, number, number]> = {
  desk: [100, 50, 75], chair: [55, 55, 90], lamp: [30, 30, 150], fridge: [48, 45, 85], rug: [150, 210, 2],
  shelf: [80, 30, 180], bed: [99, 203, 8], sofa: [180, 85, 80], microwave: [45, 35, 26],
};

export function DepositForm({ campus }: { campus: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const [f, setF] = useState({ title: "", category: "desk" as BankCategory, condition: "good", w: "100", d: "50", h: "75", price: "" });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  return (
    <form
      className="grid gap-3 rounded-[1.5rem] border border-line bg-surface p-5 sm:grid-cols-2"
      data-tour="bank-deposit"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await depositAction(campus, {
            title: f.title,
            category: f.category,
            condition: f.condition as "like_new" | "good" | "fair",
            widthCm: Number(f.w),
            depthCm: Number(f.d),
            heightCm: Number(f.h),
            priceCents: parseDollarsToCents(f.price) ?? 0,
            imageUrl: img,
          });
          if (!r.ok) return setError(r.message);
          toast.success(`Deposited as ${r.data.code}`, { description: `${r.data.location} (simulated). You own it until someone reserves it.` });
          setF((s) => ({ ...s, title: "", price: "" }));
          setImg(null);
          router.refresh();
        });
      }}
    >
      <div className="sm:col-span-2">
        <Label htmlFor="d-title">What are you depositing?</Label>
        <Input id="d-title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="IKEA desk, white" required />
      </div>
      <div>
        <Label htmlFor="d-cat">Type</Label>
        <Select
          id="d-cat"
          value={f.category}
          onChange={(e) => {
            const c = e.target.value as BankCategory;
            const [w, d, h] = PRESET[c];
            setF((s) => ({ ...s, category: c, w: String(w), d: String(d), h: String(h) }));
          }}
        >
          {BANK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {BANK_CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="d-cond">Condition</Label>
        <Select id="d-cond" value={f.condition} onChange={(e) => set("condition", e.target.value)}>
          <option value="like_new">Like new</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>Size (cm) — W × D × H</Label>
        <div className="flex items-center gap-2">
          <Input aria-label="Width cm" inputMode="numeric" value={f.w} onChange={(e) => set("w", e.target.value)} className="font-mono" />
          ×
          <Input aria-label="Depth cm" inputMode="numeric" value={f.d} onChange={(e) => set("d", e.target.value)} className="font-mono" />
          ×
          <Input aria-label="Height cm" inputMode="numeric" value={f.h} onChange={(e) => set("h", e.target.value)} className="font-mono" />
        </div>
      </div>
      <div>
        <Label htmlFor="d-price">Asking price</Label>
        <MoneyInput id="d-price" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="40" />
      </div>
      <div>
        <Label>Photo</Label>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line-strong px-3 text-sm text-ink-2 hover:border-accent">
          <ImagePlus className="size-4" /> {img ? "Photo added ✓" : "Add a photo"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setImg(await resizeImage(file));
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
        </label>
      </div>
      <div className="sm:col-span-2">
        <FieldError>{error}</FieldError>
        <Button type="submit" className="w-full" disabled={pending} data-testid="deposit">
          <PackagePlus /> {pending ? "Checking in…" : "Deposit into the bank"}
        </Button>
        <p className="mt-2 text-xs text-ink-3">
          Consignment: you keep ownership until a student reserves it; then you&apos;re paid outside Dibs. Pickup, inspection and storage are simulated in this prototype.
        </p>
      </div>
    </form>
  );
}
