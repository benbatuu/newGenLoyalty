"use client";

import { motion } from "framer-motion";
import { fade } from "@/components/marketing/home/shared";
import { MarketingSurface } from "@/components/marketing/MarketingSurface";

export type InnerRole = {
  role: string;
  title: string;
  body: string;
  tasks: string[];
};

export function InnerRoleGrid({ roles }: { roles: InnerRole[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {roles.map((role, i) => (
        <motion.article
          key={role.role}
          {...fade}
          transition={{ ...fade.transition, delay: i * 0.05 }}
        >
          <MarketingSurface className="flex h-full flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#ff5a6e]">
              {role.role}
            </p>
            <h3 className="mt-3 font-display text-xl tracking-tight text-foreground">
              {role.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {role.body}
            </p>
            <ul className="mt-5 space-y-2 border-t border-foreground/[0.08] pt-5">
              {role.tasks.map((task) => (
                <li
                  key={task}
                  className="text-xs leading-relaxed text-foreground/85 sm:text-sm"
                >
                  {task}
                </li>
              ))}
            </ul>
          </MarketingSurface>
        </motion.article>
      ))}
    </div>
  );
}
