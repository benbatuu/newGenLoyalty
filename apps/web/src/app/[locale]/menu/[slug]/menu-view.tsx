"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/public-urls";
import { MenuThemeView } from "@/components/menu-themes/resolve-theme-view";
import type { PublicMenuPayload } from "@/components/menu-themes/menu-theme-types";
import {
  fetchPublicMenuJson,
  hydratePublicMenu,
  isMenuCacheUsable,
  publicMenuCacheKey,
  readPublicMenuCache,
} from "@/lib/public-menu-cache";

export function PublicMenuView({
  slug,
  branchId,
  qrCode,
  initialMenu,
}: {
  slug: string;
  branchId?: string;
  qrCode?: string;
  initialMenu?: PublicMenuPayload | null;
}) {
  // İlk çizim sunucuyla aynı olmalı (hydration); önbellek aşağıdaki effect'te hemen uygulanır
  const [menu, setMenu] = useState<PublicMenuPayload | null>(() =>
    initialMenu ? hydratePublicMenu(initialMenu) : null,
  );
  const [loading, setLoading] = useState(!menu);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState(branchId ?? "");

  useEffect(() => {
    const key = publicMenuCacheKey({ slug, branchId: selectedBranch, qrCode });
    const cached = readPublicMenuCache(key);
    if (cached && isMenuCacheUsable(cached)) {
      setMenu(cached.data);
      setLoading(false);
    }

    const base = getApiUrl();
    const url = qrCode
      ? `${base}/public/menu/${slug}/table/${qrCode}`
      : `${base}/public/menu/${slug}${selectedBranch ? `?branchId=${selectedBranch}` : ""}`;

    let cancelled = false;
    void fetchPublicMenuJson(url, key)
      .then((data) => {
        if (cancelled) return;
        setMenu(data);
        setError(null);
      })
      .catch(() => {
        if (!cancelled && !cached && !initialMenu) setError("Menü yüklenemedi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, selectedBranch, qrCode, initialMenu]);

  if (loading && !menu) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f3ee]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d8cbb6] border-t-[#2a2118]" />
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f3ee] px-4 text-center">
        <p className="text-lg font-medium text-[#1b1916]">Menü bulunamadı</p>
        <p className="mt-1 text-sm text-[#6b645b]">
          Lütfen linki kontrol edip tekrar deneyin.
        </p>
      </div>
    );
  }

  return (
    <MenuThemeView
      key={menu.revision ?? "menu"}
      menu={menu}
      selectedBranch={selectedBranch}
      onBranchChange={setSelectedBranch}
      hideBranchSelect={Boolean(qrCode)}
    />
  );
}
