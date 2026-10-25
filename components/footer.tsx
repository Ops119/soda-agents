import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Devnet only. USDC. Not financial advice.</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/legal/terms" className="hover:text-foam">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-foam">Privacy</Link>
          <Link href="/legal/refunds" className="hover:text-foam">Refunds</Link>
          <Link href="/dashboard" className="hover:text-foam">Dashboard</Link>
        </nav>
      </div>
    </footer>
  );
}
