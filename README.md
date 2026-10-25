# Soda.agents

A mobile-first catalogue for 29 Solana agents. Buy a 30-day pass or a one-off kit with devnet USDC, get a licence and an API key, and call hosted agents through a gateway.

Payments are locked to Solana devnet. The server refuses a mainnet cluster, a mainnet RPC, and the mainnet USDC mint.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:43123.

With no Supabase variables, the catalogue, orders, and licences live in `.data/store.json`. If `TREASURY_PUBKEY` is unset outside production, the first checkout writes a devnet treasury key to `.data/devnet-treasury.json`. That file is gitignored. Do not fund it with mainnet assets.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Supabase

Create a project, then run:

1. `supabase/migrations/20261025120000_init.sql`
2. `npm run seed` and then `supabase/seed.sql`

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the server only. The service role bypasses row level security. The anon key is not used by this app. Buyer tables have RLS on and no policies, so the public API cannot read orders, licences, or keys.

`npm run seed` regenerates `supabase/seed.sql` from `lib/catalog.ts`. Running that SQL again overwrites catalogue rows with the seed.

## Devnet USDC purchase

1. In Phantom, switch to Devnet. Social login needs `NEXT_PUBLIC_PHANTOM_APP_ID`. Without it, use the injected Phantom extension, Solflare, or an Android Mobile Wallet Adapter wallet.
2. Request devnet SOL from https://faucet.solana.com.
3. Request devnet USDC from https://faucet.circle.com. The mint is `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.
4. Copy the treasury address from `.data/devnet-treasury.json` (or the one you set) and send that address a little devnet USDC if you want the treasury to show a balance. The buyer pays the order, so the buyer wallet needs the USDC.
5. Sign in. The message does not move funds and does not ask for a seed phrase.
6. Buy the cheapest pass (Node uptime, $5). Approve the transaction in the wallet, or scan the Solana Pay QR with a devnet wallet.
7. Wait until the payment is finalized. The app polls, then shows the API key once.
8. Call the agent:

```bash
curl -s -X POST http://127.0.0.1:43123/api/agents/node-uptime \
  -H "authorization: Bearer sk_soda_..." \
  -H "content-type: application/json" \
  -d '{"prompt":"which nodes are late?"}'
```

Rug / risk checker also answers three free checks a day without a key.

## What is stubbed

Hosted agents answer through `stub:echo`. They return a sample JSON payload and, for execution agents, state that the buyer must sign and that Soda does not hold a key. Replace `endpoint_url` with an HTTPS host and add that hostname to `AGENT_ENDPOINT_ALLOWLIST` when a real agent is ready. The gateway refuses every other URL.

Pay-per-call rows are in the catalogue and are not for sale. There is no x402 meter.

## Optional services

Resend, Upstash Redis, Sentry, and Cloudflare Turnstile are off unless their environment variables are set. Rate limits then use process memory. Turnstile is skipped in development and whenever the secret is unset. Reminder emails are sent only when Resend is configured, via `POST /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET`.

## Launch checklist

- Put the treasury on a hardware wallet or a multisig. Do not use the generated devnet key.
- Have counsel review Terms, Privacy, and Refunds. Set `NEXT_PUBLIC_LEGAL_ENTITY` and `NEXT_PUBLIC_CONTACT_EMAIL`.
- Decide `GEO_BLOCK_UK`. EU-27 execution features are always hidden. Iceland, Liechtenstein, and Norway are not in that list.
- Replace placeholder agent names and point hosted agents at allowlisted HTTPS endpoints.
- Set `SESSION_SECRET` (32+ characters) and `CRON_SECRET` (16+ characters).
- Run the migration and seed on the production database.
- Remove the `noindex` robots rule in `app/layout.tsx` when you want the site indexed.
- A mainnet $1 purchase needs a code change that removes the devnet guard. Environment variables alone cannot turn it off. Do that only after the treasury and the legal review, and test with $1 first.
