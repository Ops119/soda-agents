import { randomUUID } from "crypto";
import { catalogAgents, catalogListings } from "../catalog";
import type {
  ApiKeyRecord,
  Database,
  FreeCheck,
  Licence,
  NonceRecord,
  Order,
  Payment,
  Profile,
  Store,
  UsageEvent,
} from "./types";

export function emptyDatabase(): Database {
  return {
    profiles: [],
    agents: [],
    listings: [],
    orders: [],
    payments: [],
    licences: [],
    apiKeys: [],
    usage: [],
    nonces: [],
    freeChecks: [],
  };
}

/** Insert catalogue rows that are missing. Never overwrites, so operator edits stick. */
export function ensureCatalog(db: Database) {
  for (const agent of catalogAgents()) {
    if (!db.agents.some((row) => row.id === agent.id)) db.agents.push({ ...agent });
  }
  for (const listing of catalogListings()) {
    if (!db.listings.some((row) => row.id === listing.id)) db.listings.push({ ...listing });
  }
}

export function createMemoryStore(db: Database = emptyDatabase(), persist: () => void = () => {}): Store {
  ensureCatalog(db);

  const save = () => persist();

  return {
    async ready() {
      ensureCatalog(db);
      save();
    },
    async listAgents() {
      return db.agents.filter((agent) => agent.isActive);
    },
    async getAgent(id) {
      return db.agents.find((agent) => agent.id === id) ?? null;
    },
    async getAgentBySlug(slug) {
      return db.agents.find((agent) => agent.slug === slug) ?? null;
    },
    async listListings() {
      return db.listings;
    },
    async getListing(id) {
      return db.listings.find((listing) => listing.id === id) ?? null;
    },
    async getProfile(id) {
      return db.profiles.find((profile) => profile.id === id) ?? null;
    },
    async getProfileByWallet(wallet) {
      return db.profiles.find((profile) => profile.walletAddress === wallet) ?? null;
    },
    async upsertProfile(wallet, country) {
      const existing = db.profiles.find((profile) => profile.walletAddress === wallet);
      if (existing) {
        if (country && !existing.country) existing.country = country;
        save();
        return existing;
      }
      const profile: Profile = {
        id: randomUUID(),
        walletAddress: wallet,
        email: null,
        country,
        createdAt: new Date().toISOString(),
      };
      db.profiles.push(profile);
      save();
      return profile;
    },
    async updateProfile(id, patch) {
      const profile = db.profiles.find((row) => row.id === id);
      if (!profile) return null;
      if (patch.email !== undefined) profile.email = patch.email;
      if (patch.country !== undefined) profile.country = patch.country;
      save();
      return profile;
    },
    async createNonce(nonce, expiresAt) {
      db.nonces.push({ nonce, expiresAt, usedAt: null });
      save();
    },
    async consumeNonce(nonce, now) {
      const row = db.nonces.find((item) => item.nonce === nonce);
      if (!row || row.usedAt) return false;
      if (new Date(row.expiresAt).getTime() <= now.getTime()) return false;
      row.usedAt = now.toISOString();
      save();
      return true;
    },
    async createOrder(order) {
      db.orders.push(order);
      save();
      return order;
    },
    async getOrder(id) {
      return db.orders.find((order) => order.id === id) ?? null;
    },
    async saveOrder(order) {
      const index = db.orders.findIndex((row) => row.id === order.id);
      if (index === -1) throw new Error("Order not found.");
      db.orders[index] = order;
      save();
    },
    async getPaymentBySignature(signature) {
      return db.payments.find((payment) => payment.txSignature === signature) ?? null;
    },
    async getPaymentByOrder(orderId) {
      return db.payments.find((payment) => payment.orderId === orderId) ?? null;
    },
    async insertPayment(payment) {
      const bySig = db.payments.find((row) => row.txSignature === payment.txSignature);
      if (bySig) return bySig.orderId === payment.orderId ? "duplicate" : "replay";
      const byOrder = db.payments.find((row) => row.orderId === payment.orderId);
      if (byOrder) return "order_taken";
      db.payments.push(payment);
      save();
      return "inserted";
    },
    async listLicencesByOrder(orderId) {
      return db.licences.filter((licence) => licence.orderId === orderId);
    },
    async listLicencesByProfile(profileId) {
      return db.licences.filter((licence) => licence.profileId === profileId);
    },
    async getLicence(id) {
      return db.licences.find((licence) => licence.id === id) ?? null;
    },
    async insertLicence(licence) {
      const exists = db.licences.some(
        (row) => row.orderId === licence.orderId && row.agentId === licence.agentId,
      );
      if (exists) return "exists";
      db.licences.push(licence);
      save();
      return "inserted";
    },
    async saveLicence(licence) {
      const index = db.licences.findIndex((row) => row.id === licence.id);
      if (index === -1) throw new Error("Licence not found.");
      db.licences[index] = licence;
      save();
    },
    async listKeysByLicence(licenceId) {
      return db.apiKeys.filter((key) => key.licenceId === licenceId);
    },
    async findKeysByHash(hash) {
      return db.apiKeys.filter((key) => key.keyHash === hash);
    },
    async insertApiKey(key) {
      const live = db.apiKeys.some((row) => row.licenceId === key.licenceId && !row.revokedAt);
      if (live) throw new Error("duplicate live api key");
      db.apiKeys.push(key);
      save();
    },
    async saveApiKey(key) {
      const index = db.apiKeys.findIndex((row) => row.id === key.id);
      if (index === -1) throw new Error("API key not found.");
      db.apiKeys[index] = key;
      save();
    },
    async logUsage(event) {
      db.usage.push(event);
      save();
    },
    async freeCheckCount(agentId, bucket, day) {
      return (
        db.freeChecks.find((item) => item.agentId === agentId && item.bucket === bucket && item.day === day)
          ?.count ?? 0
      );
    },
    async bumpFreeCheck(agentId, bucket, day) {
      let row = db.freeChecks.find(
        (item) => item.agentId === agentId && item.bucket === bucket && item.day === day,
      );
      if (!row) {
        row = { agentId, bucket, day, count: 0 };
        db.freeChecks.push(row);
      }
      row.count += 1;
      save();
      return row.count;
    },
    async reserveFreeCheck(agentId, bucket, day, max) {
      if (!Number.isInteger(max) || max <= 0) return false;
      let row = db.freeChecks.find(
        (item) => item.agentId === agentId && item.bucket === bucket && item.day === day,
      );
      if (!row) {
        row = { agentId, bucket, day, count: 0 };
        db.freeChecks.push(row);
      }
      if (row.count >= max) return false;
      row.count += 1;
      save();
      return true;
    },
    async releaseFreeCheck(agentId, bucket, day) {
      const row = db.freeChecks.find(
        (item) => item.agentId === agentId && item.bucket === bucket && item.day === day,
      );
      if (!row || row.count <= 0) return;
      row.count -= 1;
      save();
    },
    async licencesNeedingReminder(now) {
      const horizon = now.getTime() + 3 * 24 * 60 * 60 * 1000;
      const rows: Array<Licence & { email: string | null; agentName: string }> = [];
      for (const licence of db.licences) {
        if (licence.status !== "active" || !licence.endsAt || licence.reminderSentAt) continue;
        const ends = new Date(licence.endsAt).getTime();
        if (ends <= now.getTime() || ends > horizon) continue;
        const profile = db.profiles.find((item) => item.id === licence.profileId);
        const agent = db.agents.find((item) => item.id === licence.agentId);
        if (!profile?.email || !agent) continue;
        rows.push({ ...licence, email: profile.email, agentName: agent.name });
      }
      return rows;
    },
  };
}

export type { ApiKeyRecord, FreeCheck, NonceRecord, Order, Payment, UsageEvent };
