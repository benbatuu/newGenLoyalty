import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo";
import { SECTOR_SLUGS, sectorIndex } from "@/lib/sectors";

type SectorItem = { title: string; body: string; image: string };
type Metric = { value: string; label: string; hint?: string };
type Detail = {
  metrics: Metric[];
  flow: { title: string; steps: string[] };
  fit: string[];
};

export function generateStaticParams() {
  return SECTOR_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const i = sectorIndex(slug);
  if (i < 0) return {};
  const t = await getTranslations({ locale, namespace: "sectorsPage" });
  const item = (t.raw("items") as SectorItem[])[i];
  return buildPageMetadata({
    locale,
    title: item.title,
    description: item.body,
    pathname: "/sectors/[slug]",
    params: { slug },
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

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const i = sectorIndex(slug);
  if (i < 0) notFound();

  const t = await getTranslations("sectorsPage");
  const isTr = locale === "tr";

  const items = t.raw("items") as SectorItem[];
  const item = items[i];
  if (!item) notFound();

  const details = t.raw("details") as Detail[];
  const detail = details[i];
  if (!detail) notFound();
  const { metrics, flow, fit } = detail;

  return (
    <main className="page-enter">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-5 pt-10 sm:px-8">
        <ol className="flex items-center gap-2 text-sm text-[#DFE5EB]/60">
          <li>
            <Link href="/sectors" className="transition-colors hover:text-[#DFE5EB]">
              {t("title")}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-[#DFE5EB]/80" aria-current="page">
            {item.title}
          </li>
        </ol>
      </nav>

      {/* Hero: text + photo */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-20 lg:pt-16">
        <div>
          <Eyebrow>
            {String(i + 1).padStart(2, "0")} · {isTr ? "Sektör" : "Sector"}
          </Eyebrow>
          <h1 className="mt-6 font-display text-5xl leading-[0.98] tracking-[-0.045em] text-[#DFE5EB] sm:text-6xl">
            {item.title}
          </h1>
          <p className="mt-8 max-w-lg text-base leading-[1.75] text-[#DFE5EB]/65 sm:text-lg">
            {item.body}
          </p>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/[0.08]">
          <Image
            src={item.image}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-cover"
          />
        </div>
      </section>

      {/* Metrics */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <dl className="grid grid-cols-2 border-y border-white/[0.08] lg:grid-cols-4">
          {metrics.map((m, k) => (
            <div
              key={m.label}
              className={
                "min-w-0 py-10 pr-6 " +
                (k % 2 === 1 ? "pl-6 " : "") +
                (k >= 2 ? "border-t border-white/[0.08] lg:border-t-0 " : "") +
                (k > 0 ? "lg:border-l lg:border-white/[0.08] lg:pl-8 " : "")
              }
            >
              <dt className="text-xs uppercase tracking-[0.14em] text-[#DFE5EB]/60">{m.label}</dt>
              <dd className="mt-3 font-display text-[clamp(1.6rem,3.2vw,3.25rem)] leading-none tracking-[-0.04em] text-[#DFE5EB] break-words [overflow-wrap:anywhere]">
                {m.value}
              </dd>
              {m.hint ? <p className="mt-3 text-sm leading-relaxed text-[#DFE5EB]/60">{m.hint}</p> : null}
            </div>
          ))}
        </dl>
      </section>

      {/* How the counter works for this sector */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <Eyebrow>{isTr ? "Tezgâh akışı" : "Counter flow"}</Eyebrow>
            <h2 className="mt-5 font-display text-3xl leading-tight tracking-[-0.03em] text-[#DFE5EB] sm:text-4xl">
              {flow.title}
            </h2>
          </div>
          <ol className="border-t border-white/[0.08]">
            {flow.steps.map((step, k) => (
              <li key={step} className="flex gap-6 border-b border-white/[0.08] py-5">
                <span className="font-mono text-xs tracking-[0.2em] text-[#ff5a6e]">
                  {String(k + 1).padStart(2, "0")}
                </span>
                <span className="text-[0.95rem] leading-[1.7] text-[#DFE5EB]/80">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Fit for this sector */}
      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 sm:pb-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <Eyebrow>{isTr ? "Uygunluk" : "Fit"}</Eyebrow>
            <h2 className="mt-5 font-display text-3xl leading-tight tracking-[-0.03em] text-[#DFE5EB] sm:text-4xl">
              {isTr ? "Bu sektöre uygun mu?" : "Is it right for this sector?"}
            </h2>
          </div>
          <ul className="border-t border-white/[0.08]">
            {fit.map((it) => (
              <li key={it} className="flex gap-3 border-b border-white/[0.08] py-4 text-[0.95rem] text-[#DFE5EB]/80">
                <Check />
                {it}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Back to list */}
      <section className="mx-auto max-w-7xl px-5 pb-28 sm:px-8">
        <Link
          href="/sectors"
          className="group inline-flex items-center gap-3 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-[#DFE5EB] transition-colors hover:bg-white/5"
        >
          <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
          {isTr ? "Tüm sektörler" : "All sectors"}
        </Link>
      </section>
    </main>
  );
}
