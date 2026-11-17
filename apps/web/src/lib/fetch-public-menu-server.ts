import type { PublicMenuPayload } from "@/components/menu-themes/menu-theme-types";

function apiBase(): string {
  return (
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

/** RSC / metadata — Next fetch cache ile aynı request içinde tekilleşir. */
export async function fetchPublicMenuServer(
  slug: string,
  branchId?: string,
): Promise<PublicMenuPayload | null> {
  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  try {
    const res = await fetch(`${apiBase()}/public/menu/${encodeURIComponent(slug)}${q}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicMenuPayload;
  } catch {
    return null;
  }
}
