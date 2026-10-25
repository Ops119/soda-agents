import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";

export const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

export type DevnetConfig = {
  cluster: "devnet";
  rpc: string;
  mint: string;
};

export function assertDevnetConfig(): DevnetConfig {
  const cluster = process.env.SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet";
  if (cluster !== "devnet") {
    throw new Error("Soda.agents is locked to Solana devnet.");
  }
  const rpc =
    process.env.SOLANA_RPC || process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";
  if (/mainnet/i.test(rpc)) {
    throw new Error("Refusing a mainnet RPC.");
  }
  const mint = process.env.USDC_MINT || process.env.NEXT_PUBLIC_USDC_MINT || DEVNET_USDC_MINT;
  if (mint === MAINNET_USDC_MINT) {
    throw new Error("Refusing the mainnet USDC mint.");
  }
  new PublicKey(mint);
  return { cluster: "devnet", rpc, mint };
}

let genesisChecked = false;

export async function assertDevnetGenesis(connection: Connection) {
  if (genesisChecked) return;
  const hash = await connection.getGenesisHash();
  if (hash !== DEVNET_GENESIS) {
    throw new Error("RPC genesis hash is not Solana devnet. Refusing to verify a payment.");
  }
  genesisChecked = true;
}

export function solanaConnection(): Connection {
  const { rpc } = assertDevnetConfig();
  return new Connection(rpc, "finalized");
}

export function treasuryPubkey(): PublicKey {
  const configured = process.env.TREASURY_PUBKEY || process.env.NEXT_PUBLIC_TREASURY_PUBKEY;
  if (configured) return new PublicKey(configured);
  if (process.env.NODE_ENV === "production") {
    throw new Error("TREASURY_PUBKEY is required in production.");
  }
  const file = path.join(process.cwd(), ".data", "devnet-treasury.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    const saved = JSON.parse(fs.readFileSync(file, "utf8")) as { publicKey: string };
    return new PublicKey(saved.publicKey);
  }
  const keypair = Keypair.generate();
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Buffer.from(keypair.secretKey).toString("base64"),
        note: "Devnet only. Never fund this with mainnet assets.",
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  return keypair.publicKey;
}
