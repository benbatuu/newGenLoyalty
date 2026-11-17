"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function CounterMockup({ className }: { className?: string }) {
  const t = useTranslations("sections");

  const rows = [
    { name: "Ayşe K.", stamps: "7 / 10", status: t("hero.columnActive"), score: 92 },
    { name: "Mehmet D.", stamps: "10 / 10", status: t("hero.columnReward"), score: 98 },
    { name: "Zeynep A.", stamps: "3 / 10", status: t("hero.columnActive"), score: 76 },
    { name: "Can Y.", stamps: "5 / 10", status: t("hero.columnActive"), score: 84 },
  ];

  return (
    <div className={cn("p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t("hero.counterTitle")}</p>
          <p className="text-sm font-semibold text-foreground">{t("hero.counterBrand")}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[0.65rem] font-medium text-[#ff5a6e]">
          {t("hero.liveTag")}
        </span>
      </div>

      <div className="mb-3 flex gap-2">
        <div className="h-9 flex-1 rounded-lg border border-foreground/[0.08] bg-muted/40 px-3 text-xs leading-9 text-muted-foreground">
          {t("hero.searchCustomer")}…
        </div>
        <div className="flex h-9 items-center rounded-lg bg-foreground px-3 text-xs font-medium text-background">
          + {t("hero.stampButton")}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/[0.08]">
        <div className="grid grid-cols-[1.4fr_1fr] gap-2 border-b border-foreground/[0.08] bg-muted/30 px-3 py-2 text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[1.2fr_0.8fr_0.6fr_0.5fr]">
          <span>{t("hero.columnCustomer")}</span>
          <span>{t("hero.columnStamp")}</span>
          <span className="hidden sm:inline">{t("hero.columnStatus")}</span>
          <span className="hidden text-right sm:inline">{t("hero.columnScore")}</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-[1.4fr_1fr] gap-2 border-b border-foreground/[0.06] px-3 py-2.5 text-xs last:border-b-0 sm:grid-cols-[1.2fr_0.8fr_0.6fr_0.5fr]"
          >
            <span className="truncate font-medium text-foreground">{row.name}</span>
            <span className="text-muted-foreground">{row.stamps}</span>
            <span
              className={cn(
                "hidden w-fit rounded-full px-2 py-0.5 text-[0.62rem] font-medium sm:inline-flex",
                row.status === t("hero.columnReward")
                  ? "bg-accent/50 text-accent-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {row.status}
            </span>
            <span className="hidden text-right font-medium text-[#ff5a6e] sm:inline">
              {row.score}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-foreground/[0.08] bg-muted/20 p-3">
        <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
          {t("hero.counterLastAction")}
        </p>
        <p className="mt-1 text-sm text-foreground">
          {t("hero.stampAddedFor")} <span className="font-semibold">Ayşe K.</span> · 7 → 8
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t("hero.walletUpdated")} : 2s {t("hero.ago")}</p>
      </div>
    </div>
  );
}

function WalletBarcode({ className }: { className?: string }) {
  // Sabit bir "rastgele" çubuk deseni — her render'da aynı kalsın diye seed'li
  const bars = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 1, 3, 1, 2, 1, 4, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 1, 4, 2, 1, 1, 3, 1, 2, 1, 1, 2, 4, 1, 1];
  const totalUnits = bars.reduce((a, b) => a + b, 0);

  let x = 0;
  return (
    <svg
      viewBox={`0 0 ${totalUnits} 40`}
      preserveAspectRatio="none"
      className={className}
    >
      {bars.map((w, i) => {
        const bar = i % 2 === 0; // çift index = çubuk, tek index = boşluk
        const rect = bar ? (
          <rect key={i} x={x} y={0} width={w} height={40} fill="currentColor" />
        ) : null;
        x += w;
        return rect;
      })}
    </svg>
  );
}

export function WalletPassMockup({ className }: { className?: string }) {
  const t = useTranslations("sections");
  const s = useTranslations("walletPass");

  const brandName = t("hero.counterBrand"); // "Caffe Ribelle"

  const passInfoRows = [
    { label: s("aboutBrand"), value: brandName },
    {
      label: s("howDoesItWork"),
      value: s("howDoesItWorkText", { brand: brandName }),
    },
    { label: s("brandRules"), value: s("brandRulesText") },
    { label: s("brandAddress"), value: s("brandAddressText") },
    { label: s("workHours"), value: s("workHoursText") },
    { label: s("brandWebsite"), value: s("brandWebsiteText") },
    { label: s("brandContactPhone"), value: s("brandContactPhoneText") },
    { label: s("brandCampaign"), value: s("brandCampaignText") },
  ];
  return (
    <div className={cn("flex items-center justify-center p-6 sm:p-8 [perspective:1200px]", className)}>
      <div className="group relative h-152 w-full max-w-[420px]">
        <div
          className={cn(
            "relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]",
            "group-hover:[transform:rotateY(180deg)]",
          )}
        >
          {/* FRONT */}
          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-foreground/[0.08] bg-[linear-gradient(180deg,#090909_0,#060607_42rem,#090909_100%)] shadow-lg [backface-visibility:hidden]">
            <div className="flex flex-1 flex-col p-5 text-[#ff5a6e]-foreground">
              {/* Header: logo + org name */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center rounded-md">
                    <Image src={"/caffe-ribelle-logo-256.png"} alt="Caffe Ribelle Logo" width={128} height={36} />
                  </div>
                </div>
                <p className="text-[0.65rem] font-medium uppercase tracking-wider opacity-60">
                  {t("loyaltyPass")}
                </p>
              </div>

              {/* Primary field */}
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-wide opacity-70">
                    {t("hero.stamps")}
                  </p>
                  <p className="text-4xl font-semibold leading-none">8 / 10</p>
                </div>
                <div className="rounded-lg bg-primary-foreground/15 px-3 py-1.5 text-sm font-medium">
                  2 {t("hero.toReward")}
                </div>
              </div>

              {/* Strip: stamp grid */}
              <div className="mt-6 grid grid-cols-5 gap-1.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <img
                    key={i}
                    src={i < 8 ? "/fill-cup-256.png" : "/empty-cup-256.png"}
                    alt=""
                    className="aspect-square w-full object-contain"
                  />
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <div className="w-3/5">
                  <p className="text-[0.65rem] uppercase tracking-wide opacity-70">
                    {s("notice")}
                  </p>
                  <p className="text-sm font-semibold leading-none">{s("noticeText")}</p>
                </div>
                <div className="w-1/5"/>
                <div className="w-1/5">
                  <p className="text-[0.65rem] uppercase tracking-wide opacity-70">
                      {t("hero.stamps")}
                    </p>
                    <p className="text-xl font-semibold leading-none">8 / 10</p>
                </div>
              </div>
              {/* Spacer pushes barcode block to bottom like real Wallet pass */}
              <div className="flex-1" />

              {/* Barcode block (Apple pass style, on the front) */}
              <div className="mt-6 flex flex-col items-center gap-2 border-t border-primary-foreground/15 pt-4">
                <div className="w-full rounded-md bg-primary-foreground p-3">
                  <WalletBarcode className="h-10 w-full text-black" />
                </div>
                <p className="text-[0.65rem] tracking-widest opacity-60">SW-8842-1093</p>
              </div>
            </div>
          </div>

          {/* BACK */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl border border-foreground/[0.08] bg-[linear-gradient(180deg,#090909_0,#060607_42rem,#090909_100%)] shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="flex h-full min-h-0 flex-col p-5 text-[#ff5a6e]-foreground">
              <p className="text-[0.65rem] font-medium uppercase tracking-wider opacity-80">
                {t("hero.counterBrand")}
              </p>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2 text-xs">
                <div className="space-y-3">
                  {passInfoRows.map((row) => (
                    <div
                      key={row.label}
                      className="border-b border-primary-foreground/15 pb-2.5"
                    >
                      <p className="mb-1 text-[0.6rem] uppercase tracking-wide opacity-60">
                        {row.label}
                      </p>

                      <p className="font-medium leading-relaxed opacity-95">
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SmsFlowMockup({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 p-4 sm:p-5", className)}>
      <div className="rounded-xl border border-foreground/[0.08] bg-muted/20 p-4">
        <p className="text-xs font-medium text-muted-foreground">SMS invite</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          GreenLeaf: Sadakat kartınız hazır. Apple Wallet&apos;a ekleyin →{" "}
          <span className="text-[#ff5a6e]">dokunkazan.app/w/abc12</span>
        </p>
      </div>
      <div className="rounded-xl border border-foreground/[0.08] p-4">
        <p className="text-xs font-medium text-muted-foreground">Customer action</p>
        <p className="mt-2 text-sm text-foreground">Tap link · Add to Wallet · Done</p>
        <div className="mt-3 flex gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[0.65rem] font-medium text-[#ff5a6e]">
            No app install
          </span>
          <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-[0.65rem] font-medium text-secondary-foreground">
            KVKK ready
          </span>
        </div>
      </div>
    </div>
  );
}

export function ReportsMockup({ className }: { className?: string }) {
  const bars = [42, 58, 36, 72, 64, 48, 80];
  return (
    <div className={cn("p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Today&apos;s stamps</p>
        <p className="text-2xl font-semibold text-[#ff5a6e]">127</p>
      </div>
      <div className="flex h-28 items-end gap-2">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-primary/80"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Rewards", "12"],
          ["Near reward", "34"],
          ["New passes", "18"],
        ].map(([label, val]) => (
          <div
            key={label}
            className="rounded-lg border border-foreground/[0.08] bg-muted/20 px-2 py-2"
          >
            <p className="text-[0.62rem] text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold text-foreground">{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
