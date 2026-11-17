import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MarketingSurface({
  children,
  className,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={cn("attio-surface", padding && "p-6 sm:p-7", className)}>
      {children}
    </div>
  );
}
