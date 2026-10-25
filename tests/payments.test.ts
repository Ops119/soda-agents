import { describe, expect, it } from "vitest";
import { catalogAgents, catalogListings } from "../lib/catalog";
import { usdcToMicros } from "../lib/money";
import { matchTransfer, type ObservedTransfer } from "../lib/payments/match";
import { observeTransfer, type ParsedChainTx } from "../lib/payments/parse";
import { settleOrder } from "../lib/payments/settle";
import { verifyObserved } from "../lib/payments/verify";
import { createMemoryStore } from "../lib/store/memory";
import type { Order } from "../lib/store/types";

const expected = {
  recipient: "Treasury1111111111111111111111111111111111",
  amountMicros: 19_000_000n,
  mint: "Mint11111111111111111111111111111111111111",
  reference: "Ref111111111111111111111111111111111111111",
};

function observed(patch: Partial<ObservedTransfer> = {}): ObservedTransfer {
  return {
    signature: "sig-1",
    slot: 10,
    blockTime: 1_700_000_000,
    failed: false,
    finalized: true,
    mint: expected.mint,
    recipient: expected.recipient,
    amountMicros: expected.amountMicros,
    references: ["payer", expected.reference],
    payer: "Payer111111111111111111111111111111111111",
    ...patch,
  };
}

describe("payment matching", () => {
  it("accepts an exact finalized USDC transfer", () => {
    expect(matchTransfer(expected, observed())).toBeNull();
  });

  it("rejects a smaller or larger amount", () => {
    expect(matchTransfer(expected, observed({ amountMicros: expected.amountMicros - 1n }))).toBe("amount");
    expect(matchTransfer(expected, observed({ amountMicros: expected.amountMicros + 1n }))).toBe("amount");
  });

  it("rejects the wrong mint", () => {
    expect(matchTransfer(expected, observed({ mint: "OtherMint111111111111111111111111111111111" }))).toBe("mint");
    expect(matchTransfer(expected, observed({ mint: null }))).toBe("mint");
  });

  it("rejects the wrong recipient and a self-payment", () => {
    expect(matchTransfer(expected, observed({ recipient: "Other111111111111111111111111111111111111" }))).toBe("recipient");
    expect(matchTransfer(expected, observed({ payer: expected.recipient }))).toBe("recipient");
  });

  it("rejects a missing reference", () => {
    expect(matchTransfer(expected, observed({ references: ["payer"] }))).toBe("reference");
  });

  it("rejects a failed or unfinalized transaction", () => {
    expect(matchTransfer(expected, observed({ failed: true }))).toBe("failed_tx");
    expect(matchTransfer(expected, observed({ finalized: false }))).toBe("not_finalized");
  });

  it("reads the USDC delta from token balances", () => {
    const tx: ParsedChainTx = {
      signature: "sig-1",
      slot: 3,
      blockTime: 10,
      failed: false,
      finalized: true,
      accountKeys: ["payer", expected.reference],
      payer: "payer",
      pre: [{ mint: expected.mint, owner: expected.recipient, amount: "100" }],
      post: [{ mint: expected.mint, owner: expected.recipient, amount: "19000100" }],
    };
    const seen = observeTransfer(tx, expected.mint, expected.recipient);
    expect(seen.amountMicros).toBe(19_000_000n);
    expect(matchTransfer(expected, seen)).toBeNull();
  });
});

describe("verifyObserved", () => {
  const load = async () =>
    ({
      signature: "sig-1",
      slot: 3,
      blockTime: 10,
      failed: false,
      finalized: true,
      accountKeys: ["payer", expected.reference],
      payer: "payer",
      pre: [],
      post: [{ mint: expected.mint, owner: expected.recipient, amount: expected.amountMicros.toString() }],
    }) satisfies ParsedChainTx;

  it("fails closed when validateTransfer reports an amount mismatch", async () => {
    const outcome = await verifyObserved({
      expected,
      findReference: async () => ({ signature: "sig-1" }),
      validateTransfer: async () => {
        throw new Error("amount mismatch");
      },
      load,
    });
    expect(outcome).toMatchObject({ status: "mismatch", reason: "amount" });
  });

  it("returns pending when the reference is not on-chain yet", async () => {
    const outcome = await verifyObserved({
      expected,
      findReference: async () => {
        const error = new Error("not found");
        error.name = "FindReferenceError";
        throw error;
      },
      validateTransfer: async () => undefined,
      load: async () => null,
    });
    expect(outcome.status).toBe("pending");
  });

  it("maps mint, recipient, and reference failures from validateTransfer", async () => {
    for (const reason of ["mint", "recipient", "reference"] as const) {
      const outcome = await verifyObserved({
        expected,
        findReference: async () => ({ signature: "sig-1" }),
        validateTransfer: async () => {
          throw new Error(`${reason} mismatch`);
        },
        load: async () => null,
      });
      expect(outcome).toMatchObject({ status: "mismatch", reason });
    }
  });
});

