"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { Button } from "@/components/ui/button";

type DemoModalContextValue = {
  open: boolean;
  openDemo: () => void;
  closeDemo: () => void;
};

const DemoModalContext = createContext<DemoModalContextValue | null>(null);

export function useDemoModal() {
  const ctx = useContext(DemoModalContext);
  if (!ctx) {
    throw new Error("useDemoModal must be used within DemoModalProvider");
  }
  return ctx;
}

export function DemoModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openDemo = useCallback(() => setOpen(true), []);
  const closeDemo = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ open, openDemo, closeDemo }),
    [open, openDemo, closeDemo],
  );
  const t = useTranslations("demoModal");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDemo();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeDemo]);

  return (
    <DemoModalContext.Provider value={value}>
      {children}
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
              onClick={closeDemo}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="demo-modal-title"
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-5 sm:px-8">
                <div>
                  <p className="section-label">{t("eyebrow")}</p>
                  <h2
                    id="demo-modal-title"
                    className="mt-2 font-display text-2xl font-light tracking-[-0.03em] text-white sm:text-3xl"
                  >
                    {t("title")}
                  </h2>
                  <p className="mt-2 text-sm font-light text-[var(--muted)]">
                    {t("body")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDemo}
                  className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--brass)] hover:text-[var(--brass)]"
                  aria-label={t("close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
                <ContactForm
                  compact
                  onSuccess={closeDemo}
                  submitLabel={t("submit")}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </DemoModalContext.Provider>
  );
}

export function DemoButton({
  children,
  className,
  variant = "default",
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "light" | "ghost-light" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
}) {
  const { openDemo } = useDemoModal();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={openDemo}
      data-cursor="hot"
    >
      {children}
    </Button>
  );
}
