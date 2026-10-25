import { PublicKey } from "@solana/web3.js";
import QRCode from "qrcode";
import { currentProfile } from "@/lib/current";
import { json, run } from "@/lib/http";
import { buildPayUrl } from "@/lib/payments/build";
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
    if (order.status !== "pending") return json({ error: "This order is no longer awaiting payment." }, 409);
    if (new Date(order.expiresAt).getTime() <= Date.now()) {
      return json({ error: "This order has expired. Start checkout again." }, 409);
    }
    const listing = await store.getListing(order.listingId);
    const config = assertDevnetConfig();
    const url = buildPayUrl({
      order,
      treasury: treasuryPubkey(),
      mint: new PublicKey(config.mint),
      label: listing?.label ?? "Soda.agents",
    });
    const qrDataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 280,
      color: { dark: "#10241b", light: "#f4f7f1" },
    });
    return json({ url, qrDataUrl });
  });
}
