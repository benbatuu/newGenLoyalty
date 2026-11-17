"use client";

import { motion } from "framer-motion";
import { fade } from "@/components/marketing/home/shared";

export function InnerQuoteBand({
  quote,
  attribution,
  role,
}: {
  quote: string;
  attribution: string;
  role?: string;
}) {
  return (
    <motion.blockquote
      {...fade}
      className="attio-surface relative overflow-hidden px-6 py-8 sm:px-10 sm:py-10"
    >
      <span
        className="pointer-events-none absolute left-6 top-4 font-display text-6xl leading-none text-[#ff5a6e]/15 sm:left-8 sm:text-7xl"
        aria-hidden
      >
        “
      </span>
      <p className="relative max-w-3xl font-display text-xl leading-snug tracking-tight text-foreground sm:text-2xl">
        {quote}
      </p>
      <footer className="relative mt-6 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
        <cite className="not-italic text-sm font-semibold text-foreground">
          {attribution}
        </cite>
        {role ? (
          <span className="text-sm text-muted-foreground sm:before:content-['·'] sm:before:mr-3">
            {role}
          </span>
        ) : null}
      </footer>
    </motion.blockquote>
  );
}
