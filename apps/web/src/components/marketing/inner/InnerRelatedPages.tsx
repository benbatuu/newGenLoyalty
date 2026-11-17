"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { fade } from "@/components/marketing/home/shared";

export type InnerRelatedLink = {
  href: "/how" | "/features" | "/programs" | "/pricing" | "/sectors" | "/use-cases" | "/contact";
  label: string;
  description: string;
};

export function InnerRelatedPages({ links }: { links: InnerRelatedLink[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link, i) => (
        <motion.div
          key={link.href}
          {...fade}
          transition={{ ...fade.transition, delay: i * 0.04 }}
        >
          <Link
            href={link.href}
            className="attio-surface group flex h-full flex-col p-5 transition-colors hover:border-foreground/20 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg tracking-tight text-foreground">
                {link.label}
              </h3>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#ff5a6e]" />
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              {link.description}
            </p>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
