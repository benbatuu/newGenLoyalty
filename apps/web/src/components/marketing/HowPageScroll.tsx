"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CounterMockup,
  ReportsMockup,
  SmsFlowMockup,
  WalletPassMockup,
} from "./home/ProductMockups";

type Step = { n: string; title: string; body: string };

// Screen shown for each step, in order
const mockByIndex = [CounterMockup, SmsFlowMockup, WalletPassMockup, ReportsMockup];
const fallbackMock = CounterMockup;

/**
 * Step tabs. Four numbered tabs across the top; the panel below shows the
 * chosen step's text next to the matching product screen.
 * Arrow keys move between tabs.
 */
export function HowPageScroll({
  steps,
  opsTitle,
  opsBody,
}: {
  steps: Step[];
  navLabel?: string;
  demoLabel?: string;
  opsTitle: string;
  opsBody: string;
}) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduce = useReducedMotion();

  const go = (i: number) => {
    const next = (i + steps.length) % steps.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const step = steps[active];
  const Mock = mockByIndex[active] ?? fallbackMock;

  return (
    <div>
      {/* Tabs */}
      <div
        role="tablist"
        aria-label={opsTitle}
        className="grid grid-cols-2 border-y border-white/[0.08] lg:grid-cols-4"
      >
        {steps.map((s, i) => {
          const on = i === active;
          return (
            <button
              key={s.n}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`how-tab-${i}`}
              aria-selected={on}
              aria-controls="how-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") go(i + 1);
                if (e.key === "ArrowLeft") go(i - 1);
              }}
              className={
                "relative flex min-h-24 cursor-pointer flex-col justify-between gap-4 px-5 py-5 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#EF233C] " +
                (i % 2 === 1 ? "border-l border-white/[0.08] " : "") +
                (i >= 2 ? "border-t border-white/[0.08] lg:border-t-0 " : "") +
                (i > 0 ? "lg:border-l lg:border-white/[0.08] " : "") +
                (on ? "bg-white/[0.04]" : "hover:bg-white/[0.02]")
              }
            >
              <span
                className={
                  "font-mono text-xs tracking-[0.2em] " +
                  (on ? "text-[#ff5a6e]" : "text-[#DFE5EB]/60")
                }
              >
                {s.n}
              </span>
              <span
                className={
                  "text-sm font-medium leading-snug sm:text-base " +
                  (on ? "text-[#DFE5EB]" : "text-[#DFE5EB]/55")
                }
              >
                {s.title}
              </span>
              {on ? (
                <motion.span
                  layoutId="how-tab-line"
                  className="absolute inset-x-0 -top-px h-px bg-[#D91E33]"
                  transition={{ type: "spring", stiffness: 400, damping: 36 }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div
        id="how-panel"
        role="tabpanel"
        aria-labelledby={`how-tab-${active}`}
        className="grid gap-10 py-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16 lg:py-16"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`text-${active}`}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-mono text-xs tracking-[0.2em] text-[#ff5a6e]">
              {step.n} / {String(steps.length).padStart(2, "0")}
            </p>
            <h3 className="mt-5 font-display text-3xl leading-tight tracking-[-0.03em] text-[#DFE5EB] sm:text-4xl">
              {step.title}
            </h3>
            <p className="mt-5 max-w-md text-base leading-[1.75] text-[#DFE5EB]/65">
              {step.body}
            </p>

            <div className="mt-8 flex gap-2">
              <button
                type="button"
                onClick={() => setActive((a) => Math.max(0, a - 1))}
                disabled={active === 0}
                aria-label="Previous step"
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/15 text-[#DFE5EB] transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setActive((a) => Math.min(steps.length - 1, a + 1))}
                disabled={active === steps.length - 1}
                aria-label="Next step"
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/15 text-[#DFE5EB] transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
              >
                →
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="rounded-2xl border border-white/[0.08] bg-[#16181f] p-3 sm:p-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`mock-${active}`}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Mock className="w-full" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Daily operation note */}
      <div className="grid gap-4 border-t border-white/[0.08] pt-10 sm:grid-cols-[14rem_1fr] sm:gap-10">
        <h3 className="font-display text-xl tracking-tight text-[#DFE5EB]">{opsTitle}</h3>
        <p className="max-w-2xl text-[0.95rem] leading-[1.75] text-[#DFE5EB]/60">{opsBody}</p>
      </div>
    </div>
  );
}
