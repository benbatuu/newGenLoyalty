"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PlanInquiryButton } from "@/components/marketing/DemoModal";
import { PlanPurchaseButton } from "@/components/marketing/PlanPurchaseButton";
import { cn } from "@/lib/utils";
import { formatPlanPrice, type DisplayPlan } from "@/lib/plans";
import { SectionHeader } from "./SectionHeader";
import { fade } from "./shared";

type BillingCycle = "monthly" | "yearly";

function PlanCard({
  plan,
  billing,
  locale,
  className,
}: {
  plan: DisplayPlan;
  billing: BillingCycle;
  locale: string;
  className?: string;
}) {
  const t = useTranslations("pricingPage");
  const amount = billing === "monthly" ? plan.priceMonthly : plan.priceYearly;
  const priceLabel = formatPlanPrice(amount, locale);
  const period = billing === "monthly" ? t("monthlyShort") : t("yearlyShort");

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6",
        plan.featured && "border-[#EF233C]/60 bg-[#D91E33]/[0.04]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground sm:text-lg">
            {plan.name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {plan.note}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium sm:px-2.5 sm:py-1 sm:text-xs",
            plan.featured
              ? "bg-primary/10 text-[#ff5a6e]"
              : "border border-foreground/10 text-muted-foreground",
          )}
        >
          {plan.badge}
        </span>
      </div>

      <div className="mt-6">
        <p className="stat-number mt-3 text-3xl tracking-tight sm:text-4xl">
          {priceLabel}
        </p>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{period}</p>
        {billing === "yearly" && plan.priceMonthly > 0 ? (
          <p className="mt-2 text-[0.65rem] text-muted-foreground sm:text-xs">
            {true
              ? `${t("monthly")} ${formatPlanPrice(Math.round(plan.priceYearly / 12), locale)} karşılığı`
              : `${formatPlanPrice(Math.round(plan.priceYearly / 12), locale)} / mo effective`}
          </p>
        ) : null}
      </div>

      <ul className="mt-6 flex-1 space-y-2.5 border-t border-white/10 pt-5">
        {plan.includes.map((line) => (
          <li
            key={line}
            className="flex gap-2 text-xs text-foreground/90 sm:text-sm"
          >
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ff5a6e] sm:h-4 sm:w-4" />
            {line}
          </li>
        ))}
      </ul>

      <PlanPurchaseButton
        planId={plan.id}
        billing={billing}
        className="mt-6 w-full"
        variant={plan.featured ? "default" : "outline"}
        size="sm"
      >
        {t("trialCta")}
      </PlanPurchaseButton>
    </div>
  );
}

export function PricingCards({
  title,
  intro,
  plans,
  pricingPageTitle,
  hideHeader = false,
  hidePricingPageLink = false,
  embedded = false,
}: {
  title: string;
  intro: string;
  plans: DisplayPlan[];
  pricingPageTitle: string;
  hideHeader?: boolean;
  hidePricingPageLink?: boolean;
  embedded?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("pricingPage");
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const billingTabs = (
    [
      { id: "monthly" as const, label: t("monthly") },
      { id: "yearly" as const, label: t("yearly")},
    ] as const
  ).map((option) => (
    <button
      key={option.id}
      type="button"
      role="tab"
      aria-selected={billing === option.id}
      onClick={() => setBilling(option.id)}
      className={cn(
        "flex h-11 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors sm:px-4",
        billing === option.id
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {option.label}
    </button>
  ));

  const billingToggle = (
    <div className="flex w-full flex-col gap-1.5 sm:w-auto">
      <div
        className="inline-flex w-full rounded-full border border-white/10 bg-white/[0.03] p-1 sm:w-auto"
        role="tablist"
        aria-label={t("billingPeriod")}
      >
        {billingTabs}
      </div>
      <p className="text-center text-[0.65rem] font-medium text-muted-foreground sm:text-left">
        {t("saveTwoMonths")}
      </p>
    </div>
  );

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const cards = cardRefs.current.filter(
      (el): el is HTMLElement => el !== null,
    );
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = -1;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isNaN(index)) return;
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = index;
          }
        });
        if (bestIndex >= 0 && bestRatio > 0.4) setActive(bestIndex);
      },
      { root, threshold: [0.4, 0.55, 0.7] },
    );

    cards.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [plans.length]);

  const goTo = (index: number) => {
    cardRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
    setActive(index);
  };

  const needMore = (
    <div className="flex flex-col items-stretch justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="max-w-xl">
        <p className="text-base font-semibold text-foreground">
          {t("needMore.title")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("needMore.body")}</p>
      </div>
      <PlanInquiryButton className="min-h-11 w-full shrink-0 sm:w-auto">
        {t("needMore.cta")}
      </PlanInquiryButton>
    </div>
  );

  return (
    <section
      className={cn(
        embedded
          ? ""
          : "border-y border-white/10 py-20 sm:py-28",
      )}
    >
      <div className={cn("mx-auto max-w-7xl", embedded ? "px-0" : "px-5 sm:px-8")}>
        {!hideHeader ? (
          <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="Pricing"
              title={title}
              description={intro}
              className="max-w-2xl"
            />
            {billingToggle}
          </div>
        ) : (
          <div className="flex justify-stretch sm:justify-end">{billingToggle}</div>
        )}

        <p className="mt-6 text-center text-sm font-medium text-[#ff8a96] sm:mt-8">
          {t("trialNote")}
        </p>

        {/* Mobile: swipe carousel — no sticky / no scroll-driven auto change */}
        <div className={cn("sm:hidden", !hideHeader ? "mt-8" : "mt-4")}>
          <div
            ref={scrollerRef}
            className={cn(
              "flex snap-x snap-mandatory items-stretch gap-[5%] overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              !embedded && "-mx-5 px-5",
            )}
          >
            {plans.map((plan, i) => (
              <div
                key={plan.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                data-index={i}
                className="flex w-[85%] shrink-0 snap-start"
              >
                <PlanCard
                  plan={plan}
                  billing={billing}
                  locale={locale}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          <div
            className="mt-3 flex items-center justify-center gap-2"
            role="tablist"
            aria-label={t("title")}
          >
            {plans.map((plan, i) => (
              <button
                key={plan.id}
                type="button"
                role="tab"
                aria-selected={active === i}
                aria-label={plan.name}
                onClick={() => goTo(i)}
                className="flex h-11 w-11 items-center justify-center"
              >
                <span
                  aria-hidden
                  className={cn(
                    "block h-2 rounded-full transition-all duration-300",
                    active === i ? "w-6 bg-foreground" : "w-2 bg-foreground/25",
                  )}
                />
              </button>
            ))}
          </div>

          <p className="mt-1.5 text-center text-xs font-medium text-muted-foreground">
            {plans[active]?.name}
            <span className="text-muted-foreground">
              {" "}
              · {active + 1}/{plans.length}
            </span>
          </p>

          <div className="mt-8">{needMore}</div>
        </div>

        {/* Tablet / desktop */}
        <div
          className={cn(
            "hidden sm:grid sm:grid-cols-2 sm:items-stretch sm:gap-4 xl:grid-cols-4",
            !hideHeader ? "mt-12" : "mt-6",
          )}
        >
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              {...fade}
              transition={{ ...fade.transition, delay: i * 0.05 }}
              className="h-full"
            >
              <PlanCard
                plan={plan}
                billing={billing}
                locale={locale}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-10 hidden sm:block">{needMore}</div>
      </div>
    </section>
  );
}
