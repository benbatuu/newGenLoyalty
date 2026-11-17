import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageShell({
  title,
  intro,
  children,
  narrow = false,
  wide = false,
  eyebrow = "StampWell",
  align = "left",
  flush = false,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  narrow?: boolean;
  wide?: boolean;
  eyebrow?: string;
  align?: "left" | "center";
  /** Skip outer content padding — for full-bleed scroll sections */
  flush?: boolean;
}) {
  const containerWidth = wide || !narrow ? "max-w-7xl" : "max-w-2xl";

  return (
    <main className="page-enter">
      <header className="border-b border-foreground/[0.08] pb-8 pt-8 sm:pb-14 sm:pt-14">
        <div
          className={cn(
            "mx-auto px-5 sm:px-8",
            containerWidth,
            align === "center" && "text-center",
          )}
        >
          <span className="attio-eyebrow">{eyebrow}</span>
          <h1
            className={cn(
              "mt-5 font-display text-[clamp(1.85rem,6vw,4rem)] leading-[1.04] tracking-tight text-foreground sm:mt-6",
              align === "center" && "mx-auto max-w-3xl",
            )}
          >
            {title}
          </h1>
          {intro ? (
            <p
              className={cn(
                "mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base sm:text-[1.05rem]",
                align === "center" && "mx-auto",
              )}
            >
              {intro}
            </p>
          ) : null}
        </div>
      </header>

      {flush ? (
        children
      ) : (
        <div
          className={cn(
            "mx-auto px-5 py-10 sm:px-8 sm:py-16",
            containerWidth,
          )}
        >
          {children}
        </div>
      )}
    </main>
  );
}
