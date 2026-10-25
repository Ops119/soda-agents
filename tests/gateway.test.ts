import { describe, expect, it } from "vitest";
import { generateApiKey } from "../lib/api-key";
import { catalogAgents } from "../lib/catalog";
import { accessAgent, endpointAllowed } from "../lib/gateway/access";
import { authorizeApiKey } from "../lib/gateway/authorize";
import { createMemoryStore } from "../lib/store/memory";
import type { Licence } from "../lib/store/types";

const yieldAgent = catalogAgents().find((agent) => agent.slug === "yield-scanner")!;
const rug = catalogAgents().find((agent) => agent.slug === "rug-checker")!;
const dca = catalogAgents().find((agent) => agent.slug === "dca-executor")!;

async function licensed(agentId: string, patch: Partial<Licence> = {}) {
  const store = createMemoryStore();
  const profile = await store.upsertProfile("Wallet111", "US");
  const licence: Licence = {
    id: "lic-1",
    profileId: profile.id,
    agentId,
    orderId: "order-1",
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 86_400_000).toISOString(),
    creditsLeft: null,
    status: "active",
    reminderSentAt: null,
    ...patch,
  };
  await store.insertLicence(licence);
  const key = generateApiKey();
  await store.insertApiKey({
    id: "key-1",
    licenceId: licence.id,
    keyHash: key.hash,
    prefix: key.prefix,
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date().toISOString(),
  });
  return { store, key, licence, profile };
}

describe("API key auth", () => {
  it("accepts a live key for the licensed agent", async () => {
    const { store, key } = await licensed(yieldAgent.id);
    const result = await authorizeApiKey(store, key.plaintext, yieldAgent);
    expect(result.ok).toBe(true);
  });

  it("rejects an expired licence", async () => {
    const { store, key } = await licensed(yieldAgent.id, {
      endsAt: new Date(Date.now() - 1000).toISOString(),
    });
    const result = await authorizeApiKey(store, key.plaintext, yieldAgent);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/expired/i);
  });

  it("rejects a revoked key", async () => {
    const { store, key } = await licensed(yieldAgent.id);
    const rows = await store.findKeysByHash(key.hash);
    await store.saveApiKey({ ...rows[0], revokedAt: new Date().toISOString() });
    const result = await authorizeApiKey(store, key.plaintext, yieldAgent);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("rejects a key for a different agent", async () => {
    const { store, key } = await licensed(yieldAgent.id);
    const result = await authorizeApiKey(store, key.plaintext, rug);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("rejects a licence with no credits left", async () => {
    const { store, key } = await licensed(yieldAgent.id, { creditsLeft: 0 });
    const result = await authorizeApiKey(store, key.plaintext, yieldAgent);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(402);
  });
});

describe("gateway access", () => {
  it("allows the free rug checks and then stops", async () => {
    const store = createMemoryStore();
    const body = { store, agent: rug, authorization: null, prompt: "mint", ip: "203.0.113.8", headerCountry: null };
    const first = await accessAgent(body);
    const second = await accessAgent(body);
    const third = await accessAgent(body);
    const fourth = await accessAgent(body);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
    expect(fourth.status).toBe(402);
  });

  it("blocks execution agents for an EU country header", async () => {
    const { store, key } = await licensed(dca.id);
    const result = await accessAgent({
      store,
      agent: dca,
      authorization: `Bearer ${key.plaintext}`,
      prompt: "buy 10 USDC of SOL each week",
      ip: "203.0.113.9",
      headerCountry: "DE",
    });
    expect(result.status).toBe(451);
  });

  it("only forwards to stub or an allowlisted https host", () => {
    expect(endpointAllowed("stub:echo")).toBe(true);
    expect(endpointAllowed("http://example.com/agent")).toBe(false);
    expect(endpointAllowed("https://user:pass@example.com/agent")).toBe(false);
    const previous = process.env.AGENT_ENDPOINT_ALLOWLIST;
    process.env.AGENT_ENDPOINT_ALLOWLIST = "agents.example";
    expect(endpointAllowed("https://agents.example/run")).toBe(true);
    expect(endpointAllowed("https://agents.example.evil/run")).toBe(false);
    expect(endpointAllowed("https://evil.com@agents.example/run")).toBe(false);
    process.env.AGENT_ENDPOINT_ALLOWLIST = previous;
  });

  it("answers a licensed hosted agent through the stub", async () => {
    const { store, key } = await licensed(yieldAgent.id);
    const result = await accessAgent({
      store,
      agent: yieldAgent,
      authorization: `Bearer ${key.plaintext}`,
      prompt: "compare USDC yields",
      ip: "203.0.113.10",
      headerCountry: "US",
    });
    expect(result.status).toBe(200);
    expect(JSON.stringify(result.body)).toContain("holdsBuyerKeys");
  });
});
