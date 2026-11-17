"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";
import type { FaqItem } from "./shared";

export function FAQSection({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: FaqItem[];
}) {
  const faqItems = items.slice(0, 6);
  const [active, setActive] = useState("faq-0");

  const handleChange = (value: string) => {
    if (value) setActive(value);
  };

  return (
    <section className="border-b border-white/10 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title={title}
          description={description}
          className="mb-10 max-w-2xl"
        />

        <Accordion
          type="single"
          value={active}
          onValueChange={handleChange}
          className="grid lg:grid-cols-2 lg:gap-x-12"
        >
          {faqItems.map((item, i) => (
            <AccordionItem
              key={item.q}
              value={`faq-${i}`}
              className={cn(
                i < 3 ? "lg:col-start-1" : "lg:col-start-2",
                i % 3 === 0 && "lg:row-start-1",
                i % 3 === 1 && "lg:row-start-2",
                i % 3 === 2 && "lg:row-start-3",
              )}
            >
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
