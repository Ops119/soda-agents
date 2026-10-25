# Solana Agent Kit starter

A layout for an agent that prepares Solana transactions and stops there. The buyer signs. The agent does not hold a seed phrase or a private key.

Suggested layout:

- `agent/` — reads a request and returns a description plus an unsigned transaction.
- `wallet/` — the buyer's wallet. The only place a signature is produced.
- `devnet.ts` — cluster guard. Refuse any RPC URL that contains `mainnet`.

Rules this starter expects you to keep:

- Build transactions against devnet until you have a separate review.
- Return the transaction for the user to sign. Do not ask for a secret key.
- Log the request id, not the user's prompt, if you store anything.
