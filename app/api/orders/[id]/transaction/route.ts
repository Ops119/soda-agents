import { PublicKey } from "@solana/web3.js";
import { currentProfile } from "@/lib/current";
import { json, originOk, run } from "@/lib/http";
import { buildPayTransaction } from "@/lib/payments/build";
import { rateLimit } from "@/lib/rate-limit";
import { assertDevnetConfig, solanaConnection, treasuryPubkey } from "@/lib/solana/config";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    if (!originOk(request)) return json({ error: "Origin was rejected." }, 403);
    const current = await currentProfile();
    if (!current) return json({ error: "Sign in first." }, 401);
    const { id } = await context.params;
    const limited = await rateLimit(`tx:${id}`, 12, 60);
    if (!limited.ok) return json({ error: "Too many payment attempts. Wait a minute." }, 429);
    const order = await getStore().getOrder(id);
    if (!order || order.profileId !== current.profile.id) return json({ error: "Order not found." }, 404);
    if (order.status !== "pending") return json({ error: "This order is no longer awaiting payment." }, 409);
    if (new Date(order.expiresAt).getTime() <= Date.now()) {
      return json({ error: "This order has expired. Start checkout again." }, 409);
    }
    const listing = await getStore().getListing(order.listingId);
    const config = assertDevnetConfig();
    const transaction = await buildPayTransaction({
      connection: solanaConnection(),
      payer: new PublicKey(current.profile.walletAddress),
      order,
      treasury: treasuryPubkey(),
      mint: new PublicKey(config.mint),
      label: listing?.label ?? "Soda.agents",
    });
    return json({ transaction, cluster: "devnet" });
  });
}
