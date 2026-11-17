"use client";

import { Field, btnGhost, inputClassName } from "../../../components/ui";
import { ApiError, apiUpload } from "../../../lib/api";
import { resolveAdminAssetUrl } from "../../../lib/public-urls";
import type { AssetSlot } from "./wallet-types";

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
  busyKey,
  busy,
  setBusy,
  onError,
  programId,
}: {
  label: string;
  hint?: string;
  value: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
  slot: AssetSlot;
  busyKey?: string;
  busy: string | null;
  setBusy: (s: string | null) => void;
  onError: (msg: string) => void;
  programId?: string;
}) {
  const busyId = busyKey ?? slot;
  const uploading = busy === busyId;
  return (
    <Field label={label}>
      {hint && <p className="mb-1.5 text-[11px] text-[var(--muted)]">{hint}</p>}
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
                setBusy(busyId);
                onError("");
                try {
                  const q = new URLSearchParams({ slot });
                  if (programId) q.set("programId", programId);
                  const res = await apiUpload<{ url: string }>(
                    `/tenants/me/assets?${q.toString()}`,
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
            {uploading ? "Yükleniyor…" : "Dosya seç"}
          </label>
          {value && (
            <button type="button" className={btnGhost()} onClick={onClear}>
              Kaldır
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}
