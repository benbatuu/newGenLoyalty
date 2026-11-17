"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLLOUT_FLAGS } from "@ngl/shared";
import { RequireAuth } from "../../components/ui";
import { SocialContent } from "./social-content";

/** Sosyal ödüller geçici olarak kapalı — tekrar açmak için `ROLLOUT_FLAGS.socialRewards` */
export default function SocialPage() {
  const router = useRouter();

  useEffect(() => {
    if (!ROLLOUT_FLAGS.socialRewards) {
      router.replace("/customers");
    }
  }, [router]);

  if (!ROLLOUT_FLAGS.socialRewards) return null;

  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <SocialContent />
    </RequireAuth>
  );
}
