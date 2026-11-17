"use client";

import { motion } from "framer-motion";
import { SplitWords } from "@/components/marketing/TextReveal";
import { cn } from "@/lib/utils";
import { fade } from "./shared";

export function SectionHeader({
  eyebrow,
  title,
  description,
  badge,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <motion.div
      {...fade}
      className={cn(
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl",
        className,
      )}
    >
      {badge ? <span className="attio-eyebrow">{badge}</span> : null}
      {!badge && eyebrow ? (
        <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
      ) : null}
      <h2
        className={cn(
          "font-display text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.08] tracking-tight text-foreground",
          (badge || eyebrow) && "mt-5",
        )}
      >
        <SplitWords text={title} />
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-[1.05rem]">
          {description}
        </p>
      ) : null}
    </motion.div>
  );
}
