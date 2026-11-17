"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE },
  },
};

/** Fades + lifts a block into view once, when it scrolls in. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: itemVariants.hidden,
        show: {
          ...(itemVariants.show as object),
          transition: { duration: 0.8, ease: EASE, delay },
        },
      }}
    >
      {children}
    </Tag>
  );
}

/** Staggers direct children in on scroll. Wrap each child in <StaggerItem>. */
export function StaggerGroup({
  children,
  className,
  gap = 0.08,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/** Slow ambient blob for hero backgrounds. Pure transform, GPU friendly. */
export function FloatingOrb({
  className,
  duration = 14,
  x = [0, 40, -20, 0],
  y = [0, -30, 20, 0],
}: {
  className: string;
  duration?: number;
  x?: number[];
  y?: number[];
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={className}
      animate={reduce ? undefined : { x, y, scale: [1, 1.08, 0.96, 1] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
