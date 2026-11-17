import { Eyebrow } from "./ContactParts";

type Step = { n: string; title: string; body: string };

/** What happens after a message is sent. Ruled list, same grammar as the how page. */
export function ContactSteps({ eyebrow, steps }: { eyebrow: string; steps: Step[] }) {
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <ol className="mt-6 border-t border-white/[0.08]">
        {steps.map((s) => (
          <li key={s.n} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-white/[0.08] py-6">
            <span className="font-mono text-xs tracking-[0.2em] text-[#DFE5EB]/40">{s.n}</span>
            <div>
              <p className="font-display text-xl tracking-[-0.02em] text-[#DFE5EB]">{s.title}</p>
              <p className="mt-2 text-[0.95rem] leading-[1.7] text-[#DFE5EB]/60">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
