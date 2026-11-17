import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAdminUrl } from "@/lib/public-urls";

/**
 * Plan butonu: kredi kartı istemeden 14 günlük deneme kaydına gider.
 * Paket referansı URL'de taşınır; kayıt sayfası (admin) bunu okur.
 */
export function PlanPurchaseButton({
  planId,
  billing = "monthly",
  children,
  className,
  variant = "outline",
  size = "sm",
}: {
  planId: string;
  billing?: "monthly" | "yearly";
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "light" | "ghost-light" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
}) {
  const base = getAdminUrl();
  const href = `${base}/register?plan=${encodeURIComponent(planId)}&billing=${billing}`;
  return (
    <Button asChild variant={variant} size={size} className={cn("min-h-11", className)} data-cursor="hot">
      <a href={href} rel="noopener">
        {children}
      </a>
    </Button>
  );
}
