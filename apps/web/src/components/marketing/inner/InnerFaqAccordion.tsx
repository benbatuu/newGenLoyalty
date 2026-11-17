"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FaqItem } from "@/components/marketing/home/shared";

export function InnerFaqAccordion({
  items,
  defaultOpen = "faq-0",
}: {
  items: FaqItem[];
  defaultOpen?: string;
}) {
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen}>
      {items.map((item, i) => (
        <AccordionItem key={item.q} value={`faq-${i}`}>
          <AccordionTrigger className="text-left text-base sm:text-lg">
            {item.q}
          </AccordionTrigger>
          <AccordionContent>{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
