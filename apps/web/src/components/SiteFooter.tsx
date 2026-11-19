"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "../i18n/navigation";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { getAdminLoginUrl, getAdminRegisterUrl } from "@/lib/public-urls";
import { DemoButton } from "@/components/marketing/DemoModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FooterHref =
  | "/how"
  | "/features"
  | "/programs"
  | "/pricing"
  | "/sectors"
  | "/use-cases"
  | "/contact"
  | "/portal"
  | "/kvkk"
  | "/privacy"
  | "/terms";

type FooterLink = { href: FooterHref; label: string };

function BackToTop({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-medium text-[#DFE5EB]/70 transition-colors hover:border-white/25 hover:text-[#DFE5EB]"
    >
      <span aria-hidden>↑</span>
      {label}
    </button>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#DFE5EB]/60">
        {title}
      </p>
      <ul className="mt-5 space-y-3">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group inline-flex items-center gap-1.5 text-sm text-[#DFE5EB]/65 transition-colors hover:text-[#DFE5EB]"
            >
              <span className="h-px w-0 bg-[#D91E33] transition-all duration-300 group-hover:w-3" aria-hidden />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterAccordionGroup({
  title,
  links,
  value,
}: {
  title: string;
  links: FooterLink[];
  value: string;
}) {
  return (
    <AccordionItem value={value} className="border-white/10">
      <AccordionTrigger className="py-4 text-sm font-semibold text-[#DFE5EB] hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="max-w-none pb-3!">
        <ul className="space-y-1">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex min-h-11 items-center text-sm text-[#DFE5EB]/65 transition-colors hover:text-[#DFE5EB]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  );
}

export function SiteFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const legal = useTranslations("legal");
  const locale = useLocale();
  const year = new Date().getFullYear();
  const isTr = locale === "tr";

  const productTitle = t("product");
  const resourcesTitle = isTr ? "Kaynaklar" : "Resources";
  const solutionsTitle = isTr ? "Çözümler" : "Solutions";
  const legalTitle = t("legal");
  const location = isTr ? "Türkiye · İstanbul" : "Turkey · Istanbul";

  const productLinks: FooterLink[] = [
    { href: "/how", label: nav("how") },
    { href: "/features", label: nav("features") },
    { href: "/programs", label: isTr ? "Programlar" : "Programs" },
    { href: "/pricing", label: nav("pricing") },
  ];

  const solutionLinks: FooterLink[] = [
    { href: "/sectors", label: nav("sectors") },
    { href: "/use-cases", label: nav("useCases") },
    { href: "/portal", label: t("portal") },
  ];

  const resourceLinks: FooterLink[] = [
    { href: "/contact", label: nav("contact") },
    ...(getAdminLoginUrl() ? [{ href: getAdminLoginUrl() as FooterHref, label: t("admin") }] : []),
    { href: (getAdminRegisterUrl() || "/pricing") as FooterHref, label: nav("signup") },
  ];

  const legalLinks: FooterLink[] = [
    { href: "/kvkk", label: "KVKK" },
    { href: "/privacy", label: legal("privacyTitle") },
    { href: "/terms", label: legal("termsTitle") },
  ];

  const groups = [
    { value: "product", title: productTitle, links: productLinks },
    { value: "solutions", title: solutionsTitle, links: solutionLinks },
    { value: "resources", title: resourcesTitle, links: resourceLinks },
    { value: "legal", title: legalTitle, links: legalLinks },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#111217] text-[#DFE5EB]">
      {/* Red glow, top right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 right-[-10%] size-[32rem] rounded-full bg-[#D91E33]/15 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-5 pt-14 sm:px-8 sm:pt-20">
        {/* CTA card */}
        <div className="grid gap-8 rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-10 lg:grid-cols-[1.3fr_auto] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-[#DFE5EB]/70">
              <span className="size-1.5 rounded-full bg-[#D91E33]" aria-hidden />
              {isTr ? "Kafeniz için hazır" : "Ready for your café"}
            </p>
            <p className="mt-4 font-display text-3xl tracking-tight text-[#DFE5EB] sm:text-4xl">
              {isTr ? "Her ziyaret bir adım." : "Every visit, rewarded."}
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#DFE5EB]/60">
              {t("tagline")}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
            <DemoButton
              variant="outline"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-transparent px-5 text-sm font-medium text-[#DFE5EB] transition-colors hover:bg-white/5"
            >
              {isTr ? "Demo iste" : "Request demo"}
            </DemoButton>
            <a
              href={getAdminRegisterUrl() || "/pricing"}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#D91E33] px-5 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_rgba(239,35,60,0.9)] transition-transform duration-200 hover:-translate-y-px"
            >
              {nav("signup")}
            </a>
          </div>
        </div>

        <div className="mt-14 sm:mt-16">
          {/* Mobile: brand + accordion */}
          <div className="mb-8 flex flex-col gap-3 lg:hidden">
            <Link href="/" className="inline-flex min-h-11 w-fit items-center">
              <BrandLogo />
            </Link>
            <p className="text-sm text-[#DFE5EB]/55">{location}</p>
          </div>

          <Accordion
            type="multiple"
            defaultValue={["product"]}
            className="border-t border-white/10 lg:hidden"
          >
            {groups.map((g) => (
              <FooterAccordionGroup key={g.value} value={g.value} title={g.title} links={g.links} />
            ))}
          </Accordion>

          {/* Desktop: brand + four columns */}
          <div className="hidden gap-12 lg:grid lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="inline-block">
                <BrandLogo />
              </Link>
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-[#DFE5EB]/55">
                {isTr
                  ? "Bağımsız kafeler ve butik işletmeler için dijital damga kartı ve sadakat platformu."
                  : "Digital stamp cards and loyalty for independent cafés and boutiques."}
              </p>
              <p className="mt-5 text-sm text-[#DFE5EB]/60">{location}</p>
            </div>

            <FooterColumn title={productTitle} links={productLinks} />
            <FooterColumn title={solutionsTitle} links={solutionLinks} />
            <FooterColumn title={resourcesTitle} links={resourceLinks} />
            <FooterColumn title={legalTitle} links={legalLinks} />
          </div>
        </div>
      </div>

      <div className="relative mt-14 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-5 py-6 text-center text-xs text-[#DFE5EB]/60 sm:flex-row sm:justify-between sm:px-8 sm:text-left">
          <p>{t("rights", { year })}</p>
          <p className="hidden md:block">
            {isTr
              ? "Bağımsız kafeler ve butik işletmeler için"
              : "Built for independent cafés and boutiques"}
          </p>
          <BackToTop label={isTr ? "Yukarı" : "Top"} />
        </div>
      </div>
    </footer>
  );
}
