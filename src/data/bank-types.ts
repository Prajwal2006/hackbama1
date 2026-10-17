/**
 * Campus Furniture Bank: consignment inventory that is sold now, stored over
 * the summer, delivered at move-in, and returned to circulation later.
 * Storage and delivery are simulated in this prototype — the UI says so.
 */

export const BANK_CATEGORIES = ["desk", "chair", "lamp", "fridge", "rug", "shelf", "bed", "sofa", "microwave"] as const;
export type BankCategory = (typeof BANK_CATEGORIES)[number];

export const BANK_CATEGORY_LABEL: Record<BankCategory, string> = {
  desk: "Desk", chair: "Chair", lamp: "Lamp", fridge: "Mini-fridge", rug: "Rug",
  shelf: "Shelf", bed: "Bedding / topper", sofa: "Futon / sofa", microwave: "Microwave",
};

/** Explicit inventory states. Only `available` items can be reserved. */
export type BankItemStatus = "pending" | "available" | "reserved" | "delivered" | "retired";

export type BankEvent = { at: string; kind: "deposited" | "accepted" | "reserved" | "stored" | "delivered" | "returned" | "cancelled"; note: string };

export type BankItem = {
  id: string;
  /** Human inventory id, e.g. UA-0042. */
  inventoryCode: string;
  campusId: string;
  consignorId: string;
  title: string;
  category: BankCategory;
  condition: "like_new" | "good" | "fair";
  /** Centimetres. */
  widthCm: number;
  depthCm: number;
  heightCm: number;
  priceCents: number;
  /** Estimated new price, labelled as an estimate. */
  retailCents: number | null;
  imageUrl: string | null;
  storageLocation: string | null;
  status: BankItemStatus;
  /** Times this item has served a student. */
  cycles: number;
  history: BankEvent[];
  createdAt: Date;
  updatedAt: Date;
};

/** Reservation lifecycle: the furniture-futures timeline. */
export const RESERVATION_STAGES = ["reserved", "stored", "delivered", "returned"] as const;
export type ReservationStage = (typeof RESERVATION_STAGES)[number] | "cancelled";

export type BankReservation = {
  id: string;
  campusId: string;
  buyerId: string;
  itemIds: string[];
  totalCents: number;
  moveInDate: string;
  stage: ReservationStage;
  createdAt: Date;
  updatedAt: Date;
};

export type BankReservationView = BankReservation & { items: BankItem[] };
