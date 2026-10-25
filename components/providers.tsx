"use client";

import { AddressType } from "@phantom/browser-sdk";
import { darkTheme, PhantomProvider, useAccounts, useConnect, useDisconnect, useSolana } from "@phantom/react-sdk";
import type { Adapter, MessageSignerWalletAdapter } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { ConnectionProvider, useConnection, useWallet, WalletProvider } from "@solana/wallet-adapter-react";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
} from "@solana-mobile/wallet-adapter-mobile";
import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildSiwsMessage } from "@/lib/siws";

export type SessionView = {
  profileId: string;
  wallet: string;
  email: string | null;
  country: string | null;
};

export type ConnectedWallet = {
  address: string;
  signMessage: (message: string) => Promise<Uint8Array>;
  signAndSend: (base64Tx: string) => Promise<string>;
  disconnect: () => Promise<void>;
};

type WalletApi = {
  ready: boolean;
  social: boolean;
  current: ConnectedWallet | null;
  adapterNames: string[];
  connectPhantom: () => Promise<ConnectedWallet>;
  connectSocial: (provider: "google" | "apple") => Promise<ConnectedWallet>;
  connectAdapter: (name: string) => Promise<ConnectedWallet>;
};

type AppContextValue = {
  session: SessionView | null;
  refresh: () => Promise<void>;
  connectOpen: boolean;
  setConnectOpen: (open: boolean) => void;
  wallet: WalletApi;
  signIn: (connected: ConnectedWallet) => Promise<void>;
  signingIn: boolean;
  authError: string | null;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("App context missing.");
  return value;
}

const idleWallet: WalletApi = {
  ready: false,
  social: false,
  current: null,
  adapterNames: [],
  connectPhantom: async () => {
    throw new Error("Wallets are still starting.");
  },
  connectSocial: async () => {
    throw new Error("Wallets are still starting.");
  },
  connectAdapter: async () => {
    throw new Error("Wallets are still starting.");
  },
};

function bytesFromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function phantomSignature(result: { signature?: Uint8Array } | Uint8Array): Uint8Array {
  if (result instanceof Uint8Array) return result;
  if (result.signature instanceof Uint8Array) return result.signature;
  throw new Error("Could not read the signature.");
}

function Bridge({
  social,
  onReady,
}: {
  social: boolean;
  onReady: (wallet: WalletApi) => void;
}) {
  const { connect } = useConnect();
  const accounts = useAccounts();
  const { solana } = useSolana();
  const { disconnect } = useDisconnect();
  const adapter = useWallet();
  const { connection } = useConnection();
  const [current, setCurrent] = useState<ConnectedWallet | null>(null);
  const solanaRef = useRef(solana);
  solanaRef.current = solana;

  const waitForSolanaAddress = useCallback(async (fallback: string | null | undefined) => {
    if (fallback) return fallback;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const key = solanaRef.current.publicKey;
      if (key) return key;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return solanaRef.current.publicKey;
  }, []);

  const phantomSend = useCallback(async (base64Tx: string) => {
    const chain = solanaRef.current;
    if (!chain.publicKey) throw new Error("Phantom is not connected.");
    try {
      await chain.switchNetwork("devnet");
    } catch {
      // A devnet blockhash makes a mainnet submission fail closed.
    }
    const tx = VersionedTransaction.deserialize(bytesFromBase64(base64Tx));
    const result = await chain.signAndSendTransaction(tx as never);
    if (!result.signature) throw new Error("Phantom did not return a signature.");
    return result.signature;
  }, []);

  const api = useMemo<WalletApi>(() => {
    const fromPhantom = async (provider: "injected" | "google" | "apple") => {
      const result = await connect({ provider });
      const listed =
        result.addresses?.find((item) => item.addressType === AddressType.solana)?.address ??
        accounts?.find((item) => item.addressType === AddressType.solana)?.address;
      const address = await waitForSolanaAddress(listed);
      if (!address) throw new Error("Phantom did not return a Solana address.");
      const connected: ConnectedWallet = {
        address,
        signMessage: async (message) => phantomSignature(await solanaRef.current.signMessage(message)),
        signAndSend: phantomSend,
        disconnect: async () => {
          await disconnect();
          setCurrent(null);
        },
      };
      setCurrent(connected);
      return connected;
    };

    return {
      ready: true,
      social,
      current,
      adapterNames: adapter.wallets
        .map((wallet) => wallet.adapter.name)
        .filter((name) => !/phantom/i.test(name)),
      connectPhantom: () => fromPhantom("injected"),
      connectSocial: (provider) => fromPhantom(provider),
      connectAdapter: async (name) => {
        const match = adapter.wallets.find((wallet) => wallet.adapter.name === name);
        if (!match) throw new Error("That wallet is not available on this device.");
        const walletAdapter = match.adapter;
        adapter.select(walletAdapter.name);
        await walletAdapter.connect();
        const signer = walletAdapter as Adapter & Partial<MessageSignerWalletAdapter>;
        const publicKey = walletAdapter.publicKey;
        if (!publicKey || typeof signer.signMessage !== "function") {
          throw new Error("This wallet cannot sign the sign-in message.");
        }
        const address = publicKey.toBase58();
        const connected: ConnectedWallet = {
          address,
          signMessage: (message) => signer.signMessage!(new TextEncoder().encode(message)),
          signAndSend: async (base64Tx) => {
            const tx = VersionedTransaction.deserialize(bytesFromBase64(base64Tx));
            return walletAdapter.sendTransaction(tx, connection);
          },
          disconnect: async () => {
            await walletAdapter.disconnect();
            setCurrent(null);
          },
        };
        setCurrent(connected);
        return connected;
      },
    };
  }, [accounts, adapter, connect, connection, current, disconnect, phantomSend, social, waitForSolanaAddress]);

  const apiRef = useRef(api);
  apiRef.current = api;
  const published = useRef("");

  useEffect(() => {
    const snapshot = `${api.ready}|${api.social}|${api.current?.address ?? ""}|${api.adapterNames.join(",")}`;
    if (snapshot === published.current) return;
    published.current = snapshot;
    onReady({
      ready: api.ready,
      social: api.social,
      current: api.current
        ? {
            address: api.current.address,
            signMessage: (message) => {
              const connected = apiRef.current.current;
              if (!connected) throw new Error("Reconnect the wallet before signing.");
              return connected.signMessage(message);
            },
            signAndSend: (tx) => {
              const connected = apiRef.current.current;
              if (!connected) throw new Error("Reconnect the wallet before paying.");
              return connected.signAndSend(tx);
            },
            disconnect: async () => {
              await apiRef.current.current?.disconnect();
            },
          }
        : null,
      adapterNames: api.adapterNames,
      connectPhantom: () => apiRef.current.connectPhantom(),
      connectSocial: (provider) => apiRef.current.connectSocial(provider),
      connectAdapter: (name) => apiRef.current.connectAdapter(name),
    });
  }, [api, onReady]);

  return null;
}

