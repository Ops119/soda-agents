import { readKit, verifyDownload } from "@/lib/downloads";
import { json, run } from "@/lib/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ licenceId: string }> }) {
  return run(async () => {
    const { licenceId } = await context.params;
    const url = new URL(request.url);
    const exp = Number(url.searchParams.get("exp"));
    const sig = url.searchParams.get("sig") ?? "";
    if (!verifyDownload(licenceId, exp, sig)) {
      return json({ error: "This download link has expired." }, 401);
    }
    const store = getStore();
    const licence = await store.getLicence(licenceId);
    if (!licence || licence.status === "revoked") return json({ error: "Licence not found." }, 404);
    const agent = await store.getAgent(licence.agentId);
    if (!agent || agent.delivery !== "kit") return json({ error: "Nothing to download." }, 404);
    const zip = readKit(agent.slug);
    return new Response(new Uint8Array(zip), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${agent.slug}.zip"`,
        "cache-control": "no-store",
      },
    });
  });
}
