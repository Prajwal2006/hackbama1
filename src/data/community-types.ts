/**
 * Types for the student "community" modules (subs, rides, meals, class swap)
 * and marketplace handoffs. Money is integer cents. Dibs never moves money:
 * people pay each other in whatever app they like, and both sides acknowledge it.
 */

export const PAYMENT_METHODS = ["Venmo", "Zelle", "Cash App", "Apple Pay", "PayPal", "Cash", "Other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Shared payment acknowledgement state. */
export type PaymentAck = {
  paymentMethod: PaymentMethod | null;
  paymentSentAt: Date | null;
  paymentReceivedAt: Date | null;
};

// ——— Handoffs (marketplace pickups) ———

export type HandoffPhase = "move_out" | "move_in";
export type HandoffStatus = "pending" | "completed" | "cancelled";

export type Handoff = PaymentAck & {
  id: string;
  campusId: string;
  listingId: string;
  sellerId: string;
  buyerId: string;
  source: "dibs" | "auction";
  dibId: string | null;
  amountCents: number;
  phase: HandoffPhase;
  scheduledAt: Date | null;
  status: HandoffStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HandoffView = Handoff & {
  listingTitle: string;
  listingImage: string | null;
  listingCategory: string;
  listingArtSeed: number;
  pickupSpotId: string | null;
  holdForMoveIn: boolean;
  sellerName: string;
  buyerName: string;
  role: "buyer" | "seller";
};

// ——— Community posts (subs, rides, meals) ———

export type PostKind = "sub" | "ride" | "meal";
export type PostStatus = "open" | "full" | "closed" | "cancelled";

export type SubData = { service: string; cycle: "monthly" | "yearly"; totalCents: number };
export type RideData = { from: string; to: string; trip: boolean; returnAt: string | null; luggage: string | null };
export type MealData = { dish: string; dietary: string[]; pickupSpot: string; trade: string | null };
export type PostData = SubData | RideData | MealData;

export type CommunityPost = {
  id: string;
  campusId: string;
  kind: PostKind;
  ownerId: string;
  title: string;
  body: string;
  /** Seats / portions available to others (owner not counted). */
  capacity: number;
  /** What each joiner pays the owner, per seat/portion. 0 = free. */
  unitPriceCents: number;
  startsAt: Date;
  imageUrl: string | null;
  data: PostData;
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type MemberStatus = "joined" | "left";
export type CommunityMember = PaymentAck & {
  id: string;
  postId: string;
  campusId: string;
  userId: string;
  quantity: number;
  status: MemberStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type PostView = CommunityPost & {
  ownerName: string;
  taken: number;
  members: (CommunityMember & { userName: string })[];
};

// ——— Class swap ———

export type SwapStatus = "open" | "proposed" | "matched" | "done" | "cancelled";
export type SwapRequest = {
  id: string;
  campusId: string;
  userId: string;
  course: string;
  haveSection: string;
  wantSection: string;
  status: SwapStatus;
  cycleId: string | null;
  /** Accept any valid swap automatically. */
  autoAccept: boolean;
  createdAt: Date;
};

export type SwapCycle = {
  id: string;
  campusId: string;
  course: string;
  /** Ordered: request[i] gives its section to request[i+1] (wraps). */
  requestIds: string[];
  confirmedBy: string[];
  status: "proposed" | "matched" | "cancelled";
  /** Agreed drop/add moment, set when everyone confirms. */
  swapAt: Date | null;
  createdAt: Date;
};

export type SwapView = SwapRequest & { userName: string };
export type CycleView = SwapCycle & { requests: SwapView[] };
