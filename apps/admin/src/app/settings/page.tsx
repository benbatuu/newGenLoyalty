"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_SETTINGS_PATH } from "./_lib/settings-nav";

export default function SettingsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(DEFAULT_SETTINGS_PATH);
  }, [router]);

  return null;
}
