"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Badge,
  ErrorBanner,
  FormSkeleton,
  Panel,
  PanelHeader,
  SoftBox,
  SuccessBanner,
  btnGhost,
  btnPrimary,
} from "../../components/ui";
import { ApiError, api, updateSessionSubscription } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";
import { refreshSessionData } from "../../lib/session-data";
import { SettingsSectionHeader } from "../settings/_components/settings-section-header";

type BillingTenant = {
  name: string;
  planCode: string;
  planPriceTry: number;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "CANCELLED" | "SUSPENDED";
  subscriptionActivatedAt: string | null;
  isActive: boolean;
  createdAt: string;
};

type SubscriptionSnapshot = {
  status: BillingTenant["subscriptionStatus"];
  isActive: boolean;
  daysRemaining: number;
  accessEndsAt: string | null;
  periodEndsAt: string | null;
  cancelledAt: string | null;
  suspendedAt: string | null;
  suspendUntil: string | null;
  frozenDaysRemaining: number | null;
  canCancel: boolean;
  canSuspend: boolean;
  canReactivate: boolean;
  needsReactivation: boolean;
  loginBlocked: boolean;
  loginBlockReason: string | null;
};

const STATUS_COPY: Record<
  BillingTenant["subscriptionStatus"],
  { label: string; tone: "success" | "warning" | "danger" | "neutral" }
> = {
  TRIAL: { label: "Deneme", tone: "warning" },
  ACTIVE: { label: "Aktif", tone: "success" },
  CANCELLED: { label: "İptal edildi", tone: "warning" },
  SUSPENDED: { label: "Askıda", tone: "danger" },
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BillingPage() {
  return <BillingRedirect />;
}

function BillingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings/billing");
  }, [router]);
  return null;
}

