/** Seeded Furniture Bank inventory (consignment). Prices are asking prices; retail is an estimate. */
import type { BankCategory, BankItem, BankReservation } from "../bank-types";

type Row = [string, string, string, BankCategory, BankItem["condition"], [number, number, number], number, number | null, string, string];

// [id, consignor, title, category, condition, [w,d,h cm], price $, est. retail $, photo, storage bay]
const UA: Row[] = [
  ["bnk_ua_desk", "usr_ua_cole", "Oak writing desk, 2 drawers", "desk", "good", [110, 55, 75], 45, 160, "lst_ua_desk", "Bay A-3"],
  ["bnk_ua_desk2", "usr_ua_jordan", "Compact white desk", "desk", "fair", [90, 45, 74], 25, 90, "lst_ua_monitor", "Bay A-4"],
  ["bnk_ua_chair", "usr_ua_ana", "Tan swivel desk chair", "chair", "like_new", [62, 60, 95], 30, 120, "lst_ua_chair", "Bay B-1"],
  ["bnk_ua_chair2", "usr_ua_dev", "Wooden accent chair", "chair", "good", [48, 50, 80], 15, 60, "lst_rb_chair", "Bay B-2"],
  ["bnk_ua_lamp", "usr_ua_priya", "Arc floor lamp", "lamp", "like_new", [40, 40, 170], 18, 70, "lst_ua_lamp", "Bay C-1"],
  ["bnk_ua_lamp2", "usr_ua_maya", "Pink desk lamp", "lamp", "good", [15, 15, 40], 8, 25, "lst_rb_lamp", "Bay C-2"],
  ["bnk_ua_fridge", "usr_ua_maya", "Retro pink mini-fridge", "fridge", "like_new", [48, 45, 85], 55, 180, "lst_ua_fridge_galanz", "Bay D-1"],
  ["bnk_ua_fridge2", "usr_ua_ana", "Compact black mini-fridge", "fridge", "fair", [45, 45, 50], 30, 110, "lst_ua_minifridge2", "Bay D-2"],
  ["bnk_ua_rug", "usr_ua_priya", "5×7 crimson shag rug", "rug", "good", [150, 210, 2], 22, 80, "lst_ua_rug", "Bay E-1"],
  ["bnk_ua_shelf", "usr_ua_ana", "5-tier wood bookshelf", "shelf", "good", [80, 30, 180], 20, 75, "lst_ua_shelf", "Bay A-6"],
  ["bnk_ua_bed", "usr_ua_dev", "Twin XL topper + bedding", "bed", "like_new", [99, 203, 8], 28, 95, "lst_rb_bedding", "Bay F-2"],
  ["bnk_ua_sofa", "usr_ua_cole", "Charcoal futon", "sofa", "good", [180, 85, 80], 60, 260, "lst_ua_futon", "Bay G-1"],
  ["bnk_ua_micro", "usr_ua_jordan", "White 700W microwave", "microwave", "good", [45, 35, 26], 20, 80, "lst_ua_microwave", "Bay D-4"],
];

export function buildBankSeed(now: Date): { bankItems: BankItem[]; bankReservations: BankReservation[] } {
  const may = new Date(now.getTime() - 20 * 86_400_000).toISOString();
  const bankItems: BankItem[] = UA.map(([id, consignor, title, category, condition, [w, d, h], price, retail, photo, bay], i) => ({
    id,
    inventoryCode: `UA-${String(101 + i).padStart(4, "0")}`,
    campusId: "ua",
    consignorId: consignor,
    title,
    category,
    condition,
    widthCm: w,
    depthCm: d,
    heightCm: h,
    priceCents: price * 100,
    retailCents: retail ? retail * 100 : null,
    imageUrl: `/photos/${photo}.jpg`,
    storageLocation: `Bank storage · ${bay}`,
    status: "available",
    cycles: i % 4 === 0 ? 1 : 0,
    history: [
      { at: may, kind: "deposited", note: "Deposited at move-out" },
      { at: may, kind: "accepted", note: `Inspected and shelved in ${bay} (simulated)` },
    ],
    createdAt: new Date(may),
    updatedAt: new Date(may),
  }));
  return { bankItems, bankReservations: [] };
}
