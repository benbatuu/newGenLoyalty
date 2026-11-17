"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import {
  Gift,
  MessageSquare,
  QrCode,
  RefreshCw,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";
import { CtaLabel, fade } from "./shared";

const ICONS = [Smartphone, QrCode, RefreshCw, Gift, MessageSquare, TrendingUp];

export type UseCaseItem = {
  title: string;
  body: string;
};

export function UseCasesSection({
  title,
  intro,
  items,
  useCasesPageTitle,
  hideHeader = false,
  hideLink = false,
  embedded = false,
}: {
  title: string;
  intro: string;
  items: UseCaseItem[];
  useCasesPageTitle: string;
  hideHeader?: boolean;
  hideLink?: boolean;
  embedded?: boolean;
}) {
  const rows = items.slice(0, 6);

  return (
    <section className={cn(embedded ? "" : "py-20 sm:py-28")}>
      <div className={cn("mx-auto max-w-7xl", embedded ? "px-0" : "px-5 sm:px-8")}>
        {!hideHeader ? (
          <SectionHeader
            eyebrow="Use cases"
            title={title}
            description={intro}
            className="mb-12 max-w-2xl"
          />
        ) : null}

        <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", hideHeader && "mt-0")}>
          {rows.map((item, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <motion.article
                key={item.title}
                {...fade}
                transition={{ ...fade.transition, delay: i * 0.04 }}
                className="attio-surface relative flex h-full flex-col p-6 sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/[0.08] bg-muted/40 text-[#ff5a6e]">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
                {i < rows.length - 1 ? (
                  <div className="pointer-events-none absolute -bottom-2 left-1/2 hidden h-4 w-px -translate-x-1/2 bg-foreground/10 xl:block" />
                ) : null}
              </motion.article>
            );
          })}
        </div>

        {!hideLink ? (
          <div className="mt-10">
            <Button asChild variant="outline">
              <Link href="/use-cases">
                <CtaLabel>{useCasesPageTitle}</CtaLabel>
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
