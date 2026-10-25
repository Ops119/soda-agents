import bs58 from "bs58";
import nacl from "tweetnacl";
import { describe, expect, it } from "vitest";
import { buildSiwsMessage, domainMatchesApp, parseSiwsMessage, validateSiwsFields, verifySolanaSignature } from "../lib/siws";
import { passSumCents, AGENT_SEEDS, catalogListings } from "../lib/catalog";
import { bundleCents, centsToUsdc } from "../lib/money";

function message(patch: Partial<Parameters<typeof buildSiwsMessage>[0]> = {}) {
  return buildSiwsMessage({
    domain: "127.0.0.1:43123",
    address: "Addr",
    uri: "http://127.0.0.1:43123",
    version: "1",
    chain: "solana:devnet",
    nonce: "nonce-1",
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 60_000).toISOString(),
    ...patch,
  });
}

describe("sign-in message", () => {
  it("round-trips a devnet message and a real signature", () => {
    const pair = nacl.sign.keyPair();
    const address = bs58.encode(pair.publicKey);
    const text = message({ address });
    const fields = parseSiwsMessage(text);
    expect(fields?.chain).toBe("solana:devnet");
    expect(fields?.domain).toBe("127.0.0.1:43123");
    expect(domainMatchesApp("127.0.0.1:43123") || domainMatchesApp("localhost:43123")).toBe(true);
    expect(fields?.address).toBe(address);
    const signature = nacl.sign.detached(new TextEncoder().encode(text), pair.secretKey);
    expect(verifySolanaSignature(text, bs58.encode(signature), address)).toBe(true);
    expect(verifySolanaSignature(text, bs58.encode(signature), bs58.encode(nacl.sign.keyPair().publicKey))).toBe(false);
  });

  it("rejects a mainnet chain and an expired message", () => {
    const mainnet = parseSiwsMessage(message({ chain: "solana:mainnet" }));
    expect(mainnet && validateSiwsFields(mainnet)).toMatch(/devnet/i);
    const expired = parseSiwsMessage(
      message({ expirationTime: new Date(Date.now() - 1000).toISOString() }),
    );
    expect(expired && validateSiwsFields(expired)).toMatch(/expired/i);
  });
});

describe("catalogue", () => {
  it("seeds 29 agents, unsold pay-per-call rows, and 40% bundle prices", () => {
    expect(AGENT_SEEDS).toHaveLength(29);
    const listings = catalogListings();
    expect(listings.filter((listing) => listing.kind === "ppu").every((listing) => !listing.isPurchasable)).toBe(true);
    expect(listings.find((listing) => listing.scope === "all")?.priceUsdc).toBe("99.00");
    expect(listings.find((listing) => listing.sector === "defi" && listing.scope === "sector")?.priceUsdc).toBe(
      centsToUsdc(bundleCents(passSumCents("defi"))),
    );
    expect(centsToUsdc(bundleCents(passSumCents("defi")))).toBe("79.80");
    expect(centsToUsdc(bundleCents(passSumCents("depin")))).toBe("22.20");
    expect(centsToUsdc(bundleCents(passSumCents("memecoins")))).toBe("54.60");
    expect(centsToUsdc(bundleCents(passSumCents("copy")))).toBe("58.20");
    expect(centsToUsdc(bundleCents(passSumCents("dev")))).toBe("26.40");
  });
});
