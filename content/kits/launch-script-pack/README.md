# Token and launch script pack

Notes for creating a token on Solana devnet with the Spl Token CLI. You run the commands. They target devnet only.

```bash
solana config set --url devnet
solana-keygen new --outfile ./devnet-payer.json
solana airdrop 2 ./devnet-payer.json
spl-token create-token --decimals 6 --fee-payer ./devnet-payer.json
spl-token create-account <MINT> --fee-payer ./devnet-payer.json
spl-token mint <MINT> 1000 --fee-payer ./devnet-payer.json
```

`devnet-payer.json` is a key. Do not commit it, do not paste it into chat, and do not fund it with mainnet SOL.

Before you tell anyone the mint address, write down whether mint and freeze authority stay on. Revoke them with `spl-token authorize` only when you mean to. This pack does not revoke them for you.
