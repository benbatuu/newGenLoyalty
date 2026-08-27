"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function TextReveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "h1" | "h2" | "h3" | "p" | "span";
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });

  return (
    <Tag ref={ref as never} className={cn("overflow-hidden", className)}>
      <motion.span
        className="block"
        initial={{ y: "110%", rotate: 2, opacity: 0 }}
        animate={inView ? { y: "0%", rotate: 0, opacity: 1 } : undefined}
        transition={{
          duration: 1.05,
          delay,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {children}
      </motion.span>
    </Tag>
  );
}

export function SplitWords({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const words = text.split(" ");

  return (
    <span ref={ref} className={cn("inline-flex flex-wrap gap-x-[0.28em]", className)}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="overflow-hidden inline-block">
          <motion.span
            className="inline-block"
            initial={{ y: "120%", opacity: 0 }}
            animate={inView ? { y: "0%", opacity: 1 } : undefined}
            transition={{
              duration: 0.85,
              delay: delay + i * 0.045,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
