"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquarePlus, X } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { getProgramCardTypes, type ProgramCardId } from "@/lib/program-types";
import { AppleWalletPass } from "./home/AppleWalletPass";
import { fade } from "./home/shared";

function ProgramSuggestionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("programsPage.suggestionModal");
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const unlock = lockBodyScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="program-suggestion-title"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex max-h-[min(92vh,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-2xl sm:rounded-xl pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="section-label">{t("eyebrow")}</p>
                <h2
                  id="program-suggestion-title"
                  className="mt-2 font-display text-2xl tracking-tight text-foreground sm:text-3xl"
                >
                  {t("title")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{t("body")}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-border text-muted-foreground transition hover:border-primary hover:text-[#ff5a6e]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              <ContactForm
                compact
                showMessage
                variant="suggestion"
                onSuccess={onClose}
                submitLabel={t("submit")}
                source="program-suggestion"
                messagePlaceholder={t("messagePlaceholder")}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Programs inner page — static catalog, not homepage Attio scroll */
export function ProgramsPageCatalog() {
  const locale = useLocale();
  const isTr = locale === "tr";
  const tCard = useTranslations("programsPage.suggestionCard");
  const cards = getProgramCardTypes(locale);
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  return (
    <>
      <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, i) => (
          <motion.article
            key={card.id}
            {...fade}
            transition={{ ...fade.transition, delay: (i % 6) * 0.04 }}
            className="flex h-full flex-col overflow-hidden bg-[#111217]"
          >
            <div className="flex h-[292px] shrink-0 items-center justify-center border-b border-white/[0.08] bg-[#16181f] px-4 py-5 sm:h-[324px] sm:py-6">
              <AppleWalletPass
                type={card.id as ProgramCardId}
                locale={locale}
                compact
                className="w-full max-w-[200px] sm:max-w-[220px]"
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
              <p className="font-mono text-xs tracking-[0.2em] text-[#ff5a6e]">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-3 font-display text-2xl tracking-[-0.02em] text-[#DFE5EB]">
                {card.title}
              </h2>
              <p className="mt-1 text-sm font-medium text-[#DFE5EB]/80">
                {card.headline}
              </p>
              <p className="mt-3 flex-1 text-sm leading-[1.7] text-[#DFE5EB]/55">
                {card.howItWorks}
              </p>

              {card.useCases.length > 0 ? (
                <div className="mt-5 border-t border-white/[0.08] pt-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#DFE5EB]/60">
                    {isTr ? "Kimler kullanır?" : "Best for"}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {card.useCases.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-[#DFE5EB]/80"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </motion.article>
        ))}

        <motion.article
          {...fade}
          transition={{ ...fade.transition, delay: 0.32 }}
          className="flex h-full flex-col overflow-hidden bg-[#111217] sm:col-span-2 xl:col-span-1"
        >
          <div className="flex h-[292px] shrink-0 items-center justify-center border-b border-dashed border-white/15 px-6 sm:h-[324px]">
            <span className="flex size-16 items-center justify-center rounded-full border border-dashed border-white/25 text-[#ff5a6e]">
              <MessageSquarePlus className="h-7 w-7" strokeWidth={1.5} />
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
            <p className="font-mono text-xs tracking-[0.2em] text-[#DFE5EB]/60">
              {tCard("label")}
            </p>
            <h2 className="mt-3 font-display text-2xl tracking-[-0.02em] text-[#DFE5EB]">
              {tCard("title")}
            </h2>
            <p className="mt-1 text-sm font-medium text-[#DFE5EB]/80">
              {tCard("headline")}
            </p>
            <p className="mt-3 flex-1 text-sm leading-[1.7] text-[#DFE5EB]/55">
              {tCard("body")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full"
              onClick={() => setSuggestionOpen(true)}
            >
              {tCard("cta")}
            </Button>
          </div>
        </motion.article>
      </div>

      <ProgramSuggestionModal
        open={suggestionOpen}
        onClose={() => setSuggestionOpen(false)}
      />
    </>
  );
}
