import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { CheckoutClient } from "@/components/checkout-client";
import { RiskDisclaimer } from "@/components/disclaimer";
import { Badge } from "@/components/ui/badge";
import { agentsCoveredBy, listingIncludesExecution } from "@/lib/coverage";
import { currentProfile } from "@/lib/current";
import { countryFromHeaders, executionBlocked } from "@/lib/geo";
import { disclaimerSector } from "@/lib/catalog";
import { priceLine } from "@/lib/pricing";
import { assertDevnetConfig, treasuryPubkey } from "@/lib/solana/config";
import { getStore } from "@/lib/store";
import { shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const store = getStore();
  await store.ready();
  const listing = await store.getListing(listingId);
  if (!listing) notFound();
  const [agents, listings] = await Promise.all([store.listAgents(), store.listListings()]);
  const covered = agentsCoveredBy(listing, agents, listings);
  const risky = covered.some((agent) => disclaimerSector(agent.sector)) || disclaimerSector(listing.sector);
  const executes = listingIncludesExecution(listing, agents, listings);
  const headerList = await headers();
  const headerCountry = countryFromHeaders(headerList);
  const current = await currentProfile();
  const blocked =
    executes && executionBlocked(current?.profile.country ?? null, headerCountry)
      ? "Execution agents are unavailable in your region. They only build a transaction for you to sign, and that feature is hidden here."
      : null;
  const config = assertDevnetConfig();
  const treasury = treasuryPubkey().toBase58();
  const forSale = listing.isPurchasable && listing.kind !== "ppu";

  return (
    <div className="mx-auto grid max-w-lg gap-5">
      <Link href="/" className="text-sm text-muted">← Catalogue</Link>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Checkout · devnet</p>
      <h1 className="font-display text-4xl leading-none">{listing.label}</h1>
      {covered.length > 0 ? (
        <ul className="grid gap-1 text-sm text-muted">
          {covered.slice(0, 8).map((agent) => (
            <li key={agent.id}>{agent.name}</li>
          ))}
          {covered.length > 8 ? <li>and {covered.length - 8} more hosted passes</li> : null}
        </ul>
      ) : null}
      <div className="rounded-3xl border border-line bg-card p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{listing.kind === "one_off" ? "One payment" : "30 days, prepaid"}</p>
            <p className="font-display text-4xl">{forSale ? priceLine(listing) : "Not for sale"}</p>
          </div>
          <Badge tone="lime">USDC</Badge>
        </div>
        <dl className="mt-4 grid gap-2 text-xs text-muted">
          <div className="flex justify-between gap-3">
            <dt>Network</dt>
            <dd>Solana devnet</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Mint</dt>
            <dd className="font-mono">{shortAddress(config.mint)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Treasury</dt>
            <dd className="font-mono">{shortAddress(treasury)}</dd>
          </div>
        </dl>
      </div>
      {risky ? <RiskDisclaimer /> : null}
      {executes ? (
        <p className="text-sm leading-relaxed text-muted">
          This purchase includes an agent that can draft a transaction. You sign it. The agent cannot.
        </p>
      ) : null}
      {!forSale ? (
        <p className="text-sm text-muted">Pay-per-call billing is not offered. Choose a pass or a kit.</p>
      ) : blocked ? (
        <p role="status" className="rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">{blocked}</p>
      ) : (
        <CheckoutClient
          listingId={listing.id}
          needsCountry={executes}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          initialEmail={current?.profile.email ?? null}
          initialCountry={current?.profile.country ?? null}
        />
      )}
    </div>
  );
}
