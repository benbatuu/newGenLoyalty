"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fade } from "@/components/marketing/home/shared";
import { MarketingSurface } from "@/components/marketing/MarketingSurface";

export function InnerSplitSection({
  eyebrow,
  title,
  body,
  bullets,
  visual,
  reverse = false,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  bullets?: string[];
  visual?: ReactNode;
  reverse?: boolean;
}) {
  return (
    <motion.div
      {...fade}
      className="attio-surface grid gap-8 overflow-hidden p-6 sm:grid-cols-2 sm:p-8 lg:gap-12"
    >
      <div className={reverse ? "sm:order-2" : undefined}>
        {eyebrow ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-[#ff5a6e]">
            {eyebrow}
          </span>
        ) : null}
        <h2
          className={cn(
            "font-display text-2xl tracking-tight text-foreground sm:text-3xl",
            eyebrow && "mt-3",
          )}
        >
          {title}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {body}
        </p>
        {bullets && bullets.length > 0 ? (
          <ul className="mt-6 space-y-2.5">
            {bullets.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm text-foreground/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5a6e]" />
                {line}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {visual ? (
        <div
          className={cn(
            "flex min-h-[220px] items-center justify-center rounded-xl border border-foreground/[0.08] bg-muted/25 p-4 sm:min-h-[260px]",
            reverse && "sm:order-1",
          )}
        >
          {visual}
        </div>
      ) : null}
    </motion.div>
  );
}
