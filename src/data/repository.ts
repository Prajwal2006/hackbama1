import type {
  Bid,
  CampusStats,
  Dib,
  Listing,
  ListingFilter,
  ListingStatus,
  ListingView,
  Notification,
  Profile,
  Save,
} from "./types";
import type { NewListingInput } from "@/features/listings/schema";

/**
 * A trusted identity. Only ever constructed server-side from a verified
 * session (see `src/lib/auth/viewer.ts`) — never from client input.
 */
export type Actor = {
  userId: string;
  /** The campus the actor is verified at. */
  campusId: string;
};

export type ErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid"
  | "conflict"
  | "own_listing"
  | "unavailable"
  | "auction_not_started"
  | "auction_ended"
  | "bid_too_low"
  | "duplicate";

export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode; message: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(code: ErrorCode, message: string): Result<T> => ({
  ok: false,
  code,
  message,
});

export type PlaceBidInput = {
  listingId: string;
  amountCents: number;
  /** Client-generated key; resubmits with the same key return the original bid. */
  idempotencyKey: string;
  /** The minimum the client believed was valid. Used only to report a race, never trusted. */
  expectedMinCents?: number;
};

export type MaintenanceReport = { expiredDibs: number; settledAuctions: number };

export interface MarketRepository {
  readonly kind: "mock" | "neon";

  // Profiles
  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(
    p: Pick<Profile, "id" | "campusId" | "displayName" | "email"> & { verifiedAt: Date | null },
  ): Promise<Profile>;

  // Listings
  listListings(filter: ListingFilter): Promise<ListingView[]>;
  getListing(id: string): Promise<ListingView | null>;
  createListing(actor: Actor, input: NewListingInput): Promise<Result<Listing>>;
  setListingStatus(actor: Actor, listingId: string, status: ListingStatus): Promise<Result<Listing>>;

  // Bids
  listBidsForListing(listingId: string): Promise<(Bid & { bidderLabel: string })[]>;
  listBidsForUser(actor: Actor): Promise<(Bid & { listing: ListingView })[]>;
  placeBid(actor: Actor, input: PlaceBidInput): Promise<Result<{ bid: Bid; listing: ListingView }>>;
  buyNow(actor: Actor, listingId: string): Promise<Result<ListingView>>;

  // Dibs
  callDibs(actor: Actor, listingId: string): Promise<Result<{ dib: Dib; listing: ListingView }>>;
  cancelDibs(actor: Actor, dibId: string): Promise<Result<Dib>>;
  completeDibs(actor: Actor, dibId: string): Promise<Result<Dib>>;
  listDibsForUser(actor: Actor): Promise<(Dib & { listing: ListingView })[]>;
  listDibsForSeller(actor: Actor): Promise<(Dib & { listing: ListingView; buyerName: string })[]>;
  getActiveDibForListing(listingId: string): Promise<Dib | null>;

  // Saves
  toggleSave(actor: Actor, listingId: string): Promise<Result<{ saved: boolean }>>;
  listSavedIds(actor: Actor): Promise<string[]>;
  listSaves(actor: Actor): Promise<(Save & { listing: ListingView })[]>;

  // Notifications
  listNotifications(actor: Actor, limit?: number): Promise<Notification[]>;
  unreadCount(actor: Actor): Promise<number>;
  markNotificationsRead(actor: Actor): Promise<void>;

  // Aggregates
  campusStats(campusId: string): Promise<CampusStats>;

  /** Expires stale dibs and settles due auctions. Idempotent and safe to run concurrently. */
  runMaintenance(now?: Date): Promise<MaintenanceReport>;
  /** Settles one auction now if it is due. Idempotent. */
  settleAuction(listingId: string, now?: Date): Promise<Result<ListingView>>;
}
