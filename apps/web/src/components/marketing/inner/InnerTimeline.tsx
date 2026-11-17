"use client";

import { motion } from "framer-motion";
import { fade } from "@/components/marketing/home/shared";

export type InnerTimelineStep = {
  title: string;
  body: string;
};

export function InnerTimeline({ steps }: { steps: InnerTimelineStep[] }) {
  return (
    <ol className="relative space-y-0">
      {steps.map((step, i) => (
        <motion.li
          key={step.title}
          {...fade}
          transition={{ ...fade.transition, delay: i * 0.06 }}
          className="relative grid gap-4 pb-10 pl-12 last:pb-0 sm:grid-cols-[8rem_1fr] sm:gap-8 sm:pl-0"
        >
          <div
            className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full border border-foreground/[0.12] bg-background text-xs font-semibold tabular-nums text-foreground sm:relative sm:left-auto sm:top-auto sm:size-10 sm:text-sm"
            aria-hidden
          >
            {String(i + 1).padStart(2, "0")}
          </div>
          {i < steps.length - 1 ? (
            <span
              className="absolute bottom-0 left-4 top-8 w-px bg-foreground/[0.1] sm:left-[1.25rem] sm:top-10"
              aria-hidden
            />
          ) : null}
          <div className="min-w-0 sm:pt-1">
            <h3 className="font-display text-lg tracking-tight text-foreground sm:text-xl">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
