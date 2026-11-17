import type { Viewport } from "next";
import { PublicMenuView } from "../../menu-view";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ slug: string; qrCode: string }>;
}) {
  const { slug, qrCode } = await params;
  return <PublicMenuView slug={slug} qrCode={qrCode} />;
}
