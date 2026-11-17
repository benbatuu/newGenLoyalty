import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HowPageScroll } from "@/components/marketing/HowPageScroll";
import { buildPageMetadata } from "@/lib/seo";

type Proof = { stat: string; label: string; hint?: string };
type Role = { role: string; title: string; body: string; tasks: string[] };
type TimelineItem = { title: string; body: string };
type FaqItem = { q: string; a: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "howPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/how",
  });
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.7rem] tracking-[0.22em] text-[#ff5a6e]">
      {children}
    </p>
  );
}

export default async function HowPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("howPage");
  const sections = await getTranslations("sections");
  const isTr = locale === "tr";

  const steps = t.raw("steps") as { n: string; title: string; body: string }[];
  const proof = sections.raw("proofItems") as Proof[];
  const roles = t.raw("roles") as Role[];
  const timeline = t.raw("timeline") as TimelineItem[];
  const faq = t.raw("faq") as FaqItem[];

  return (
    <main className="page-enter">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
        <Eyebrow>{isTr ? "NASIL ÇALIŞIR" : "HOW IT WORKS"}</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[0.98] tracking-[-0.045em] text-[#DFE5EB] sm:text-7xl">
          {t("title")}
        </h1>
        <p className="mt-8 max-w-xl text-base leading-[1.75] text-[#DFE5EB]/60 sm:text-lg">
          {t("intro")}
        </p>
      </section>

      {/* Metrics: ruled 4-up row */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <dl className="grid grid-cols-2 border-y border-white/[0.08] lg:grid-cols-4">
          {proof.map((m, i) => (
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
                {m.stat}
              </dd>
              {m.hint ? (
                <p className="mt-3 text-sm leading-relaxed text-[#DFE5EB]/60">{m.hint}</p>
              ) : null}
            </div>
          ))}
        </dl>
      </section>

      {/* Chapters: sticky split view */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="mb-12 max-w-2xl">
          <Eyebrow>{isTr ? "ADIMLAR" : "STEPS"}</Eyebrow>
          <h2 className="mt-5 font-display text-3xl tracking-[-0.03em] text-[#DFE5EB] sm:text-5xl">
            {sections("productTitle")}
          </h2>
        </div>
        <HowPageScroll steps={steps} opsTitle={t("opsTitle")} opsBody={t("opsBody")} />
      </section>

      {/* Roles: ruled rows */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="mb-16 grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <Eyebrow>{isTr ? "ROLLER" : "ROLES"}</Eyebrow>
            <h2 className="mt-5 font-display text-3xl tracking-[-0.03em] text-[#DFE5EB] sm:text-5xl">
              {t("rolesTitle")}
            </h2>
          </div>
          <p className="text-base leading-[1.75] text-[#DFE5EB]/55 lg:justify-self-end lg:max-w-md">
            {t("rolesIntro")}
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
          {roles.map((r, i) => (
            <article key={r.role} className="flex flex-col bg-[#111217] p-7 sm:p-9">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-3xl tracking-[-0.03em] text-[#DFE5EB]">
                  {r.role}
                </h3>
                <span className="font-mono text-xs tracking-[0.2em] text-[#DFE5EB]/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-[#ff5a6e]">{r.title}</p>
              <p className="mt-5 text-[0.95rem] leading-[1.7] text-[#DFE5EB]/60">{r.body}</p>

              <ul className="mt-8 divide-y divide-white/[0.08] border-t border-white/[0.08] text-sm text-[#DFE5EB]/80">
                {r.tasks.map((task) => (
                  <li key={task} className="flex items-center gap-3 py-3">
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      className="size-4 shrink-0 text-[#ff5a6e]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8.5l3.2 3.2L13 5" />
                    </svg>
                    {task}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Journey: numbered timeline */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="mb-16 max-w-2xl">
          <Eyebrow>{isTr ? "YOLCULUK" : "JOURNEY"}</Eyebrow>
          <h2 className="mt-5 font-display text-3xl tracking-[-0.03em] text-[#DFE5EB] sm:text-5xl">
            {t("timelineTitle")}
          </h2>
          <p className="mt-6 text-base leading-[1.75] text-[#DFE5EB]/55">
            {t("timelineIntro")}
          </p>
        </div>
        <ol className="relative grid gap-px bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
          {timeline.map((item, i) => (
            <li key={item.title} className="bg-[#111217] p-8">
              <p className="font-mono text-xs tracking-[0.2em] text-[#DFE5EB]/60">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-10 font-display text-xl tracking-tight text-[#DFE5EB]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-[1.7] text-[#DFE5EB]/55">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ: native disclosure, no client JS */}
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
    </main>
  );
}
