"use client";

import { useTranslations } from "next-intl";
import { Link } from "../i18n/navigation";
import { AuroraField } from "@/components/marketing/AuroraField";

export function SiteFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const legal = useTranslations("legal");
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-[var(--line)] bg-[var(--bg-deep)] text-[var(--ink-soft)]">
      <AuroraField className="opacity-30" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="font-display text-[2.1rem] font-light tracking-[-0.03em] text-white">
            Dokun <span className="italic text-[var(--brass)]">&amp;</span> Kazan
          </p>
          <p className="mt-5 max-w-xs text-[0.95rem] font-light leading-relaxed text-[var(--muted-on-dark)]">
            {t("tagline")}
          </p>
        </div>
        <div>
          <p className="section-label">{t("product")}</p>
          <ul className="mt-5 space-y-3 text-sm font-light">
            {(
              [
                ["/how", nav("how")],
                ["/features", nav("features")],
                ["/sectors", nav("sectors")],
                ["/use-cases", nav("useCases")],
                ["/pricing", nav("pricing")],
              ] as const
            ).map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="link-underline text-white/60 hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/login" className="link-underline text-white/60 hover:text-white">
                {t("admin")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="section-label">{t("legal")}</p>
          <ul className="mt-5 space-y-3 text-sm font-light">
            <li>
              <Link href="/kvkk" className="link-underline text-white/60 hover:text-white">
                KVKK
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="link-underline text-white/60 hover:text-white">
                {legal("privacyTitle")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="link-underline text-white/60 hover:text-white">
                {legal("termsTitle")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="link-underline text-white/60 hover:text-white">
                {nav("contact")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="section-label">GEO</p>
          <p className="mt-5 text-sm font-light leading-relaxed text-[var(--muted-on-dark)]">
            Türkiye · İstanbul
            <br />
            TR / EN
            <br />
            <span className="mt-3 block text-[var(--brass)]">
              Independent cafés &amp; boutiques
            </span>
          </p>
        </div>
      </div>
      <div className="relative border-t border-[var(--line)] px-5 py-6 text-center font-nav text-[0.62rem] tracking-[0.18em] uppercase text-white/35 sm:px-8">
        {t("rights", { year })}
      </div>
    </footer>
  );
}
