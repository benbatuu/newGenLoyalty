"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

/** Marka sekmesi — wallet kart ayarlarındaki Marka bölümüne yönlendirir */
function BrandRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(q ? `/settings/card?tab=brand&${q}` : "/settings/card?tab=brand");
  }, [router, searchParams]);

  return (
    <p className="text-sm text-[var(--muted)]">
      Marka ayarlarına yönlendiriliyor…{" "}
      <Link href="/settings/card?tab=brand" className="text-[var(--accent)]">
        Buraya tıklayın
      </Link>
    </p>
  );
}

export default function BrandSettingsPage() {
  return (
    <Suspense>
      <BrandRedirect />
    </Suspense>
  );
}
