import { cn } from "@/lib/utils";

export function ProductFrame({
  title,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        "attio-surface overflow-hidden shadow-[0_20px_70px_-20px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-foreground/[0.08] bg-muted/30 px-4 py-3">
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        {title ? (
          <span className="ml-2 truncate text-xs font-medium text-muted-foreground">
            {title}
          </span>
        ) : null}
      </div>
      <div className={cn("bg-card", contentClassName)}>{children}</div>
    </div>
  );
}
