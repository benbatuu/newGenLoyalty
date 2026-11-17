import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProgramsPageCatalog } from "@/components/marketing/ProgramsPageCatalog";
import { buildPageMetadata } from "@/lib/seo";

type MatrixRow = { label: string; values: ("yes" | "no" | "partial" | string)[] };
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
  const t = await getTranslations({ locale, namespace: "programsPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/programs",
  });
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[#ff5a6e]">
      {children}
    </p>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={"size-4 shrink-0 text-[#ff5a6e] " + className}
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

/** Matrix cell: icon plus screen-reader text, never colour alone */
function MatrixCell({ value, yes, no }: { value: string; yes: string; no: string }) {
  if (value === "yes") {
    return (
      <>
        <Check className="mx-auto" />
        <span className="sr-only">{yes}</span>
      </>
    );
  }
  if (value === "no") {
    return (
      <>
        <span aria-hidden className="mx-auto block h-px w-3 bg-[#DFE5EB]/25" />
        <span className="sr-only">{no}</span>
      </>
    );
  }
  return <span className="text-sm text-[#DFE5EB]/70">{value}</span>;
}

export default async function ProgramsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("programsPage");
  const isTr = locale === "tr";

  const matrixColumns = t.raw("matrixColumns") as string[];
  const matrixRows = t.raw("matrixRows") as MatrixRow[];
  const deepDive = t.raw("deepDive") as {
    eyebrow: string;
    title: string;
    body: string;
    bullets: string[];
  };
  const chooseBullets = t.raw("chooseBullets") as string[];
  const related = t.raw("related") as Related[];

  return (
    <main className="page-enter">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
        <Eyebrow>{isTr ? "Programlar" : "Programs"}</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[0.98] tracking-[-0.045em] text-[#DFE5EB] sm:text-7xl">
          {t("title")}
        </h1>
        <p className="mt-8 max-w-xl text-base leading-[1.75] text-[#DFE5EB]/60 sm:text-lg">
          {t("intro")}
        </p>
      </section>

      {/* Catalog: the eight card types as real wallet passes */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <ProgramsPageCatalog />
      </section>

      {/* Plan matrix */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <Eyebrow>{isTr ? "Karşılaştır" : "Compare"}</Eyebrow>
            <h2 className="mt-5 font-display text-3xl leading-tight tracking-[-0.03em] text-[#DFE5EB] sm:text-4xl">
              {t("matrixTitle")}
            </h2>
            <p className="mt-5 text-base leading-[1.75] text-[#DFE5EB]/55">{t("matrixIntro")}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th scope="col" className="py-4 pr-4 text-xs font-normal uppercase tracking-[0.14em] text-[#DFE5EB]/60">
                    {isTr ? "Kart tipi" : "Card type"}
                  </th>
                  {matrixColumns.map((c) => (
                    <th
                      key={c}
                      scope="col"
                      className="px-3 py-4 text-center text-sm font-medium text-[#DFE5EB]"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row) => (
                  <tr key={row.label} className="border-b border-white/[0.08]">
                    <th scope="row" className="py-4 pr-4 text-[0.95rem] font-normal text-[#DFE5EB]/85">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td key={matrixColumns[i] ?? i} className="px-3 py-4 text-center">
                        <MatrixCell
                          value={v}
                          yes={isTr ? "Dahil" : "Included"}
                          no={isTr ? "Dahil değil" : "Not included"}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Choosing a model */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <Eyebrow>{isTr ? "Seçim" : "Choosing"}</Eyebrow>
            <h2 className="mt-5 font-display text-3xl leading-tight tracking-[-0.03em] text-[#DFE5EB] sm:text-4xl">
              {t("chooseTitle")}
            </h2>
            <p className="mt-5 text-base leading-[1.75] text-[#DFE5EB]/55">{t("chooseIntro")}</p>
          </div>
          <ul className="border-t border-white/[0.08]">
            {chooseBullets.map((item) => {
              // Copy is written as "Name — reason"; split so the name reads as a label
              const [name, ...rest] = item.split(" — ");
              const reason = rest.join(" — ");
              return (
                <li
                  key={item}
                  className="grid gap-1 border-b border-white/[0.08] py-4 sm:grid-cols-[12rem_1fr] sm:gap-6"
                >
                  <span className="text-[0.95rem] font-medium text-[#DFE5EB]">{name}</span>
                  {reason ? (
                    <span className="text-[0.95rem] text-[#DFE5EB]/60">{reason}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Multiple programs per guest */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <Eyebrow>{deepDive.eyebrow}</Eyebrow>
            <h2 className="mt-5 font-display text-3xl leading-tight tracking-[-0.03em] text-[#DFE5EB] sm:text-4xl">
              {deepDive.title}
            </h2>
            <p className="mt-5 text-base leading-[1.75] text-[#DFE5EB]/55">{deepDive.body}</p>
          </div>
          <ul className="border-t border-white/[0.08]">
            {deepDive.bullets.map((b) => (
              <li
                key={b}
                className="flex gap-3 border-b border-white/[0.08] py-4 text-[0.95rem] text-[#DFE5EB]/80"
              >
                <Check className="mt-1" />
                {b}
              </li>
            ))}
          </ul>
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
