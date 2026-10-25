import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectPrompt } from "@/components/connect-prompt";
import { PayClient } from "@/components/pay-client";
import { currentProfile } from "@/lib/current";
import { assertDevnetConfig, treasuryPubkey } from "@/lib/solana/config";
import { getStore } from "@/lib/store";
import { shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pay" };

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const current = await currentProfile();
  if (!current) {
    return <ConnectPrompt title="Sign in to pay" body="This order is tied to the wallet that created it." />;
  }
  const { orderId } = await params;
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.profileId !== current.profile.id) notFound();
  const listing = await store.getListing(order.listingId);
  const config = assertDevnetConfig();
  const treasury = treasuryPubkey().toBase58();

  return (
    <div className="mx-auto grid max-w-lg gap-5">
      <Link href={`/checkout/${order.listingId}`} className="text-sm text-muted">← Checkout</Link>
      <h1 className="font-display text-4xl leading-none">{listing?.label ?? "Order"}</h1>
      <div className="rounded-3xl border border-line bg-card p-4">
        <p className="text-sm text-muted">Amount due</p>
        <p className="font-display text-4xl">{order.amountUsdc} USDC</p>
        <dl className="mt-4 grid gap-2 text-xs text-muted">
          <div className="flex justify-between gap-3"><dt>Status</dt><dd className="capitalize">{order.status}</dd></div>
          <div className="flex justify-between gap-3"><dt>Reference</dt><dd className="font-mono">{shortAddress(order.referencePubkey)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Treasury</dt><dd className="font-mono">{shortAddress(treasury)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Mint</dt><dd className="font-mono">{shortAddress(config.mint)}</dd></div>
        </dl>
      </div>
      <p className="text-sm leading-relaxed text-muted">
        Your wallet must be on devnet. The charge is devnet USDC. A mainnet wallet will not match this mint, and Soda will not treat a mainnet transfer as paid.
      </p>
      {order.status === "paid" ? (
        <Link href={`/orders/${order.id}/success`} className="inline-flex h-12 items-center justify-center rounded-full bg-lime px-5 font-semibold text-lime-ink">
          View licence
        </Link>
      ) : order.status === "expired" ? (
        <p className="text-sm text-warn">This order expired before a payment was verified. Start checkout again.</p>
      ) : (
        <PayClient orderId={order.id} amount={order.amountUsdc} expiresAt={order.expiresAt} initialStatus={order.status} />
      )}
    </div>
  );
}
