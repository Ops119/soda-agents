import { stableId } from "./ids";
import { bundleCents, centsToUsdc } from "./money";

export const SECTORS = [
  { id: "defi", label: "DeFi" },
  { id: "depin", label: "DePIN" },
  { id: "memecoins", label: "Memecoins" },
  { id: "copy", label: "Copy-Trading" },
  { id: "dev", label: "Dev tooling" },
] as const;

export type SectorId = (typeof SECTORS)[number]["id"];

export type RiskLevel = "low" | "medium" | "high";
export type Delivery = "hosted" | "kit";
export type Tier = "Lite" | "Core" | "Pro";

export type AgentSeed = {
  slug: string;
  name: string;
  sector: SectorId;
  tier: Tier;
  summary: string;
  risk: RiskLevel;
  execution: boolean;
  delivery: Delivery;
  /** 30-day pass price in cents. Absent for one-off kits. */
  passCents?: number;
  oneOffCents?: number;
  freeDaily?: number;
  hint: string;
};

export const AGENT_SEEDS: AgentSeed[] = [
  {
    slug: "yield-scanner",
    name: "Yield scanner",
    sector: "defi",
    tier: "Core",
    summary: "Ranks Solana lending and LP yields by a simple net figure after fees. You choose where funds go.",
    risk: "medium",
    execution: false,
    delivery: "hosted",
    passCents: 1900,
    hint: "Which USDC markets should I compare?",
  },
  {
    slug: "lp-range-monitor",
    name: "LP range monitor + alerts",
    sector: "defi",
    tier: "Core",
    summary: "Watches a concentrated-liquidity position and flags when price leaves the range. It never rebalances.",
    risk: "medium",
    execution: false,
    delivery: "hosted",
    passCents: 1900,
    hint: "Pool, range, and the wallet to watch.",
  },
  {
    slug: "liquidation-alerts",
    name: "Liquidation / health-factor alerts",
    sector: "defi",
    tier: "Lite",
    summary: "Warns when a lending position's health factor is getting close to liquidation.",
    risk: "high",
    execution: false,
    delivery: "hosted",
    passCents: 900,
    hint: "Market and the wallet to watch.",
  },
  {
    slug: "dca-executor",
    name: "DCA executor (user-signed)",
    sector: "defi",
    tier: "Pro",
    summary: "Builds a dollar-cost-average swap for you to approve in your wallet. It cannot sign and it never holds your keys.",
    risk: "high",
    execution: true,
    delivery: "hosted",
    passCents: 2900,
    hint: "Asset, USDC amount, and how often.",
  },
  {
    slug: "portfolio-pnl",
    name: "Portfolio + PnL tracker",
    sector: "defi",
    tier: "Lite",
    summary: "Reads public balances and estimates cost basis and unrealised PnL. Read-only.",
    risk: "low",
    execution: false,
    delivery: "hosted",
    passCents: 900,
    hint: "Paste the wallet address to summarise.",
  },
  {
    slug: "stablecoin-rotator",
    name: "Stablecoin yield rotator (suggests, user signs)",
    sector: "defi",
    tier: "Pro",
    summary: "Suggests a stablecoin yield move and builds the transaction. Nothing moves until you sign.",
    risk: "high",
    execution: true,
    delivery: "hosted",
    passCents: 3900,
    hint: "Current stablecoin and the amount.",
  },
  {
    slug: "points-tracker",
    name: "Points / airdrop tracker",
    sector: "defi",
    tier: "Lite",
    summary: "Lists points and airdrop campaigns for wallets you choose. It does not claim or bridge.",
    risk: "medium",
    execution: false,
    delivery: "hosted",
    passCents: 900,
    hint: "Wallet address to check.",
  },
  {
    slug: "node-uptime",
    name: "Node uptime monitor",
    sector: "depin",
    tier: "Lite",
    summary: "Checks whether your DePIN nodes are answering and how long they have been quiet.",
    risk: "low",
    execution: false,
    delivery: "hosted",
    passCents: 500,
    hint: "Node id or URL to check.",
  },
  {
    slug: "rewards-tracker",
    name: "Rewards tracker + claim reminders",
    sector: "depin",
    tier: "Lite",
    summary: "Totals accrued DePIN rewards and reminds you when a claim window is open. You claim yourself.",
    risk: "low",
    execution: false,
    delivery: "hosted",
    passCents: 500,
    hint: "Network and wallet address.",
  },
  {
    slug: "coverage-analyser",
    name: "Coverage / earnings analyser",
    sector: "depin",
    tier: "Core",
    summary: "Compares node earnings with coverage so you can see which locations are paying.",
    risk: "low",
    execution: false,
    delivery: "hosted",
    passCents: 1200,
    hint: "Network and the region you operate in.",
  },
  {
    slug: "depin-analytics",
    name: "DePIN token + revenue analytics",
    sector: "depin",
    tier: "Core",
    summary: "Summarises token emissions, protocol revenue, and payout trends for a DePIN network.",
    risk: "medium",
    execution: false,
    delivery: "hosted",
    passCents: 1500,
    hint: "Which network should I summarise?",
  },
  {
    slug: "hardware-roi",
    name: "Hardware ROI planner",
    sector: "depin",
    tier: "Core",
    summary: "A one-off workbook for estimating hardware payback from assumptions you type in. Not a forecast.",
    risk: "low",
    execution: false,
    delivery: "kit",
    oneOffCents: 1500,
    hint: "Hardware cost and expected monthly rewards.",
  },
  {
    slug: "rug-checker",
    name: "Rug / risk checker",
    sector: "memecoins",
    tier: "Lite",
    summary: "Scores a mint for authorities, liquidity lock, and holder concentration. Three free checks a day, or a 30-day pass.",
    risk: "high",
    execution: false,
    delivery: "hosted",
    passCents: 900,
    freeDaily: 3,
    hint: "Paste a Solana mint address.",
  },
  {
    slug: "launch-scanner",
    name: "New-launch scanner",
    sector: "memecoins",
    tier: "Core",
    summary: "Lists newly created mints that pass a basic liquidity filter. Discovery only, not a buy list.",
    risk: "high",
    execution: false,
    delivery: "hosted",
    passCents: 1900,
    hint: "How far back should I look?",
  },
  {
    slug: "holder-watch",
    name: "Holder concentration + dev-wallet watch",
    sector: "memecoins",
    tier: "Core",
    summary: "Shows top holders and watches wallets you mark as the deployer. It does not trade.",
    risk: "high",
    execution: false,
    delivery: "hosted",
    passCents: 1500,
    hint: "Mint address and the deployer wallet.",
  },
  {
    slug: "narrative-tracker",
    name: "Social / narrative tracker",
    sector: "memecoins",
    tier: "Core",
    summary: "Groups public chatter around a mint into themes. Sentiment is not a buy signal.",
    risk: "medium",
    execution: false,
    delivery: "hosted",
    passCents: 1900,
    hint: "Mint or ticker to track.",
  },
  {
    slug: "snipe-alerts",
    name: "Snipe alerts (signals only, no auto-buy)",
    sector: "memecoins",
    tier: "Pro",
    summary: "Sends timing signals around new pools. It will not buy, sell, or submit a swap.",
    risk: "high",
    execution: false,
    delivery: "hosted",
    passCents: 2900,
    hint: "Which launch window should I watch?",
  },
  {
    slug: "launch-assistant",
    name: "Launch assistant",
    sector: "memecoins",
    tier: "Pro",
    summary: "A one-off checklist and script outline for a launch you run yourself. It does not deploy anything.",
    risk: "high",
    execution: false,
    delivery: "kit",
    oneOffCents: 2500,
    hint: "Token name and supply you are planning.",
  },
  {
    slug: "smart-wallet-tracker",
    name: "Smart-wallet tracker",
    sector: "copy",
    tier: "Core",
    summary: "Follows wallets you label and summarises their recent swaps. Read-only.",
    risk: "medium",
    execution: false,
    delivery: "hosted",
    passCents: 1500,
    hint: "Wallet address to follow.",
  },
  {
    slug: "whale-alerts",
    name: "Whale alerts",
    sector: "copy",
    tier: "Lite",
    summary: "Notifies you when a watched wallet moves more than the size you set.",
    risk: "medium",
    execution: false,
    delivery: "hosted",
    passCents: 900,
    hint: "Wallet and the size threshold.",
  },
  {
    slug: "copy-trade-assistant",
    name: "Copy-trade assistant (confirm every trade)",
    sector: "copy",
    tier: "Pro",
    summary: "Drafts a copy of a watched trade for you to confirm. Every trade needs your signature. Nothing runs silently.",
    risk: "high",
    execution: true,
    delivery: "hosted",
    passCents: 3900,
    hint: "Wallet to mirror and the max USDC size.",
  },
  {
    slug: "leaderboard-analytics",
    name: "Trader leaderboard analytics",
    sector: "copy",
    tier: "Core",
    summary: "Ranks public wallets over a simple realised-PnL window. Past results are not future results.",
    risk: "medium",
    execution: false,
    delivery: "hosted",
    passCents: 1900,
    hint: "Window length, such as 7 days.",
  },
  {
    slug: "risk-guard",
    name: "Risk guard (stop-loss suggestions)",
    sector: "copy",
    tier: "Core",
    summary: "Suggests stop levels from the risk you state. It does not place orders.",
    risk: "high",
    execution: false,
    delivery: "hosted",
    passCents: 1500,
    hint: "Position and how much you can lose.",
  },
  {
    slug: "agent-kit-starter",
    name: "Solana Agent Kit starter",
    sector: "dev",
    tier: "Pro",
    summary: "A starter pack for a Solana agent: layout, signing notes, and a devnet script you run yourself.",
    risk: "low",
    execution: false,
    delivery: "kit",
    oneOffCents: 4900,
    hint: "What should the agent do?",
  },
  {
    slug: "x402-paywall-kit",
    name: "x402 paywall kit",
    sector: "dev",
    tier: "Pro",
    summary: "A reference pack describing an HTTP 402 paywall in front of an agent. Soda does not meter pay-per-call.",
    risk: "low",
    execution: false,
    delivery: "kit",
    oneOffCents: 4900,
    hint: "Which route should the paywall cover?",
  },
  {
    slug: "anchor-review",
    name: "Anchor program review assistant",
    sector: "dev",
    tier: "Pro",
    summary: "Reads an Anchor program you paste and lists common safety issues. A second pair of eyes, not an audit.",
    risk: "medium",
    execution: false,
    delivery: "hosted",
    passCents: 2900,
    hint: "Paste the instruction handler you want read.",
  },
  {
    slug: "tx-debugger",
    name: "Tx / RPC debugger",
    sector: "dev",
    tier: "Core",
    summary: "Explains a transaction signature or RPC error in plain language.",
    risk: "low",
    execution: false,
    delivery: "hosted",
    passCents: 1500,
    hint: "Paste a signature or the RPC error.",
  },
  {
    slug: "launch-script-pack",
    name: "Token + launch script pack",
    sector: "dev",
    tier: "Core",
    summary: "Scripts and notes for creating a token on devnet. You run them. They do not target mainnet.",
    risk: "medium",
    execution: false,
    delivery: "kit",
    oneOffCents: 2900,
    hint: "Token name, symbol, and decimals.",
  },
  {
    slug: "mcp-server-pack",
    name: "Solana MCP server pack",
    sector: "dev",
    tier: "Pro",
    summary: "A starter Model Context Protocol server with read-only Solana RPC helpers.",
    risk: "low",
    execution: false,
    delivery: "kit",
    oneOffCents: 7900,
    hint: "Which read-only RPC methods do you need?",
  },
];

