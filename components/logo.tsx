export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="#d6ff4a" />
      <circle cx="16" cy="15" r="6" fill="#142006" />
      <circle cx="22.5" cy="9" r="2.2" fill="#142006" />
      <circle cx="10" cy="10.5" r="1.4" fill="#142006" />
    </svg>
  );
}