function Engines({
  rpc,
  phantomAppId,
  onReady,
}: {
  rpc: string;
  phantomAppId: string;
  onReady: (wallet: WalletApi) => void;
}) {
  const [wallets, setWallets] = useState<Adapter[] | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const social = Boolean(phantomAppId);
  const phantomConfig = useMemo(
    () => ({
      providers: (social ? ["google", "apple", "injected"] : ["injected"]) as Array<
        "google" | "apple" | "injected"
      >,
      appId: social ? phantomAppId : undefined,
      addressTypes: [AddressType.solana],
      authOptions: { redirectUrl: origin ? `${origin}/` : "/" },
    }),
    [origin, phantomAppId, social],
  );

  useEffect(() => {
    const here = window.location.origin;
    setOrigin(here);
    const next: Adapter[] = [new SolflareWalletAdapter(), new PhantomWalletAdapter()];
    if (/android/i.test(navigator.userAgent)) {
      next.push(
        new SolanaMobileWalletAdapter({
          addressSelector: createDefaultAddressSelector(),
          appIdentity: {
            name: "Soda.agents",
            uri: here,
            icon: `${here}/icon-192.png`,
          },
          authorizationResultCache: createDefaultAuthorizationResultCache(),
          chain: "solana:devnet",
          onWalletNotFound: createDefaultWalletNotFoundHandler(),
        }),
      );
    }
    setWallets(next);
  }, []);

  if (!wallets || !origin) return null;

  return (
    <ConnectionProvider endpoint={rpc}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <PhantomProvider config={phantomConfig} theme={darkTheme} appName="Soda.agents">
          <Bridge social={social} onReady={onReady} />
        </PhantomProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function Providers({
  children,
  initialSession,
  phantomAppId,
  rpc,
}: {
  children: React.ReactNode;
  initialSession: SessionView | null;
  phantomAppId: string;
  rpc: string;
}) {
  const [session, setSession] = useState(initialSession);
  const [connectOpen, setConnectOpen] = useState(false);
  const [wallet, setWallet] = useState<WalletApi>({ ...idleWallet, social: Boolean(phantomAppId) });
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/auth/session");
    const body = (await response.json()) as { session: SessionView | null };
    setSession(body.session);
  }, []);

  const signIn = useCallback(async (connected: ConnectedWallet) => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const nonceResponse = await fetch("/api/auth/nonce", { method: "POST" });
      const nonceBody = (await nonceResponse.json()) as { nonce?: string; error?: string };
      if (!nonceResponse.ok || !nonceBody.nonce) {
        throw new Error(nonceBody.error ?? "Could not start sign-in.");
      }
      const issued = new Date();
      const message = buildSiwsMessage({
        domain: window.location.host,
        address: connected.address,
        uri: window.location.origin,
        version: "1",
        chain: "solana:devnet",
        nonce: nonceBody.nonce,
        issuedAt: issued.toISOString(),
        expirationTime: new Date(issued.getTime() + 10 * 60 * 1000).toISOString(),
      });
      const signature = await connected.signMessage(message);
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          signature: bs58.encode(signature),
          address: connected.address,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Sign-in was rejected.");
      await refresh();
      setConnectOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed.";
      setAuthError(message);
      throw error;
    } finally {
      setSigningIn(false);
    }
  }, [refresh]);

  const value = useMemo(
    () => ({ session, refresh, connectOpen, setConnectOpen, wallet, signIn, signingIn, authError }),
    [authError, connectOpen, refresh, session, signIn, signingIn, wallet],
  );

  return (
    <AppContext.Provider value={value}>
      <Engines rpc={rpc} phantomAppId={phantomAppId} onReady={setWallet} />
      {children}
    </AppContext.Provider>
  );
}
