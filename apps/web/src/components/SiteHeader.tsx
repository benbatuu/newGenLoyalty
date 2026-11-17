"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Link, usePathname } from "../i18n/navigation";
import type { Locale } from "../i18n/routing";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { getAdminLoginUrl } from "@/lib/public-urls";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { cn } from "@/lib/utils";

const LOCALES = ["tr", "en", "ru"] as const;

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const routeParams = useParams<{ slug?: string }>();
  // Language switch keeps the current page; dynamic routes need their params
  const switchTo = routeParams.slug
    ? ({ pathname, params: { slug: routeParams.slug } } as const)
    : pathname;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const adminLogin = getAdminLoginUrl();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);

  // Main menu.
  const links = [
    { href: "/how" as const, label: t("how") },
    { href: "/features" as const, label: t("features") },
    { href: "/programs" as const, label: t("programs") },
    { href: "/sectors" as const, label: t("sectors") },
    { href: "/pricing" as const, label: t("pricing") },
    { href: "/contact" as const, label: t("contact") },
  ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const unlock = lockBodyScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const LoginLink = ({ className }: { className: string }) =>
    adminLogin && isExternal(adminLogin) ? (
      <a href={adminLogin} className={className} rel="noopener noreferrer">
        {t("login")}
      </a>
    ) : (
      <Link href="/login" className={className}>
        {t("login")}
      </Link>
    );

  return (
    <>
      <div className="h-20 lg:h-24" aria-hidden />

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open && "z-[70]",
          scrolled && !open ? "px-3 pt-3 sm:px-6" : "px-0 pt-0",
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between gap-6 transition-[height,padding,background-color,border-color,box-shadow,border-radius,max-width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            scrolled && !open
              ? "h-14 max-w-7xl rounded-full border border-white/10 bg-[#111217]/85 pl-4 pr-2.5 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:pl-5"
              : "h-20 rounded-none border border-transparent bg-transparent px-5 sm:px-8 lg:h-24",
          )}
        >
          <Link href="/" className="flex min-h-11 shrink-0 items-center transition-transform duration-300 ease-out hover:scale-95 motion-reduce:transition-none" aria-label="StampWell">
            <BrandLogo
              compact
              className={cn(
                "max-w-[7rem] sm:max-w-none",
                scrolled && !open && "h-8 sm:h-10",
              )}
            />
          </Link>

          <nav aria-label="Main" className="hidden flex-1 justify-center 2xl:flex">
            <ul className="flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {links.map((l) => {
                const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                return (
                  <li key={l.href} className="relative">
                    <Link
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative inline-flex h-8 items-center whitespace-nowrap rounded-full px-2.5 text-[0.84rem] font-medium tracking-tight transition-colors duration-200",
                        active ? "text-[#111217]" : "text-[#DFE5EB]/65 hover:text-[#DFE5EB]",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 -z-0 rounded-full bg-[#DFE5EB] shadow-[0_6px_18px_-8px_rgba(223,229,235,0.6)]"
                          transition={{ type: "spring", stiffness: 420, damping: 36 }}
                        />
                      ) : null}
                      <span className="relative">{l.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className="hidden items-center gap-0.5 rounded-full border border-white/10 p-0.5 md:inline-flex"
              role="group"
              aria-label={t("language")}
            >
              {LOCALES.map((code) => (
                <Link
                  key={code}
                  href={switchTo as never}
                  locale={code}
                  aria-current={locale === code ? "true" : undefined}
                  className={cn(
                    "inline-flex h-7 min-w-8 items-center justify-center rounded-full px-2 text-[0.68rem] font-semibold tracking-wider transition-colors",
                    locale === code
                      ? "bg-[#DFE5EB] text-[#111217]"
                      : "text-[#DFE5EB]/55 hover:text-[#DFE5EB]",
                  )}
                >
                  {code.toUpperCase()}
                </Link>
              ))}
            </div>

            <LoginLink className="hidden h-9 items-center rounded-full px-3.5 text-sm font-medium text-[#DFE5EB]/75 transition-colors hover:text-[#DFE5EB] 2xl:inline-flex" />

            <Link
              href="/pricing"
              className="group hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#D91E33] pl-4 pr-3.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-10px_rgba(239,35,60,0.9)] transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_12px_28px_-10px_rgba(239,35,60,1)] 2xl:inline-flex"
            >
              {t("signup")}
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </Link>

            <button
              type="button"
              aria-expanded={open}
              aria-controls="site-mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
              className="relative flex size-11 items-center justify-center rounded-full text-[#DFE5EB] transition-colors hover:bg-white/5 2xl:hidden"
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              <div className="relative block h-3.5 w-[18px]">
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 block h-0.5 w-full rounded-full bg-current transition-transform duration-300 ease-out",
                    open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0",
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-1/2 block h-0.5 w-full -translate-y-1/2 rounded-full bg-current transition-opacity duration-200",
                    open ? "opacity-0" : "opacity-100",
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 block h-0.5 w-full rounded-full bg-current transition-transform duration-300 ease-out",
                    open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0",
                  )}
                />
              </div>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open ? (
            <motion.div
              key="panel"
              id="site-mobile-nav"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mx-3 mb-3 flex max-h-[min(80vh,42rem)] flex-col overflow-y-auto rounded-3xl border border-white/10 bg-[#171920] p-4 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7)] sm:mx-6 2xl:hidden"
            >
              <div className="flex items-center justify-between px-2 pb-4 pt-1">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#DFE5EB]/60">
                  {t("language")}
                </span>
                <div className="inline-flex items-center gap-0.5 rounded-full bg-white/5 p-0.5" role="group" aria-label={t("language")}>
                  {LOCALES.map((code) => (
                    <Link
                      key={code}
                      href={switchTo as never}
                      locale={code}
                      aria-current={locale === code ? "true" : undefined}
                      className={cn(
                        "inline-flex h-11 min-w-12 items-center justify-center rounded-full px-3 text-xs font-semibold tracking-wider transition-colors",
                        locale === code ? "bg-[#DFE5EB] text-[#111217]" : "text-[#DFE5EB]/60",
                      )}
                    >
                      {code.toUpperCase()}
                    </Link>
                  ))}
                </div>
              </div>

              <nav className="flex flex-col">
                {links.map((l) => {
                  const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={cn(
                        "flex items-center justify-between rounded-2xl px-3 py-3.5 text-base font-medium transition-colors",
                        active
                          ? "bg-white/5 text-[#DFE5EB]"
                          : "text-[#DFE5EB]/80 hover:bg-white/5 hover:text-[#DFE5EB]",
                      )}
                    >
                      {l.label}
                      <span aria-hidden className={cn(active ? "text-[#ff5a6e]" : "text-[#DFE5EB]/60")}>
                        →
                      </span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                <LoginLink className="flex h-11 items-center justify-center rounded-full border border-white/15 text-sm font-medium text-[#DFE5EB]" />
                <Link
                  href="/pricing"
                  className="flex h-11 items-center justify-center rounded-full bg-[#D91E33] text-sm font-semibold text-white"
                >
                  {t("signup")}
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.button
            key="nav-backdrop"
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] 2xl:hidden"
            onClick={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
