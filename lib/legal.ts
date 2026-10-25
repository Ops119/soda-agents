export function legalEntity() {
  return process.env.NEXT_PUBLIC_LEGAL_ENTITY || "Soda.agents";
}

export function contactEmail() {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@soda.agents";
}
