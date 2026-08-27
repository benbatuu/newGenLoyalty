import { getSiteUrl } from "@/lib/public-urls";

type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationJsonLd(locale: string) {
  const SITE = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Dokun & Kazan",
    url: `${SITE}/${locale}`,
    description:
      locale === "tr"
        ? "Küçük kafeler için Wallet tabanlı dijital damga kartı."
        : "Wallet-based digital stamp cards for small cafés.",
    areaServed: {
      "@type": "Country",
      name: "Turkey",
    },
    availableLanguage: ["tr", "en"],
  };
}

export function softwareJsonLd(locale: string) {
  const SITE = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Dokun & Kazan",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS Wallet, Android Wallet",
    offers: {
      "@type": "Offer",
      priceCurrency: "TRY",
      price: "990",
    },
    url: `${SITE}/${locale}`,
    inLanguage: locale,
  };
}

export function faqJsonLd(
  items: { q: string; a: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
