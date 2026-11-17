"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useFocusTrap } from "@/lib/use-focus-trap";

type DemoModalMode = "demo" | "planInquiry";

type DemoModalContextValue = {
  open: boolean;
  mode: DemoModalMode;
  openDemo: () => void;
  openPlanInquiry: () => void;
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
  const [mode, setMode] = useState<DemoModalMode>("demo");
  const openDemo = useCallback(() => {
    setMode("demo");
    setOpen(true);
  }, []);
  const openPlanInquiry = useCallback(() => {
    setMode("planInquiry");
    setOpen(true);
  }, []);
  const closeDemo = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ open, mode, openDemo, openPlanInquiry, closeDemo }),
    [open, mode, openDemo, openPlanInquiry, closeDemo],
  );
  const t = useTranslations("demoModal");
  const isPlanInquiry = mode === "planInquiry";
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDemo();
    };
    const unlock = lockBodyScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
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
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="demo-modal-title"
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 flex max-h-[min(92vh,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-2xl sm:rounded-xl pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
                <div>
                  <p className="section-label">
                    {isPlanInquiry ? t("planInquiry.eyebrow") : t("eyebrow")}
                  </p>
                  <h2
                    id="demo-modal-title"
                    className="mt-2 font-display text-2xl tracking-tight text-foreground sm:text-3xl"
                  >
                    {isPlanInquiry ? t("planInquiry.title") : t("title")}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isPlanInquiry ? t("planInquiry.body") : t("body")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDemo}
                  className="flex h-10 w-10 shrink-0 items-center justify-center border border-border text-muted-foreground transition hover:border-primary hover:text-[#ff5a6e]"
                  aria-label={t("close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
                <ContactForm
                  compact
                  showMessage={isPlanInquiry}
                  onSuccess={closeDemo}
                  submitLabel={
                    isPlanInquiry ? t("planInquiry.submit") : t("submit")
                  }
                  source={isPlanInquiry ? "pricing-enterprise" : "demo-modal"}
                  messagePlaceholder={
                    isPlanInquiry ? t("planInquiry.messagePlaceholder") : undefined
                  }
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

export function PlanInquiryButton({
  children,
  className,
  variant = "outline",
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "light" | "ghost-light" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
}) {
  const { openPlanInquiry } = useDemoModal();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={openPlanInquiry}
      data-cursor="hot"
    >
      {children}
    </Button>
  );
}
