"use client";

import { cn } from "@/lib/utils";

export function Marquee({
  items,
  className,
  speed = 40,
}: {
  items: string[];
  className?: string;
  speed?: number;
}) {
  const row = [...items, ...items];
  return (
    <div
      className={cn("marquee relative overflow-hidden border-y border-[var(--line)]", className)}
      style={{ "--marquee-duration": `${speed}s` } as React.CSSProperties}
    >
      <div className="marquee-track">
        {row.map((item, i) => (
          <span key={`${item}-${i}`} className="marquee-item">
            <span className="marquee-dot" aria-hidden />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
