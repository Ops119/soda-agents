"use client";

import { useState } from "react";
import { UseAgent } from "@/components/use-agent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRY_CODES, countryLabel } from "@/lib/countries";
import { formatWhen } from "@/lib/utils";

export type DashboardLicence = {
  id: string;
  name: string;
  slug: string;
  delivery: "hosted" | "kit";
  status: string;
  endsAt: string | null;
  prefix: string | null;
  hint: string;
  execution: boolean;
  blocked: boolean;
};

export function DashboardClient({
  licences,
  email,
  country,
}: {
  licences: DashboardLicence[];
  email: string | null;
  country: string | null;
}) {
  const [profileEmail, setProfileEmail] = useState(email ?? "");
  const [profileCountry, setProfileCountry] = useState(country ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile() {
    setError(null);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: profileEmail.trim() ? profileEmail.trim() : null,
        country: profileCountry || null,
      }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Could not save.");
    else setNotice("Saved.");
  }

  async function rotate(id: string) {
    setError(null);
    setRevealed(null);
    const response = await fetch(`/api/licences/${id}/rotate`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not rotate the key.");
      return;
    }
    setRevealed(body.apiKey);
    setNotice("New key. Copy it now — it will not be shown again.");
  }

  async function revoke(id: string, name: string) {
    if (!window.confirm(`Revoke access to ${name}? The current key for this licence stops working.`)) return;
    const response = await fetch(`/api/licences/${id}/revoke`, { method: "POST" });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Could not revoke.");
      return;
    }
    window.location.reload();
  }

  async function download(id: string) {
    setError(null);
    const response = await fetch(`/api/licences/${id}/download`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not create a download link.");
      return;
    }
    window.location.href = body.url;
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-line bg-card/60 p-4">
        <h2 className="font-display text-xl">Receipt details</h2>
        <div className="mt-3 grid gap-3">
          <label className="text-sm" htmlFor="dash-email">
            Email
            <Input id="dash-email" className="mt-1" type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} />
          </label>
          <label className="text-sm" htmlFor="dash-country">
            Country
            <select id="dash-country" className="mt-1 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-foam" value={profileCountry} onChange={(event) => setProfileCountry(event.target.value)}>
              <option value="">Select</option>
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>{countryLabel(code)}</option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" onClick={saveProfile}>Save</Button>
        </div>
      </section>

      {notice ? <p className="text-sm text-ok">{notice}</p> : null}
      {revealed ? (
        <section className="rounded-3xl border border-lime/40 bg-lime/10 p-4">
          <p className="text-sm text-lime">Copy this key now. It is not stored in a form you can open later.</p>
          <p className="mt-2 break-all font-mono text-sm">{revealed}</p>
          <Button type="button" className="mt-3" variant="outline" onClick={() => navigator.clipboard.writeText(revealed)}>
            Copy key
          </Button>
        </section>
      ) : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

      {licences.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-line p-6 text-sm text-muted">
          No licences yet. Pick an agent from the catalogue and pay in devnet USDC.
        </section>
      ) : (
        licences.map((licence) => (
          <article key={licence.id} className="rounded-3xl border border-line bg-card/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl">{licence.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {licence.status === "active" ? "Active" : licence.status}
                  {licence.endsAt ? ` · ends ${formatWhen(licence.endsAt)}` : " · does not expire"}
                  {licence.prefix ? ` · ${licence.prefix}…` : ""}
                </p>
              </div>
            </div>
            {licence.blocked ? (
              <p className="mt-3 text-sm text-warn">Execution is hidden in your region. This agent only builds a transaction for you to sign, and that feature stays off here.</p>
            ) : null}
            <p className="mt-3 text-xs text-muted">
              Rotate and revoke apply to this licence. A bundle shares one secret at purchase, so the other licences keep working until you rotate or revoke them too.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {licence.delivery === "kit" ? (
                <Button type="button" onClick={() => download(licence.id)}>Download kit</Button>
              ) : null}
              <Button type="button" variant="outline" disabled={licence.status !== "active"} onClick={() => rotate(licence.id)}>
                Rotate key
              </Button>
              <Button type="button" variant="danger" onClick={() => revoke(licence.id, licence.name)}>
                Revoke
              </Button>
            </div>
            {licence.delivery === "hosted" && licence.status === "active" && !licence.blocked ? (
              <div className="mt-4">
                <UseAgent slug={licence.slug} hint={licence.hint} />
              </div>
            ) : null}
          </article>
        ))
      )}
    </div>
  );
}