export type AgentRecord = {
  id: string;
  slug: string;
  name: string;
  sector: SectorId;
  summary: string;
  riskLevel: RiskLevel;
  endpointUrl: string;
  isActive: boolean;
  execution: boolean;
  delivery: Delivery;
  tier: Tier;
  freeDailyChecks: number | null;
  hint: string;
};

export type ListingKind = "pass_30d" | "one_off" | "ppu";
export type ListingScope = "agent" | "sector" | "all";

export type ListingRecord = {
  id: string;
  agentId: string | null;
  kind: ListingKind;
  priceUsdc: string;
  credits: number | null;
  scope: ListingScope;
  sector: SectorId | null;
  label: string;
  isPurchasable: boolean;
};

export function sectorLabel(id: SectorId): string {
  return SECTORS.find((s) => s.id === id)?.label ?? id;
}

export function disclaimerSector(id: string | null | undefined): boolean {
  return id === "defi" || id === "memecoins" || id === "copy";
}

export function toAgent(seed: AgentSeed): AgentRecord {
  return {
    id: stableId(`agent:${seed.slug}`),
    slug: seed.slug,
    name: seed.name,
    sector: seed.sector,
    summary: seed.summary,
    riskLevel: seed.risk,
    endpointUrl: seed.delivery === "hosted" ? "stub:echo" : "kit:local",
    isActive: true,
    execution: seed.execution,
    delivery: seed.delivery,
    tier: seed.tier,
    freeDailyChecks: seed.freeDaily ?? null,
    hint: seed.hint,
  };
}

