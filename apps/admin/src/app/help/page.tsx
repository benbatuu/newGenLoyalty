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
} from "../../components/ui";

const STEPS = [
  {
    title: "1 · Davet sayfasını ayarla",
    body: "Kafe adı, iletişim, davet metinleri, form alanları ve KVKK politikalarını düzenle.",
    href: "/business",
    cta: "Davet sayfası",
  },
  {
    title: "2 · Ödül kuralını ayarla",
    body: "Örn. 10 damga → 1 bedava kahve. Tüm kasiyerler ve kartlar bu kurala bağlanır.",
    href: "/reward",
    cta: "Ödül kuralı",
  },
  {
    title: "3 · Kartı tasarla",
    body: "Logo, renk, damga ikonu ve ön yüz alanlarını seç. Canlı önizleme ile kontrol et.",
    href: "/settings",
    cta: "Kart tasarımı",
  },
  {
    title: "4 · Kasiyer ekle",
    body: "Personeline e-posta ve geçici şifre ver. Tezgâh ekranından damga basabilirler.",
    href: "/staff",
    cta: "Kasiyerler",
  },
  {
    title: "5 · Müşteri kaydet",
    body: "Tezgâhta telefon ile ara veya yeni kayıt al. Müşteriye Wallet ekleme linki SMS ile gider.",
    href: "/counter",
    cta: "Tezgâh",
  },
  {
    title: "6 · Duyuru gönder",
    body: "Kampanya veya saat değişikliğini Wallet kilit ekranına düşür.",
    href: "/notifications",
    cta: "Bildirimler",
  },
] as const;

const FAQ = [
  {
    q: "Müşteri uygulama indirmek zorunda mı?",
    a: "Hayır. Kart Apple / Google Wallet’ta yaşar. Müşteri paneli yoktur.",
  },
  {
    q: "Damga nasıl basılır?",
    a: "Tezgâh’ta telefon ara → Damga ekle. Müşteri başına günde en fazla 1 damga verilir (1 ziyaret = 1 damga). Ödül hazırsa önce Ödül kullan.",
  },
  {
    q: "Kart güncellenmiyor gibi duruyor?",
    a: "Tünel / API URL değiştiyse eski kart güncellenemez. Wallet’tan silip davet linkiyle yeniden ekletin.",
  },
  {
    q: "Damga bildirimi Türkçe geliyor, değiştirebilir miyim?",
    a: "Evet. Ödül kuralı sayfasında “Wallet bildirim metinleri” bölümünden damga ve durum metinlerini özelleştir. %@ yeni değerle değiştirilir. İngilizce örnek: Stamp updated: %@ ve {remaining} stamps left.",
  },
  {
    q: "Aboneliğimi nasıl değiştiririm?",
    a: "MVP’de ödeme manuel. Abonelik sayfasından durumu görürsünüz; değişiklik için destek ile iletişime geçin.",
  },
] as const;

export default function HelpPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <div className="w-full space-y-6">
        <PageHeader
          eyebrow="Destek"
          title="Yardım"
          subtitle="Sistemi 6 adımda ayağa kaldır. Takıldığın yerde SSS’e bak."
          actions={
            <Link href="/counter" className={btnPrimary()}>
              Tezgâha git
            </Link>
          }
        />

        <SoftBox>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Dokun &amp; Kazan, kafeler için Wallet tabanlı damga kartıdır. Müşteriye
            app indirtmezsiniz; personel tezgâhtan damga basar, kart telefonda
            güncellenir.
          </p>
        </SoftBox>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {STEPS.map((step) => (
            <Panel key={step.href}>
              <h2 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {step.body}
              </p>
              <Link href={step.href} className={`${btnGhost()} mt-4`}>
                {step.cta} →
              </Link>
            </Panel>
          ))}
        </div>

        <Panel>
          <PanelHeader title="Sık sorulanlar" />
          <dl className="space-y-4">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="border-b border-[var(--line)] pb-4 last:border-0 last:pb-0"
              >
                <dt className="font-semibold text-[var(--ink)]">{item.q}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>

        <SoftBox className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Destek
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">
              destek@dokunkazan.com
            </p>
          </div>
          <Link href="/billing" className={btnGhost()}>
            Aboneliğime bak
          </Link>
        </SoftBox>
      </div>
    </RequireAuth>
  );
}