describe("settlement", () => {
  async function pendingOrder(signature = "sig-1") {
    const store = createMemoryStore();
    const profile = await store.upsertProfile("Wallet111", "US");
    const listings = catalogListings();
    const listing = listings.find((item) => item.label.startsWith("Yield scanner") && item.kind === "pass_30d");
    if (!listing) throw new Error("missing listing");
    const order: Order = {
      id: "order-1",
      profileId: profile.id,
      listingId: listing.id,
      amountUsdc: listing.priceUsdc,
      referencePubkey: "ref",
      status: "pending",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await store.createOrder(order);
    const agents = catalogAgents();
    const seen = observed({
      signature,
      amountMicros: usdcToMicros(listing.priceUsdc),
      blockTime: Math.floor(Date.now() / 1000),
    });
    return { store, listing, agents, listings, order, seen };
  }

  it("issues one licence and then treats the same signature as already issued", async () => {
    const { store, listing, agents, listings, order, seen } = await pendingOrder();
    const first = await settleOrder(store, order.id, seen, listing, agents, listings);
    const second = await settleOrder(store, order.id, seen, listing, agents, listings);
    expect(first.ok && first.apiKey).toBeTruthy();
    expect(second.ok && second.alreadyIssued).toBe(true);
    expect(await store.listLicencesByOrder(order.id)).toHaveLength(1);
    expect(await store.getPaymentByOrder(order.id)).toBeTruthy();
  });

  it("rejects a replayed signature on a different order", async () => {
    const { store, listing, agents, listings, seen } = await pendingOrder("replay-sig");
    await settleOrder(store, "order-1", seen, listing, agents, listings);
    const profile = await store.getProfileByWallet("Wallet111");
    await store.createOrder({
      id: "order-2",
      profileId: profile!.id,
      listingId: listing.id,
      amountUsdc: listing.priceUsdc,
      referencePubkey: "ref-2",
      status: "pending",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    const replay = await settleOrder(store, "order-2", seen, listing, agents, listings);
    expect(replay).toEqual({ ok: false, error: "replay" });
    expect(await store.listLicencesByOrder("order-2")).toHaveLength(0);
  });

  it("finishes a licence when the payment was saved but the order is still pending", async () => {
    const { store, listing, agents, listings, order, seen } = await pendingOrder("resume-sig");
    await store.insertPayment({
      id: "pay-resume",
      orderId: order.id,
      txSignature: seen.signature,
      payer: seen.payer ?? "payer",
      amount: order.amountUsdc,
      slot: seen.slot,
      verifiedAt: new Date().toISOString(),
    });
    const resumed = await settleOrder(store, order.id, seen, listing, agents, listings);
    expect(resumed.ok && resumed.apiKey).toBeTruthy();
    const licences = await store.listLicencesByOrder(order.id);
    expect(licences).toHaveLength(1);
    const paid = await store.getOrder(order.id);
    await store.saveOrder({ ...paid!, status: "pending" });
    const again = await settleOrder(store, order.id, seen, listing, agents, listings);
    expect(again.ok && again.alreadyIssued && again.apiKey == null).toBe(true);
    expect(await store.listKeysByLicence(licences[0].id)).toHaveLength(1);
    expect((await store.getOrder(order.id))?.status).toBe("paid");
  });

  it("does not licence a payment that landed after expiry", async () => {
    const { store, listing, agents, listings, order, seen } = await pendingOrder("late-sig");
    seen.blockTime = Math.floor(Date.now() / 1000) + 120;
    await store.saveOrder({ ...order, expiresAt: new Date(Date.now() - 1000).toISOString() });
    const result = await settleOrder(store, order.id, seen, listing, agents, listings);
    expect(result).toEqual({ ok: false, error: "expired" });
  });
});
