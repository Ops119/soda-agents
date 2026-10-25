import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { catalogAgents, catalogListings, type AgentRecord, type ListingRecord } from "../catalog";
import type {
  ApiKeyRecord,
  Licence,
  Order,
  Payment,
  Profile,
  ReminderRow,
  Store,
  UsageEvent,
} from "./types";

type Row = Record<string, unknown>;

function price(value: unknown): string {
  if (typeof value === "number") return value.toFixed(2);
  const text = String(value);
  if (/^\d+\.\d$/.test(text)) return `${text}0`;
  if (/^\d+$/.test(text)) return `${text}.00`;
  return text;
}

function agent(row: Row): AgentRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    sector: row.sector as AgentRecord["sector"],
    summary: String(row.summary),
    riskLevel: row.risk_level as AgentRecord["riskLevel"],
    endpointUrl: String(row.endpoint_url),
    isActive: Boolean(row.is_active),
    execution: Boolean(row.execution),
    delivery: row.delivery as AgentRecord["delivery"],
    tier: row.tier as AgentRecord["tier"],
    freeDailyChecks: row.free_daily_checks == null ? null : Number(row.free_daily_checks),
    hint: String(row.hint ?? ""),
  };
}

function listing(row: Row): ListingRecord {
  return {
    id: String(row.id),
    agentId: row.agent_id == null ? null : String(row.agent_id),
    kind: row.kind as ListingRecord["kind"],
    priceUsdc: price(row.price_usdc),
    credits: row.credits == null ? null : Number(row.credits),
    scope: row.scope as ListingRecord["scope"],
    sector: row.sector == null ? null : (row.sector as ListingRecord["sector"]),
    label: String(row.label),
    isPurchasable: Boolean(row.is_purchasable),
  };
}

function profile(row: Row): Profile {
  return {
    id: String(row.id),
    walletAddress: String(row.wallet_address),
    email: row.email == null ? null : String(row.email),
    country: row.country == null ? null : String(row.country),
    createdAt: String(row.created_at),
  };
}

function order(row: Row): Order {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    listingId: String(row.listing_id),
    amountUsdc: price(row.amount_usdc),
    referencePubkey: String(row.reference_pubkey),
    status: row.status as Order["status"],
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
  };
}

function payment(row: Row): Payment {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    txSignature: String(row.tx_signature),
    payer: String(row.payer),
    amount: price(row.amount),
    slot: Number(row.slot),
    verifiedAt: String(row.verified_at),
  };
}

function licence(row: Row): Licence {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    agentId: String(row.agent_id),
    orderId: String(row.order_id),
    startsAt: String(row.starts_at),
    endsAt: row.ends_at == null ? null : String(row.ends_at),
    creditsLeft: row.credits_left == null ? null : Number(row.credits_left),
    status: row.status as Licence["status"],
    reminderSentAt: row.reminder_sent_at == null ? null : String(row.reminder_sent_at),
  };
}

function apiKey(row: Row): ApiKeyRecord {
  return {
    id: String(row.id),
    licenceId: String(row.licence_id),
    keyHash: String(row.key_hash),
    prefix: String(row.prefix),
    lastUsedAt: row.last_used_at == null ? null : String(row.last_used_at),
    revokedAt: row.revoked_at == null ? null : String(row.revoked_at),
    createdAt: String(row.created_at),
  };
}

function must<T>(data: T, error: { message: string; code?: string } | null): T {
  if (error) throw new Error(error.message);
  return data;
}

