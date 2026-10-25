/** EU-27. UK is optional via GEO_BLOCK_UK. */
export const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
] as const;

const EU = new Set<string>(EU_COUNTRIES);

export function normalizeCountry(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (code === "UK") return "GB";
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

export function ukBlocked(): boolean {
  return process.env.GEO_BLOCK_UK === "true" || process.env.NEXT_PUBLIC_GEO_BLOCK_UK === "true";
}

export function isBlockedCountry(code: string | null, blockUk = ukBlocked()): boolean {
  if (!code) return false;
  if (EU.has(code)) return true;
  if (blockUk && code === "GB") return true;
  return false;
}

/** Block when either the profile country or the edge header is in a blocked region. */
export function executionBlocked(
  profileCountry: string | null,
  headerCountry: string | null,
  blockUk = ukBlocked(),
): boolean {
  return isBlockedCountry(profileCountry, blockUk) || isBlockedCountry(headerCountry, blockUk);
}

export function countryFromHeaders(headerList: { get(name: string): string | null }): string | null {
  return (
    normalizeCountry(headerList.get("cf-ipcountry")) ??
    normalizeCountry(headerList.get("x-vercel-ip-country")) ??
    normalizeCountry(headerList.get("x-country-code"))
  );
}
