import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { WalletPassMockup } from "@/components/marketing/home/ProductMockups";
import { buildPageMetadata } from "@/lib/seo";

type Feature = { title: string; body: string };
type Metric = { value: string; label: string; hint?: string };
type FaqItem = { q: string; a: string };
type Related = {
  href: "/how" | "/features" | "/programs" | "/pricing" | "/sectors" | "/use-cases" | "/contact";
  label: string;
  description: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "featuresPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/features",
  });
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[#ff5a6e]">
      {children}
    </p>
  );
}

function Check() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="mt-1 size-4 shrink-0 text-[#ff5a6e]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8.5l3.2 3.2L13 5" />
    </svg>
  );
}

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("featuresPage");
  const isTr = locale === "tr";

  const items = t.raw("items") as Feature[];
  const metrics = t.raw("metrics") as Metric[];
  const deepDive = t.raw("deepDive") as {
    eyebrow: string;
    title: string;
    body: string;
    bullets: string[];
  };
  const checklist = t.raw("checklist") as {
    title: string;
    description: string;
    items: string[];
  };
  const faq = t.raw("faq") as FaqItem[];
  const related = t.raw("related") as Related[];

  return (
    <main className="page-enter">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
        <Eyebrow>{isTr ? "Özellikler" : "Features"}</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[0.98] tracking-[-0.045em] text-[#DFE5EB] sm:text-7xl">
          {t("title")}
        </h1>
        <p className="mt-8 max-w-xl text-base leading-[1.75] text-[#DFE5EB]/60 sm:text-lg">
          {t("intro")}
        </p>
      </section>

      {/* Metrics */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <dl className="grid grid-cols-2 border-y border-white/[0.08] lg:grid-cols-4">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={
                "min-w-0 py-10 pr-6 " +
                (i % 2 === 1 ? "pl-6 " : "") +
                (i >= 2 ? "border-t border-white/[0.08] lg:border-t-0 " : "") +
                (i > 0 ? "lg:border-l lg:border-white/[0.08] lg:pl-8 " : "")
              }
            >
              <dt className="text-xs uppercase tracking-[0.14em] text-[#DFE5EB]/60">
                {m.label}
              </dt>
              <dd className="mt-3 font-display text-[clamp(1.6rem,3.2vw,3.25rem)] leading-none tracking-[-0.04em] text-[#DFE5EB] break-words [overflow-wrap:anywhere]">
                {m.value}
              </dd>
              {m.hint ? (
                <p className="mt-3 text-sm leading-relaxed text-[#DFE5EB]/60">{m.hint}</p>
              ) : null}
            </div>
          ))}
        </dl>
      </section>

      {/* Feature grid: numbered cells, hairline dividers */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <ul className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <li key={item.title} className="flex min-h-56 flex-col bg-[#111217] p-7 sm:p-9">
              <span className="font-mono text-xs tracking-[0.2em] text-[#DFE5EB]/60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-auto pt-10 font-display text-2xl tracking-[-0.02em] text-[#DFE5EB]">
                {item.title}
              </h2>
              <p className="mt-3 text-[0.95rem] leading-[1.7] text-[#DFE5EB]/60">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Deep dive: text + real wallet pass */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <Eyebrow>{deepDive.eyebrow}</Eyebrow>
            <h2 className="mt-5 font-display text-3xl leading-tight tracking-[-0.03em] text-[#DFE5EB] sm:text-5xl">
              {deepDive.title}
            </h2>
            <p className="mt-6 max-w-lg text-base leading-[1.75] text-[#DFE5EB]/60">
              {deepDive.body}
            </p>
            <ul className="mt-10 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {deepDive.bullets.map((b) => (
                <li key={b} className="flex gap-3 py-4 text-[0.95rem] text-[#DFE5EB]/80">
                  <Check />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#16181f] p-4 sm:p-6">
            <WalletPassMockup className="w-full" />
          </div>
        </div>
      </section>

      {/* Included in every plan */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <Eyebrow>{isTr ? "Dahil olanlar" : "Included"}</Eyebrow>
            <h2 className="mt-5 font-display text-3xl leading-tight tracking-[-0.03em] text-[#DFE5EB] sm:text-4xl">
              {checklist.title}
            </h2>
            <p className="mt-5 text-base leading-[1.75] text-[#DFE5EB]/55">
              {checklist.description}
            </p>
          </div>
          <ul className="grid border-t border-white/[0.08] sm:grid-cols-2 sm:gap-x-10">
            {checklist.items.map((item) => (
              <li
                key={item}
                className="flex gap-3 border-b border-white/[0.08] py-4 text-[0.95rem] text-[#DFE5EB]/80"
              >
                <Check />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-5 font-display text-3xl leading-tight tracking-[-0.03em] text-[#DFE5EB] sm:text-4xl">
            {t("faqTitle")}
          </h2>
        </div>
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {faq.map((item) => (
            <details key={item.q} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg text-[#DFE5EB] [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="font-mono text-[#ff5a6e] transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-2xl text-[0.95rem] leading-[1.75] text-[#DFE5EB]/60">
                {item.a}
              </p>
            </details>
          ))}
        </div>
        </div>
      </section>

      {/* Related pages */}
      <section className="mx-auto max-w-7xl px-5 pb-28 sm:px-8">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-[#DFE5EB]">
          {t("relatedTitle")}
        </h2>
        <ul className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
          {related.map((r) => (
            <li key={r.href} className="bg-[#111217]">
              <Link
                href={r.href}
                className="group flex h-full flex-col gap-3 p-7 transition-colors duration-200 hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#EF233C]"
              >
                <span className="flex items-center justify-between text-lg font-medium text-[#DFE5EB]">
                  {r.label}
                  <span
                    aria-hidden
                    className="text-[#ff5a6e] transition-transform duration-200 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
                <span className="text-sm leading-relaxed text-[#DFE5EB]/55">{r.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
