"use client";

import { useEffect } from "react";

/** Eski adres: tek kart detay sayfası artık /reward?programId=… */
export default function StampEditorRedirect() {
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("programId");
    window.location.replace(id ? `/reward?programId=${encodeURIComponent(id)}` : "/reward");
  }, []);
  return null;
}
