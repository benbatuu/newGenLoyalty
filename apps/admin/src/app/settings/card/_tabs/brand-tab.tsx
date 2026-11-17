"use client";

import {
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  inputClassName,
} from "../../../../components/ui";
import { ColorField, IconUploadField } from "./shared-fields";

type BrandTabProps = {
  name: string;
  setName: (v: string) => void;
  logoText: string;
  setLogoText: (v: string) => void;
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  primaryColor: string;
  setPrimaryColor: (v: string) => void;
  foregroundColor: string;
  setForegroundColor: (v: string) => void;
  labelColor: string;
  setLabelColor: (v: string) => void;
  uploadBusy: string | null;
  setUploadBusy: (v: string | null) => void;
  setError: (msg: string | null) => void;
};

export function BrandTab({
  name,
  setName,
  logoText,
  setLogoText,
  logoUrl,
  setLogoUrl,
  primaryColor,
  setPrimaryColor,
  foregroundColor,
  setForegroundColor,
  labelColor,
  setLabelColor,
  uploadBusy,
  setUploadBusy,
  setError,
}: BrandTabProps) {
  return (
    <Panel>
      <PanelHeader
        step={2}
        title="Marka & renkler"
        description="Logo varsa Wallet üstünde yalnızca logo görünür; isim bildirim başlığında kalır."
      />
      <div className="space-y-4">
        <Field label="Kafe adı (organizasyon)">
          <input
            className={inputClassName()}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field label="Kart üst yazısı (logo yokken)">
          <input
            className={inputClassName()}
            value={logoText}
            onChange={(e) => setLogoText(e.target.value)}
            placeholder={name || "Boşsa kafe adı"}
          />
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Logo yüklüyken Wallet&apos;ta yalnızca logo görünür; bu yazı gizlenir.
            Bildirim başlığı için kafe adı kullanılır.
          </p>
        </Field>
        <IconUploadField
          label="Logo"
          hint="Wallet üst logosuna basılır"
          value={logoUrl}
          onUploaded={setLogoUrl}
          onClear={() => setLogoUrl("")}
          slot="logo"
          busy={uploadBusy}
          setBusy={setUploadBusy}
          onError={(msg) => setError(msg || null)}
        />
        <SoftBox>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Renk paleti
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <ColorField
              label="Arka plan"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorField
              label="İkon / yazı"
              value={foregroundColor}
              onChange={setForegroundColor}
            />
            <ColorField
              label="Etiket"
              value={labelColor}
              onChange={setLabelColor}
            />
          </div>
        </SoftBox>
      </div>
    </Panel>
  );
}
