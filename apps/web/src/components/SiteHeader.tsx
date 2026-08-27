"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Link, usePathname } from "../i18n/navigation";
import type { Locale } from "../i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const links = [
    { href: "/how" as const, label: t("how") },
    { href: "/features" as const, label: t("features") },
    { href: "/sectors" as const, label: t("sectors") },
    { href: "/use-cases" as const, label: t("useCases") },
    { href: "/pricing" as const, label: t("pricing") },
    { href: "/contact" as const, label: t("contact") },
  ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "z-50 transition-[background,border-color,backdrop-filter] duration-500",
          onHome ? "fixed inset-x-0 top-0" : "sticky top-0",
          scrolled || !onHome
            ? "border-b border-[var(--line)] bg-[rgba(6,9,8,0.72)] backdrop-blur-2xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-[4.25rem] sm:gap-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 font-display text-[1.4rem] font-light leading-none tracking-[-0.03em] text-white sm:text-[1.55rem]"
          >
            Dokun <span className="italic text-[var(--brass)]">&amp;</span> Kazan
          </Link>

          <nav className="mx-auto hidden min-w-0 items-center justify-center gap-x-4 lg:flex xl:gap-x-5">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  data-active={active ? "true" : "false"}
                  className={cn(
                    "nav-link",
                    active ? "text-white" : "text-white/45 hover:text-white",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <div
              className="font-nav flex items-center gap-1.5 text-[0.62rem] font-medium tracking-[0.12em] uppercase text-white/40"
              aria-label={t("language")}
            >
              {(["tr", "en"] as const).map((code, i) => (
                <span key={code} className="inline-flex items-center gap-1.5">
                  {i > 0 ? <span className="text-white/20">/</span> : null}
                  <Link
                    href={pathname}
                    locale={code}
                    className={cn(
                      "transition-colors duration-300",
                      locale === code
                        ? "text-[var(--brass)]"
                        : "hover:text-white",
                    )}
                  >
                    {code}
                  </Link>
                </span>
              ))}
            </div>

            <Link
              href="/login"
              className="nav-link hidden text-white/45 hover:text-white sm:inline-flex"
            >
              {t("login")}
            </Link>
            <Button
              asChild
              size="sm"
              variant="ghost-light"
              className="hidden sm:inline-flex"
            >
              <Link href="/signup">
                <span className="relative z-10">{t("signup")}</span>
              </Link>
            </Button>

            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
              className="relative flex h-10 w-10 items-center justify-center text-white lg:hidden"
            >
              <span className="sr-only">Menu</span>
              <span className="flex w-5 flex-col gap-1.5">
                <span
                  className={cn(
                    "block h-px w-full origin-center bg-current transition duration-300",
                    open && "translate-y-[7px] rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "block h-px w-full bg-current transition duration-300",
                    open && "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "block h-px w-full origin-center bg-current transition duration-300",
                    open && "-translate-y-[7px] -rotate-45",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] lg:hidden"
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => setOpen(false)}
            />
            <motion.nav
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 top-0 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-5 pb-10 pt-24"
            >
              <ul className="space-y-1">
                {links.map((l, i) => {
                  const active = pathname === l.href;
                  return (
                    <motion.li
                      key={l.href}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                    >
                      <Link
                        href={l.href}
                        className={cn(
                          "flex items-baseline justify-between border-b border-[var(--line)] py-4 font-display text-3xl font-light tracking-[-0.03em]",
                          active ? "text-[var(--brass)]" : "text-white",
                        )}
                      >
                        {l.label}
                        <span className="section-label">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href="/login">
                    <span className="relative z-10">{t("login")}</span>
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">
                    <span className="relative z-10 inline-flex items-center gap-2">
                      {t("signup")}
                      <span className="btn-arrow">→</span>
                    </span>
                  </Link>
                </Button>
              </div>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
