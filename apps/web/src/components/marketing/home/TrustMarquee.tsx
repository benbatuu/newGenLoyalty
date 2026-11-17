"use client";

import { useLocale } from "next-intl";

const ITEMS = {
  tr: [
    "Apple Wallet",
    "Google Wallet",
    "SMS davet",
    "Uygulama yok",
    "Damga & ödül",
    "KVKK uyumlu",
    "Türkiye",
    "Kafe odaklı",
  ],
  en: [
    "Apple Wallet",
    "Google Wallet",
    "SMS invite",
    "No app install",
    "Stamp & reward",
    "KVKK-ready",
    "Turkey",
    "Café-first",
  ],
  ru:[
    "Apple Wallet",
"Google Wallet",
"Приглашение по SMS",
"Без установки приложения",
"Штампы и награды",
"Соответствие требованиям KVKK",
"Турция",
"Ориентировано на кафе",
  ],
} as const;

export function TrustMarquee() {
  const locale = useLocale() as "tr" | "en" | "ru";
  const items = ITEMS[locale] ?? ITEMS.en;
  const loop = [...items, ...items];

  return (
    <div className="border-b border-foreground/[0.08] bg-muted/20 py-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 text-xs font-medium text-muted-foreground sm:px-8 sm:text-sm">
        {loop.slice(0, items.length).map((item) => (
          <span key={item} className="inline-flex items-center gap-2">
            <span className="size-1 rounded-full bg-foreground/20" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
