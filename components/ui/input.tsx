import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-foam placeholder:text-muted",
        className,
      )}
      {...props}
    />
  );
}
