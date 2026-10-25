import type { ObservedTransfer } from "./match";

export type TokenBalance = {
  mint: string;
  owner: string | null;
  amount: string;
};

export type ParsedChainTx = {
  signature: string;
  slot: number;
  blockTime: number | null;
  failed: boolean;
  finalized: boolean;
  accountKeys: string[];
  pre: TokenBalance[];
  post: TokenBalance[];
  payer: string | null;
};

export function netToOwner(tx: ParsedChainTx, mint: string, owner: string): bigint {
  const sum = (rows: TokenBalance[]) =>
    rows.reduce((total, row) => {
      if (row.mint !== mint || row.owner !== owner) return total;
      return total + BigInt(row.amount);
    }, 0n);
  return sum(tx.post) - sum(tx.pre);
}

export function observeTransfer(tx: ParsedChainTx, mint: string, recipient: string): ObservedTransfer {
  const received = netToOwner(tx, mint, recipient);
  const sawMint = tx.post.some((row) => row.mint === mint) || tx.pre.some((row) => row.mint === mint);
  return {
    signature: tx.signature,
    slot: tx.slot,
    blockTime: tx.blockTime,
    failed: tx.failed,
    finalized: tx.finalized,
    mint: sawMint ? mint : null,
    recipient: received !== 0n || tx.post.some((row) => row.owner === recipient && row.mint === mint) ? recipient : null,
    amountMicros: received,
    references: tx.accountKeys,
    payer: tx.payer,
  };
}
