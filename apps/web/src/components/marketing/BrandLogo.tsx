import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  compact = false,
}: {
  className?: string;
  /** Slightly smaller mark for dense layouts */
  compact?: boolean;
}) {
  return (
    <Image
      src="/logo-header.png"
      alt="StampWell"
      width={160}
      height={48}
      className={cn(
        "w-auto object-contain object-left",
        compact ? "h-11 sm:h-14" : "h-12 sm:h-16",
        className,
      )}
      priority
    />
  );
}
