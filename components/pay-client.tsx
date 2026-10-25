"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers";
import { Button } from "@/components/ui/button";

const reasons: Record<string, string> = {
  amount: "The amount was not the order total.",
  mint: "The token was not devnet USDC.",
  recipient: "The recipient was not the Soda treasury.",
  reference: "The payment reference did not match this order.",
  failed_tx: "The transaction failed on-chain.",
  not_finalized: "Waiting for the transaction to finalize.",
};

export function PayClient({
  orderId,
  amount,
  expiresAt,
  initialStatus,
}: {
  orderId: string;
  amount: string;
  expiresAt: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const { wallet, session, setConnectOpen } = useApp();
  const [status, setStatus] = useState(initialStatus);
  const [phase, setPhase] = useState<"idle" | "building" | "signing" | "checking">("idle");
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<{ url: string; qrDataUrl: string } | null>(null);
  const [message, setMessage] = useState("Waiting for a finalized devnet payment.");
  const checkRef = useRef<(manual: boolean) => Promise<void>>(async () => undefined);

  useEffect(() => {
    if (status !== "pending") return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (new Date(expiresAt).getTime() + 2 * 60 * 1000 < Date.now()) {
        setMessage("This order has expired. If you paid in time, check once more.");
        return;
      }
      void checkRef.current(false);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [expiresAt, status]);

  async function check(manual: boolean) {
    if (manual) setPhase("checking");
    try {
      const response = await fetch(`/api/orders/${orderId}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await response.json()) as {
        status?: string;
        error?: string;
        reason?: string;
        apiKey?: string | null;
        slugs?: string[];
        alreadyIssued?: boolean;
      };
      if (response.status === 202 || body.status === "pending") {
        setMessage("No finalized payment yet. Devnet finality usually takes under a minute.");
        return;
      }
      if (body.status === "mismatch") {
        setError(reasons[body.reason ?? ""] ?? "The payment did not match this order.");
        return;
      }
      if (!response.ok) {
        setError(body.error ?? "Could not verify the payment.");
        return;
      }
      if (body.apiKey) {
        window.sessionStorage.setItem(
          `soda.reveal.${orderId}`,
          JSON.stringify({ apiKey: body.apiKey, slugs: body.slugs ?? [] }),
        );
        for (const slug of body.slugs ?? []) window.sessionStorage.setItem(`soda.key.${slug}`, body.apiKey);
      }
      setStatus("paid");
      router.push(`/orders/${orderId}/success`);
    } catch {
      if (manual) setError("Could not reach the verifier.");
    } finally {
      if (manual) setPhase("idle");
    }
  }

  checkRef.current = check;

  async function loadQr() {
    setError(null);
    const response = await fetch(`/api/orders/${orderId}/solana-pay`);
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not build the Solana Pay code.");
      return;
    }
    setQr(body);
  }

  async function payInApp() {
    setError(null);
    if (!session) {
      setConnectOpen(true);
      return;
    }
    if (!wallet.current) {
      setConnectOpen(true);
      return;
    }
    if (wallet.current.address !== session.wallet) {
      setError("The connected wallet is not the one you signed in with. Connect that wallet again.");
      setConnectOpen(true);
      return;
    }
    setPhase("building");
    try {
      const response = await fetch(`/api/orders/${orderId}/transaction`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not build the transaction.");
      setPhase("signing");
      await wallet.current.signAndSend(body.transaction);
      setPhase("checking");
      await check(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The wallet did not send the payment.");
      setPhase("idle");
    }
  }

  const expired = status === "pending" && new Date(expiresAt).getTime() <= Date.now();

  return (
    <div className="grid gap-4">
      <p role="status" className="text-sm text-muted" aria-live="polite">
        {message}
      </p>
      <Button type="button" size="lg" disabled={phase !== "idle" || status !== "pending"} onClick={payInApp}>
        {phase === "building" ? "Building transaction…" : phase === "signing" ? "Approve in your wallet…" : phase === "checking" ? "Verifying…" : `Pay ${amount} USDC`}
      </Button>
      <Button type="button" variant="outline" disabled={status !== "pending"} onClick={loadQr}>
        Show Solana Pay QR
      </Button>
      {qr ? (
        <div className="rounded-3xl border border-line bg-foam p-4 text-lime-ink">
          {/* eslint-disable-next-line @next/next/no-img-element -- data-URL QR, not a remote image */}
          <img src={qr.qrDataUrl} alt="Solana Pay QR code for this USDC order" className="mx-auto w-full max-w-[280px]" />
          <p className="mt-3 text-sm">Scan with a devnet wallet. The token is devnet USDC, not mainnet USDC.</p>
          <button
            type="button"
            className="mt-2 break-all text-left text-xs underline"
            onClick={() => navigator.clipboard.writeText(qr.url)}
          >
            Copy Solana Pay link
          </button>
        </div>
      ) : null}
      <Button type="button" variant="ghost" disabled={phase !== "idle"} onClick={() => check(true)}>
        {expired ? "Check the chain once more" : "I've paid — check now"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
