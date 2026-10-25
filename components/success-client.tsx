"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function SuccessClient({ orderId }: { orderId: string }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(`soda.reveal.${orderId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { apiKey?: string };
        setApiKey(parsed.apiKey ?? null);
      } catch {
        setApiKey(null);
      }
    }
    setReady(true);
  }, [orderId]);

  if (!ready) return <p className="text-sm text-muted">Loading your key…</p>;

  if (!apiKey) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        This key was already shown. If you did not copy it, rotate it on the dashboard. Rotation issues a new key and retires the old one.
      </p>
    );
  }

  return (
    <div className="rounded-3xl border border-lime/40 bg-lime/10 p-4">
      <p className="text-sm text-lime">Copy this key now. Closing the tab hides it. Soda only keeps a hash.</p>
      <p className="mt-3 break-all font-mono text-sm">{apiKey}</p>
      <Button type="button" className="mt-4" onClick={() => navigator.clipboard.writeText(apiKey)}>
        Copy key
      </Button>
    </div>
  );
}
