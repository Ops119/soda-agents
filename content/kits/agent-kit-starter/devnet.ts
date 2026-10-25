const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

export function assertDevnet(rpcUrl: string, genesis: string) {
  if (/mainnet/i.test(rpcUrl)) {
    throw new Error("Refusing a mainnet RPC.");
  }
  if (genesis !== DEVNET_GENESIS) {
    throw new Error("RPC genesis hash is not Solana devnet.");
  }
}
