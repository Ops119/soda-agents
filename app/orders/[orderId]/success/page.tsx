import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectPrompt } from "@/components/connect-prompt";
import { SuccessClient } from "@/components/success-client";
import { currentProfile } from "@/lib/current";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Licence ready" };

export default async function SuccessPage({ params }: { params: Promise<{ orderId: string }> }) {
  const current = await currentProfile();
  if (!current) return <ConnectPrompt title="Sign in" body="Your licence is on the wallet that paid." />;
  const { orderId } = await params;
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.profileId !== current.profile.id) notFound();
  if (order.status !== "paid") {
    return (
      <section className="mx-auto max-w-lg">
        <h1 className="font-display text-4xl">Payment is not verified yet.</h1>
        <Link href={`/pay/${order.id}`} className="mt-4 inline-flex text-lime">Return to payment</Link>
      </section>
    );
  }
  const [licences, agents] = await Promise.all([
    store.listLicencesByOrder(order.id),
    store.listAgents(),
  ]);
  const names = licences.map((licence) => agents.find((agent) => agent.id === licence.agentId)?.name ?? "Agent");

  return (
    <div className="mx-auto grid max-w-lg gap-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Paid on devnet</p>
      <h1 className="font-display text-4xl leading-none">Your access is on.</h1>
      <ul className="grid gap-1 text-sm text-muted">
        {names.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <SuccessClient orderId={order.id} />
      <p className="text-sm leading-relaxed text-muted">
        One key covers every agent in this purchase. Hosted agents take it as a bearer token. Kits download from the dashboard for 24 hours at a time.
      </p>
      <Link href="/dashboard" className="inline-flex h-12 items-center justify-center rounded-full bg-lime px-5 font-semibold text-lime-ink">
        Open dashboard
      </Link>
    </div>
  );
}
