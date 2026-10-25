import { createHash } from "crypto";

/** Deterministic ids so the SQL seed and the local store stay aligned. */
export function stableId(key: string): string {
  const hex = createHash("sha256").update(`soda.agents.v1:${key}`).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}
