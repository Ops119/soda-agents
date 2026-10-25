import { keyLooksValid, hashApiKey } from "../api-key";
import type { AgentRecord } from "../catalog";
import type { ApiKeyRecord, Licence, Store } from "../store/types";

export type AuthOk = { ok: true; apiKey: ApiKeyRecord; licence: Licence };
export type AuthFail = { ok: false; status: number; error: string };

export function licenceUsable(licence: Licence, now: Date): string | null {
  if (licence.status === "revoked") return "This licence was revoked.";
  if (licence.status === "expired") return "This licence has expired.";
  if (licence.endsAt && new Date(licence.endsAt).getTime() <= now.getTime()) {
    return "This licence has expired.";
  }
  if (licence.creditsLeft != null && licence.creditsLeft <= 0) {
    return "This licence has no credits left.";
  }
  return null;
}

export async function authorizeApiKey(
  store: Store,
  token: string | null,
  agent: AgentRecord,
  now = new Date(),
): Promise<AuthOk | AuthFail> {
  if (!token || !keyLooksValid(token)) {
    return { ok: false, status: 401, error: "Missing or invalid API key." };
  }
  const keys = await store.findKeysByHash(hashApiKey(token));
  if (keys.length === 0) {
    return { ok: false, status: 401, error: "API key was not recognised." };
  }
  const activeKeys = keys.filter((key) => !key.revokedAt);
  if (activeKeys.length === 0) {
    return { ok: false, status: 401, error: "This API key was revoked." };
  }

  let sawAgent = false;
  let lastError = "This licence cannot be used.";
  for (const key of activeKeys) {
    const licence = await store.getLicence(key.licenceId);
    if (!licence || licence.agentId !== agent.id) continue;
    sawAgent = true;
    const problem = licenceUsable(licence, now);
    if (problem) {
      lastError = problem;
      continue;
    }
    return { ok: true, apiKey: key, licence };
  }

  if (!sawAgent) {
    return { ok: false, status: 403, error: "This key does not include that agent." };
  }
  const expired = lastError.includes("expired");
  return { ok: false, status: expired ? 403 : 402, error: lastError };
}
