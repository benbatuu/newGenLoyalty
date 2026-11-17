"use client";

import { Panel, PanelHeader, inputClassName } from "../../../../components/ui";

type BackTabProps = {
  passDescriptionLabel: string;
  setPassDescriptionLabel: (v: string) => void;
  passDescription: string;
  setPassDescription: (v: string) => void;
  passHowItWorksLabel: string;
  setPassHowItWorksLabel: (v: string) => void;
  passHowItWorks: string;
  setPassHowItWorks: (v: string) => void;
  passTermsLabel: string;
  setPassTermsLabel: (v: string) => void;
  passTerms: string;
  setPassTerms: (v: string) => void;
  passLocationsLabel: string;
  setPassLocationsLabel: (v: string) => void;
  passLocations: string;
  setPassLocations: (v: string) => void;
  passHoursLabel: string;
  setPassHoursLabel: (v: string) => void;
  passHours: string;
  setPassHours: (v: string) => void;
  passPhoneLabel: string;
  setPassPhoneLabel: (v: string) => void;
  passPhone: string;
  setPassPhone: (v: string) => void;
  passWebsiteLabel: string;
  setPassWebsiteLabel: (v: string) => void;
  passWebsiteUrl: string;
  setPassWebsiteUrl: (v: string) => void;
  passExtra1Label: string;
  setPassExtra1Label: (v: string) => void;
  passExtra1Value: string;
  setPassExtra1Value: (v: string) => void;
  passExtra2Label: string;
  setPassExtra2Label: (v: string) => void;
  passExtra2Value: string;
  setPassExtra2Value: (v: string) => void;
  passExtra3Label: string;
  setPassExtra3Label: (v: string) => void;
  passExtra3Value: string;
  setPassExtra3Value: (v: string) => void;
};

type RowProps = {
  index: number;
  label: string;
  onLabel: (v: string) => void;
  value: string;
  onValue: (v: string) => void;
  labelPlaceholder: string;
  valuePlaceholder?: string;
  rows?: number;
  inputType?: "text" | "url";
};

/** Arka yüz satırı: sol kenarda sıra numarası, üstte satır adı, altta içerik. */
function BackRow({ index, label, onLabel, value, onValue, labelPlaceholder, valuePlaceholder, rows = 1, inputType = "text" }: RowProps) {
  const multi = rows > 1;
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-xl border border-[var(--line)] bg-[var(--background)] p-3.5">
      <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-[var(--surface)] text-[11px] font-semibold tabular-nums text-[var(--muted)]">
        {index}
      </span>
      <div className="min-w-0 space-y-2.5">
        <input
          className={`${inputClassName()} h-8 border-transparent bg-transparent px-0 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] focus:border-transparent focus:ring-0`}
          value={label}
          placeholder={labelPlaceholder}
          aria-label={`Satır ${index} adı`}
          onChange={(e) => onLabel(e.target.value)}
        />
        {multi ? (
          <textarea
            className={`${inputClassName()} min-h-[72px] resize-y py-2 text-[0.875rem] leading-relaxed`}
            rows={rows}
            value={value}
            placeholder={valuePlaceholder ?? "İçerik yazın"}
            aria-label={`Satır ${index} içeriği`}
            onChange={(e) => onValue(e.target.value)}
          />
        ) : (
          <input
            type={inputType}
            className={`${inputClassName()} h-9 text-[0.875rem]`}
            value={value}
            placeholder={valuePlaceholder ?? (inputType === "url" ? "https://…" : "İçerik yazın")}
            aria-label={`Satır ${index} içeriği`}
            onChange={(e) => onValue(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

export function BackTab(props: BackTabProps) {
  return (
    <Panel>
      <PanelHeader
        step={4}
        title="Arka yüz"
        description="Kartın arkasındaki bilgi satırları. Boş içerikli satır kartta gösterilmez."
      />
      <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--muted)]">
        Satır adı (büyük harfli başlık) ve içerik ayrı alanlardır. Yer tutucu metinler yalnızca örnektir; gerçek içeriği siz yazarsınız.
      </div>
      <div className="space-y-3">
        <BackRow index={1} label={props.passDescriptionLabel} onLabel={props.setPassDescriptionLabel} value={props.passDescription} onValue={props.setPassDescription} labelPlaceholder="Hakkında" valuePlaceholder="İşletmenizi kısaca tanıtın" rows={3} />
        <BackRow index={2} label={props.passHowItWorksLabel} onLabel={props.setPassHowItWorksLabel} value={props.passHowItWorks} onValue={props.setPassHowItWorks} labelPlaceholder="Nasıl çalışır?" valuePlaceholder="Damgaları nasıl toplayacağını anlatın" rows={3} />
        <BackRow index={3} label={props.passTermsLabel} onLabel={props.setPassTermsLabel} value={props.passTerms} onValue={props.setPassTerms} labelPlaceholder="Koşullar" valuePlaceholder="Ödül koşullarını yazın" rows={3} />
        <BackRow index={4} label={props.passLocationsLabel} onLabel={props.setPassLocationsLabel} value={props.passLocations} onValue={props.setPassLocations} labelPlaceholder="Şubeler / adres" valuePlaceholder="Adres bilgisi" rows={2} />
        <BackRow index={5} label={props.passHoursLabel} onLabel={props.setPassHoursLabel} value={props.passHours} onValue={props.setPassHours} labelPlaceholder="Çalışma saatleri" valuePlaceholder="Örn. 08:00 – 22:00" />
        <BackRow index={6} label={props.passPhoneLabel} onLabel={props.setPassPhoneLabel} value={props.passPhone} onValue={props.setPassPhone} labelPlaceholder="Telefon" valuePlaceholder="0XXX XXX XX XX" />
        <BackRow index={7} label={props.passWebsiteLabel} onLabel={props.setPassWebsiteLabel} value={props.passWebsiteUrl} onValue={props.setPassWebsiteUrl} labelPlaceholder="Web" inputType="url" />
      </div>

      <div className="mt-5 space-y-3 border-t border-[var(--line)] pt-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink)]">Ek satırlar</h3>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">İsteğe bağlı üç serbest satır.</p>
        </div>
        <BackRow index={8} label={props.passExtra1Label} onLabel={props.setPassExtra1Label} value={props.passExtra1Value} onValue={props.setPassExtra1Value} labelPlaceholder="Ek satır 1" rows={2} />
        <BackRow index={9} label={props.passExtra2Label} onLabel={props.setPassExtra2Label} value={props.passExtra2Value} onValue={props.setPassExtra2Value} labelPlaceholder="Ek satır 2" rows={2} />
        <BackRow index={10} label={props.passExtra3Label} onLabel={props.setPassExtra3Label} value={props.passExtra3Value} onValue={props.setPassExtra3Value} labelPlaceholder="Ek satır 3" rows={2} />
      </div>
    </Panel>
  );
}
