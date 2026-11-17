import { Link } from "@/i18n/navigation";

type UseCase = { title: string; body: string };

/**
 * Homepage teaser for the use-cases page: three real scenarios in a ruled
 * row, plus one link to the full page. Kept short so the homepage stays light.
 */
export function UseCasesTeaser({
  eyebrow,
  title,
  linkLabel,
  items,
}: {
  eyebrow: string;
  title: string;
  linkLabel: string;
  items: UseCase[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[#ff5a6e]">
            {eyebrow}
          </p>
          <h2 className="mt-5 font-display text-3xl tracking-[-0.03em] text-[#DFE5EB] sm:text-4xl">
            {title}
          </h2>
        </div>
        <Link
          href="/use-cases"
          className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#DFE5EB]/75 transition-colors hover:text-[#DFE5EB]"
        >
          {linkLabel}
          <span aria-hidden className="text-[#ff5a6e] transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>

      <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
        {items.slice(0, 3).map((item, i) => (
          <li key={item.title} className="flex flex-col bg-[#111217] p-7 sm:p-8">
            <span className="font-mono text-xs tracking-[0.2em] text-[#DFE5EB]/60">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-8 font-display text-xl tracking-[-0.02em] text-[#DFE5EB]">
              {item.title}
            </h3>
            <p className="mt-3 text-[0.95rem] leading-[1.7] text-[#DFE5EB]/60">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
