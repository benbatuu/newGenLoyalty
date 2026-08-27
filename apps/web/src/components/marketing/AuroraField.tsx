"use client";

import { cn } from "@/lib/utils";

/** Animated aurora + grid for dark sections */
export function AuroraField({ className }: { className?: string }) {
  return (
    <div className={cn("aurora-field pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="aurora-orb aurora-orb-a" />
      <div className="aurora-orb aurora-orb-b" />
      <div className="aurora-orb aurora-orb-c" />
      <div className="aurora-grid" />
      <div className="aurora-vignette" />
      <div className="grain opacity-[0.07]" />
    </div>
  );
}
