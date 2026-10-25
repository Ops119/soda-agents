import { randomUUID } from "crypto";
import { generateApiKey } from "../api-key";
import type { AgentRecord, ListingRecord } from "../catalog";
import { agentsCoveredBy } from "../coverage";
import { withLock } from "../lock";
import type { Licence, Payment, Store } from "../store/types";
import type { ObservedTransfer } from "./match";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function insertLiveKey(store: Store, key: Parameters<Store["insertApiKey"]>[0]): Promise<boolean> {
  try {
    await store.insertApiKey(key);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/duplicate|unique|23505/i.test(message)) return false;
    throw error;
  }
}

export type SettleResult =
  | {
      ok: true;
      alreadyIssued: boolean;
      apiKey: string | null;
      licences: Licence[];
    }
  | { ok: false; error: "replay" | "order_taken" | "expired" | "empty" };

export async function settleOrder(
  store: Store,
  orderId: string,
  observed: ObservedTransfer,
  listing: ListingRecord,
  agents: AgentRecord[],
  listings: ListingRecord[],
  now = new Date(),
): Promise<SettleResult> {
  return withLock("payments", () =>
    settleUnlocked(store, orderId, observed, listing, agents, listings, now),
  );
}

async function settleUnlocked(
  store: Store,
  orderId: string,
  observed: ObservedTransfer,
  listing: ListingRecord,
  agents: AgentRecord[],
  listings: ListingRecord[],
  now: Date,
): Promise<SettleResult> {
  const order = await store.getOrder(orderId);
  if (!order) return { ok: false, error: "empty" };

  const covered = agentsCoveredBy(listing, agents, listings).filter((agent) => agent.isActive);
  if (covered.length === 0) return { ok: false, error: "empty" };

  const expiresAt = new Date(order.expiresAt).getTime();
  const paidAtMs = observed.blockTime != null ? observed.blockTime * 1000 : now.getTime();
  if (paidAtMs > expiresAt) {
    if (order.status === "pending") {
      await store.saveOrder({ ...order, status: "expired" });
    }
    return { ok: false, error: "expired" };
  }

  if (order.status === "paid") {
    const licences = await store.listLicencesByOrder(order.id);
    return { ok: true, alreadyIssued: true, apiKey: null, licences };
  }

  const bySignature = await store.getPaymentBySignature(observed.signature);
  if (bySignature && bySignature.orderId !== order.id) return { ok: false, error: "replay" };
  const byOrder = await store.getPaymentByOrder(order.id);
  if (byOrder && byOrder.txSignature !== observed.signature) return { ok: false, error: "order_taken" };

  if (!byOrder) {
    const payment: Payment = {
      id: randomUUID(),
      orderId: order.id,
      txSignature: observed.signature,
      payer: observed.payer ?? "unknown",
      amount: order.amountUsdc,
      slot: observed.slot,
      verifiedAt: now.toISOString(),
    };
    const inserted = await store.insertPayment(payment);
    if (inserted === "replay") return { ok: false, error: "replay" };
    if (inserted === "order_taken" || inserted === "duplicate") {
      const winner = await store.getPaymentByOrder(order.id);
      if (!winner || winner.txSignature !== observed.signature) return { ok: false, error: "order_taken" };
    } else if (inserted !== "inserted") {
      return { ok: false, error: "order_taken" };
    }
  }

  const startsAt = new Date(paidAtMs).toISOString();
  const endsAt = listing.kind === "pass_30d" ? new Date(paidAtMs + THIRTY_DAYS_MS).toISOString() : null;
  const licences: Licence[] = [];
  for (const agent of covered) {
    const licence: Licence = {
      id: randomUUID(),
      profileId: order.profileId,
      agentId: agent.id,
      orderId: order.id,
      startsAt,
      endsAt,
      creditsLeft: null,
      status: "active",
      reminderSentAt: null,
    };
    const result = await store.insertLicence(licence);
    if (result === "inserted") {
      licences.push(licence);
    }
  }
  const stored = await store.listLicencesByOrder(order.id);
  const existingKeys = (
    await Promise.all(stored.map((licence) => store.listKeysByLicence(licence.id)))
  ).flat();
  const live = existingKeys.find((key) => !key.revokedAt) ?? null;
  let plaintext: string | null = null;

  if (live) {
    for (const licence of stored) {
      const keys = await store.listKeysByLicence(licence.id);
      if (keys.some((key) => !key.revokedAt)) continue;
      await insertLiveKey(store, {
        id: randomUUID(),
        licenceId: licence.id,
        keyHash: live.keyHash,
        prefix: live.prefix,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: now.toISOString(),
      });
    }
  } else {
    const generated = generateApiKey();
    let wrote = false;
    for (const licence of stored) {
      const wroteRow = await insertLiveKey(store, {
        id: randomUUID(),
        licenceId: licence.id,
        keyHash: generated.hash,
        prefix: generated.prefix,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: now.toISOString(),
      });
      wrote = wrote || wroteRow;
    }
    if (wrote) plaintext = generated.plaintext;
  }

  await store.saveOrder({ ...order, status: "paid" });
  return {
    ok: true,
    alreadyIssued: plaintext == null,
    apiKey: plaintext,
    licences: stored,
  };
}
