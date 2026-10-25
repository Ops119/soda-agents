import { findReference, validateTransfer } from "@solana/pay";
import { PublicKey, type Connection, type Finality } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { assertDevnetGenesis } from "../solana/config";
import type { ExpectedPayment, Mismatch, ObservedTransfer } from "./match";
import { matchTransfer } from "./match";
import { observeTransfer, type ParsedChainTx, type TokenBalance } from "./parse";

export type VerifyOutcome =
  | { status: "pending" }
  | { status: "mismatch"; reason: Mismatch; signature?: string }
  | { status: "invalid"; error: string; signature?: string }
  | { status: "verified"; observed: ObservedTransfer };

type TokenRow = {
  mint?: string;
  owner?: string;
  uiTokenAmount?: { amount?: string };
};

type ChainResponse = {
  slot: number;
  blockTime: number | null;
  meta: {
    err: unknown;
    preTokenBalances?: TokenRow[] | null;
    postTokenBalances?: TokenRow[] | null;
    loadedAddresses?: { writable?: PublicKey[]; readonly?: PublicKey[] } | null;
  } | null;
  transaction: {
    message: {
      staticAccountKeys?: PublicKey[];
      accountKeys?: PublicKey[];
      getAccountKeys?: (args: {
        accountKeysFromLookups?: { writable?: PublicKey[]; readonly?: PublicKey[] } | null;
      }) => { keySegments: () => PublicKey[][] };
    };
  };
};

function mapValidateError(error: unknown): Mismatch | null {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("amount")) return "amount";
  if (message.includes("recipient")) return "recipient";
  if (message.includes("reference")) return "reference";
  if (message.includes("mint") || message.includes("spl") || message.includes("token")) return "mint";
  return null;
}

function isMissing(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  return name.includes("FindReference") || /not found|could not find/i.test(message);
}

function balances(rows: TokenRow[] | null | undefined): TokenBalance[] {
  return (rows ?? []).flatMap((row) => {
    if (!row.mint || !row.uiTokenAmount?.amount) return [];
    return [{ mint: row.mint, owner: row.owner ?? null, amount: row.uiTokenAmount.amount }];
  });
}

export function adaptTransaction(signature: string, tx: ChainResponse, finalized: boolean): ParsedChainTx {
  const message = tx.transaction.message;
  let accountKeys: string[] = [];
  if (typeof message.getAccountKeys === "function") {
    const loaded = message.getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses });
    accountKeys = loaded
      .keySegments()
      .flat()
      .map((key) => key.toBase58());
  } else if (message.staticAccountKeys) {
    accountKeys = message.staticAccountKeys.map((key) => key.toBase58());
  } else if (message.accountKeys) {
    accountKeys = message.accountKeys.map((key) => key.toBase58());
  }
  return {
    signature,
    slot: tx.slot,
    blockTime: tx.blockTime,
    failed: Boolean(tx.meta?.err),
    finalized,
    accountKeys,
    pre: balances(tx.meta?.preTokenBalances),
    post: balances(tx.meta?.postTokenBalances),
    payer: accountKeys[0] ?? null,
  };
}

export async function verifyObserved(input: {
  expected: ExpectedPayment;
  findReference: () => Promise<{ signature: string }>;
  validateTransfer: (signature: string) => Promise<unknown>;
  load: (signature: string) => Promise<ParsedChainTx | null>;
}): Promise<VerifyOutcome> {
  let signature: string;
  try {
    const found = await input.findReference();
    signature = found.signature;
  } catch (error) {
    if (isMissing(error)) return { status: "pending" };
    return { status: "invalid", error: "Could not look up the payment reference." };
  }

  let validateError: unknown = null;
  try {
    await input.validateTransfer(signature);
  } catch (error) {
    validateError = error;
  }

  const loaded = await input.load(signature);
  if (!loaded) {
    if (validateError) {
      const reason = mapValidateError(validateError);
      if (reason) return { status: "mismatch", reason, signature };
    }
    return { status: "pending" };
  }

  const observed = observeTransfer(loaded, input.expected.mint, input.expected.recipient);
  const reason = matchTransfer(input.expected, observed);
  if (reason) return { status: "mismatch", reason, signature };
  if (validateError) {
    const mapped = mapValidateError(validateError);
    if (mapped) return { status: "mismatch", reason: mapped, signature };
    return { status: "invalid", error: "On-chain transfer validation failed.", signature };
  }
  return { status: "verified", observed };
}

export async function verifyOnChain(connection: Connection, expected: ExpectedPayment): Promise<VerifyOutcome> {
  await assertDevnetGenesis(connection);
  const recipient = new PublicKey(expected.recipient);
  const mint = new PublicKey(expected.mint);
  const reference = new PublicKey(expected.reference);
  const amount = new BigNumber(expected.amountMicros.toString()).dividedBy(1_000_000);
  const finality: Finality = "finalized";

  return verifyObserved({
    expected,
    findReference: async () => findReference(connection, reference, { finality }),
    validateTransfer: (signature) =>
      validateTransfer(
        connection,
        signature,
        { recipient, amount, splToken: mint, reference },
        { commitment: finality },
      ),
    load: async (signature) => {
      const tx = await connection.getTransaction(signature, {
        commitment: finality,
        maxSupportedTransactionVersion: 0,
      });
      if (!tx) return null;
      return adaptTransaction(signature, tx as ChainResponse, true);
    },
  });
}
