import { currentProfile } from "@/lib/current";
import { countryFromHeaders } from "@/lib/geo";
import { clientIp, json, originOk, run } from "@/lib/http";
import { coveredNames, newOrderId, newReference, orderBlocked } from "@/lib/order-guard";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { verifyTurnstile } from "@/lib/turnstile";
import { orderSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_TTL_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  return run(async () => {
    if (!originOk(request)) return json({ error: "Origin was rejected." }, 403);
    const current = await currentProfile();
    if (!current) return json({ error: "Sign in with your wallet first." }, 401);
    const limited = await rateLimit(`order:${current.profile.id}`, 8, 60);
    if (!limited.ok) return json({ error: "Too many orders. Wait a minute." }, 429);
    const parsed = orderSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Checkout details were not valid." }, 400);
    if (!(await verifyTurnstile(parsed.data.turnstileToken, clientIp(request)))) {
      return json({ error: "Bot check failed. Try again." }, 400);
    }
    const store = getStore();
    const listing = await store.getListing(parsed.data.listingId);
    if (!listing || !listing.isPurchasable || listing.kind === "ppu") {
      return json({ error: "That product is not for sale." }, 400);
    }
    const [agents, listings] = await Promise.all([store.listAgents(), store.listListings()]);
    let profile = current.profile;
    if (parsed.data.country) {
      profile = (await store.updateProfile(profile.id, { country: parsed.data.country })) ?? profile;
    }
    if (parsed.data.email) {
      profile = (await store.updateProfile(profile.id, { email: parsed.data.email })) ?? profile;
    }
    const blocked = orderBlocked({
      listing,
      agents,
      listings,
      profile,
      requestedCountry: parsed.data.country ?? null,
      headerCountry: countryFromHeaders(request.headers),
    });
    if (blocked) return json({ error: blocked }, 403);
    const names = coveredNames(listing, agents, listings);
    if (names.length === 0) return json({ error: "This product does not include an agent." }, 400);
    const now = new Date();
    const order = await store.createOrder({
      id: newOrderId(),
      profileId: profile.id,
      listingId: listing.id,
      amountUsdc: listing.priceUsdc,
      referencePubkey: newReference(),
      status: "pending",
      expiresAt: new Date(now.getTime() + ORDER_TTL_MS).toISOString(),
      createdAt: now.toISOString(),
    });
    return json({
      orderId: order.id,
      amountUsdc: order.amountUsdc,
      expiresAt: order.expiresAt,
      reference: order.referencePubkey,
    });
  });
}
