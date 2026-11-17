"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { WalletPassMockup } from "./ProductMockups";
import { fade } from "./shared";
import { useTranslations } from "next-intl";

export function ProductSection({
  title,
  body,
  points,
}: {
  title: string;
  body: string;
  points: string[];
}) {

  const t = useTranslations("sections")
  return (
    <section className="border-b border-white/10 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <motion.div {...fade}>
          <SectionHeader eyebrow={t("productLabel")} title={title} description={body} />
          <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 py-3.5 text-sm sm:text-base">
                <Check className="h-4 w-4 shrink-0 text-[#ff5a6e]" />
                <span className="text-[#DFE5EB]/85">{p}</span>
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div {...fade} transition={{ ...fade.transition, delay: 0.08 }}>
          <WalletPassMockup />
        </motion.div>
      </div>
    </section>
  );
}
