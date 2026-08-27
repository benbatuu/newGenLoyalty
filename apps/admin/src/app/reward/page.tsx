"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ErrorBanner,
  Field,
  FormSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { bustCache, useApiQuery } from "../../lib/use-api-query";

type TenantReward = {
  rewardRule: {
    stampsRequired: number;
    rewardLabel: string;
  } | null;
  rewardReadyText: string | null;
  stampsRemainingTemplate: string | null;
  stampChangeMessage: string | null;
  statusChangeMessage: string | null;
  rewardChangeMessage: string | null;
  redeemChangeMessage: string | null;
};

function formatNotifyPreview(template: string, sample: string): string {
  const t = template.trim() || "%@";
  return t.includes("%@") ? t.replace(/%@/g, sample) : `${t} ${sample}`;
}

export default function RewardPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <RewardContent />
    </RequireAuth>
  );
}

function RewardContent() {
  const { data, error: loadError, loading, reload } = useApiQuery<TenantReward>(
    "settings:me",
    "/tenants/me",
    { ttlMs: 60_000 },
  );

  const [stampsRequired, setStampsRequired] = useState(10);
  const [rewardLabel, setRewardLabel] = useState("1 bedava kahve");
  const [rewardReadyText, setRewardReadyText] = useState("Ödül hazır!");
  const [remainingTpl, setRemainingTpl] = useState("{remaining} damga kaldı");
  const [stampChangeMessage, setStampChangeMessage] = useState(
    "Damga güncellendi: %@",
  );
  const [rewardChangeMessage, setRewardChangeMessage] = useState("Ödül hazır: %@");
  const [redeemChangeMessage, setRedeemChangeMessage] = useState(
    "Ödül kullanıldı: %@",
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setStampsRequired(data.rewardRule?.stampsRequired ?? 10);
    setRewardLabel(data.rewardRule?.rewardLabel ?? "1 bedava kahve");
    setRewardReadyText(data.rewardReadyText ?? "Ödül hazır!");
    setRemainingTpl(
      data.stampsRemainingTemplate ?? "{remaining} damga kaldı",
    );
    setStampChangeMessage(
      data.stampChangeMessage ?? "Damga güncellendi: %@",
    );
    setRewardChangeMessage(data.rewardChangeMessage ?? "Ödül hazır: %@");
    setRedeemChangeMessage(
      data.redeemChangeMessage ?? "Ödül kullanıldı: %@",
    );
  }, [data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const [design] = await Promise.all([
        api<{ walletSync?: { synced: number } }>("/tenants/me", {
          method: "PATCH",
          body: JSON.stringify({
            rewardReadyText: rewardReadyText.trim() || null,
            stampsRemainingTemplate: remainingTpl.trim() || null,
            stampChangeMessage: stampChangeMessage.trim() || null,
            rewardChangeMessage: rewardChangeMessage.trim() || null,
            redeemChangeMessage: redeemChangeMessage.trim() || null,
          }),
        }),
        api("/tenants/me/reward-rule", {
          method: "PATCH",
          body: JSON.stringify({
            stampsRequired,
            rewardLabel: rewardLabel.trim(),
          }),
        }),
      ]);
      const synced = design.walletSync?.synced ?? 0;
      setOk(
        synced > 0
          ? `Kaydedildi · ${synced} Wallet kartı güncellendi`
          : "Kaydedildi · bir sonraki damgada yeni bildirim metni kullanılır",
      );
      bustCache("settings");
      bustCache("metrics");
      bustCache("reports");
      bustCache("customers");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  const previewFilled = Math.min(3, stampsRequired);
  const previewRemaining = remainingTpl.replace(
    /\{remaining\}/g,
    String(Math.max(stampsRequired - previewFilled, 0)),
  );

  const stampNotifyPreview = useMemo(
    () =>
      formatNotifyPreview(
        stampChangeMessage,
        `${previewFilled} / ${stampsRequired}`,
      ),
    [stampChangeMessage, previewFilled, stampsRequired],
  );

  if (loading && !data) {
    return <FormSkeleton rows={4} />;
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Sadakat programı"
        title="Ödül kuralı"
        subtitle="Müşteri kaç damgada ne kazanır? Wallet bildirim metinlerini de buradan özelleştirebilirsin."
        actions={
          <Link href="/settings?tab=notify" className={btnGhost()}>
            Bildirim ikonu & barkod
          </Link>
        }
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      <form
        onSubmit={save}
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="space-y-5">
          <Panel>
            <PanelHeader
              title="Kural"
              description="MVP’de işletme başına tek ödül kuralı vardır."
            />
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Gerekli damga sayısı">
                  <input
                    className={inputClassName()}
                    type="number"
                    min={1}
                    max={16}
                    value={stampsRequired}
                    onChange={(e) => setStampsRequired(Number(e.target.value))}
                    required
                  />
                </Field>
                <Field label="Ödül metni">
                  <input
                    className={inputClassName()}
                    value={rewardLabel}
                    onChange={(e) => setRewardLabel(e.target.value)}
                    placeholder="1 bedava kahve"
                    required
                  />
                </Field>
              </div>
              <Field label="Ödül hazır metni (kart durumu)">
                <input
                  className={inputClassName()}
                  value={rewardReadyText}
                  onChange={(e) => setRewardReadyText(e.target.value)}
                  placeholder="Ödül hazır!"
                />
              </Field>
              <Field label="Kalan damga şablonu">
                <input
                  className={inputClassName()}
                  value={remainingTpl}
                  onChange={(e) => setRemainingTpl(e.target.value)}
                  placeholder="{remaining} damga kaldı"
                />
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {"{remaining}"} otomatik kalan sayıya dönüşür. İngilizce
                  örnek: {"{remaining} stamps left"}
                </p>
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Wallet bildirim metinleri"
              description="Her olayda tek bildirim gider: normal damga, ödül hazır (10/10) veya ödül kullanımı. %@ yeni değerle değiştirilir."
            />
            <div className="space-y-4">
              <Field label="Damga bildirimi">
                <input
                  className={inputClassName()}
                  value={stampChangeMessage}
                  onChange={(e) => setStampChangeMessage(e.target.value)}
                  placeholder="Damga güncellendi: %@"
                />
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  Örnek (EN): Stamp updated: %@
                </p>
              </Field>
              <Field label="Ödül hazır bildirimi (10/10)">
                <input
                  className={inputClassName()}
                  value={rewardChangeMessage}
                  onChange={(e) => setRewardChangeMessage(e.target.value)}
                  placeholder="Ödül hazır: %@"
                />
              </Field>
              <Field label="Ödül kullanıldı bildirimi">
                <input
                  className={inputClassName()}
                  value={redeemChangeMessage}
                  onChange={(e) => setRedeemChangeMessage(e.target.value)}
                  placeholder="Ödül kullanıldı: %@"
                />
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  Örnek (EN): Reward redeemed: %@ — değer karttaki damga
                  sayısıdır (0 / 10).
                </p>
              </Field>
              <SoftBox>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Önizleme
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-[var(--ink)]">
                  <li>· Damga: {stampNotifyPreview}</li>
                  <li>
                    · Ödül hazır:{" "}
                    {formatNotifyPreview(rewardChangeMessage, rewardReadyText)}
                  </li>
                  <li>
                    · Ödül kullanıldı:{" "}
                    {formatNotifyPreview(redeemChangeMessage, `0 / ${stampsRequired}`)}
                  </li>
                </ul>
              </SoftBox>
            </div>
          </Panel>

          <button type="submit" className={btnPrimary()} disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet ve Wallet’a gönder"}
          </button>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <Panel>
            <PanelHeader title="Örnek kart" />
            <SoftBox className="space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  Program
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-xl">
                  {stampsRequired} damga → {rewardLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  3 damga doluyken durum
                </p>
                <p className="mt-1 text-sm text-[var(--ink)]">
                  {previewRemaining}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  Tamamlanınca
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--accent)]">
                  {rewardReadyText}
                </p>
              </div>
            </SoftBox>
          </Panel>
        </aside>
      </form>
    </div>
  );
}
