"use client";

import {
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  inputClassName,
} from "../../../../components/ui";
import {
  StampGlyph,
  STAMP_THEMES,
  type StampTheme,
} from "../../../../components/stamp-glyph";
import { IconUploadField } from "./shared-fields";
import { StampsSection } from "../../../reward/_panels/passkit-sections";
import type { ProgramWalletDraft } from "../../../reward/_panels/wallet-types";


import { INSETS, type StampInset } from "./types";

type StampTabProps = {
  stampTheme: StampTheme;
  setStampTheme: (v: StampTheme) => void;
  stampIconFilledUrl: string;
  setStampIconFilledUrl: (v: string) => void;
  stampIconEmptyUrl: string;
  setStampIconEmptyUrl: (v: string) => void;
  stampInset: StampInset;
  setStampInset: (v: StampInset) => void;
  primaryColor: string;
  stampsRequired: number;
  setStampsRequired: (v: number) => void;
  rewardLabel: string;
  setRewardLabel: (v: string) => void;
  draft: ProgramWalletDraft;
  onDraftChange: (d: ProgramWalletDraft) => void;
  uploadBusy: string | null;
  setUploadBusy: (v: string | null) => void;
  setError: (msg: string | null) => void;
};

export function StampTab({
  stampTheme,
  setStampTheme,
  stampIconFilledUrl,
  setStampIconFilledUrl,
  stampIconEmptyUrl,
  setStampIconEmptyUrl,
  stampInset,
  setStampInset,
  primaryColor,
  stampsRequired,
  setStampsRequired,
  rewardLabel,
  setRewardLabel,
  draft,
  onDraftChange,
  uploadBusy,
  setUploadBusy,
  setError,
}: StampTabProps) {
  void rewardLabel;
  void setRewardLabel;
  void setStampTheme;
  void setStampIconFilledUrl;
  void setStampIconEmptyUrl;
  void setStampInset;
  void setStampsRequired;
  return (
    <Panel>
      <PanelHeader
        step={1}
        title="Damga görseli"
        description="Tema, kenar boşluğu ve ödül için gereken damga sayısı."
      />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STAMP_THEMES.map((t) => {
            const active = stampTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setStampTheme(t.id)}
                className={`rounded-[var(--radius-sm)] border px-3 py-3 text-left transition ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]"
                    : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--line-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                {t.id !== "CUSTOM" ? (
                  <div className="flex items-center gap-1">
                    <StampGlyph
                      theme={t.id}
                      filled={false}
                      color="#888"
                      size={24}
                    />
                    <StampGlyph theme={t.id} filled color="#888" size={24} />
                  </div>
                ) : (
                  <div className="text-xl">{t.emoji}</div>
                )}
                <div className="mt-1 text-sm font-semibold">{t.label}</div>
                <div
                  className={`text-[11px] ${active ? "text-white/70" : "text-[var(--muted)]"}`}
                >
                  {t.hint}
                </div>
              </button>
            );
          })}
        </div>

        {stampTheme === "CUSTOM" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <IconUploadField
              label="Dolu damga ikonu"
              hint="PNG · şeffaf arka plan"
              value={stampIconFilledUrl}
              onUploaded={setStampIconFilledUrl}
              onClear={() => setStampIconFilledUrl("")}
              slot="stampFilled"
              busy={uploadBusy}
              setBusy={setUploadBusy}
              onError={(msg) => setError(msg || null)}
            />
            <IconUploadField
              label="Boş damga ikonu"
              hint="Opsiyonel"
              value={stampIconEmptyUrl}
              onUploaded={setStampIconEmptyUrl}
              onClear={() => setStampIconEmptyUrl("")}
              slot="stampEmpty"
              busy={uploadBusy}
              setBusy={setUploadBusy}
              onError={(msg) => setError(msg || null)}
            />
          </div>
        ) : null}

        <Field label="Kenar boşluğu">
          <div className="grid grid-cols-3 gap-2">
            {INSETS.map((opt) => {
              const active = stampInset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStampInset(opt.id)}
                  className={`rounded-[var(--radius-sm)] border px-2 py-2.5 text-left transition ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]"
                      : "border-[var(--line)] bg-[var(--panel)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div
                    className={`text-[11px] ${active ? "text-white/80" : "text-[var(--muted)]"}`}
                  >
                    {opt.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        <StampsSection
          draft={draft}
          onChange={onDraftChange}
          stampsRequired={stampsRequired}
          filledUrl={stampIconFilledUrl || null}
          emptyUrl={stampIconEmptyUrl || null}
        />
      </div>
    </Panel>
  );
}
