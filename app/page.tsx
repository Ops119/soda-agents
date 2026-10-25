import Link from "next/link";
import { RiskDisclaimer } from "@/components/disclaimer";
import { Badge } from "@/components/ui/badge";
import { SECTORS, disclaimerSector, sectorLabel, type SectorId } from "@/lib/catalog";
import { getStore } from "@/lib/store";
import { fromPrice, riskCopy } from "@/lib/pricing";
import { formatUsdc, usdcToCents } from "@/lib/money";

export const dynamic = "force-dynamic";

const tabs = [{ id: "all", label: "All" }, ...SECTORS, { id: "bundles", label: "Bundles" }] as const;

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ sector?: string }>;
}) {
  const { sector: requested } = await searchParams;
  const sector = tabs.some((tab) => tab.id === requested) ? requested ?? "all" : "all";
  let agents: Awaited<ReturnType<Awaited<ReturnType<typeof getStore>>["listAgents"]>> = [];
  let listings: Awaited<ReturnType<Awaited<ReturnType<typeof getStore>>["listListings"]>> = [];
  let error: string | null = null;
  try {
    const store = getStore();
    await store.ready();
    [agents, listings] = await Promise.all([store.listAgents(), store.listListings()]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "The catalogue is unavailable.";
  }

  const bundles = listings.filter((listing) => listing.scope !== "agent" && listing.isPurchasable);
  const visibleBundles =
    sector === "bundles" || sector === "all"
      ? bundles
      : bundles.filter((listing) => listing.sector === sector);
  const visibleAgents =
    sector === "all" || sector === "bundles"
      ? sector === "bundles"
        ? []
        : agents
      : agents.filter((agent) => agent.sector === sector);
  const showDisclaimer = sector === "all" || sector === "bundles" || disclaimerSector(sector);

  return (
    <div className="grid gap-6">
      <section className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Devnet · USDC</p>
        <h1 className="font-display mt-2 max-w-xl text-4xl leading-none sm:text-6xl">
          Agents, cold and ready.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Twenty-nine Solana agents. Pay in USDC, get a key, call the ones that stay hosted. One-off kits download from your dashboard.
        </p>
      </section>

      <div className="tab-scroll -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Sectors">
        {tabs.map((tab) => {
          const selected = tab.id === sector;
          const href = tab.id === "all" ? "/" : `/?sector=${tab.id}`;
          return (
            <Link
              key={tab.id}
              href={href}
              role="tab"
              aria-selected={selected}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${selected ? "border-lime bg-lime text-lime-ink" : "border-line text-foam"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {showDisclaimer ? <RiskDisclaimer /> : null}
      {error ? (
        <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {visibleBundles.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="font-display text-2xl">Passes and bundles</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleBundles.map((listing) => (
              <Link key={listing.id} href={`/checkout/${listing.id}`} className="rounded-3xl border border-lime/30 bg-card p-4 hover:border-lime">
                <Badge tone="lime">{listing.scope === "all" ? "All hosted passes" : sectorLabel(listing.sector as SectorId)}</Badge>
                <h3 className="font-display mt-3 text-2xl">{listing.label}</h3>
                <p className="mt-2 text-sm text-muted">
                  {listing.scope === "all"
                    ? "30 days of every hosted pass. One-off kits stay separate."
                    : "30 days of the hosted passes in this sector, at 40% off the sum. Kits stay separate."}
                </p>
                <p className="mt-4 font-display text-3xl">{formatUsdc(usdcToCents(listing.priceUsdc))}</p>
                <p className="text-xs uppercase tracking-wide text-muted">30 days · prepaid</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {visibleAgents.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAgents.map((agent) => {
            const risk = riskCopy(agent.riskLevel);
            return (
              <Link key={agent.id} href={`/agents/${agent.slug}`} className="flex flex-col rounded-3xl border border-line bg-card/80 p-4 hover:border-lime/60">
                <div className="flex items-center justify-between gap-2">
                  <Badge>{sectorLabel(agent.sector)} · {agent.tier}</Badge>
                  <Badge tone={risk.tone}>{risk.label}</Badge>
                </div>
                <h2 className="font-display mt-4 text-2xl leading-tight">{agent.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{agent.summary}</p>
                <p className="mt-4 text-sm font-semibold text-foam">{fromPrice(agent, listings)}</p>
              </Link>
            );
          })}
        </section>
      ) : null}

      {!error && visibleAgents.length === 0 && visibleBundles.length === 0 ? (
        <p className="text-sm text-muted">Nothing is listed in this sector yet.</p>
      ) : null}
    </div>
  );
}
