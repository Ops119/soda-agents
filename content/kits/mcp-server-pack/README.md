# Solana MCP server pack

A starting point for a Model Context Protocol server that only reads public Solana data. It does not sign, and it does not hold a buyer key.

`server.mjs` answers one tool, `getSlot`, against the RPC URL you pass in `SOLANA_RPC`. Keep that URL on devnet until you have reviewed the process that will run it.

Run it with Node 22:

```bash
SOLANA_RPC=https://api.devnet.solana.com node server.mjs
```

The process speaks newline-delimited JSON on stdin and stdout. It is a starter, not a hosted Soda agent.
