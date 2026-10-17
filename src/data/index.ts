import "server-only";
import { dataMode, env } from "@/lib/env";
import type { MarketRepository } from "./repository";
import { createMockRepository } from "./adapters/mock";
import { createNeonRepository } from "./adapters/neon";

let repo: MarketRepository | undefined;

/** The single entry point to data. Picks the adapter from the environment. */
export function getRepo(): MarketRepository {
  repo ??= dataMode === "neon" ? createNeonRepository(env.databaseUrl) : createMockRepository();
  return repo;
}

export type { MarketRepository, Actor, Result } from "./repository";