export function catalogAgents(): AgentRecord[] {
  return AGENT_SEEDS.map(toAgent);
}

export function passSumCents(sector?: SectorId): number {
  return AGENT_SEEDS.filter((a) => a.passCents != null && (!sector || a.sector === sector)).reduce(
    (sum, a) => sum + (a.passCents ?? 0),
    0,
  );
}

export function catalogListings(): ListingRecord[] {
  const listings: ListingRecord[] = [];
  for (const seed of AGENT_SEEDS) {
    const agentId = stableId(`agent:${seed.slug}`);
    if (seed.passCents != null) {
      listings.push({
        id: stableId(`listing:${seed.slug}:pass`),
        agentId,
        kind: "pass_30d",
        priceUsdc: centsToUsdc(seed.passCents),
        credits: null,
        scope: "agent",
        sector: seed.sector,
        label: `${seed.name} · 30-day pass`,
        isPurchasable: true,
      });
    }
    if (seed.oneOffCents != null) {
      listings.push({
        id: stableId(`listing:${seed.slug}:oneoff`),
        agentId,
        kind: "one_off",
        priceUsdc: centsToUsdc(seed.oneOffCents),
        credits: null,
        scope: "agent",
        sector: seed.sector,
        label: `${seed.name} · one-off kit`,
        isPurchasable: true,
      });
    }
    if (seed.delivery === "hosted") {
      listings.push({
        id: stableId(`listing:${seed.slug}:ppu`),
        agentId,
        kind: "ppu",
        priceUsdc: "0.02",
        credits: 100,
        scope: "agent",
        sector: seed.sector,
        label: `${seed.name} · pay per call`,
        isPurchasable: false,
      });
    }
  }

  listings.push({
    id: stableId("listing:all-access"),
    agentId: null,
    kind: "pass_30d",
    priceUsdc: "99.00",
    credits: null,
    scope: "all",
    sector: null,
    label: "All-access pass",
    isPurchasable: true,
  });

  for (const sector of SECTORS) {
    const cents = bundleCents(passSumCents(sector.id));
    listings.push({
      id: stableId(`listing:bundle:${sector.id}`),
      agentId: null,
      kind: "pass_30d",
      priceUsdc: centsToUsdc(cents),
      credits: null,
      scope: "sector",
      sector: sector.id,
      label: `${sector.label} bundle`,
      isPurchasable: true,
    });
  }

  return listings;
}

