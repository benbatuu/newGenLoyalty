"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";
import { CtaLabel, fade } from "./shared";
import { useTranslations } from "next-intl";

export type SectorItem = {
  title: string;
  body: string;
  image: string;
};

export function SectorsShowcase({
  title,
  intro,
  items,
  sectorsPageTitle,
  hideHeader = false,
  hideLink = false,
  embedded = false,
}: {
  title: string;
  intro: string;
  items: SectorItem[];
  sectorsPageTitle: string;
  hideHeader?: boolean;
  hideLink?: boolean;
  embedded?: boolean;
}) {
  const featured = items[0];
  const rest = items.slice(1, 6);

  const t = useTranslations("sectorsPage");
  return (
    <section
      className={cn(
        embedded
          ? ""
          : "border-y border-foreground/[0.08] bg-muted/30 py-20 sm:py-28",
      )}
    >
      <div className={cn("mx-auto max-w-7xl", embedded ? "px-0" : "px-5 sm:px-8")}>
        {!hideHeader ? (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow={t("title")}
              title={title}
              description={intro}
            />
            {!hideLink ? (
              <Button asChild variant="outline" className="shrink-0 self-start lg:self-auto">
                <Link href="/sectors">
                  <CtaLabel>{sectorsPageTitle}</CtaLabel>
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className={cn("grid gap-4 lg:grid-cols-12 lg:grid-rows-[repeat(2,minmax(220px,auto))]", !hideHeader && "mt-12")}>
          {featured ? (
            <motion.article
              {...fade}
              className="attio-surface group relative overflow-hidden lg:col-span-7 lg:row-span-2"
            >
              <div className="relative min-h-[280px] sm:min-h-[320px] lg:min-h-full lg:absolute lg:inset-0">
                <Image
                  src={featured.image}
                  alt={featured.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  sizes="(max-width:1024px) 100vw, 58vw"
                  priority
                />
                {/* Stronger veil on mobile so overlay copy stays readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/15 lg:from-foreground/78 lg:via-foreground/28 lg:to-transparent" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/75">
                  01 · Featured
                </p>
                <h3 className="mt-3 max-w-lg font-display text-2xl tracking-tight text-white sm:text-3xl">
                  {featured.title}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/90 sm:text-base">
                  {featured.body}
                </p>
              </div>
            </motion.article>
          ) : null}

          {rest.map((item, i) => (
            <motion.article
              key={item.title}
              {...fade}
              transition={{ ...fade.transition, delay: (i + 1) * 0.04 }}
              className={cn(
                "attio-surface group overflow-hidden",
                i < 2 ? "lg:col-span-5" : "lg:col-span-4",
              )}
            >
              <div className="relative h-44 overflow-hidden sm:h-48">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                  sizes="(max-width:1024px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 to-transparent opacity-80 transition group-hover:opacity-90" />
                <span className="absolute left-4 top-4 rounded-full bg-background/90 px-2.5 py-1 text-[0.65rem] font-semibold text-foreground">
                  {String(i + 2).padStart(2, "0")}
                </span>
              </div>
              <div className="p-5 sm:p-6">
                <h3 className="font-display text-lg tracking-tight text-foreground sm:text-xl">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
