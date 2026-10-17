"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Gavel, Gift, ImagePlus, Tag, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ItemArt } from "@/components/art/ItemArt";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, MoneyInput, Select, Textarea } from "@/components/ui/field";
import type { PickupSpot } from "@/config/campuses";
import {
  CATEGORIES, CATEGORY_LABEL, CONDITIONS, CONDITION_LABEL, PICKUP_LABEL, PICKUP_MODES, type SaleMode,
} from "@/data/types";
import { formatCents, parseDollarsToCents } from "@/lib/money";
import { formatRemaining } from "@/lib/time";
import { cn } from "@/lib/utils";
import { createListingAction } from "../actions";
import { resizeImage } from "../image-resize";

const money = (label: string) =>
  z.string().trim().refine((v) => v === "" || parseDollarsToCents(v) !== null, `${label}: use a dollar amount like 25 or 12.50`);

const formSchema = z
  .object({
    title: z.string().trim().min(3, "Give it a title (3+ characters)").max(80),
    description: z.string().max(1200),
    category: z.enum(CATEGORIES),
    condition: z.enum(CONDITIONS),
    saleMode: z.enum(["fixed", "auction", "free"]),
    price: money("Price"),
    startingBid: money("Starting bid"),
    increment: money("Increment"),
    endsAt: z.string(),
    reserve: money("Reserve"),
    buyNow: money("Buy-now"),
    pickupMode: z.enum(PICKUP_MODES),
    pickupSpotId: z.string(),
    handoffStart: z.string(),
    handoffEnd: z.string(),
    locationHint: z.string().max(140),
  })
  .superRefine((v, ctx) => {
    const c = (s: string) => parseDollarsToCents(s);
    if (v.saleMode === "fixed" && !(c(v.price) ?? 0)) ctx.addIssue({ code: "custom", path: ["price"], message: "Set a price — or make it free" });
    if (v.saleMode === "auction") {
      const start = c(v.startingBid) ?? 0;
      if (start <= 0) ctx.addIssue({ code: "custom", path: ["startingBid"], message: "Starting bid must be above $0" });
      if (!(c(v.increment) ?? 0)) ctx.addIssue({ code: "custom", path: ["increment"], message: "Increment must be above $0" });
      const end = v.endsAt ? new Date(v.endsAt).getTime() : NaN;
      if (!Number.isFinite(end) || end < Date.now() + 15 * 60_000)
        ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End at least 15 minutes from now" });
      const reserve = c(v.reserve);
      if (reserve !== null && reserve < start) ctx.addIssue({ code: "custom", path: ["reserve"], message: "Reserve can't be below the starting bid" });
      const bn = c(v.buyNow);
      if (bn !== null && bn <= Math.max(start, reserve ?? 0))
        ctx.addIssue({ code: "custom", path: ["buyNow"], message: "Buy-now must beat the starting bid and reserve" });
    }
    if (v.pickupMode === "scheduled" && !v.handoffStart) ctx.addIssue({ code: "custom", path: ["handoffStart"], message: "Pick a handoff time" });
    if (v.handoffStart && v.handoffEnd && new Date(v.handoffEnd) <= new Date(v.handoffStart))
      ctx.addIssue({ code: "custom", path: ["handoffEnd"], message: "Window must end after it starts" });
  });

type FormValues = z.infer<typeof formSchema>;

const STEPS: { title: string; fields: FieldPath<FormValues>[] }[] = [
  { title: "What is it?", fields: ["title", "category", "condition", "description"] },
  { title: "How are you selling?", fields: ["saleMode", "price", "startingBid", "increment", "endsAt", "reserve", "buyNow"] },
  { title: "Handoff", fields: ["pickupMode", "pickupSpotId", "handoffStart", "handoffEnd", "locationHint"] },
  { title: "Look good?", fields: [] },
];

const MODES: { v: SaleMode; label: string; blurb: string; icon: typeof Tag }[] = [
  { v: "fixed", label: "Fixed price", blurb: "First to call dibs gets it.", icon: Tag },
  { v: "auction", label: "Auction", blurb: "Let students bid it up.", icon: Gavel },
  { v: "free", label: "Free", blurb: "Just get it out of your room.", icon: Gift },
];

