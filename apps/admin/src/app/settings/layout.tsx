"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FormSkeleton, RequireAuth } from "../../components/ui";
import { SettingsShell } from "./_components/settings-shell";
import {
  isBrandSettingsPath,
  isFullWidthSettingsPath,
} from "./_lib/settings-nav";

function SettingsLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Marka ve kart sayfaları kendi sekme menüsünü kullanır; üst ayar menüsü gösterilmez
  if (isBrandSettingsPath(pathname)) {
    return <div className="w-full">{children}</div>;
  }

  return <SettingsShell>{children}</SettingsShell>;
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <Suspense fallback={<FormSkeleton rows={6} />}>
        <SettingsLayoutInner>{children}</SettingsLayoutInner>
      </Suspense>
    </RequireAuth>
  );
}
