import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en"],
  defaultLocale: "tr",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/how": {
      tr: "/nasil-calisir",
      en: "/how-it-works",
    },
    "/features": {
      tr: "/ozellikler",
      en: "/features",
    },
    "/pricing": {
      tr: "/fiyatlandirma",
      en: "/pricing",
    },
    "/sectors": {
      tr: "/sektorler",
      en: "/sectors",
    },
    "/use-cases": {
      tr: "/kullanim-senaryolari",
      en: "/use-cases",
    },
    "/contact": {
      tr: "/iletisim",
      en: "/contact",
    },
    "/login": {
      tr: "/giris",
      en: "/login",
    },
    "/signup": {
      tr: "/kayit",
      en: "/signup",
    },
    "/kvkk": "/kvkk",
    "/privacy": {
      tr: "/gizlilik",
      en: "/privacy",
    },
    "/terms": {
      tr: "/kullanim-sartlari",
      en: "/terms",
    },
  },
});

export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];
