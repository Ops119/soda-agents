import type { AgentRecord, ListingRecord } from "../catalog";

export type Profile = {
  id: string;
  walletAddress: string;
  email: string | null;
  country: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  profileId: string;
  listingId: string;
  amountUsdc: string;
  referencePubkey: string;
  status: "pending" | "paid" | "expired";
  expiresAt: string;
  createdAt: string;
};

export type Payment = {
  id: string;
  orderId: string;
  txSignature: string;
  payer: string;
  amount: string;
  slot: number;
  verifiedAt: string;
};

export type Licence = {
  id: string;
  profileId: string;
  agentId: string;
  orderId: string;
  startsAt: string;
  endsAt: string | null;
  creditsLeft: number | null;
  status: "active" | "expired" | "revoked";
  reminderSentAt: string | null;
};

export type ApiKeyRecord = {
  id: string;
  licenceId: string;
  keyHash: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type UsageEvent = {
  id: string;
  apiKeyId: string | null;
  agentId: string;
  units: number;
  createdAt: string;
};

export type NonceRecord = {
  nonce: string;
  expiresAt: string;
  usedAt: string | null;
};

export type FreeCheck = {
  agentId: string;
  bucket: string;
  day: string;
  count: number;
};

export type ReminderRow = Licence & {
  email: string | null;
  agentName: string;
};

export interface Store {
  ready(): Promise<void>;
  listAgents(): Promise<AgentRecord[]>;
  getAgent(id: string): Promise<AgentRecord | null>;
  getAgentBySlug(slug: string): Promise<AgentRecord | null>;
  listListings(): Promise<ListingRecord[]>;
  getListing(id: string): Promise<ListingRecord | null>;
  getProfile(id: string): Promise<Profile | null>;
  getProfileByWallet(wallet: string): Promise<Profile | null>;
  upsertProfile(wallet: string, country: string | null): Promise<Profile>;
  updateProfile(
    id: string,
    patch: { email?: string | null; country?: string | null },
  ): Promise<Profile | null>;
  createNonce(nonce: string, expiresAt: string): Promise<void>;
  consumeNonce(nonce: string, now: Date): Promise<boolean>;
  createOrder(order: Order): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  saveOrder(order: Order): Promise<void>;
  getPaymentBySignature(signature: string): Promise<Payment | null>;
  getPaymentByOrder(orderId: string): Promise<Payment | null>;
  insertPayment(payment: Payment): Promise<"inserted" | "duplicate" | "replay" | "order_taken">;
  listLicencesByOrder(orderId: string): Promise<Licence[]>;
  listLicencesByProfile(profileId: string): Promise<Licence[]>;
  getLicence(id: string): Promise<Licence | null>;
  insertLicence(licence: Licence): Promise<"inserted" | "exists">;
  saveLicence(licence: Licence): Promise<void>;
  listKeysByLicence(licenceId: string): Promise<ApiKeyRecord[]>;
  findKeysByHash(hash: string): Promise<ApiKeyRecord[]>;
  insertApiKey(key: ApiKeyRecord): Promise<void>;
  saveApiKey(key: ApiKeyRecord): Promise<void>;
  logUsage(event: UsageEvent): Promise<void>;
  freeCheckCount(agentId: string, bucket: string, day: string): Promise<number>;
  /** Returns the count after increment. */
  bumpFreeCheck(agentId: string, bucket: string, day: string): Promise<number>;
  /** Atomically take one free check when the bucket is still under max. */
  reserveFreeCheck(agentId: string, bucket: string, day: string, max: number): Promise<boolean>;
  /** Give a reserved check back when the agent call fails. */
  releaseFreeCheck(agentId: string, bucket: string, day: string): Promise<void>;
  licencesNeedingReminder(now: Date): Promise<ReminderRow[]>;
}

export type Database = {
  profiles: Profile[];
  agents: AgentRecord[];
  listings: ListingRecord[];
  orders: Order[];
  payments: Payment[];
  licences: Licence[];
  apiKeys: ApiKeyRecord[];
  usage: UsageEvent[];
  nonces: NonceRecord[];
  freeChecks: FreeCheck[];
};
