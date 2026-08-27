"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homePathForRole, useAuth } from "../lib/auth";

export default function HomePage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else router.replace(homePathForRole(user.role));
  }, [ready, user, router]);

  return (
    <div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">
      Yönlendiriliyor…
    </div>
  );
}
