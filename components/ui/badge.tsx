import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  lime: "bg-lime/15 text-lime",
  foam: "bg-foam/10 text-foam",
  warn: "bg-warn/15 text-warn",
  danger: "bg-danger/15 text-danger",
  muted: "bg-foam/8 text-muted",
  ok: "bg-ok/15 text-ok",
} as const;

export function Badge({
  tone = "muted",
  className,
  children,
}: {
  tone?: keyof typeof tones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase", tones[tone], className)}>
      {children}
    </span>
  );
}
