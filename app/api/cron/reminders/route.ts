import { secretsEqual } from "@/lib/api-key";
import { bearer, json, run } from "@/lib/http";
import { sendExpiryReminders } from "@/lib/reminders";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return run(async () => {
    const secret = process.env.CRON_SECRET;
    const got = bearer(request) ?? "";
    if (!secret || secret.length < 16) {
      return json({ error: "CRON_SECRET is not configured." }, 503);
    }
    if (got.length !== secret.length || !secretsEqual(got, secret)) {
      return json({ error: "Unauthorised." }, 401);
    }
    const result = await sendExpiryReminders(getStore());
    return json(result);
  });
}
