import { getSiteUrl } from "@/lib/public-urls";

type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** Escape `<` so FAQ/copy cannot break out of the script tag. */
function safeJsonLd(data: JsonLdProps["data"]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

export function organizationJsonLd(locale: string) {
  const SITE = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "StampWell",
    alternateName: "StampWell Loyalty",
    url: `${SITE}/${locale}`,
    logo: `${SITE}/logo.png`,
    image: `${SITE}/logo.png`,
    description:
      locale === "tr"
        ? "Küçük kafeler için Wallet tabanlı sadakat platformu."
        : "Wallet-based loyalty platform for modern businesses.",
    areaServed: {
      "@type": "Country",
      name: "Turkey",
    },
    availableLanguage: ["tr", "en","ru"],
  };
}

export function softwareJsonLd(locale: string) {
  const SITE = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "StampWell",
    alternateName: "StampWell Loyalty",
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
