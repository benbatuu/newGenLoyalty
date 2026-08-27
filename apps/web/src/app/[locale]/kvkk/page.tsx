import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/PageShell";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return buildPageMetadata({
    locale,
    title: t("kvkkTitle"),
    description: t("lastUpdated"),
    pathname: "/kvkk",
  });
}

export default async function KvkkPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const paragraphs = t.raw("kvkkBody") as string[];

  return (
    <PageShell title={t("kvkkTitle")} intro={t("lastUpdated")} narrow>
      <div className="space-y-5 text-[0.98rem] font-light leading-relaxed text-[var(--ink)]/85">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 48)}>{p}</p>
        ))}
      </div>
    </PageShell>
  );
}
