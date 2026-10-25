"use client";

import Link from "next/link";
import { useApp } from "@/components/providers";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/utils";

export function Header() {
  const { session, setConnectOpen, wallet } = useApp();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    if (wallet.current) await wallet.current.disconnect().catch(() => undefined);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg tracking-tight">
            soda<span className="text-muted">.agents</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="hidden rounded-full px-3 py-2 text-muted hover:text-foam sm:inline">
            Dashboard
          </Link>
          {session ? (
            <>
              <Link href="/dashboard" className="rounded-full border border-line px-3 py-2 text-xs text-foam">
                {shortAddress(session.wallet)}
              </Link>
              <Button type="button" variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" onClick={() => setConnectOpen(true)}>
              Connect
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
