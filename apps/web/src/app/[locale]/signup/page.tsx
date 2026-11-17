import { redirect } from "@/i18n/navigation";

/** Kayıt artık fiyatlandırma sayfasından paket seçilerek yapılır. */
export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/pricing", locale });
}
