import type { BankCategory, BankItem, BankReservationView } from "./bank-types";
import type { Actor, Result } from "./repository";

export type DepositInput = {
  title: string;
  category: BankCategory;
  condition: BankItem["condition"];
  widthCm: number;
  depthCm: number;
  heightCm: number;
  priceCents: number;
  imageUrl: string | null;
};

export interface BankRepository {
  listInventory(campusId: string): Promise<BankItem[]>;
  myDeposits(actor: Actor): Promise<BankItem[]>;
  myReservations(actor: Actor): Promise<BankReservationView[]>;
  /** Consignment deposit. The prototype "accepts" it into simulated storage immediately. */
  deposit(actor: Actor, input: DepositInput): Promise<Result<BankItem>>;
  /** Atomic: reserves every item or none. */
  reserve(actor: Actor, itemIds: string[], moveInDate: string): Promise<Result<BankReservationView>>;
  /** Moves a reservation one step along reserved → stored → delivered → returned. Demo time travel. */
  advance(actor: Actor, reservationId: string): Promise<Result<BankReservationView>>;
  cancel(actor: Actor, reservationId: string): Promise<Result<void>>;
}
