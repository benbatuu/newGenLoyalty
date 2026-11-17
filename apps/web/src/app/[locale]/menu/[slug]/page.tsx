import type { Metadata, Viewport } from "next";
import { PublicMenuView } from "./menu-view";
import { fetchPublicMenuServer } from "@/lib/fetch-public-menu-server";
import { hydratePublicMenu } from "@/lib/public-menu-cache";

/** iOS form focus zoom’unu engelle (inputlar 16px + bu viewport) */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicMenuServer(slug);
  if (!data) return { title: "Menü" };
  return {
    title: `${data.tenant.name} — Menü`,
    description: `${data.tenant.name} dijital menüsü`,
  };
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const { slug } = await params;
  const { branchId } = await searchParams;
  const raw = await fetchPublicMenuServer(slug, branchId);
  const initialMenu = raw ? hydratePublicMenu(raw) : null;

  return (
    <PublicMenuView slug={slug} branchId={branchId} initialMenu={initialMenu} />
  );
}
