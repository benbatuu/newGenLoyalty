"use client";

import { motion } from "framer-motion";
import { fade } from "@/components/marketing/home/shared";
import { MarketingSurface } from "@/components/marketing/MarketingSurface";

export type InnerMetric = {
  value: string;
  label: string;
  hint?: string;
};

export function InnerMetricStrip({ items }: { items: InnerMetric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          {...fade}
          transition={{ ...fade.transition, delay: i * 0.05 }}
        >
          <MarketingSurface className="h-full">
            <p className="stat-number text-3xl tracking-tight text-foreground sm:text-4xl">
              {item.value}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{item.label}</p>
            {item.hint ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.hint}
              </p>
            ) : null}
          </MarketingSurface>
        </motion.div>
      ))}
    </div>
  );
}
