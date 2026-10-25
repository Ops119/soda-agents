"use client";

import { useApp } from "@/components/providers";
import { Button } from "@/components/ui/button";

export function ConnectPrompt({ title, body }: { title: string; body: string }) {
  const { setConnectOpen } = useApp();
  return (
    <section className="mx-auto max-w-lg py-10">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="mt-3 text-muted">{body}</p>
      <Button type="button" className="mt-6" onClick={() => setConnectOpen(true)}>
        Connect wallet
      </Button>
    </section>
  );
}
