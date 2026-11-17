"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MarketingSurface } from "@/components/marketing/MarketingSurface";

const ease = [0.16, 1, 0.3, 1] as const;

export function NotFoundContent({
  homeLabel,
  contactLabel,
}: {
  homeLabel: string;
  contactLabel: string;
}) {
  const digits = ["4", "0", "4"];

  return (
    <MarketingSurface className="relative overflow-hidden py-14 text-center sm:py-20">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(72vw,22rem)] w-[min(72vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15"
        animate={{ scale: [1, 1.06, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(88vw,28rem)] w-[min(88vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-foreground/[0.08]"
        animate={{ rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease }}
        className="relative mx-auto mb-8 flex justify-center"
      >
        <Image
          src="/logo.png"
          alt="StampWell"
          width={180}
          height={54}
          className="h-12 w-auto object-contain sm:h-14"
          priority
        />
      </motion.div>

      <div className="relative flex items-end justify-center gap-1 sm:gap-3">
        {digits.map((digit, i) => (
          <motion.span
            key={`${digit}-${i}`}
            initial={{ opacity: 0, y: 48, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.08 + i * 0.14, duration: 0.75, ease }}
            className="font-display text-[clamp(4.5rem,16vw,9rem)] leading-none tracking-[-0.06em] text-foreground/[0.12]"
          >
            {digit}
          </motion.span>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6, ease }}
        className="relative mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        <Button asChild size="lg">
          <Link href="/">
            <span className="relative z-10 inline-flex items-center gap-2">
              {homeLabel}
              <span className="btn-arrow" aria-hidden>
                →
              </span>
            </span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/contact">
            <span className="relative z-10">{contactLabel}</span>
          </Link>
        </Button>
      </motion.div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-8 top-8 h-24 w-24 rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, 12, 0], y: [0, -8, 0], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-6 bottom-6 h-28 w-28 rounded-full bg-muted-foreground/10 blur-3xl"
        animate={{ x: [0, -10, 0], y: [0, 10, 0], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
    </MarketingSurface>
  );
}
