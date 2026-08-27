"use client";

import Link from "next/link";
import {
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  btnGhost,
  btnPrimary,
} from "../../../components/ui";

const STEPS = [
  {
    title: "1 · Yeni kafe oluştur",
    body: "Kafe adı, slug ve sahip hesabı ile tenant aç. Sahip otomatik STORE_OWNER rolü alır.",
    href: "/tenants",
    cta: "Kafeler",
  },
  {
    title: "2 · Aboneliği ayarla",
    body: "Deneme, aktif, askıda veya iptal durumunu seç. Manuel ödeme alındığında ACTIVE yap.",
    href: "/platform/subscriptions",
    cta: "Abonelikler",
  },
  {
    title: "3 · Dondur / aç",
    body: "Ödeme gecikmesi veya ihlal durumunda tenant’ı dondur; müşteri damgası durur.",
    href: "/tenants",
    cta: "Kafe listesi",
  },
  {
    title: "4 · Lead’leri işle",
    body: "İletişim formu ve self-serve kayıtlardan gelen talepleri Lead’ler ekranından takip et.",
    href: "/platform/leads",
    cta: "Lead’ler",
  },
  {
    title: "5 · Platform özetini izle",
    body: "Günlük damga, MRR ve dikkat gerektiren hesapları Özet ekranından takip et.",
    href: "/platform",
    cta: "Özet",
  },
] as const;

const FAQ = [
  {
    q: "SUPER_ADMIN bir kafenin paneline girebilir mi?",
    a: "Hayır — her kafe kendi tenant verisiyle çalışır. Platform yönetimi burada; operasyon sahibin panelindedir.",
  },
  {
    q: "MRR nasıl hesaplanıyor?",
    a: "Sadece ACTIVE durumdaki tenant’ların planPriceTry değerleri toplanır. Deneme ve askıdakiler dahil değildir.",
  },
  {
    q: "Tenant dondurulunca ne olur?",
    a: "API tenant guard’ı engeller; kasiyer damga basamaz, Wallet güncellemeleri durur. Açınca devam eder.",
  },
  {
    q: "Slug değiştirilebilir mi?",
    a: "MVP’de slug oluşturma anında sabitlenir. Wallet URL’leri slug’a bağlı olduğu için dikkatli olun.",
  },
] as const;

export default function PlatformHelpPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <div className="w-full space-y-6">
        <PageHeader
          eyebrow="Destek"
          title="Platform yardımı"
          subtitle="Tenant oluşturma, abonelik ve operasyon rehberi."
          actions={
            <Link href="/platform" className={btnGhost()}>
              ← Özet
            </Link>
          }
        />

        <Panel>
          <PanelHeader
            title="Başlangıç adımları"
            description="Yeni bir kafe onboard etmek için sıra"
          />
          <ol className="mt-2 space-y-4">
            {STEPS.map((step) => (
              <li
                key={step.title}
                className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-[var(--ink)]">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                    {step.body}
                  </p>
                </div>
                <Link href={step.href} className={`${btnPrimary()} shrink-0`}>
                  {step.cta}
                </Link>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel>
          <PanelHeader title="Sık sorulan sorular" />
          <dl className="mt-2 space-y-4">
            {FAQ.map((item) => (
              <SoftBox key={item.q}>
                <dt className="font-semibold text-[var(--ink)]">{item.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                  {item.a}
                </dd>
              </SoftBox>
            ))}
          </dl>
        </Panel>

        <SoftBox>
          <p className="text-sm text-[var(--muted)]">
            Teknik sorun veya ödeme entegrasyonu için geliştirici ekiple
            iletişime geç. iyzico otomasyonu yakında tenant sahiplerinin
            Abonelik sayfasına eklenecek.
          </p>
        </SoftBox>
      </div>
    </RequireAuth>
  );
}