export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function renderSeedSql(): string {
  const agents = catalogAgents();
  const listings = catalogListings();
  const agentRows = agents
    .map(
      (a) =>
        `(${[
          sqlString(a.id),
          sqlString(a.slug),
          sqlString(a.name),
          sqlString(a.sector),
          sqlString(a.summary),
          sqlString(a.riskLevel),
          sqlString(a.endpointUrl),
          "true",
          a.execution ? "true" : "false",
          sqlString(a.delivery),
          sqlString(a.tier),
          a.freeDailyChecks == null ? "null" : String(a.freeDailyChecks),
          sqlString(a.hint),
        ].join(", ")})`,
    )
    .join(",\n");

  const listingRows = listings
    .map(
      (l) =>
        `(${[
          sqlString(l.id),
          l.agentId ? sqlString(l.agentId) : "null",
          sqlString(l.kind),
          l.priceUsdc,
          l.credits == null ? "null" : String(l.credits),
          sqlString(l.scope),
          l.sector ? sqlString(l.sector) : "null",
          sqlString(l.label),
          l.isPurchasable ? "true" : "false",
        ].join(", ")})`,
    )
    .join(",\n");

  return `-- Generated from lib/catalog.ts. Do not edit by hand.
insert into public.agents (
  id, slug, name, sector, summary, risk_level, endpoint_url, is_active,
  execution, delivery, tier, free_daily_checks, hint
) values
${agentRows}
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  sector = excluded.sector,
  summary = excluded.summary,
  risk_level = excluded.risk_level,
  endpoint_url = excluded.endpoint_url,
  is_active = excluded.is_active,
  execution = excluded.execution,
  delivery = excluded.delivery,
  tier = excluded.tier,
  free_daily_checks = excluded.free_daily_checks,
  hint = excluded.hint;

insert into public.listings (
  id, agent_id, kind, price_usdc, credits, scope, sector, label, is_purchasable
) values
${listingRows}
on conflict (id) do update set
  agent_id = excluded.agent_id,
  kind = excluded.kind,
  price_usdc = excluded.price_usdc,
  credits = excluded.credits,
  scope = excluded.scope,
  sector = excluded.sector,
  label = excluded.label,
  is_purchasable = excluded.is_purchasable;
`;
}
