import { currentProfile } from "@/lib/current";
import { sendEmail } from "@/lib/email";
import { json, originOk, run } from "@/lib/http";
import { usdcToMicros } from "@/lib/money";
import { rateLimit } from "@/lib/rate-limit";
import { settleOrder } from "@/lib/payments/settle";
import { verifyOnChain } from "@/lib/payments/verify";
import { appOrigin } from "@/lib/siws";
import { assertDevnetConfig, solanaConnection, treasuryPubkey } from "@/lib/solana/config";
import { getStore } from "@/lib/store";
import { verifyBodySchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    if (!originOk(request)) return json({ error: "Origin was rejected." }, 403);
    const current = await currentProfile();
    if (!current) return json({ error: "Sign in first." }, 401);
    const { id } = await context.params;
    const limited = await rateLimit(`verify:${id}`, 20, 60);
    if (!limited.ok) return json({ error: "Checking too often. Wait a few seconds." }, 429);
    const body = verifyBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) return json({ error: "Verification payload was not valid." }, 400);
    const store = getStore();
    const order = await store.getOrder(id);
    if (!order || order.profileId !== current.profile.id) return json({ error: "Order not found." }, 404);
    if (order.status === "paid") {
      const licences = await store.listLicencesByOrder(order.id);
      return json({ status: "paid", alreadyIssued: true, apiKey: null, licences: licences.map(publicLicence) });
    }
    const config = assertDevnetConfig();
    const outcome = await verifyOnChain(solanaConnection(), {
      recipient: treasuryPubkey().toBase58(),
      amountMicros: usdcToMicros(order.amountUsdc),
      mint: config.mint,
      reference: order.referencePubkey,
    });
    if (outcome.status === "pending") return json({ status: "pending" }, 202);
    if (outcome.status === "mismatch") {
      return json({ status: "mismatch", reason: outcome.reason }, 400);
    }
    if (outcome.status === "invalid") return json({ error: outcome.error }, 400);
    const [agents, listings] = await Promise.all([store.listAgents(), store.listListings()]);
    const listing = listings.find((item) => item.id === order.listingId);
    if (!listing) return json({ error: "Listing missing." }, 500);
    const settled = await settleOrder(store, order.id, outcome.observed, listing, agents, listings);
    if (!settled.ok) {
      const message =
        settled.error === "replay"
          ? "That transaction was already used for a different order."
          : settled.error === "expired"
            ? "The payment landed after the order expired."
            : "The payment could not be applied.";
      return json({ error: message }, 409);
    }
    const slugs = settled.licences
      .map((licence) => agents.find((agent) => agent.id === licence.agentId)?.slug)
      .filter((slug): slug is string => Boolean(slug));
    if (settled.apiKey && current.profile.email) {
      await sendEmail(
        current.profile.email,
        `Your Soda.agents key for ${listing.label}`,
        [
          `Payment of ${order.amountUsdc} USDC was verified on Solana devnet.`,
          `Order ${order.id}`,
          `Agents: ${slugs.join(", ")}`,
          "",
          "API key (shown in this email and once in the app):",
          settled.apiKey,
          "",
          `Dashboard: ${appOrigin()}/dashboard`,
          "Soda never asks for your seed phrase. If you did not make this purchase, rotate the key.",
        ].join("\n"),
      );
    }
    return json({
      status: "paid",
      alreadyIssued: settled.alreadyIssued,
      apiKey: settled.apiKey,
      slugs,
      licences: settled.licences.map(publicLicence),
    });
  });
}

function publicLicence(licence: { id: string; agentId: string; endsAt: string | null; status: string }) {
  return {
    id: licence.id,
    agentId: licence.agentId,
    endsAt: licence.endsAt,
    status: licence.status,
  };
}
