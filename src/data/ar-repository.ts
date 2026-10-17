import type { ArDims, ArSpec } from "@/features/ar/spec";
import type { Result } from "./repository";

/** The 3D model a seller attached to a listing, stored as a small part-list spec (not a file). */
export type ArModel = {
  listingId: string;
  campusId: string;
  sellerId: string;
  spec: ArSpec;
  dimensionsCm: ArDims;
  createdAt: Date;
};

export type NewArModel = Omit<ArModel, "createdAt">;

/** AR models for listings. One per listing; the GLB is generated on demand from the spec. */
export interface ArRepository {
  getByListing(listingId: string): Promise<ArModel | null>;
  /** Which of these listings have an AR model (for badges in lists). */
  listingsWithModel(listingIds: string[]): Promise<Set<string>>;
  /** Creates or replaces the listing's model. The caller has already checked the seller owns the listing. */
  save(model: NewArModel): Promise<Result<ArModel>>;
}
