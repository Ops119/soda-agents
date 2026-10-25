"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UseAgent({
  slug,
  hint,
  free,
}: {
  slug: string;
  hint: string;
  free?: number | null;
}) {
  const storageKey = `soda.key.${slug}`;
  const [key, setKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);

  function remembered() {
    return window.sessionStorage.getItem(storageKey) ?? "";
  }

  async function ask(useFree: boolean) {
    setPending(true);
    setError(null);
    setReply(null);
    const token = (key || remembered()).trim();
    if (!useFree && token) window.sessionStorage.setItem(storageKey, token);
    try {
      const response = await fetch(`/api/agents/${slug}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(useFree || !token ? {} : { authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ prompt: prompt || hint }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The agent did not answer.");
      setReply(JSON.stringify(body, null, 2));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The agent did not answer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-card/70 p-4">
      <h2 className="font-display text-xl">Use this agent</h2>
      <p className="mt-1 text-sm text-muted">
        The key stays in this browser session after you paste it. Soda stores only a hash.
      </p>
      <label className="mt-4 block text-sm" htmlFor={`key-${slug}`}>
        API key
        <Input
          id={`key-${slug}`}
          className="mt-1"
          autoComplete="off"
          placeholder="sk_soda_…"
          value={key}
          onChange={(event) => setKey(event.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm" htmlFor={`prompt-${slug}`}>
        Prompt
        <textarea
          id={`prompt-${slug}`}
          className="mt-1 min-h-28 w-full rounded-2xl border border-line bg-bg px-4 py-3 text-base text-foam placeholder:text-muted"
          placeholder={hint}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={4000}
        />
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" disabled={pending} onClick={() => ask(false)}>
          {pending ? "Asking…" : "Send"}
        </Button>
        {free ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => ask(true)}>
            {pending ? "Asking…" : `${free} free checks today`}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {reply ? (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-bg p-3 text-xs leading-relaxed text-foam">
          {reply}
        </pre>
      ) : null}
    </section>
  );
}
