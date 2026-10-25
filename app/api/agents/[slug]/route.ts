import { accessAgent } from "@/lib/gateway/access";
import { countryFromHeaders } from "@/lib/geo";
import { clientIp, json, run } from "@/lib/http";
import { getStore } from "@/lib/store";
import { promptSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  return run(async () => {
    const { slug } = await context.params;
    if (!/^[a-z0-9-]{1,64}$/.test(slug)) return json({ error: "Unknown agent." }, 404);
    const store = getStore();
    const agent = await store.getAgentBySlug(slug);
    if (!agent || !agent.isActive) return json({ error: "Unknown agent." }, 404);
    const parsed = promptSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Send a prompt of 1 to 4000 characters." }, 400);
    const result = await accessAgent({
      store,
      agent,
      authorization: request.headers.get("authorization"),
      prompt: parsed.data.prompt,
      ip: clientIp(request),
      headerCountry: countryFromHeaders(request.headers),
    });
    return json(result.body, result.status);
  });
}