export function BillingSettingsPanel() {
  const router = useRouter();
  const { data, error, loading, reload } = useApiQuery<BillingTenant>(
    "settings:me",
    "/tenants/me",
  );
  const {
    data: sub,
    error: subError,
    loading: subLoading,
    reload: reloadSub,
  } = useApiQuery<SubscriptionSnapshot>(
    "subscription:snapshot",
    "/tenants/me/subscription",
  );

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!sub) return;
    updateSessionSubscription(sub);
    if (sub.needsReactivation && typeof window !== "undefined") {
      sessionStorage.setItem("subscription:needsReactivation", "1");
    } else {
      sessionStorage.removeItem("subscription:needsReactivation");
    }
  }, [sub]);

  async function runAction(
    key: string,
    path: string,
    confirmMsg: string,
  ) {
    if (!window.confirm(confirmMsg)) return;
    setBusy(key);
    setActionError(null);
    setActionOk(null);
    try {
      const result = await api<SubscriptionSnapshot>(path, { method: "POST" });
      await Promise.all([reload(true), reloadSub(true)]);
      refreshSessionData("plan"); // menüdeki paket bilgisi de tazelensin
      if (path.includes("suspend")) {
        setActionOk(
          "Hesap askıya alındı. 90 gün içinde geri dönerseniz kalan günleriniz korunur.",
        );
        updateSessionSubscription(result);
        router.replace("/login");
        return;
      }
      if (path.includes("cancel")) {
        setActionOk(
          `Abonelik iptal edildi. ${result.daysRemaining} gün daha kullanabilirsiniz.`,
        );
      }
      if (path.includes("reactivate")) {
        setActionOk(
          `Hesap yeniden açıldı. ${result.daysRemaining} gün kullanım hakkınız var.`,
        );
        sessionStorage.removeItem("subscription:needsReactivation");
        updateSessionSubscription(result);
        router.replace("/reports");
      }
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "İşlem tamamlanamadı",
      );
    } finally {
      setBusy(null);
    }
  }

  if ((loading && !data) || (subLoading && !sub)) {
    return <FormSkeleton rows={3} />;
  }

  const status = sub?.status ?? data?.subscriptionStatus ?? "TRIAL";
  const copy = STATUS_COPY[status];

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Paket & abonelik"
        subtitle="Planınızı yönetin, iptal edin veya hesabı geçici olarak askıya alın."
        help="İptal sonrası kalan günleriniz dolana kadar kullanmaya devam edersiniz. Askıya almada 90 gün içinde dönerseniz dondurulan günleriniz geri yüklenir."
      />
      <ErrorBanner message={error || subError || actionError} />
      <SuccessBanner message={actionOk} />

      {sub?.needsReactivation ? (
        <SoftBox className="border-amber-500/30 bg-amber-500/10">
          <p className="font-medium text-[var(--ink)]">Hesabınız askıda</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {sub.frozenDaysRemaining ?? 0} günlük kullanım hakkınız donduruldu.
            {sub.suspendUntil
              ? ` ${formatDate(sub.suspendUntil)} tarihine kadar yeniden açabilirsiniz.`
              : null}
          </p>
          <button
            type="button"
            className={`${btnPrimary()} mt-4`}
            disabled={busy === "reactivate"}
            onClick={() =>
              void runAction(
                "reactivate",
                "/tenants/me/subscription/reactivate",
                "Hesabı yeniden açmak istediğinize emin misiniz?",
              )
            }
          >
            {busy === "reactivate" ? "Açılıyor…" : "Hesabı yeniden aç"}
          </button>
        </SoftBox>
      ) : null}

      {status === "CANCELLED" && sub && sub.daysRemaining > 0 ? (
        <SoftBox className="border-amber-500/20 bg-amber-500/5">
          <p className="text-sm text-[var(--ink)]">
            Abonelik iptal edildi.{" "}
            <span className="font-semibold">{sub.daysRemaining} gün</span> daha
            kullanabilirsiniz ({formatDate(sub.accessEndsAt)}).
          </p>
        </SoftBox>
      ) : null}

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
            Kalan gün
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">
            {sub?.daysRemaining ?? "—"}
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
          <PanelHeader title="Dönem bilgisi" />
          <ul className="space-y-3 text-sm text-[var(--ink)]">
            <li className="flex justify-between gap-3 border-b border-[var(--line)] pb-3">
              <span className="text-[var(--muted)]">Dönem bitişi</span>
              <span className="font-medium">{formatDate(sub?.periodEndsAt)}</span>
            </li>
            <li className="flex justify-between gap-3 border-b border-[var(--line)] pb-3">
              <span className="text-[var(--muted)]">Aylık ücret</span>
              <span className="font-medium tabular-nums">
                ₺{data?.planPriceTry ?? 990}/ay
              </span>
            </li>
            <li className="flex justify-between gap-3 border-b border-[var(--line)] pb-3">
              <span className="text-[var(--muted)]">Aktivasyon</span>
              <span className="font-medium">
                {formatDate(data?.subscriptionActivatedAt)}
              </span>
            </li>
            {sub?.cancelledAt ? (
              <li className="flex justify-between gap-3 border-b border-[var(--line)] pb-3">
                <span className="text-[var(--muted)]">İptal tarihi</span>
                <span className="font-medium">{formatDate(sub.cancelledAt)}</span>
              </li>
            ) : null}
            {sub?.suspendedAt ? (
              <li className="flex justify-between gap-3">
                <span className="text-[var(--muted)]">Askıya alma</span>
                <span className="font-medium">{formatDate(sub.suspendedAt)}</span>
              </li>
            ) : null}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader title="Hesap işlemleri" />
          <div className="space-y-4 text-sm">
            {sub?.canCancel ? (
              <div className="rounded-[var(--radius-sm)] border border-[var(--line)] p-4">
                <p className="font-medium text-[var(--ink)]">Aboneliği iptal et</p>
                <p className="mt-1 text-[var(--muted)]">
                  Kalan {sub.daysRemaining} gün boyunca kullanmaya devam edersiniz.
                  Süre bitince hesaba giriş kapanır.
                </p>
                <button
                  type="button"
                  className={`${btnGhost()} mt-3`}
                  disabled={!!busy}
                  onClick={() =>
                    void runAction(
                      "cancel",
                      "/tenants/me/subscription/cancel",
                      `Aboneliği iptal etmek istediğinize emin misiniz? ${sub.daysRemaining} gün daha kullanabileceksiniz.`,
                    )
                  }
                >
                  {busy === "cancel" ? "İşleniyor…" : "Aboneliği iptal et"}
                </button>
              </div>
            ) : null}

            {sub?.canSuspend ? (
              <div className="rounded-[var(--radius-sm)] border border-[var(--line)] p-4">
                <p className="font-medium text-[var(--ink)]">Hesabı askıya al</p>
                <p className="mt-1 text-[var(--muted)]">
                  Hesap hemen kapanır. Kalan {sub.daysRemaining} gün dondurulur.
                  90 gün içinde dönerseniz kaldığınız yerden devam edersiniz.
                </p>
                <button
                  type="button"
                  className={`${btnGhost()} mt-3`}
                  disabled={!!busy}
                  onClick={() =>
                    void runAction(
                      "suspend",
                      "/tenants/me/subscription/suspend",
                      "Hesabı askıya almak istediğinize emin misiniz? Oturumunuz kapanacak.",
                    )
                  }
                >
                  {busy === "suspend" ? "Askıya alınıyor…" : "Hesabı askıya al"}
                </button>
              </div>
            ) : null}

            {!sub?.canCancel && !sub?.canSuspend && !sub?.canReactivate ? (
              <p className="text-[var(--muted)]">
                Bu hesap için şu an yapılabilecek bir işlem yok.
              </p>
            ) : null}

            <Link href="/settings/account" className={btnGhost()}>
              Profil ayarları →
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
