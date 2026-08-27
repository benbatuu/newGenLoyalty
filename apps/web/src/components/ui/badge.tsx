import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("section-label inline-flex items-center gap-2.5", {
  variants: {
    variant: {
      default: "text-[var(--brass)]",
      secondary: "text-[var(--muted)]",
      outline:
        "border border-[var(--line)] px-3 py-1.5 text-[var(--muted)]",
      brass: "text-[var(--brass)]",
    },
  },
  defaultVariants: { variant: "brass" },
});

export function Badge({
  className,
  variant,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brass)] opacity-40" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brass)] shadow-[0_0_10px_var(--glow)]" />
      </span>
      {children}
    </div>
  );
}
