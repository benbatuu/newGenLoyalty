import { Eyebrow, FactRow } from "./ContactParts";

export function ContactInfo({
  eyebrow,
  title,
  body,
  facts,
}: {
  eyebrow: string;
  title: string;
  body: string;
  facts: { label: string; value: string }[];
}) {
  return (
    <aside className="lg:sticky lg:top-36">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 font-display text-3xl leading-tight tracking-[-0.03em] text-[#DFE5EB] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-[1.75] text-[#DFE5EB]/60">{body}</p>
      <dl className="mt-10 border-t border-white/[0.08]">
        {facts.map((f) => (
          <FactRow key={f.label} label={f.label} value={f.value} />
        ))}
      </dl>
    </aside>
  );
}
