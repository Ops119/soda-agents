import { currentProfile } from "@/lib/current";
import { json, originOk, run } from "@/lib/http";
import { getStore } from "@/lib/store";
import { profileSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  return run(async () => {
    if (!originOk(request)) return json({ error: "Origin was rejected." }, 403);
    const current = await currentProfile();
    if (!current) return json({ error: "Sign in first." }, 401);
    const parsed = profileSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Check the email and country." }, 400);
    const profile = await getStore().updateProfile(current.profile.id, {
      email: parsed.data.email,
      country: parsed.data.country,
    });
    return json({
      email: profile?.email ?? null,
      country: profile?.country ?? null,
    });
  });
}
