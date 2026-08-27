"use client";

import { DemoButton } from "@/components/marketing/DemoModal";

export function DemoCta({
  label,
  className,
  variant = "default",
  size = "default",
}: {
  label: string;
  className?: string;
  variant?: "default" | "light" | "ghost-light" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
}) {
  return (
    <DemoButton variant={variant} size={size} className={className}>
      <span className="relative z-10 inline-flex items-center gap-2.5">
        {label}
        <span className="btn-arrow" aria-hidden>
          →
        </span>
      </span>
    </DemoButton>
  );
}
