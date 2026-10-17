import "server-only";
import { dataMode, env } from "@/lib/env";
import type { AuthStore } from "./auth-store";
import type { CommunityRepository } from "./community-repository";
import { createMockCommunityRepository } from "./adapters/mock/community";
import { createNeonCommunityRepository } from "./adapters/neon/community";
import type { MarketRepository } from "./repository";
import { createMockRepository } from "./adapters/mock";
import { createMockAuthStore } from "./adapters/mock/auth";
import { createNeonRepository } from "./adapters/neon";
import { createNeonAuthStore } from "./adapters/neon/auth";

let repo: MarketRepository | undefined;
let auth: AuthStore | undefined;
let community: CommunityRepository | undefined;

/** The single entry point to marketplace data. Picks the adapter from the environment. */
export function getRepo(): MarketRepository {
  repo ??= dataMode === "neon" ? createNeonRepository(env.databaseUrl) : createMockRepository();
  return repo;
}

/** Sign-in codes and user identities. */
export function getAuthStore(): AuthStore {
  auth ??= dataMode === "neon" ? createNeonAuthStore(env.databaseUrl) : createMockAuthStore();
  return auth;
}

/** Subs, rides, meals, class swaps. */
export function getCommunity(): CommunityRepository {
  community ??= dataMode === "neon" ? createNeonCommunityRepository(env.databaseUrl) : createMockCommunityRepository();
  return community;
}

export type { MarketRepository, Actor, Result } from "./repository";
