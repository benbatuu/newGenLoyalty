import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Width constraint only — PageShell already provides horizontal padding */
export function InnerPageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-7xl", className)}>
      {children}
    </div>
  );
}

export function InnerPageSection({
  children,
  className,
  bordered = true,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <section
      className={cn(
        "mt-14 pt-14 sm:mt-16 sm:pt-16",
        bordered && "border-t border-foreground/[0.08]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function InnerSectionIntro({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "mb-8 max-w-2xl sm:mb-10",
        align === "center" && "mx-auto text-center",
      )}
    >
      {eyebrow ? <span className="attio-eyebrow">{eyebrow}</span> : null}
      <h2
        className={cn(
          "font-display text-[clamp(1.65rem,3.5vw,2.35rem)] tracking-tight text-foreground",
          eyebrow && "mt-4",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
