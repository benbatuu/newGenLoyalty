"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";
import {
  CounterMockup,
  ReportsMockup,
  SmsFlowMockup,
  WalletPassMockup,
} from "./ProductMockups";
import { CtaLabel, fade, type FeatureItem } from "./shared";
import { useTranslations } from "next-intl";

const mockups = [
  CounterMockup,
  SmsFlowMockup,
  WalletPassMockup,
  ReportsMockup,
  CounterMockup,
  ReportsMockup,
];

export function FeatureBento({
  title,
  intro,
  items,
  featuresPageTitle,
}: {
  title: string;
  intro: string;
  items: FeatureItem[];
  featuresPageTitle: string;
}) {
  const t = useTranslations("featuresPage");
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={t("label")} title={title} description={intro} />
          <Button asChild variant="outline" className="min-h-11 shrink-0 self-start lg:self-auto">
            <Link href="/features">
              <CtaLabel>{featuresPageTitle}</CtaLabel>
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-6 lg:auto-rows-[minmax(220px,auto)]">
          {items.map((item, i) => {
            const Mock = mockups[i % mockups.length];
            const featured = i === 0;
            return (
              <motion.article
                key={item.title}
                {...fade}
                transition={{ ...fade.transition, delay: (i % 3) * 0.04 }}
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]",
                  featured ? "md:col-span-2 lg:col-span-4 lg:row-span-2" : "lg:col-span-2",
                )}
              >
                <div className={cn("p-6", featured && "pb-0")}>
                  <h3 className="font-display text-xl tracking-tight text-[#DFE5EB]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#DFE5EB]/60">
                    {item.body}
                  </p>
                </div>
                {featured ? (
                  <div className="mt-4 border-t border-white/10">
                    <Mock className="scale-[0.98]" />
                  </div>
                ) : (
                  <div className="mt-auto border-t border-white/10 p-4">
                    <div className="rounded-md bg-white/[0.04] px-3 py-2 text-xs text-[#DFE5EB]/60">
                      {i + 1} · {t("dailyCounter")}
                    </div>
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
