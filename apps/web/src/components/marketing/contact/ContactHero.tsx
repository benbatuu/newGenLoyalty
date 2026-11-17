import type { ReactNode } from "react";
import { Eyebrow } from "./ContactParts";

/** Page header: large title with intro on the left, a side column on the right. */
export function ContactHero({
  eyebrow,
  title,
  intro,
  aside,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  aside: ReactNode;
}) {
  return (
    <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-6 font-display text-5xl leading-[0.98] tracking-[-0.045em] text-[#DFE5EB] sm:text-7xl">
          {title}
        </h1>
        <p className="mt-8 max-w-xl text-base leading-[1.75] text-[#DFE5EB]/60 sm:text-lg">{intro}</p>
      </div>
      <div className="self-end">{aside}</div>
    </section>
  );
}
