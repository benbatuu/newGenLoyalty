"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SmoothScroll } from "./SmoothScroll";

/** Hides marketing chrome on standalone public routes (QR menu, etc.). */
export function MarketingShell({ children }: { children: ReactNode }) {
  // "/menu" is not a typed marketing route, so compare as plain strings
  const pathname: string = usePathname();
  const isPublicMenu = pathname === "/menu" || pathname.startsWith("/menu/");

  if (isPublicMenu) {
    return <>{children}</>;
  }

  return (
    <SmoothScroll>
      <SiteHeader />
      {children}
      <SiteFooter />
    </SmoothScroll>
  );
}
