"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { fade } from "@/components/marketing/home/shared";
import { MarketingSurface } from "@/components/marketing/MarketingSurface";

export function InnerChecklistPanel({
  title,
  description,
  items,
  columns = 2,
}: {
  title: string;
  description?: string;
  items: string[];
  columns?: 1 | 2;
}) {
  return (
    <motion.div {...fade}>
      <MarketingSurface>
        <h3 className="font-display text-xl tracking-tight text-foreground sm:text-2xl">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
        <ul
          className={
            columns === 2
              ? "mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2"
              : "mt-6 space-y-3"
          }
        >
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-foreground/90">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5a6e]" />
              {item}
            </li>
          ))}
        </ul>
      </MarketingSurface>
    </motion.div>
  );
}
