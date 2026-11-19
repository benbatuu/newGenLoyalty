import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en", "ru"],
  defaultLocale: "en",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/how": {
      tr: "/nasil-calisir",
      en: "/how-it-works",
      ru:"/как-это-работает"
    },
    "/features": {
      tr: "/ozellikler",
      en: "/features",
      ru: "/возможности"
    },
    "/pricing": {
      tr: "/fiyatlandirma",
      en: "/pricing",
      ru: "/тарифы"
    },
    "/sectors": {
      tr: "/sektorler",
      en: "/sectors",
      ru: "/отрасли"
    },
    "/sectors/[slug]": {
      tr: "/sektorler/[slug]",
      en: "/sectors/[slug]",
      ru: "/отрасли/[slug]"
    },
    "/use-cases": {
      tr: "/kullanim-senaryolari",
      en: "/use-cases",
      ru: "/сценарии-использования"
    },
    "/contact": {
      tr: "/iletisim",
      en: "/contact",
      ru: "/контакты"
    },
    "/signup": {
      tr: "/kayit",
      en: "/signup",
      ru: "/зарегистрироваться"
    },
    "/kvkk": "/kvkk",
    "/privacy": {
      tr: "/gizlilik",
      en: "/privacy",
      ru: "/конфиденциальность"
    },
    "/terms": {
      tr: "/kullanim-sartlari",
      en: "/terms",
      ru: "/условия"
    },
    "/programs": {
      tr: "/program-tipleri",
      en: "/programs",
      ru: "/программы"
    },
    "/portal": {
      tr: "/portal",
      en: "/portal",
      ru: "/портал"
    },
    "/social": {
      tr: "/sosyal",
      en: "/social",
      ru: "/соцсети"
    },
  },
});

export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];