function localInput(d: Date) {
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function CreateListingForm({ campus, spots, seed }: { campus: string; spots: PickupSpot[]; seed: number }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [openedAt] = useState(() => Date.now());

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: {
      title: "", description: "", category: "fridge", condition: "good", saleMode: "fixed",
      price: "", startingBid: "", increment: "5", endsAt: localInput(new Date(openedAt + 3 * 86_400_000)),
      reserve: "", buyNow: "", pickupMode: "flexible", pickupSpotId: spots[0]?.id ?? "",
      handoffStart: "", handoffEnd: "", locationHint: "",
    },
  });
  const { register, formState: { errors }, setValue, trigger, handleSubmit, control } = form;
  const v = useWatch({ control });
  const mode = (v.saleMode ?? "fixed") as SaleMode;

  const next = async () => {
    const ok = await trigger(STEPS[step].fields);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of [...files].slice(0, 4 - images.length)) {
      try {
        const url = await resizeImage(f);
        setImages((prev) => [...prev, url].slice(0, 4));
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
  };

  const onSubmit = handleSubmit((d) => {
    const cents = (s: string) => parseDollarsToCents(s);
    start(async () => {
      const r = await createListingAction(campus, {
        title: d.title,
        description: d.description,
        category: d.category,
        condition: d.condition,
        saleMode: d.saleMode,
        priceCents: d.saleMode === "fixed" ? (cents(d.price) ?? 0) : 0,
        auction:
          d.saleMode === "auction"
            ? {
                startingBidCents: cents(d.startingBid)!,
                minimumIncrementCents: cents(d.increment)!,
                auctionStartsAt: new Date().toISOString() as unknown as Date,
                auctionEndsAt: new Date(d.endsAt).toISOString() as unknown as Date,
                reservePriceCents: cents(d.reserve),
                buyNowPriceCents: cents(d.buyNow),
              }
            : null,
        imageUrls: images,
        pickupMode: d.pickupMode,
        handoffStart: d.handoffStart ? (new Date(d.handoffStart).toISOString() as unknown as Date) : null,
        handoffEnd: d.handoffEnd ? (new Date(d.handoffEnd).toISOString() as unknown as Date) : null,
        pickupSpotId: d.pickupSpotId || null,
        locationHint: d.locationHint.trim() || null,
        artSeed: seed,
      });
      if (!r.ok) {
        toast.error("Couldn't post that", { description: r.message });
        return;
      }
      toast.success("You're live!", { description: "Students can call dibs right now." });
      router.push(`/${campus}/listing/${r.data.id}`);
    });
  });

  const previewPrice =
    mode === "free" ? "FREE" : mode === "auction"
      ? formatCents(parseDollarsToCents(v.startingBid ?? "") ?? 0, { compact: true })
      : formatCents(parseDollarsToCents(v.price ?? "") ?? 0, { compact: true });
  const endsIn = v.endsAt ? new Date(v.endsAt).getTime() - openedAt : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <form
        noValidate
        className="min-w-0"
        // Enter only advances; posting needs an explicit tap on "Post it".
        onSubmit={(e) => {
          e.preventDefault();
          if (step < STEPS.length - 1) void next();
        }}
      >
        <ol className="mb-6 flex gap-2" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex-1">
              <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-accent" : "bg-surface-2")} />
              <p className={cn("mt-2 hidden text-xs font-semibold sm:block", i === step ? "text-ink" : "text-ink-3")}>
                {i + 1}. {s.title}
              </p>
            </li>
          ))}
        </ol>
        <h2 className="mb-5 font-display text-2xl font-extrabold">{STEPS[step].title}</h2>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
          >
            {step === 0 ? (
              <>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="e.g. Galanz retro mini-fridge, red" aria-invalid={!!errors.title} {...register("title")} />
                  <FieldError>{errors.title?.message}</FieldError>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select id="category" {...register("category")}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select id="condition" {...register("condition")}>
                      {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Photos <span className="font-normal text-ink-3">(optional, up to 4 — we&apos;ll draw one if you skip)</span></Label>
                  <div className="flex flex-wrap gap-3">
                    {images.map((src, i) => (
                      <div key={i} className="relative size-24 overflow-hidden rounded-2xl border border-line">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                        <button type="button" aria-label="Remove photo" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-bg/85">
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                    {images.length < 4 ? (
                      <label className="grid size-24 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-line-strong text-ink-3 hover:border-accent hover:text-accent">
                        <ImagePlus className="size-6" />
                        <span className="sr-only">Add photos</span>
                        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
                      </label>
                    ) : null}
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Size, quirks, what's included…" {...register("description")} />
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Sale mode">
                  {MODES.map((m) => (
                    <button
                      key={m.v}
                      type="button"
                      role="radio"
                      aria-checked={mode === m.v}
                      onClick={() => setValue("saleMode", m.v, { shouldValidate: false })}
                      className={cn(
                        "rounded-2xl border-2 p-4 text-left transition-colors",
                        mode === m.v ? "border-accent bg-accent/8" : "border-line-strong hover:border-ink-3",
                      )}
                    >
                      <m.icon className={cn("size-6", mode === m.v && "text-accent")} />
                      <p className="mt-3 font-display text-lg font-extrabold">{m.label}</p>
                      <p className="text-sm text-ink-2">{m.blurb}</p>
                    </button>
                  ))}
                </div>
                {mode === "fixed" ? (
                  <div className="max-w-xs">
                    <Label htmlFor="price">Price</Label>
                    <MoneyInput id="price" placeholder="25" aria-invalid={!!errors.price} {...register("price")} />
                    <FieldError>{errors.price?.message}</FieldError>
                  </div>
                ) : null}
                {mode === "free" ? (
                  <div className="flex items-center gap-4 rounded-2xl bg-sticker p-4 text-[#16120f]">
                    <span className="sticker bg-[#16120f] px-3 py-1 text-lg text-sticker -rotate-6">FREE</span>
                    <p className="font-semibold">No price needed. First student to call dibs gets a 24h hold.</p>
                  </div>
                ) : null}
                {mode === "auction" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="startingBid">Starting bid</Label>
                      <MoneyInput id="startingBid" placeholder="30" aria-invalid={!!errors.startingBid} {...register("startingBid")} />
                      <FieldError>{errors.startingBid?.message}</FieldError>
                    </div>
                    <div>
                      <Label htmlFor="increment">Minimum increment</Label>
                      <MoneyInput id="increment" aria-invalid={!!errors.increment} {...register("increment")} />
                      <FieldError>{errors.increment?.message}</FieldError>
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="endsAt">Bidding ends</Label>
                      <Input id="endsAt" type="datetime-local" aria-invalid={!!errors.endsAt} {...register("endsAt")} />
                      <FieldError>{errors.endsAt?.message}</FieldError>
                      <p className="mt-1 text-xs text-ink-3">Starts as soon as you post. Max 21 days. Terms lock once someone bids.</p>
                    </div>
                    <div>
                      <Label htmlFor="reserve">Reserve <span className="font-normal text-ink-3">(optional, hidden)</span></Label>
                      <MoneyInput id="reserve" aria-invalid={!!errors.reserve} {...register("reserve")} />
                      <FieldError>{errors.reserve?.message}</FieldError>
                    </div>
                    <div>
                      <Label htmlFor="buyNow">Buy-now price <span className="font-normal text-ink-3">(optional)</span></Label>
                      <MoneyInput id="buyNow" aria-invalid={!!errors.buyNow} {...register("buyNow")} />
                      <FieldError>{errors.buyNow?.message}</FieldError>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="pickupMode">Pickup</Label>
                    <Select id="pickupMode" {...register("pickupMode")}>
                      {PICKUP_MODES.map((p) => <option key={p} value={p}>{PICKUP_LABEL[p]}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="pickupSpotId">Campus spot</Label>
                    <Select id="pickupSpotId" {...register("pickupSpotId")}>
                      {spots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="handoffStart">Handoff from {v.pickupMode !== "scheduled" ? <span className="font-normal text-ink-3">(optional)</span> : null}</Label>
                    <Input id="handoffStart" type="datetime-local" aria-invalid={!!errors.handoffStart} {...register("handoffStart")} />
                    <FieldError>{errors.handoffStart?.message}</FieldError>
                  </div>
                  <div>
                    <Label htmlFor="handoffEnd">Until</Label>
                    <Input id="handoffEnd" type="datetime-local" aria-invalid={!!errors.handoffEnd} {...register("handoffEnd")} />
                    <FieldError>{errors.handoffEnd?.message}</FieldError>
                  </div>
                </div>
                <div>
                  <Label htmlFor="locationHint">Where exactly? <span className="font-normal text-ink-3">(optional)</span></Label>
                  <Input id="locationHint" placeholder="Lobby by the mailboxes" {...register("locationHint")} />
                  <p className="mt-1 text-xs text-ink-3">Keep it public — no room numbers. Share details after someone calls dibs.</p>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <div className="rounded-2xl border border-line p-5 text-ink-2">
                <p><strong className="text-ink">{v.title || "Untitled"}</strong> · {CATEGORY_LABEL[v.category ?? "other"]} · {CONDITION_LABEL[v.condition ?? "good"]}</p>
                <p className="mt-2">
                  {mode === "free" ? "Free — dibs holds it 24h." : mode === "fixed" ? `${previewPrice} — dibs holds it 24h.` :
                    `Auction from ${previewPrice}, +${formatCents(parseDollarsToCents(v.increment ?? "") ?? 0)} per bid, ends in ${formatRemaining(endsIn)}.`}
                </p>
                <p className="mt-2">{PICKUP_LABEL[v.pickupMode ?? "flexible"]} at {spots.find((s) => s.id === v.pickupSpotId)?.name ?? "campus"}.</p>
                <p className="mt-2">{images.length ? `${images.length} photo(s)` : "No photos — we'll use an illustration."}</p>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-8 flex gap-3 border-t border-line bg-bg/90 py-3 backdrop-blur md:static md:border-0 md:bg-transparent">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft /> Back
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button key="next" type="button" className="ml-auto" onClick={next} data-testid="next-step">
              Next <ArrowRight />
            </Button>
          ) : (
            <Button key="post" type="button" size="lg" className="ml-auto" disabled={pending} onClick={onSubmit} data-testid="post-listing">
              {pending ? "Posting…" : "Post it"}
            </Button>
          )}
        </div>
      </form>

      <aside className="order-first lg:order-none" aria-label="Live preview">
        <div className="lg:sticky lg:top-24">
          <p className="mb-3 font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Live preview</p>
          <div className="mx-auto max-w-[16rem] lg:max-w-none">
            <div className="relative overflow-hidden rounded-[1.4rem] border border-line shadow-card">
              <div className="aspect-[4/3.6]">
                {images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ItemArt category={v.category ?? "other"} seed={seed} />
                )}
              </div>
              {mode === "auction" ? (
                <span className="absolute top-3 left-3 rounded-full bg-bg/85 px-2.5 py-1 font-mono text-xs font-bold">
                  {formatRemaining(endsIn)} · 0 bids
                </span>
              ) : null}
            </div>
            <div className="relative -mt-5 flex justify-end pr-3">
              <span className={cn("sticker px-3.5 py-1.5 font-mono", mode === "free" ? "bg-sticker text-[#16120f] -rotate-6" : mode === "auction" ? "bg-ink text-bg -rotate-3" : "bg-accent text-accent-ink rotate-2")}>
                {mode === "auction" ? <Gavel className="size-4 text-accent" /> : null}
                {previewPrice}
              </span>
            </div>
            <p className="mt-1.5 px-1 font-display font-bold">{v.title || "Your item title"}</p>
            {mode === "auction" ? (
              <div className="mt-3 flex gap-2 opacity-70" aria-hidden>
                <div className="h-11 flex-1 rounded-xl border border-line-strong px-3 py-2.5 font-mono text-sm">{previewPrice}</div>
                <div className="grid h-11 place-items-center rounded-full bg-accent px-4 text-sm font-bold text-accent-ink">Bid</div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
