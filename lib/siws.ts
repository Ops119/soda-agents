import bs58 from "bs58";
import nacl from "tweetnacl";

export type SiwsFields = {
  domain: string;
  address: string;
  uri: string;
  version: string;
  chain: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
};

export function buildSiwsMessage(fields: SiwsFields & { domain: string }): string {
  return [
    "Soda.agents wants you to sign in with your Solana account:",
    fields.address,
    "",
    "Sign in to buy and manage agent access. This does not authorise a transaction, move funds, or reveal your seed phrase.",
    "",
    `Domain: ${fields.domain}`,
    `URI: ${fields.uri}`,
    `Version: ${fields.version}`,
    `Chain: ${fields.chain}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
    `Expiration Time: ${fields.expirationTime}`,
  ].join("\n");
}

export function parseSiwsMessage(message: string): SiwsFields | null {
  const lines = message.split("\n");
  if (lines[0] !== "Soda.agents wants you to sign in with your Solana account:") return null;
  const address = lines[1]?.trim();
  if (!address) return null;
  const read = (prefix: string) => {
    const line = lines.find((entry) => entry.startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : null;
  };
  const domain = read("Domain: ");
  const uri = read("URI: ");
  const version = read("Version: ");
  const chain = read("Chain: ");
  const nonce = read("Nonce: ");
  const issuedAt = read("Issued At: ");
  const expirationTime = read("Expiration Time: ");
  if (!domain || !uri || !version || !chain || !nonce || !issuedAt || !expirationTime) return null;
  if (domain.length > 255 || /[\s/]/.test(domain)) return null;
  if (!lines.some((line) => line.includes("seed phrase"))) return null;
  return { domain, address, uri, version, chain, nonce, issuedAt, expirationTime };
}

export function verifySolanaSignature(message: string, signatureB58: string, address: string): boolean {
  try {
    const signature = bs58.decode(signatureB58);
    const publicKey = bs58.decode(address);
    if (signature.length !== 64 || publicKey.length !== 32) return false;
    return nacl.sign.detached.verify(new TextEncoder().encode(message), signature, publicKey);
  } catch {
    return false;
  }
}

export function validateSiwsFields(fields: SiwsFields, now = Date.now()): string | null {
  if (fields.chain !== "solana:devnet") return "Sign in on Solana devnet.";
  if (fields.version !== "1") return "Unsupported sign-in version.";
  const issued = Date.parse(fields.issuedAt);
  const expiration = Date.parse(fields.expirationTime);
  if (!Number.isFinite(issued) || !Number.isFinite(expiration)) return "Sign-in timestamps were not valid.";
  if (issued > now + 2 * 60 * 1000 || expiration <= now || expiration - issued > 15 * 60 * 1000) {
    return "Sign-in message has expired. Try again.";
  }
  return null;
}

export function appOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:43123";
  return new URL(raw).origin;
}

export function domainMatchesApp(domain: string): boolean {
  let expected: URL;
  try {
    expected = new URL(appOrigin());
  } catch {
    return false;
  }
  if (domain === expected.host) return true;
  if (process.env.NODE_ENV === "production") return false;
  const localHosts = new Set(["localhost", "127.0.0.1"]);
  const [host, port = ""] = domain.split(":");
  return localHosts.has(host) && localHosts.has(expected.hostname) && port === expected.port;
}

export function sameOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const incoming = new URL(origin).origin;
    const expected = new URL(appOrigin());
    if (incoming === expected.origin) return true;
    if (process.env.NODE_ENV !== "production") {
      const localHosts = new Set(["localhost", "127.0.0.1"]);
      const incomingUrl = new URL(incoming);
      return (
        localHosts.has(incomingUrl.hostname) &&
        localHosts.has(expected.hostname) &&
        incomingUrl.port === expected.port &&
        incomingUrl.protocol === expected.protocol
      );
    }
    return false;
  } catch {
    return false;
  }
}
