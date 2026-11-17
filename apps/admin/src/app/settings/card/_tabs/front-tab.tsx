"use client";

import {
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  inputClassName,
} from "../../../../components/ui";

type FrontTabProps = {
  showStampField: boolean;
  setShowStampField: (v: boolean) => void;
  showRewardField: boolean;
  setShowRewardField: (v: boolean) => void;
  showStatusField: boolean;
  setShowStatusField: (v: boolean) => void;
  showBroadcastField: boolean;
  setShowBroadcastField: (v: boolean) => void;
  stampFieldLabel: string;
  setStampFieldLabel: (v: string) => void;
  rewardFieldLabel: string;
  setRewardFieldLabel: (v: string) => void;
  statusFieldLabel: string;
  setStatusFieldLabel: (v: string) => void;
  headerFieldLabel: string;
  setHeaderFieldLabel: (v: string) => void;
  broadcastFieldLabel: string;
  setBroadcastFieldLabel: (v: string) => void;
  broadcastEmptyText: string;
  setBroadcastEmptyText: (v: string) => void;
  rewardReadyText: string;
  setRewardReadyText: (v: string) => void;
  stampsRemainingTemplate: string;
  setStampsRemainingTemplate: (v: string) => void;
};

export function FrontTab({
  showStampField,
  setShowStampField,
  showRewardField,
  setShowRewardField,
  showStatusField,
  setShowStatusField,
  showBroadcastField,
  setShowBroadcastField,
  stampFieldLabel,
  setStampFieldLabel,
  rewardFieldLabel,
  setRewardFieldLabel,
  statusFieldLabel,
  setStatusFieldLabel,
  headerFieldLabel,
  setHeaderFieldLabel,
  broadcastFieldLabel,
  setBroadcastFieldLabel,
  broadcastEmptyText,
  setBroadcastEmptyText,
  rewardReadyText,
  setRewardReadyText,
  stampsRemainingTemplate,
  setStampsRemainingTemplate,
}: FrontTabProps) {
  return (
    <Panel>
      <PanelHeader
        step={3}
        title="Ön yüz metinleri"
        description="Header, Wallet yığınında (kartlar üst üste) sağ üstte görünür. İstemediğin alanları kapatabilirsin."
      />
      <div className="space-y-4">
        <SoftBox>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Ön yüzde göster
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["Damga", showStampField, setShowStampField],
                ["Ödül", showRewardField, setShowRewardField],
                ["Durum", showStatusField, setShowStatusField],
                ["Duyuru", showBroadcastField, setShowBroadcastField],
              ] as const
            ).map(([label, on, set]) => (
              <label
                key={label}
                className={`flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-2.5 text-sm transition ${
                  on
                    ? "border-[var(--accent)]/30 bg-[var(--panel)] shadow-[var(--shadow-sm)]"
                    : "border-[var(--line)] bg-[var(--panel)]/60 opacity-70"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => set(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            Duyuru kapalıysa kilit ekranı bildirimi yine çalışır (arka yüzde
            tutulur).
          </p>
        </SoftBox>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Damga alanı etiketi">
            <input
              className={inputClassName()}
              value={stampFieldLabel}
              onChange={(e) => setStampFieldLabel(e.target.value)}
              disabled={!showStampField}
            />
          </Field>
          <Field label="Ödül alanı etiketi">
            <input
              className={inputClassName()}
              value={rewardFieldLabel}
              onChange={(e) => setRewardFieldLabel(e.target.value)}
              disabled={!showRewardField}
            />
          </Field>
          <Field label="Durum alanı etiketi">
            <input
              className={inputClassName()}
              value={statusFieldLabel}
              onChange={(e) => setStatusFieldLabel(e.target.value)}
              disabled={!showStatusField}
            />
          </Field>
          <Field label="Header etiketi (opsiyonel)">
            <input
              className={inputClassName()}
              value={headerFieldLabel}
              onChange={(e) => setHeaderFieldLabel(e.target.value)}
              placeholder="Boş = header yok · örn. DAMGA"
            />
          </Field>
          <Field label="Duyuru alanı etiketi">
            <input
              className={inputClassName()}
              value={broadcastFieldLabel}
              onChange={(e) => setBroadcastFieldLabel(e.target.value)}
              placeholder="NOTICE veya DUYURU"
              disabled={!showBroadcastField}
            />
          </Field>
          <Field label="Duyuru yokken metin">
            <input
              className={inputClassName()}
              value={broadcastEmptyText}
              onChange={(e) => setBroadcastEmptyText(e.target.value)}
              placeholder="No announcement / Yeni duyuru yok"
              disabled={!showBroadcastField}
            />
          </Field>
        </div>
        <SoftBox>
          <div className="space-y-3">
            <Field label="Ödül hazır metni">
              <input
                className={inputClassName()}
                value={rewardReadyText}
                onChange={(e) => setRewardReadyText(e.target.value)}
              />
            </Field>
            <Field label="Kalan damga şablonu">
              <input
                className={inputClassName()}
                value={stampsRemainingTemplate}
                onChange={(e) => setStampsRemainingTemplate(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {"{remaining}"} otomatik kalan sayıya dönüşür.
              </p>
            </Field>
          </div>
        </SoftBox>
      </div>
    </Panel>
  );
}
