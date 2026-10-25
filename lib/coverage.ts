import type { AgentRecord, ListingRecord } from "./catalog";

export function purchasablePassAgentIds(listings: ListingRecord[]): Set<string> {
  const ids = new Set<string>();
  for (const listing of listings) {
    if (
      listing.kind === "pass_30d" &&
      listing.scope === "agent" &&
      listing.isPurchasable &&
      listing.agentId
    ) {
      ids.add(listing.agentId);
    }
  }
  return ids;
}

/** Agents a buyer receives. Bundles cover hosted passes only, not one-off kits. */
export function agentsCoveredBy(
  listing: ListingRecord,
  agents: AgentRecord[],
  listings: ListingRecord[],
): AgentRecord[] {
  if (listing.scope === "agent") {
    return agents.filter((agent) => agent.id === listing.agentId);
  }
  const passes = purchasablePassAgentIds(listings);
  if (listing.scope === "sector") {
    return agents.filter((agent) => agent.sector === listing.sector && passes.has(agent.id));
  }
  return agents.filter((agent) => passes.has(agent.id));
}

export function listingIncludesExecution(
  listing: ListingRecord,
  agents: AgentRecord[],
  listings: ListingRecord[],
): boolean {
  return agentsCoveredBy(listing, agents, listings).some((agent) => agent.execution);
}
