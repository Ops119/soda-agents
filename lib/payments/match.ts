export type Mismatch = "amount" | "mint" | "recipient" | "reference" | "failed_tx" | "not_finalized";

export type ExpectedPayment = {
  recipient: string;
  amountMicros: bigint;
  mint: string;
  reference: string;
};

export type ObservedTransfer = {
  signature: string;
  slot: number;
  blockTime: number | null;
  failed: boolean;
  finalized: boolean;
  mint: string | null;
  recipient: string | null;
  amountMicros: bigint;
  references: string[];
  payer: string | null;
};

/**
 * Exact USDC match. A greater or smaller amount is a mismatch so a payment
 * cannot be reused at a different price, and an underpayment cannot clear.
 */
export function matchTransfer(expected: ExpectedPayment, observed: ObservedTransfer): Mismatch | null {
  if (!observed.finalized) return "not_finalized";
  if (observed.failed) return "failed_tx";
  if (!observed.references.includes(expected.reference)) return "reference";
  if (!observed.mint || observed.mint !== expected.mint) return "mint";
  if (!observed.recipient || observed.recipient !== expected.recipient) return "recipient";
  if (observed.payer && observed.payer === expected.recipient) return "recipient";
  if (observed.amountMicros !== expected.amountMicros) return "amount";
  return null;
}
