"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useApp } from "@/components/providers";

export function ConnectSheet() {
  const { connectOpen, setConnectOpen, wallet, signIn, signingIn, authError } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<void>) {
    setError(null);
    setPending(label);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not connect.");
    } finally {
      setPending(null);
    }
  }

  const busy = Boolean(pending) || signingIn;

  return (
    <Dialog open={connectOpen} onOpenChange={setConnectOpen} title="Connect a wallet">
      <p className="mb-4 text-sm leading-relaxed text-muted">
        Sign in with your Solana address. The message does not move funds. Soda never asks for your seed phrase.
      </p>
      <div className="grid gap-2">
        {wallet.social ? (
          <>
            <Button type="button" disabled={!wallet.ready || busy} onClick={() => run("google", async () => signIn(await wallet.connectSocial("google")))}>
              {pending === "google" ? "Waiting for Google…" : "Continue with Google"}
            </Button>
            <Button type="button" variant="outline" disabled={!wallet.ready || busy} onClick={() => run("apple", async () => signIn(await wallet.connectSocial("apple")))}>
              {pending === "apple" ? "Waiting for Apple…" : "Continue with Apple"}
            </Button>
          </>
        ) : null}
        <Button type="button" variant={wallet.social ? "outline" : "default"} disabled={!wallet.ready || busy} onClick={() => run("phantom", async () => signIn(await wallet.connectPhantom()))}>
          {pending === "phantom" ? "Waiting for Phantom…" : "Phantom"}
        </Button>
        {wallet.adapterNames.map((name) => (
          <Button key={name} type="button" variant="outline" disabled={!wallet.ready || busy} onClick={() => run(name, async () => signIn(await wallet.connectAdapter(name)))}>
            {pending === name ? `Waiting for ${name}…` : name}
          </Button>
        ))}
        {!wallet.ready ? <p className="text-sm text-muted">Preparing wallets…</p> : null}
      </div>
      {error || authError ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error || authError}
        </p>
      ) : null}
      <p className="mt-4 text-xs leading-relaxed text-muted">
        On Android, a Solana mobile wallet shows up in this list. Payments stay on devnet.
      </p>
    </Dialog>
  );
}
