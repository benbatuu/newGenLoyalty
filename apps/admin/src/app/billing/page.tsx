"use client";

import {
  Badge,
  ErrorBanner,
  FormSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
} from "../../components/ui";
import { useApiQuery } from "../../lib/use-api-query";

type BillingTenant = {
  name: string;
  planCode: string;
  planPriceTry: number;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "CANCELLED" | "SUSPENDED";
  subscriptionActivatedAt: string | null;
  isActive: boolean;
  createdAt: string;
};

const STATUS_COPY: Record<
  BillingTenant["subscriptionStatus"],
  { label: string; tone: "success" | "warning" | "danger" | "neutral"; hint: string }
> = {
  TRIAL: {
    label: "Deneme",
    tone: "warning",
    hint: "Ücretsiz deneme sürecindesiniz. Aktif paket için destek ile iletişime geçin.",
  },
  ACTIVE: {
    label: "Aktif",
    tone: "success",
    hint: "Aboneliğiniz aktif. Tüm özellikler kullanılabilir.",
  },
  CANCELLED: {
    label: "İptal",
    tone: "danger",
    hint: "Abonelik iptal edilmiş. Yeniden açmak için destek ile konuşun.",
  },
  SUSPENDED: {
    label: "Askıda",
    tone: "warning",
    hint: "Hesap geçici olarak askıya alınmış. Destek ekibi yardımcı olur.",
  },
};

export default function BillingPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <BillingContent />
    </RequireAuth>
  );
}

function BillingContent() {
  const { data, error, loading } = useApiQuery<BillingTenant>(
    "settings:me",
    "/tenants/me",
    { ttlMs: 60_000 },
  );

  if (loading && !data) {
    return <FormSkeleton rows={3} />;
  }

  const status = data?.subscriptionStatus ?? "TRIAL";
  const copy = STATUS_COPY[status];

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="İşletme"
        title="Abonelik"
        subtitle="Paketinizi ve hesap durumunuzu görün. Ödeme entegrasyonu yakında; şimdilik manuel aktivasyon."
      />
      <ErrorBanner message={error} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            İşletme
          </p>
          <p className="mt-1 font-medium text-[var(--ink)]">{data?.name ?? "—"}</p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Paket
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl capitalize">
            {data?.planCode ?? "cafe"}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Aylık ücret
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">
            ₺{data?.planPriceTry ?? 990}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Durum
          </p>
          <div className="mt-2">
            <Badge tone={copy.tone}>{copy.label}</Badge>
          </div>
        </SoftBox>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Paket özeti" />
          <ul className="space-y-3 text-sm text-[var(--ink)]">
            <li className="flex justify-between gap-3 border-b border-[var(--line)] pb-3">
              <span className="text-[var(--muted)]">Plan kodu</span>
              <span className="font-medium capitalize">{data?.planCode}</span>
            </li>
            <li className="flex justify-between gap-3 border-b border-[var(--line)] pb-3">
              <span className="text-[var(--muted)]">Ücret</span>
              <span className="font-medium tabular-nums">
                ₺{data?.planPriceTry}/ay
              </span>
            </li>
            <li className="flex justify-between gap-3 border-b border-[var(--line)] pb-3">
              <span className="text-[var(--muted)]">Aktivasyon</span>
              <span className="font-medium">
                {data?.subscriptionActivatedAt
                  ? new Date(data.subscriptionActivatedAt).toLocaleDateString(
                      "tr-TR",
                    )
                  : "Henüz aktifleştirilmedi"}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-[var(--muted)]">Hesap açılışı</span>
              <span className="font-medium">
                {data?.createdAt
                  ? new Date(data.createdAt).toLocaleDateString("tr-TR")
                  : "—"}
              </span>
            </li>
          </ul>
        </Panel>

        <Panel>
          <PanelHeader title="Ne dahil?" />
          <ul className="space-y-2.5 text-sm text-[var(--ink)]">
            {[
              "Sınırsız müşteri kaydı",
              "Apple Wallet damga kartı",
              "Kasiyer hesapları",
              "Anlık Wallet bildirimi",
              "Raporlar & özet paneli",
              "Kart tasarımı özelleştirme",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                {item}
              </li>
            ))}
          </ul>
          <SoftBox className="mt-5">
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {copy.hint}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Faturalama soruları için:{" "}
              <span className="font-medium text-[var(--ink)]">
                destek@dokunkazan.com
              </span>
            </p>
          </SoftBox>
        </Panel>
      </div>
    </div>
  );
}
