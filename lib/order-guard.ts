import { Keypair, PublicKey } from "@solana/web3.js";
import { randomUUID } from "crypto";
import type { ListingRecord } from "./catalog";
import { agentsCoveredBy, listingIncludesExecution } from "./coverage";
import { executionBlocked, normalizeCountry } from "./geo";
import type { AgentRecord } from "./catalog";
import type { Profile } from "./store/types";

export function assertListingForSale(listing: ListingRecord | null): listing is ListingRecord {
  return Boolean(listing && listing.isPurchasable && listing.kind !== "ppu");
}

export function orderBlocked(input: {
  listing: ListingRecord;
  agents: AgentRecord[];
  listings: ListingRecord[];
  profile: Profile;
  requestedCountry: string | null;
  headerCountry: string | null;
}): string | null {
  const country = normalizeCountry(input.requestedCountry) ?? input.profile.country;
  const executes = listingIncludesExecution(input.listing, input.agents, input.listings);
  if (!executes) return null;
  if (executionBlocked(country, input.headerCountry)) {
    return "Execution agents are unavailable in your region. They build transactions for you to sign, and that feature is hidden here.";
  }
  if (!country && !input.headerCountry) {
    return "Choose your country before buying an agent that builds transactions.";
  }
  return null;
}

export function coveredNames(
  listing: ListingRecord,
  agents: AgentRecord[],
  listings: ListingRecord[],
): string[] {
  return agentsCoveredBy(listing, agents, listings).map((agent) => agent.name);
}

export function newReference(): string {
  return Keypair.generate().publicKey.toBase58();
}

export function isPubkey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export function newOrderId(): string {
  return randomUUID();
}
