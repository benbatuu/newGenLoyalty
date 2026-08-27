"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cn(
        "border-b border-[var(--line)] transition-colors data-[state=open]:border-[var(--brass)]/40",
        className,
      )}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex flex-1 items-center justify-between gap-6 py-7 text-left font-display text-[1.3rem] font-medium tracking-[-0.02em] text-white transition-colors hover:text-[var(--brass)] sm:text-[1.5rem] [&[data-state=open]>span]:rotate-45",
          className,
        )}
        {...props}
      >
        {children}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--line)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:border-[var(--brass)] group-data-[state=open]:border-[var(--brass)] group-data-[state=open]:bg-[var(--brass-soft)] group-data-[state=open]:shadow-[0_0_24px_var(--glow)]">
          <Plus className="h-3.5 w-3.5 text-[var(--muted)] transition-colors group-data-[state=open]:text-[var(--brass)]" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div
        className={cn(
          "max-w-2xl pb-8 text-[0.98rem] font-light leading-[1.8] text-[var(--muted)]",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}
