import Link from "next/link";
import { notFound } from "next/navigation";
import { RiskDisclaimer } from "@/components/disclaimer";
import { UseAgent } from "@/components/use-agent";
import { Badge } from "@/components/ui/badge";
import { disclaimerSector, sectorLabel } from "@/lib/catalog";
import { agentOffers, priceLine, riskCopy } from "@/lib/pricing";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug };
}

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = getStore();
  await store.ready();
  const agent = await store.getAgentBySlug(slug);
  if (!agent || !agent.isActive) notFound();
  const listings = await store.listListings();
  const offers = agentOffers(agent, listings);
  const risk = riskCopy(agent.riskLevel);

  return (
    <article className="mx-auto grid max-w-2xl gap-5">
      <Link href={`/?sector=${agent.sector}`} className="text-sm text-muted">
        ← {sectorLabel(agent.sector)}
      </Link>
      <div className="flex flex-wrap gap-2">
        <Badge>{agent.tier}</Badge>
        <Badge tone={risk.tone}>{risk.label}</Badge>
        {agent.execution ? <Badge tone="warn">You sign</Badge> : null}
      </div>
      <h1 className="font-display text-4xl leading-none sm:text-5xl">{agent.name}</h1>
      <p className="text-base leading-relaxed text-muted">{agent.summary}</p>
      <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm leading-relaxed">
        This agent never asks for your seed phrase and never holds your keys.
        {agent.execution
          ? " When it trades, it only builds a transaction for you to sign."
          : agent.delivery === "kit"
            ? " You download the kit and run it yourself."
            : " It reads and reports. It does not move funds."}
      </p>
      {disclaimerSector(agent.sector) ? <RiskDisclaimer /> : null}
      <section className="grid gap-3">
        <h2 className="font-display text-2xl">Pricing</h2>
        {offers.map((listing) => (
          <Link key={listing.id} href={`/checkout/${listing.id}`} className="flex items-center justify-between gap-3 rounded-3xl border border-line bg-card px-4 py-4 hover:border-lime">
            <span>
              <span className="block font-semibold">{listing.kind === "one_off" ? "One-off kit" : "30-day pass"}</span>
              <span className="text-sm text-muted">Prepaid. No recurring charge.</span>
            </span>
            <span className="font-display text-2xl">{priceLine(listing)}</span>
          </Link>
        ))}
        {agent.freeDailyChecks ? (
          <p className="text-sm text-muted">{agent.freeDailyChecks} free checks a day without a key. The pass removes the cap.</p>
        ) : null}
        <p className="text-sm text-muted">Pay-per-call is not on sale.</p>
      </section>
      {agent.delivery === "hosted" ? <UseAgent slug={agent.slug} hint={agent.hint} free={agent.freeDailyChecks} /> : null}
    </article>
  );
}
