import { randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, json, originOk, run } from "@/lib/http";
import { NONCE_COOKIE, sessionCookieOptions } from "@/lib/session";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return run(async () => {
    if (!originOk(request)) return json({ error: "Origin was rejected." }, 403);
    const limited = await rateLimit(`nonce:${clientIp(request)}`, 10, 60);
    if (!limited.ok) return json({ error: "Too many sign-in attempts. Wait a minute." }, 429);
    const nonce = randomBytes(24).toString("base64url");
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await getStore().createNonce(nonce, expires.toISOString());
    const response = json({ nonce });
    response.cookies.set(NONCE_COOKIE, nonce, { ...sessionCookieOptions(), maxAge: 60 * 10 });
    return response;
  });
}
