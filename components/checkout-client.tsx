"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/providers";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRY_CODES, countryLabel } from "@/lib/countries";

export function CheckoutClient({
  listingId,
  needsCountry,
  siteKey,
  initialEmail,
  initialCountry,
}: {
  listingId: string;
  needsCountry: boolean;
  siteKey?: string;
  initialEmail: string | null;
  initialCountry: string | null;
}) {
  const router = useRouter();
  const { session, setConnectOpen } = useApp();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [country, setCountry] = useState(initialCountry ?? "");
  const [token, setToken] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createOrder() {
    if (!session) {
      setConnectOpen(true);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId,
          email: email.trim(),
          country: country || undefined,
          turnstileToken: token,
        }),
      });
      const body = (await response.json()) as { orderId?: string; error?: string };
      if (!response.ok || !body.orderId) throw new Error(body.error ?? "Could not start the order.");
      router.push(`/pay/${body.orderId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the order.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4">
      <label className="text-sm" htmlFor="checkout-email">
        Email for the receipt and the key
        <Input
          id="checkout-email"
          className="mt-1"
          type="email"
          autoComplete="email"
          placeholder="Optional, but useful if you close this tab"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="text-sm" htmlFor="checkout-country">
        Country {needsCountry ? "(required for this agent)" : "(optional)"}
        <select
          id="checkout-country"
          className="mt-1 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-foam"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
        >
          <option value="">Select</option>
          {COUNTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {countryLabel(code)}
            </option>
          ))}
        </select>
      </label>
      <Turnstile siteKey={siteKey} onToken={setToken} />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="button" size="lg" disabled={pending} onClick={createOrder}>
        {pending ? "Creating order…" : session ? "Continue to payment" : "Connect wallet to pay"}
      </Button>
      <p className="text-xs leading-relaxed text-muted">
        Prepaid USDC on devnet. No recurring charge. Soda never asks for your seed phrase.
      </p>
    </div>
  );
}
