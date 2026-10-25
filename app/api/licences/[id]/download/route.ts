import { createClient } from "@supabase/supabase-js";
import { currentProfile } from "@/lib/current";
import { readKit, signDownload } from "@/lib/downloads";
import { json, originOk, run } from "@/lib/http";
import { appOrigin } from "@/lib/siws";
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
    if (licence.status === "revoked") return json({ error: "This licence was revoked." }, 409);
    const agent = await store.getAgent(licence.agentId);
    if (!agent || agent.delivery !== "kit") {
      return json({ error: "This licence is for a hosted agent, not a download." }, 400);
    }
    const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    const zip = readKit(agent.slug);
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const objectPath = `${licence.id}/${agent.slug}.zip`;
        const uploaded = await admin.storage.from("kits").upload(objectPath, zip, {
          contentType: "application/zip",
          upsert: true,
        });
        if (!uploaded.error) {
          const signed = await admin.storage.from("kits").createSignedUrl(objectPath, 24 * 60 * 60);
          if (signed.data?.signedUrl) return json({ url: signed.data.signedUrl, expiresIn: "24h" });
        }
      } catch {
        // Fall through to the local signed URL.
      }
    }
    const signature = signDownload(licence.id, exp);
    const url = `${appOrigin()}/api/downloads/${licence.id}?exp=${exp}&sig=${encodeURIComponent(signature)}`;
    return json({ url, expiresIn: "24h" });
  });
}
