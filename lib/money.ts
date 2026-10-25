/** USDC amounts as integer cents in the catalogue, decimal strings at the boundary. */

export function centsToUsdc(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("Price must be a non-negative integer number of cents.");
  }
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return `${whole}.${frac.toString().padStart(2, "0")}`;
}

export function usdcToCents(usdc: string): number {
  const match = /^(\d+)\.(\d{2})$/.exec(usdc);
  if (!match) throw new Error("USDC amounts must be decimal strings with 2 places.");
  return Number(match[1]) * 100 + Number(match[2]);
}

/** 6 decimal places, as on the USDC mint. */
export function usdcToMicros(usdc: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(usdc);
  if (!match) throw new Error("Invalid USDC amount.");
  const whole = BigInt(match[1]);
  const frac = (match[2] ?? "").padEnd(6, "0");
  return whole * 1_000_000n + BigInt(frac);
}

export function microsToUsdc(micros: bigint): string {
  if (micros < 0n) throw new Error("Negative amount.");
  const whole = micros / 1_000_000n;
  const frac = (micros % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  if (!frac) return `${whole}.00`;
  const two = (micros % 1_000_000n).toString().padStart(6, "0").slice(0, 2);
  if (frac.length <= 2) return `${whole}.${two}`;
  return `${whole}.${(micros % 1_000_000n).toString().padStart(6, "0")}`;
}

export function formatUsdc(cents: number): string {
  return `$${centsToUsdc(cents)}`;
}

/** 40% off a sum of pass prices. Exact for the seeded catalogue. */
export function bundleCents(sumCents: number): number {
  if (!Number.isInteger(sumCents) || sumCents < 0) throw new Error("Bad bundle sum.");
  return Math.round((sumCents * 60) / 100);
}
