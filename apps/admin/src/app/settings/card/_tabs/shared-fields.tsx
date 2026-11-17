"use client";

import { Field, inputClassName } from "../../../../components/ui";
import { ApiError, apiUpload } from "../../../../lib/api";
import { resolveAdminAssetUrl } from "../../../../lib/public-urls";
import type { AssetSlot } from "./types";

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-[var(--line)] bg-[var(--panel)]"
        />
        <input
          className={inputClassName()}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
          required
        />
      </div>
    </Field>
  );
}

export function IconUploadField({
  label,
  hint,
  value,
  onUploaded,
  onClear,
  slot,
  busy,
  setBusy,
  onError,
}: {
  label: string;
  hint?: string;
  value: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
  slot: AssetSlot;
  busy: string | null;
  setBusy: (s: string | null) => void;
  onError: (msg: string) => void;
}) {
  const uploading = busy === slot;
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveAdminAssetUrl(value)}
              alt=""
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <span className="text-xs text-[var(--muted)]">—</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm hover:bg-[var(--surface)]">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="sr-only"
              disabled={!!busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(slot);
                onError("");
                try {
                  const res = await apiUpload<{ url: string }>(
                    `/tenants/me/assets?slot=${slot}`,
                    file,
                  );
                  onUploaded(res.url);
                } catch (err) {
                  onError(
                    err instanceof ApiError
                      ? err.message
                      : "Yükleme başarısız",
                  );
                } finally {
                  setBusy(null);
                }
              }}
            />
            {uploading ? "Yükleniyor…" : value ? "Değiştir" : "Dosya seç"}
          </label>
          {value ? (
            <button
              type="button"
              className="text-xs text-[var(--muted)] underline"
              onClick={onClear}
              disabled={!!busy}
            >
              Kaldır
            </button>
          ) : null}
          {hint ? (
            <p className="text-[11px] text-[var(--muted)]">{hint}</p>
          ) : null}
        </div>
      </div>
    </Field>
  );
}

export function LabelValuePair({
  labelTitle,
  valueTitle,
  label,
  value,
  onLabel,
  onValue,
  rows = 1,
  labelPlaceholder,
  valuePlaceholder,
}: {
  labelTitle: string;
  valueTitle: string;
  label: string;
  value: string;
  onLabel: (v: string) => void;
  onValue: (v: string) => void;
  rows?: number;
  labelPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
      <Field label={labelTitle}>
        <input
          className={inputClassName()}
          value={label}
          onChange={(e) => onLabel(e.target.value)}
          placeholder={labelPlaceholder}
        />
      </Field>
      <Field label={valueTitle}>
        {rows > 1 ? (
          <textarea
            className={inputClassName() + " min-h-20"}
            value={value}
            onChange={(e) => onValue(e.target.value)}
            placeholder={valuePlaceholder}
            rows={rows}
          />
        ) : (
          <input
            className={inputClassName()}
            value={value}
            onChange={(e) => onValue(e.target.value)}
            placeholder={valuePlaceholder}
          />
        )}
      </Field>
    </div>
  );
}
