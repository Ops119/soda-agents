import { randomUUID, createHash } from "crypto";
import type { AgentRecord } from "../catalog";
import { withLock } from "../lock";
import { rateLimit } from "../rate-limit";
import { sessionSecret } from "../session";
import type { Store } from "../store/types";
import { executionBlocked } from "../geo";
import { authorizeApiKey } from "./authorize";
import { stubReply } from "./stub";

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${sessionSecret()}:${ip}`).digest("hex").slice(0, 32);
}

export function endpointAllowed(url: string): boolean {
  if (url === "stub:echo") return true;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (parsed.port && parsed.port !== "443") return false;
  const allow = (process.env.AGENT_ENDPOINT_ALLOWLIST ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(parsed.hostname.toLowerCase());
}

async function forward(agent: AgentRecord, prompt: string): Promise<unknown> {
  if (agent.endpointUrl === "stub:echo") return stubReply(agent, prompt);
  if (!endpointAllowed(agent.endpointUrl)) {
    throw new Error("endpoint");
  }
  const response = await fetch(agent.endpointUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, agent: agent.slug }),
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error("upstream");
  }
  return { sample: false, body: text.slice(0, 8000) };
}

export async function accessAgent(input: {
  store: Store;
  agent: AgentRecord;
  authorization: string | null;
  prompt: string;
  ip: string;
  headerCountry: string | null;
  now?: Date;
}): Promise<{ status: number; body: unknown }> {
  const now = input.now ?? new Date();
  if (!input.agent.isActive) {
    return { status: 404, body: { error: "This agent is not available." } };
  }
  if (input.agent.delivery === "kit") {
    return {
      status: 403,
      body: { error: "This purchase is a kit. Download it from your dashboard." },
    };
  }
  if (input.agent.execution && executionBlocked(null, input.headerCountry)) {
    return {
      status: 451,
      body: { error: "Execution agents are unavailable in your region." },
    };
  }

  const header = input.authorization?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const day = now.toISOString().slice(0, 10);

  if (!header) {
    const free = input.agent.freeDailyChecks ?? 0;
    if (free <= 0) {
      return { status: 401, body: { error: "An API key is required." } };
    }
    const bucket = hashIp(input.ip);
    const reserved = await input.store.reserveFreeCheck(input.agent.id, bucket, day, free);
    if (!reserved) {
      return {
        status: 402,
        body: { error: `The ${free} free checks for today are used. A 30-day pass removes the cap.` },
      };
    }
    try {
      const body = await forward(input.agent, input.prompt);
      await input.store.logUsage({
        id: randomUUID(),
        apiKeyId: null,
        agentId: input.agent.id,
        units: 1,
        createdAt: now.toISOString(),
      });
      return { status: 200, body };
    } catch {
      await input.store.releaseFreeCheck(input.agent.id, bucket, day);
      return { status: 502, body: { error: "The agent did not answer." } };
    }
  }

  const auth = await authorizeApiKey(input.store, header, input.agent, now);
  if (!auth.ok) return { status: auth.status, body: { error: auth.error } };
  if (input.agent.execution) {
    const owner = await input.store.getProfile(auth.licence.profileId);
    if (executionBlocked(owner?.country ?? null, input.headerCountry)) {
      return {
        status: 451,
        body: { error: "Execution agents are unavailable in your region." },
      };
    }
  }

  const perMinute = await rateLimit(`key:${auth.apiKey.id}`, 30, 60);
  if (!perMinute.ok) {
    return { status: 429, body: { error: "Too many calls. Wait a minute and try again." } };
  }

  const spent = await withLock(`licence:${auth.licence.id}`, async () => {
    const fresh = await input.store.getLicence(auth.licence.id);
    if (!fresh) return false;
    if (fresh.creditsLeft == null) return true;
    if (fresh.creditsLeft <= 0) return false;
    await input.store.saveLicence({ ...fresh, creditsLeft: fresh.creditsLeft - 1 });
    return true;
  });
  if (!spent) {
    return { status: 402, body: { error: "This licence has no credits left." } };
  }

  try {
    const body = await forward(input.agent, input.prompt);
    await input.store.saveApiKey({ ...auth.apiKey, lastUsedAt: now.toISOString() });
    await input.store.logUsage({
      id: randomUUID(),
      apiKeyId: auth.apiKey.id,
      agentId: input.agent.id,
      units: 1,
      createdAt: now.toISOString(),
    });
    return { status: 200, body };
  } catch (error) {
    if (auth.licence.creditsLeft != null) {
      const fresh = await input.store.getLicence(auth.licence.id);
      if (fresh && fresh.creditsLeft != null) {
        await input.store.saveLicence({ ...fresh, creditsLeft: fresh.creditsLeft + 1 });
      }
    }
    const endpoint = error instanceof Error && error.message === "endpoint";
    return {
      status: 502,
      body: { error: endpoint ? "This agent endpoint is not allowlisted." : "The agent did not answer." },
    };
  }
}
