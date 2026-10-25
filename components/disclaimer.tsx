export function RiskDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      role="note"
      className={`rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm leading-relaxed text-warn ${className}`}
    >
      Not financial advice. These agents can be wrong. Crypto is high risk and you may lose everything.
    </p>
  );
}
