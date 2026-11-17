import { Eyebrow } from "@/components/marketing/contact/ContactParts";

/** Short label for the index: text before the first colon, else the first words. */
function labelOf(p: string): string {
  const colon = p.indexOf(":");
  if (colon > 0 && colon < 48) return p.slice(0, colon);
  const words = p.split(" ").slice(0, 4).join(" ");
  return words.length > 40 ? `${words.slice(0, 38)}…` : words;
}

/**
 * Legal page in the site's grammar: a sticky index on the left (title, date,
 * numbered sections that jump to their paragraph) and the text on the right.
 */
export function LegalDocument({
  eyebrow,
  title,
  updated,
  paragraphs,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  paragraphs: string[];
}) {
  return (
    <main className="page-enter mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
      <aside className="lg:sticky lg:top-36 lg:self-start">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-6 font-display text-4xl leading-[1.02] tracking-[-0.04em] text-[#DFE5EB] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 text-sm text-[#DFE5EB]/50">{updated}</p>

        <nav aria-label={title} className="mt-12 hidden lg:block">
          <ol className="border-t border-white/[0.08]">
            {paragraphs.map((p, i) => (
              <li key={`idx-${i}`} className="border-b border-white/[0.08]">
                <a
                  href={`#s-${i + 1}`}
                  className="grid grid-cols-[2.5rem_1fr] py-3 text-sm text-[#DFE5EB]/60 transition-colors hover:text-[#DFE5EB]"
                >
                  <span className="font-mono text-xs tracking-[0.15em] text-[#DFE5EB]/35">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate">{labelOf(p)}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </aside>

      <div className="space-y-6">
        {paragraphs.map((p, i) => (
          <section
            key={`s-${i + 1}`}
            id={`s-${i + 1}`}
            className="scroll-mt-40 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-9"
          >
            <p className="font-mono text-xs tracking-[0.2em] text-[#EF233C]">
              {String(i + 1).padStart(2, "0")}
            </p>
            <p className="mt-4 text-[1.02rem] leading-[1.85] text-[#DFE5EB]/85">{p}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
