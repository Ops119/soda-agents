import type { AgentRecord, ListingRecord, RiskLevel } from "./catalog";
import { formatUsdc, usdcToCents } from "./money";

export function priceLine(listing: ListingRecord): string {
  const text = formatUsdc(usdcToCents(listing.priceUsdc));
  if (listing.kind === "pass_30d" && listing.scope === "agent") return `${text} / 30 days`;
  if (listing.kind === "one_off") return `${text} once`;
  if (listing.scope !== "agent") return `${text} / 30 days`;
  return text;
}

export function agentOffers(agent: AgentRecord, listings: ListingRecord[]) {
  return listings.filter((listing) => listing.agentId === agent.id && listing.isPurchasable);
}

export function fromPrice(agent: AgentRecord, listings: ListingRecord[]): string {
  const offers = agentOffers(agent, listings);
  if (offers.length === 0) return "Unavailable";
  const cheapest = [...offers].sort((a, b) => usdcToCents(a.priceUsdc) - usdcToCents(b.priceUsdc))[0];
  return priceLine(cheapest);
}

export function riskCopy(level: RiskLevel): { label: string; tone: "ok" | "warn" | "danger" } {
  if (level === "low") return { label: "Lower risk", tone: "ok" };
  if (level === "medium") return { label: "Market risk", tone: "warn" };
  return { label: "High risk", tone: "danger" };
}
