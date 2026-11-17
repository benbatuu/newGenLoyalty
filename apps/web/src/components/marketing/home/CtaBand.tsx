"use client";

import { SplitWords } from "@/components/marketing/TextReveal";
import { DemoButton } from "@/components/marketing/DemoModal";

export function CtaBand({
  title,
  body,
  button,
}: {
  title: string;
  body: string;
  button: string;
}) {
  return (
    <section className="border-t border-foreground/[0.08] bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <h2 className="max-w-2xl font-display text-[clamp(2rem,5vw,3.25rem)] tracking-tight text-foreground">
          <SplitWords text={title} />
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          {body}
        </p>
        <DemoButton size="lg" className="mt-8">
          {button}
        </DemoButton>
      </div>
    </section>
  );
}
