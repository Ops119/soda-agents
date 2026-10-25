import { json, originOk, run } from "@/lib/http";
import { NONCE_COOKIE, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return run(async () => {
    if (!originOk(request)) return json({ error: "Origin was rejected." }, 403);
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    response.cookies.set(NONCE_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  });
}
