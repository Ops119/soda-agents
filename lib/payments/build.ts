import { createTransfer, encodeURL } from "@solana/pay";
import { PublicKey, TransactionMessage, VersionedTransaction, type Connection } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import type { Order } from "../store/types";

export async function buildPayTransaction(input: {
  connection: Connection;
  payer: PublicKey;
  order: Order;
  treasury: PublicKey;
  mint: PublicKey;
  label: string;
}): Promise<string> {
  const reference = new PublicKey(input.order.referencePubkey);
  const amount = new BigNumber(input.order.amountUsdc);
  const legacy = await createTransfer(input.connection, input.payer, {
    recipient: input.treasury,
    amount,
    splToken: input.mint,
    reference,
    memo: `soda:${input.order.id}`,
  });
  if (!legacy.recentBlockhash) {
    throw new Error("Could not fetch a recent blockhash.");
  }
  const message = new TransactionMessage({
    payerKey: input.payer,
    recentBlockhash: legacy.recentBlockhash,
    instructions: legacy.instructions,
  }).compileToV0Message();
  return Buffer.from(new VersionedTransaction(message).serialize()).toString("base64");
}

export function buildPayUrl(input: {
  order: Order;
  treasury: PublicKey;
  mint: PublicKey;
  label: string;
}): string {
  const url = encodeURL({
    recipient: input.treasury,
    amount: new BigNumber(input.order.amountUsdc),
    splToken: input.mint,
    reference: new PublicKey(input.order.referencePubkey),
    label: "Soda.agents",
    message: input.label.slice(0, 80),
    memo: `soda:${input.order.id}`,
  });
  return url.toString();
}
