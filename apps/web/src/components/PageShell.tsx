import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { AuroraField } from "@/components/marketing/AuroraField";

export function PageShell({
  title,
  intro,
  children,
  narrow = false,
  wide = false,
  heroImage,
  heroAlt = "",
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  narrow?: boolean;
  wide?: boolean;
  heroImage?: string;
  heroAlt?: string;
}) {
  return (
    <main className="page-enter relative">
      {heroImage ? (
        <div className="relative h-[46vh] min-h-[280px] max-h-[460px] overflow-hidden bg-[var(--bg-deep)]">
          <AuroraField className="opacity-50" />
          <Image
            src={heroImage}
            alt={heroAlt}
            fill
            priority
            className="object-cover opacity-45 mix-blend-luminosity"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/50 to-transparent" />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 mx-auto px-5 pb-10 sm:px-8",
              wide || !narrow ? "max-w-7xl" : "max-w-2xl",
            )}
          >
            <p className="section-label mb-4">Dokun &amp; Kazan</p>
            <h1 className="font-display text-[clamp(2.6rem,6vw,4.6rem)] font-light leading-[1.02] tracking-[-0.04em] text-white">
              {title}
            </h1>
            <span className="mt-6 block h-px w-16 bg-gradient-to-r from-[var(--brass)] to-transparent" />
            {intro ? (
              <p className="mt-5 max-w-2xl text-[1.05rem] font-light leading-relaxed text-[var(--muted)]">
                {intro}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "relative mx-auto px-5 pt-32 sm:px-8 sm:pt-36",
            wide ? "max-w-7xl" : narrow ? "max-w-2xl" : "max-w-4xl",
          )}
        >
          <AuroraField className="opacity-25" />
          <header className="relative max-w-2xl">
            <p className="section-label mb-4">Dokun &amp; Kazan</p>
            <h1 className="font-display text-[clamp(2.8rem,6vw,4.8rem)] font-light leading-[1.02] tracking-[-0.04em] text-white">
              {title}
            </h1>
            <span className="mt-6 block h-px w-16 bg-gradient-to-r from-[var(--brass)] to-transparent" />
            {intro ? (
              <p className="mt-6 text-[1.05rem] font-light leading-relaxed text-[var(--muted)]">
                {intro}
              </p>
            ) : null}
          </header>
        </div>
      )}
      <div
        className={cn(
          "relative mx-auto px-5 pb-24 sm:px-8",
          heroImage ? "pt-12 sm:pt-16" : "mt-14 sm:mt-16",
          wide ? "max-w-7xl" : narrow ? "max-w-2xl" : "max-w-4xl",
        )}
      >
        {children}
      </div>
    </main>
  );
}