export function createSupabaseStore(url: string, serviceRoleKey: string): Store {
  const db: SupabaseClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async ready() {
      const probe = await db.from("agents").select("id").limit(1);
      if (probe.error) {
        throw new Error(`Supabase is not ready: ${probe.error.message}`);
      }
      const allAgents = await db.from("agents").select("id");
      if (allAgents.error) throw new Error(allAgents.error.message);
      const agentIds = new Set(((allAgents.data ?? []) as { id: string }[]).map((row) => row.id));
      const missingAgents = catalogAgents().filter((row) => !agentIds.has(row.id));
      if (missingAgents.length > 0) {
        const inserted = await db.from("agents").insert(
          missingAgents.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            sector: row.sector,
            summary: row.summary,
            risk_level: row.riskLevel,
            endpoint_url: row.endpointUrl,
            is_active: row.isActive,
            execution: row.execution,
            delivery: row.delivery,
            tier: row.tier,
            free_daily_checks: row.freeDailyChecks,
            hint: row.hint,
          })),
        );
        if (inserted.error) throw new Error(inserted.error.message);
      }
      const allListings = await db.from("listings").select("id");
      if (allListings.error) throw new Error(allListings.error.message);
      const listingIds = new Set(((allListings.data ?? []) as { id: string }[]).map((row) => row.id));
      const missingListings = catalogListings().filter((row) => !listingIds.has(row.id));
      if (missingListings.length > 0) {
        const inserted = await db.from("listings").insert(
          missingListings.map((row) => ({
            id: row.id,
            agent_id: row.agentId,
            kind: row.kind,
            price_usdc: row.priceUsdc,
            credits: row.credits,
            scope: row.scope,
            sector: row.sector,
            label: row.label,
            is_purchasable: row.isPurchasable,
          })),
        );
        if (inserted.error) throw new Error(inserted.error.message);
      }
    },
    async listAgents() {
      const { data, error } = await db.from("agents").select("*").eq("is_active", true);
      return must(data ?? [], error).map((row) => agent(row as Row));
    },
    async getAgent(id) {
      const { data, error } = await db.from("agents").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? agent(data as Row) : null;
    },
    async getAgentBySlug(slug) {
      const { data, error } = await db.from("agents").select("*").eq("slug", slug).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? agent(data as Row) : null;
    },
    async listListings() {
      const { data, error } = await db.from("listings").select("*");
      return must(data ?? [], error).map((row) => listing(row as Row));
    },
    async getListing(id) {
      const { data, error } = await db.from("listings").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? listing(data as Row) : null;
    },
    async getProfile(id) {
      const { data, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? profile(data as Row) : null;
    },
    async getProfileByWallet(wallet) {
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("wallet_address", wallet)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? profile(data as Row) : null;
    },
    async upsertProfile(wallet, country) {
      const existing = await this.getProfileByWallet(wallet);
      if (existing) {
        if (country && !existing.country) {
          return (await this.updateProfile(existing.id, { country })) ?? existing;
        }
        return existing;
      }
      const { data, error } = await db
        .from("profiles")
        .insert({ wallet_address: wallet, country })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return profile(data as Row);
    },
    async updateProfile(id, patch) {
      const update: Row = {};
      if (patch.email !== undefined) update.email = patch.email;
      if (patch.country !== undefined) update.country = patch.country;
      const { data, error } = await db.from("profiles").update(update).eq("id", id).select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return data ? profile(data as Row) : null;
    },
    async createNonce(nonce, expiresAt) {
      const { error } = await db.from("nonces").insert({ nonce, expires_at: expiresAt });
      if (error) throw new Error(error.message);
    },
    async consumeNonce(nonce, now) {
      const { data, error } = await db
        .from("nonces")
        .update({ used_at: now.toISOString() })
        .eq("nonce", nonce)
        .is("used_at", null)
        .gt("expires_at", now.toISOString())
        .select("nonce");
      if (error) throw new Error(error.message);
      return (data ?? []).length > 0;
    },
    async createOrder(row) {
      const { data, error } = await db
        .from("orders")
        .insert({
          id: row.id,
          profile_id: row.profileId,
          listing_id: row.listingId,
          amount_usdc: row.amountUsdc,
          reference_pubkey: row.referencePubkey,
          status: row.status,
          expires_at: row.expiresAt,
          created_at: row.createdAt,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return order(data as Row);
    },
    async getOrder(id) {
      const { data, error } = await db.from("orders").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? order(data as Row) : null;
    },
    async saveOrder(row) {
      const { error } = await db
        .from("orders")
        .update({ status: row.status, expires_at: row.expiresAt, amount_usdc: row.amountUsdc })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    },
    async getPaymentBySignature(signature) {
      const { data, error } = await db
        .from("payments")
        .select("*")
        .eq("tx_signature", signature)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? payment(data as Row) : null;
    },
    async getPaymentByOrder(orderId) {
      const { data, error } = await db.from("payments").select("*").eq("order_id", orderId).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? payment(data as Row) : null;
    },
    async insertPayment(row) {
      const { error } = await db.from("payments").insert({
        id: row.id,
        order_id: row.orderId,
        tx_signature: row.txSignature,
        payer: row.payer,
        amount: row.amount,
        slot: row.slot,
        verified_at: row.verifiedAt,
      });
      if (!error) return "inserted";
      if (error.code !== "23505") throw new Error(error.message);
      const bySig = await this.getPaymentBySignature(row.txSignature);
      if (bySig) return bySig.orderId === row.orderId ? "duplicate" : "replay";
      const byOrder = await this.getPaymentByOrder(row.orderId);
      if (byOrder) return "order_taken";
      throw new Error(error.message);
    },
    async listLicencesByOrder(orderId) {
      const { data, error } = await db.from("licences").select("*").eq("order_id", orderId);
      return must(data ?? [], error).map((row) => licence(row as Row));
    },
    async listLicencesByProfile(profileId) {
      const { data, error } = await db.from("licences").select("*").eq("profile_id", profileId);
      return must(data ?? [], error).map((row) => licence(row as Row));
    },
    async getLicence(id) {
      const { data, error } = await db.from("licences").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? licence(data as Row) : null;
    },
    async insertLicence(row) {
      const { error } = await db.from("licences").insert({
        id: row.id,
        profile_id: row.profileId,
        agent_id: row.agentId,
        order_id: row.orderId,
        starts_at: row.startsAt,
        ends_at: row.endsAt,
        credits_left: row.creditsLeft,
        status: row.status,
        reminder_sent_at: row.reminderSentAt,
      });
      if (!error) return "inserted";
      if (error.code === "23505") return "exists";
      throw new Error(error.message);
    },
    async saveLicence(row) {
      const { error } = await db
        .from("licences")
        .update({
          status: row.status,
          credits_left: row.creditsLeft,
          reminder_sent_at: row.reminderSentAt,
          ends_at: row.endsAt,
        })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    },
    async listKeysByLicence(licenceId) {
      const { data, error } = await db.from("api_keys").select("*").eq("licence_id", licenceId);
      return must(data ?? [], error).map((row) => apiKey(row as Row));
    },
    async findKeysByHash(hash) {
      const { data, error } = await db.from("api_keys").select("*").eq("key_hash", hash);
      return must(data ?? [], error).map((row) => apiKey(row as Row));
    },
    async insertApiKey(row) {
      const { error } = await db.from("api_keys").insert({
        id: row.id,
        licence_id: row.licenceId,
        key_hash: row.keyHash,
        prefix: row.prefix,
        last_used_at: row.lastUsedAt,
        revoked_at: row.revokedAt,
        created_at: row.createdAt,
      });
      if (error) throw new Error(error.message);
    },
    async saveApiKey(row) {
      const { error } = await db
        .from("api_keys")
        .update({ last_used_at: row.lastUsedAt, revoked_at: row.revokedAt })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    },
    async logUsage(event: UsageEvent) {
      const { error } = await db.from("usage_events").insert({
        id: event.id,
        api_key_id: event.apiKeyId,
        agent_id: event.agentId,
        units: event.units,
        created_at: event.createdAt,
      });
      if (error) throw new Error(error.message);
    },
    async freeCheckCount(agentId, bucket, day) {
      const { data, error } = await db
        .from("free_checks")
        .select("count")
        .eq("agent_id", agentId)
        .eq("bucket", bucket)
        .eq("day", day)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? Number((data as { count: number }).count) : 0;
    },
    async bumpFreeCheck(agentId, bucket, day) {
      const { data, error } = await db.rpc("bump_free_check", {
        p_agent_id: agentId,
        p_bucket: bucket,
        p_day: day,
      });
      if (error) throw new Error(error.message);
      return Number(data);
    },
    async reserveFreeCheck(agentId, bucket, day, max) {
      const { data, error } = await db.rpc("reserve_free_check", {
        p_agent_id: agentId,
        p_bucket: bucket,
        p_day: day,
        p_max: max,
      });
      if (error) throw new Error(error.message);
      return Boolean(data);
    },
    async releaseFreeCheck(agentId, bucket, day) {
      const { error } = await db.rpc("release_free_check", {
        p_agent_id: agentId,
        p_bucket: bucket,
        p_day: day,
      });
      if (error) throw new Error(error.message);
    },
    async licencesNeedingReminder(now) {
      const horizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await db
        .from("licences")
        .select("*")
        .eq("status", "active")
        .is("reminder_sent_at", null)
        .gt("ends_at", now.toISOString())
        .lte("ends_at", horizon);
      if (error) throw new Error(error.message);
      const rows: ReminderRow[] = [];
      for (const item of (data ?? []) as Row[]) {
        const row = licence(item);
        const owner = await this.getProfile(row.profileId);
        const agentRow = await this.getAgent(row.agentId);
        if (!owner?.email || !agentRow) continue;
        rows.push({ ...row, email: owner.email, agentName: agentRow.name });
      }
      return rows;
    },
  };
}
