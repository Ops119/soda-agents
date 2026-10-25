import { currentProfile } from "@/lib/current";
import { json, originOk, run } from "@/lib/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(async () => {
    if (!originOk(request)) return json({ error: "Origin was rejected." }, 403);
    const current = await currentProfile();
    if (!current) return json({ error: "Sign in first." }, 401);
    const { id } = await context.params;
    const store = getStore();
    const licence = await store.getLicence(id);
    if (!licence || licence.profileId !== current.profile.id) return json({ error: "Licence not found." }, 404);
    const now = new Date().toISOString();
    await store.saveLicence({ ...licence, status: "revoked" });
    const keys = await store.listKeysByLicence(licence.id);
    for (const key of keys) {
      if (!key.revokedAt) await store.saveApiKey({ ...key, revokedAt: now });
    }
    return json({ ok: true });
  });
}
