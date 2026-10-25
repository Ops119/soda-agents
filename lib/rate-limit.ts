type Bucket = { count: number; reset: number };
const memory = new Map<string, Bucket>();

export type LimitResult = { ok: true; remaining: number } | { ok: false; remaining: 0 };

async function upstashIncr(key: string, windowSec: number): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec],
      ]),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: number }[];
    const count = payload?.[0]?.result;
    return typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

function memoryIncr(key: string, windowSec: number): number {
  const now = Date.now();
  const current = memory.get(key);
  if (!current || current.reset <= now) {
    memory.set(key, { count: 1, reset: now + windowSec * 1000 });
    return 1;
  }
  current.count += 1;
  return current.count;
}

/** Fixed window. Uses Upstash when configured, and memory if it is not or it fails. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<LimitResult> {
  const bucket = `soda:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const remote = await upstashIncr(bucket, windowSec);
  const count = remote ?? memoryIncr(bucket, windowSec);
  if (count > limit) return { ok: false, remaining: 0 };
  return { ok: true, remaining: limit - count };
}

export function resetMemoryLimits() {
  memory.clear();
}
