"use client";

import { Field, inputClassName } from "../../../components/ui";
import { StampLayoutEditor } from "./stamp-layout-editor";
import {
  BARCODE_OPTIONS,
  INSETS,
  STAMP_ROW_OPTIONS,
  type PassKitField,
  type ProgramWalletDraft,
  type StampInset,
} from "./wallet-types";

type SectionProps = {
  draft: ProgramWalletDraft;
  onChange: (d: ProgramWalletDraft) => void;
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[40px] rounded-lg border px-3.5 py-2 text-sm transition ${active ? "border-[var(--ink)] bg-[var(--surface)] font-medium" : "border-[var(--line)] hover:bg-[var(--surface)]"}`}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] p-3.5 hover:bg-[var(--surface)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="block text-[12px] text-[var(--muted)]">{hint}</span> : null}
      </span>
    </label>
  );
}

function FieldList({
  title,
  hint,
  items,
  max,
  onChange,
  labelPlaceholder,
  valuePlaceholder,
}: {
  title: string;
  hint: string;
  items: PassKitField[];
  max: number;
  onChange: (items: PassKitField[]) => void;
  labelPlaceholder: string;
  valuePlaceholder: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-[12px] text-[var(--muted)]">{hint}</p>
      </div>
      {items.map((f, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] items-end gap-2">
          <Field label={`Başlık ${i + 1}`}>
            <input
              className={inputClassName()}
              value={f.label}
              maxLength={20}
              placeholder={labelPlaceholder}
              onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
            />
          </Field>
          <Field label="Değer">
            <input
              className={inputClassName()}
              value={f.value}
              maxLength={60}
              placeholder={valuePlaceholder}
              onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))}
            />
          </Field>
          <button
            type="button"
            aria-label={`${title} ${i + 1} sil`}
            className="mb-0.5 h-10 rounded-lg border border-[var(--line)] px-3 text-sm text-[var(--muted)] hover:bg-[var(--surface)]"
            onClick={() => onChange(items.filter((_, k) => k !== i))}
          >
            Sil
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={items.length >= max}
        className="min-h-[40px] rounded-lg border border-dashed border-[var(--line-strong)] px-4 py-2 text-sm hover:bg-[var(--surface)] disabled:opacity-40"
        onClick={() => onChange([...items, { label: "", value: "" }])}
      >
        + Alan ekle ({items.length}/{max})
      </button>
    </div>
  );
}

/** Ön yüz alanları: ek header ve yardımcı (auxiliary) alanlar */
export function FieldsSection({
  draft,
  onChange,
  tenantHasHeader,
}: SectionProps & { tenantHasHeader: boolean }) {
  return (
    <div className="space-y-8">
      <FieldList
        title="Üst sağ alanlar (header)"
        hint={`Logonun karşısında, en üstte görünür. Tasarımı bozmamak için en fazla 2 alan${tenantHasHeader ? " (işletme header'ı 1 yer kaplıyor)" : ""}.`}
        items={draft.headerFields}
        max={tenantHasHeader ? 1 : 2}
        onChange={(headerFields) => onChange({ ...draft, headerFields })}
        labelPlaceholder="Örn. SEVİYE"
        valuePlaceholder="Örn. Gold"
      />
    </div>
  );
}

/** Barkod: görünürlük, biçim ve altındaki yazı */
export function BarcodeSection({ draft, onChange }: SectionProps) {
  return (
    <div className="space-y-6">
      <Toggle
        checked={draft.showBarcode}
        onChange={(showBarcode) => onChange({ ...draft, showBarcode })}
        label="Barkodu göster"
        hint="Kapalıysa kart barkodsuz olur; kasiyer müşteriyi kod ile bulamaz."
      />
      {draft.showBarcode && (
        <>
          <Field label="Barkod biçimi">
            <div className="flex flex-wrap gap-2">
              <Chip active={draft.barcodeFormat === ""} onClick={() => onChange({ ...draft, barcodeFormat: "" })}>
                İşletme varsayılanı
              </Chip>
              {BARCODE_OPTIONS.map((o) => (
                <Chip key={o.id} active={draft.barcodeFormat === o.id} onClick={() => onChange({ ...draft, barcodeFormat: o.id })}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Barkodun altındaki yazı">
            <div className="flex flex-wrap gap-2">
              <Chip active={draft.barcodeAltMode === "CODE"} onClick={() => onChange({ ...draft, barcodeAltMode: "CODE" })}>
                Müşteri kodu
              </Chip>
              <Chip active={draft.barcodeAltMode === "CUSTOM"} onClick={() => onChange({ ...draft, barcodeAltMode: "CUSTOM" })}>
                Özel yazı
              </Chip>
              <Chip active={draft.barcodeAltMode === "NONE"} onClick={() => onChange({ ...draft, barcodeAltMode: "NONE" })}>
                Gösterme
              </Chip>
            </div>
            {draft.barcodeAltMode === "CUSTOM" && (
              <input
                className={`${inputClassName()} mt-2`}
                value={draft.barcodeAltText}
                maxLength={40}
                placeholder="Örn. Kasada gösterin"
                onChange={(e) => onChange({ ...draft, barcodeAltText: e.target.value })}
              />
            )}
          </Field>
        </>
      )}
      <div className="border-t border-[var(--line)] pt-5">
        <Toggle
          checked={draft.sharingProhibited}
          onChange={(sharingProhibited) => onChange({ ...draft, sharingProhibited })}
          label="Kartın paylaşılmasını engelle"
          hint="Müşteri kartı AirDrop veya mesajla başkasına gönderemez."
        />
      </div>
    </div>
  );
}

/** Konum ve tarih: kilit ekranında kartı öne çıkarır */
export function RelevanceSection({ draft, onChange }: SectionProps) {
  const setLoc = (i: number, patch: Partial<ProgramWalletDraft["locations"][number]>) =>
    onChange({ ...draft, locations: draft.locations.map((l, k) => (k === i ? { ...l, ...patch } : l)) });

  const fillMyLocation = (i: number) => {
    navigator.geolocation?.getCurrentPosition((pos) =>
      setLoc(i, { latitude: Number(pos.coords.latitude.toFixed(6)), longitude: Number(pos.coords.longitude.toFixed(6)) }),
    );
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Konumlar (en fazla 10)</p>
          <p className="text-[12px] text-[var(--muted)]">
            Müşteri bu konumlara yaklaşınca iPhone kilit ekranında kartı önerir ve aşağıdaki mesajı gösterir.
          </p>
        </div>
        {draft.locations.map((l, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-[var(--line)] p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Enlem">
                <input
                  type="number"
                  step="any"
                  className={inputClassName()}
                  value={Number.isFinite(l.latitude) ? l.latitude : ""}
                  onChange={(e) => setLoc(i, { latitude: e.target.value === "" ? NaN : Number(e.target.value) })}
                />
              </Field>
              <Field label="Boylam">
                <input
                  type="number"
                  step="any"
                  className={inputClassName()}
                  value={Number.isFinite(l.longitude) ? l.longitude : ""}
                  onChange={(e) => setLoc(i, { longitude: e.target.value === "" ? NaN : Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Kilit ekranı mesajı">
              <input
                className={inputClassName()}
                value={l.relevantText}
                maxLength={60}
                placeholder="Örn. Yakınındayız, kahveni al!"
                onChange={(e) => setLoc(i, { relevantText: e.target.value })}
              />
            </Field>
            <div className="flex gap-2">
              <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm hover:bg-[var(--surface)]" onClick={() => fillMyLocation(i)}>
                Konumumu kullan
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface)]"
                onClick={() => onChange({ ...draft, locations: draft.locations.filter((_, k) => k !== i) })}
              >
                Sil
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          disabled={draft.locations.length >= 10}
          className="min-h-[40px] rounded-lg border border-dashed border-[var(--line-strong)] px-4 py-2 text-sm hover:bg-[var(--surface)] disabled:opacity-40"
          onClick={() => onChange({ ...draft, locations: [...draft.locations, { latitude: NaN, longitude: NaN, relevantText: "" }] })}
        >
          + Konum ekle ({draft.locations.length}/10)
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Öne çıkma zamanı" hint="Bu saatte kart kilit ekranında önerilir.">
          <input
            type="datetime-local"
            className={inputClassName()}
            value={draft.relevantDate}
            onChange={(e) => onChange({ ...draft, relevantDate: e.target.value })}
          />
        </Field>
        <Field label="Son geçerlilik" hint="Bu tarihten sonra Wallet kartı süresi dolmuş gösterir.">
          <input
            type="datetime-local"
            className={inputClassName()}
            value={draft.expirationDate}
            onChange={(e) => onChange({ ...draft, expirationDate: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

/** Damgalar: sürükle-bırak şerit + dizilim kontrolleri */
export function StampsSection({
  draft,
  onChange,
  stampsRequired,
  showEditor = true,
  filledUrl,
  emptyUrl,
}: SectionProps & {
  stampsRequired: number;
  showEditor?: boolean;
  filledUrl?: string | null;
  emptyUrl?: string | null;
}) {
  return (
    <div className="space-y-6">
      {showEditor && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Şerit (sürükle-bırak)
          </p>
          <StampLayoutEditor draft={draft} onChange={onChange} stampsRequired={stampsRequired} filledUrl={filledUrl} emptyUrl={emptyUrl} />
        </>
      )}
      {!showEditor && (
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Satır sayısı">
          <div className="flex flex-wrap gap-2">
            {STAMP_ROW_OPTIONS.map((o) => (
              <Chip key={o.value} active={(draft.stampRows || 0) === o.value} onClick={() => onChange({ ...draft, stampRows: o.value })}>
                {o.label}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Satır düzeni">
          <div className="flex flex-wrap gap-2">
            <Chip active={draft.stampLayout === "GRID"} onClick={() => onChange({ ...draft, stampLayout: "GRID" })}>Izgara</Chip>
            <Chip active={draft.stampLayout === "STAGGERED"} onClick={() => onChange({ ...draft, stampLayout: "STAGGERED" })}>Dizgi</Chip>
          </div>
        </Field>
        <Field label="Kenar boşluğu">
          <div className="flex flex-wrap gap-2">
            {INSETS.map((o) => (
              <Chip key={o.id} active={draft.stampInset === o.id} onClick={() => onChange({ ...draft, stampInset: o.id as StampInset })}>
                {o.label}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="space-y-4">
          <Field label={`Yatay boşluk: ${draft.stampGapX ?? "varsayılan"} (eksi = üst üste)`}>
            <input type="range" min={-150} max={200} step={1} value={draft.stampGapX ?? 18} onChange={(e) => onChange({ ...draft, stampGapX: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Dikey boşluk: ${draft.stampGapY ?? "varsayılan"} (eksi = üst üste)`}>
            <input type="range" min={-150} max={150} step={1} value={draft.stampGapY ?? 14} onChange={(e) => onChange({ ...draft, stampGapY: Number(e.target.value) })} className="w-full" />
          </Field>
          <button type="button" className="text-[11px] text-[var(--muted)] underline" onClick={() => onChange({ ...draft, stampGapX: null, stampGapY: null })}>
            Boşlukları varsayılana döndür
          </button>
        </div>
      </div>
      )}
      <Toggle
        checked={draft.suppressStripShine}
        onChange={(suppressStripShine) => onChange({ ...draft, suppressStripShine })}
        label="Şerit parlama efektini kapat"
        hint="Apple varsayılan olarak şeride hafif bir parlama ekler. Kendi tasarımınız bozuluyorsa kapatın."
      />
    </div>
  );
}
