/** ISO 3166-1 alpha-2 codes we accept on a profile. Names come from Intl. */
export const COUNTRY_CODES = [
  "AR","AU","AT","BE","BR","BG","CA","CL","CO","HR","CY","CZ","DK","EE","FI","FR",
  "DE","GH","GR","HK","HU","IS","IN","ID","IE","IL","IT","JP","KE","LV","LT","LU",
  "MY","MT","MX","NL","NZ","NG","NO","PH","PL","PT","RO","SA","SG","SK","SI","ZA",
  "KR","ES","SE","CH","TW","TH","TR","UA","AE","GB","US","UY","VN",
] as const;

export function countryLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
