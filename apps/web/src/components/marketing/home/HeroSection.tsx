"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DemoButton } from "@/components/marketing/DemoModal";
import { ProductFrame } from "./ProductFrame";
import { CounterMockup } from "./ProductMockups";

export function HeroSection({
  headline,
  sub,
  ctaPrimary,
  ctaSecondary,
}: {
  heroAlt?: string;
  headline: string;
  sub: string;
  ctaPrimary: string;
  ctaSecondary: string;
}) {
  const t = useTranslations("home");

  return (
    <section className="border-b border-white/10 pb-20 pt-14 sm:pt-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-sm text-[#DFE5EB]/60">{t("pill")}</p>

          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-[#DFE5EB] sm:text-5xl lg:text-6xl">
            {t("hero.title")}{" "}
            <span className="text-[#ff5a6e]">{t("hero.subtitle")}</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg text-[#DFE5EB]/80">{headline}</p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#DFE5EB]/60">
            {sub}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <DemoButton size="lg" className="w-full sm:w-auto">
              {ctaPrimary}
            </DemoButton>
            <Link
              href="/how"
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/15 px-6 text-sm font-medium text-[#DFE5EB] transition-colors hover:bg-white/5"
            >
              {ctaSecondary}
            </Link>
          </div>
        </div>

        <div>
          <ProductFrame title={t("brandFull")}>
            <CounterMockup />
          </ProductFrame>
        </div>
      </div>
    </section>
  );
}
