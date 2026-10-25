import { countryFromHeaders, normalizeCountry } from "@/lib/geo";
import { clientIp, json, originOk, run } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import {
  NONCE_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/session";
import { domainMatchesApp, parseSiwsMessage, sameOrigin, validateSiwsFields, verifySolanaSignature } from "@/lib/siws";
import { getStore } from "@/lib/store";
import { siwsSchema } from "@/lib/validators";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return run(async () => {
    if (!originOk(request)) return json({ error: "Origin was rejected." }, 403);
    const limited = await rateLimit(`siws:${clientIp(request)}`, 10, 60);
    if (!limited.ok) return json({ error: "Too many sign-in attempts. Wait a minute." }, 429);
    const parsed = siwsSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Sign-in payload was not valid." }, 400);
    const fields = parseSiwsMessage(parsed.data.message);
    if (!fields) return json({ error: "Sign-in message was not recognised." }, 400);
    const fieldError = validateSiwsFields(fields);
    if (fieldError) return json({ error: fieldError }, 400);
    if (fields.address !== parsed.data.address) {
      return json({ error: "The signed address does not match." }, 400);
    }
    let uri: URL;
    try {
      uri = new URL(fields.uri);
    } catch {
      return json({ error: "Sign-in URI was not valid." }, 400);
    }
    if (!sameOrigin(uri.origin) || !domainMatchesApp(fields.domain)) {
      return json({ error: "Sign-in URI does not match this app." }, 400);
    }
    const issued = Date.parse(fields.issuedAt);
    const exp = Date.parse(fields.expirationTime);
    const now = Date.now();
    if (!Number.isFinite(issued) || !Number.isFinite(exp)) {
      return json({ error: "Sign-in timestamps were not valid." }, 400);
    }
    if (issued > now + 2 * 60 * 1000 || exp <= now || exp - issued > 15 * 60 * 1000) {
      return json({ error: "Sign-in message has expired. Try again." }, 400);
    }
    const jar = await cookies();
    if (jar.get(NONCE_COOKIE)?.value !== fields.nonce) {
      return json({ error: "Sign-in challenge does not match this browser." }, 400);
    }
    if (!verifySolanaSignature(parsed.data.message, parsed.data.signature, fields.address)) {
      return json({ error: "Signature was rejected." }, 400);
    }
    const store = getStore();
    const consumed = await store.consumeNonce(fields.nonce, new Date());
    if (!consumed) return json({ error: "Sign-in challenge was already used or expired." }, 400);
    const country = normalizeCountry(countryFromHeaders(request.headers));
    const profile = await store.upsertProfile(fields.address, country);
    const token = signSession({
      profileId: profile.id,
      wallet: profile.walletAddress,
      exp: Math.floor(now / 1000) + 60 * 60 * 24 * 7,
    });
    const response = json({
      wallet: profile.walletAddress,
      email: profile.email,
      country: profile.country,
      profileId: profile.id,
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    response.cookies.set(NONCE_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  });
}
