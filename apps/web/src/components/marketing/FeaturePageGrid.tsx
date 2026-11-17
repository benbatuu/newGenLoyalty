"use client";

import { motion } from "framer-motion";
import { fade, type FeatureItem } from "@/components/marketing/home/shared";

export function FeaturePageGrid({
  items,
  badge,
}: {
  items: FeatureItem[];
  badge?: string;
}) {
  return (
    <>
      {badge ? (
        <span className="attio-eyebrow mb-8 inline-block">{badge}</span>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <motion.article
            key={item.title}
            {...fade}
            transition={{ ...fade.transition, delay: (i % 3) * 0.04 }}
            className="attio-surface p-6 sm:p-7"
          >
            <p className="text-sm font-medium tabular-nums text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-4 font-display text-xl tracking-tight text-foreground">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          </motion.article>
        ))}
      </div>
    </>
  );
}
