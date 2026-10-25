import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-16">
      <h1 className="font-display text-4xl">That page is not on the menu.</h1>
      <p className="mt-3 text-muted">The catalogue is still open.</p>
      <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-lime px-5 font-semibold text-lime-ink">
        Back to agents
      </Link>
    </section>
  );
}
