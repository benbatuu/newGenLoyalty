"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";
import { fade, type ProofItem } from "./shared";
import { useTranslations } from "next-intl";

export function StatsGrid({
  title,
  items,
}: {
  title: string;
  items: ProofItem[];
}) {

  const t = useTranslations("sections");

  return (

    <section className="border-b border-foreground/[0.08] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow={t("statsGridTitle")}
          title={title}
          className="mb-10"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              {...fade}
              transition={{ ...fade.transition, delay: i * 0.05 }}
              className="attio-surface px-6 py-8"
            >
              <p className="stat-number text-4xl tracking-tight sm:text-5xl">
                {item.stat}
              </p>
              <p className="mt-3 text-base font-medium text-foreground">
                {item.label}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.hint}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
