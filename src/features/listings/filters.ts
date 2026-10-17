import { CATEGORIES, PICKUP_MODES, SALE_MODES, type Category, type ListingSort, type PickupMode, type SaleMode } from "@/data/types";
import { parseDollarsToCents } from "@/lib/money";

export type BrowseParams = {
  q?: string;
  category?: Category;
  mode?: SaleMode;
  pickup?: PickupMode;
  spot?: string;
  min?: number;
  max?: number;
  sort: ListingSort;
  nearby: boolean;
};

const SORTS: ListingSort[] = ["newest", "price_asc", "price_desc", "ending_soon", "popular"];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);

/** Parses untrusted URL search params into a typed filter. Unknown values are dropped. */
export function parseBrowseParams(sp: Record<string, string | string[] | undefined>): BrowseParams {
  const min = parseDollarsToCents(one(sp.min));
  const max = parseDollarsToCents(one(sp.max));
  return {
    q: one(sp.q)?.slice(0, 80),
    category: pick(one(sp.category), CATEGORIES),
    mode: pick(one(sp.mode), SALE_MODES),
    pickup: pick(one(sp.pickup), PICKUP_MODES),
    spot: one(sp.spot)?.slice(0, 64),
    min: min ?? undefined,
    max: max ?? undefined,
    sort: pick(one(sp.sort), SORTS) ?? "newest",
    nearby: one(sp.nearby) === "1",
  };
}

export const SORT_LABEL: Record<ListingSort, string> = {
  newest: "Newest",
  price_asc: "Price: low → high",
  price_desc: "Price: high → low",
  ending_soon: "Ending soon",
  popular: "Most wanted",
};
