import { currentProfile } from "@/lib/current";
import { json, run } from "@/lib/http";
import { assertDevnetConfig, treasuryPubkey } from "@/lib/solana/config";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    const current = await currentProfile();
    if (!current) return json({ error: "Sign in first." }, 401);
    const { id } = await context.params;
    const store = getStore();
    const order = await store.getOrder(id);
    if (!order || order.profileId !== current.profile.id) return json({ error: "Order not found." }, 404);
    const listing = await store.getListing(order.listingId);
    const config = assertDevnetConfig();
    return json({
      id: order.id,
      status: order.status,
      amountUsdc: order.amountUsdc,
      expiresAt: order.expiresAt,
      reference: order.referencePubkey,
      label: listing?.label ?? "Soda.agents",
      treasury: treasuryPubkey().toBase58(),
      mint: config.mint,
      cluster: config.cluster,
    });
  });
}
