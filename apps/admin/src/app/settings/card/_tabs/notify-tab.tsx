"use client";

import {
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  inputClassName,
} from "../../../../components/ui";
import { IconUploadField } from "./shared-fields";
import type { BarcodeFormat } from "./types";
import { BARCODE_OPTIONS } from "../../../reward/_panels/wallet-types";

type NotifyTabProps = {
  notifyIconUrl: string;
  setNotifyIconUrl: (v: string) => void;
  stampChangeMessage: string;
  setStampChangeMessage: (v: string) => void;
  rewardChangeMessage: string;
  setRewardChangeMessage: (v: string) => void;
  statusChangeMessage: string;
  setStatusChangeMessage: (v: string) => void;
  headerChangeMessage: string;
  setHeaderChangeMessage: (v: string) => void;
  headerFieldLabel: string;
  barcodeFormat: BarcodeFormat;
  setBarcodeFormat: (v: BarcodeFormat) => void;
  primaryColor: string;
  uploadBusy: string | null;
  setUploadBusy: (v: string | null) => void;
  setError: (msg: string | null) => void;
};

export function NotifyTab({
  notifyIconUrl,
  setNotifyIconUrl,
  stampChangeMessage,
  setStampChangeMessage,
  rewardChangeMessage,
  setRewardChangeMessage,
  statusChangeMessage,
  setStatusChangeMessage,
  headerChangeMessage,
  setHeaderChangeMessage,
  headerFieldLabel,
  barcodeFormat,
  setBarcodeFormat,
  primaryColor,
  uploadBusy,
  setUploadBusy,
  setError,
}: NotifyTabProps) {
  return (
    <Panel>
      <PanelHeader
        step={5}
        title="Bildirim & barkod"
        description={`Kilit ekranı metinleri olaya göre tek bildirim gönderir: damga, ödül hazır veya ödül kullanıldı. %@ yeni değere dönüşür.`}
      />
      <div className="space-y-4">
        <IconUploadField
          label="Bildirim ikonu"
          hint="Kilit ekranı / bildirim — kare PNG"
          value={notifyIconUrl}
          onUploaded={setNotifyIconUrl}
          onClear={() => setNotifyIconUrl("")}
          slot="icon"
          busy={uploadBusy}
          setBusy={setUploadBusy}
          onError={(msg) => setError(msg || null)}
        />
        <SoftBox>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Değişim mesajları
          </p>
          <div className="space-y-3">
            <Field label="Damga bildirim metni">
              <input
                className={inputClassName()}
                value={stampChangeMessage}
                onChange={(e) => setStampChangeMessage(e.target.value)}
                placeholder="Damga güncellendi: %@"
              />
            </Field>
            <Field label="Ödül bildirim metni">
              <input
                className={inputClassName()}
                value={rewardChangeMessage}
                onChange={(e) => setRewardChangeMessage(e.target.value)}
                placeholder="Ödül: %@"
              />
            </Field>
            <Field label="Durum bildirim metni">
              <input
                className={inputClassName()}
                value={statusChangeMessage}
                onChange={(e) => setStatusChangeMessage(e.target.value)}
                placeholder="%@"
              />
            </Field>
            {headerFieldLabel.trim() ? (
              <Field label="Header bildirim metni">
                <input
                  className={inputClassName()}
                  value={headerChangeMessage}
                  onChange={(e) => setHeaderChangeMessage(e.target.value)}
                  placeholder="Damga: %@"
                />
              </Field>
            ) : null}
          </div>
        </SoftBox>
        <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3">
          <p className="text-sm font-medium text-[var(--ink)]">Barkod türü</p>
          <p className="text-xs text-[var(--muted)]">Müşterinin telefonunda kartın altında görünür. Kasiyer bu kodu okutur.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Kasada okutulacak kod">
            {BARCODE_OPTIONS.map((opt) => {
              const active = barcodeFormat === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setBarcodeFormat(opt.id)}
                  className={`rounded-lg border px-3 py-2 text-left transition ${active ? "border-[var(--ink)] bg-[var(--surface)] ring-1 ring-[var(--ink)]/20" : "border-[var(--line)] hover:bg-[var(--surface)]"}`}
                >
                  <span className="block text-[0.8125rem] font-semibold text-[var(--ink)]">{opt.label}</span>
                  <span className="block text-[0.6875rem] text-[var(--muted)]">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}
