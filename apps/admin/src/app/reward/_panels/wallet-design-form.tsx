"use client";

import { useState } from "react";
import {
  STORE_CARD_IMAGE_SPECS,
  defaultGroupStampTheme,
  formatPassImageSize,
  type GroupStampStyle,
} from "@ngl/shared";
import { Field, SoftBox, inputClassName } from "../../../components/ui";
import { StampGlyph, STAMP_THEMES } from "../../../components/stamp-glyph";
import type { MultiStampDraft } from "../multi-stamp-panel";
import { ColorField, IconUploadField } from "./wallet-fields";
import { getGroupStampStyle } from "./wallet-helpers";
import {
  BACK_FIELD_PRESETS,
  INSETS,
  type GroupPreviewItem,
  type ProgramWalletDraft,
  type WalletBackField,
} from "./wallet-types";

export type WalletDesignFormProps = {
  programId: string;
  programName: string;
  draft: ProgramWalletDraft;
  onChange: (draft: ProgramWalletDraft) => void;
  uploadBusy: string | null;
  setUploadBusy: (s: string | null) => void;
  setUploadError: (msg: string) => void;
  showStampStrip: boolean;
  isMultiStampCombined: boolean;
  multiStamp?: MultiStampDraft | null;
  onMultiStampChange?: (draft: MultiStampDraft) => void;
  groupPreviewItems: GroupPreviewItem[];
  effectiveFilledUrl: string | null;
  effectiveEmptyUrl: string | null;
};

export function WalletDesignForm({
  programId,
  programName,
  draft,
  onChange,
  uploadBusy,
  setUploadBusy,
  setUploadError,
  showStampStrip,
  isMultiStampCombined,
  multiStamp,
  onMultiStampChange,
  groupPreviewItems,
  effectiveFilledUrl,
  effectiveEmptyUrl,
}: WalletDesignFormProps) {
  const [face, setFace] = useState<"front" | "back">("front");

  function patchBackField(key: WalletBackField["key"], patch: Partial<WalletBackField>) {
    const existing = draft.backFields.find((f) => f.key === key);
    if (!existing && !patch.value) return; // don't add empty
    if (existing) {
      onChange({
        ...draft,
        backFields: draft.backFields
          .map((f) => (f.key === key ? { ...f, ...patch } : f))
          .filter((f) => f.value.trim() !== ""),
      });
    } else {
      const preset = BACK_FIELD_PRESETS.find((p) => p.key === key);
      onChange({
        ...draft,
        backFields: [
          ...draft.backFields,
          { key, label: patch.label ?? preset?.label ?? key, value: patch.value ?? "", ...patch },
        ],
      });
    }
  }

  function getBackFieldValue(key: WalletBackField["key"]) {
    return draft.backFields.find((f) => f.key === key);
  }

  function patchGroupStamp(groupId: string, patch: Partial<GroupStampStyle>) {
    if (!multiStamp || !onMultiStampChange) return;
    if (multiStamp.mode === "LANES") {
      onMultiStampChange({
        ...multiStamp,
        lanes: multiStamp.lanes.map((l) =>
          l.id === groupId ? { ...l, ...patch } : l,
        ),
      });
    } else {
      onMultiStampChange({
        ...multiStamp,
        productGroups: multiStamp.productGroups.map((g) =>
          g.id === groupId ? { ...g, ...patch } : g,
        ),
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Front / Back Tab Switch */}
      <div className="flex rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1">
        <button
          type="button"
          onClick={() => setFace("front")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${face === "front"
            ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm"
            : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
        >
          🎨 Ön Yüz
        </button>
        <button
          type="button"
          onClick={() => setFace("back")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${face === "back"
            ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm"
            : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
        >
          📝 Arka Yüz
        </button>
      </div>

      {face === "back" ? (
        <div className="space-y-4">
          <SoftBox>
            <p className="text-sm font-medium text-[var(--ink)]">Arka yüz alanları</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Apple Wallet’da kartı çeviren müşteri, bu bilgileri görür. Doldurulmayanlar gösterilmez.
            </p>
          </SoftBox>

          {BACK_FIELD_PRESETS.map((preset) => {
            const field = getBackFieldValue(preset.key);
            const currentLabel = field?.label ?? preset.label;
            const currentValue = field?.value ?? "";

            return (
              <div
                key={preset.key}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--ink)]">{preset.label}</p>
                  {currentValue && (
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:text-red-700"
                      onClick={() =>
                        onChange({
                          ...draft,
                          backFields: draft.backFields.filter((f) => f.key !== preset.key),
                        })
                      }
                    >
                      ✕ Kaldır
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Kısa yazı">
                    <input
                      className={inputClassName()}
                      value={currentLabel}
                      maxLength={50}
                      placeholder={preset.label}
                      onChange={(e) =>
                        patchBackField(preset.key, {
                          label: e.target.value,
                          value: currentValue,
                        })
                      }
                    />
                  </Field>
                  <Field label="Bilgi">
                    <input
                      className={inputClassName()}
                      value={currentValue}
                      placeholder={preset.placeholder}
                      maxLength={200}
                      onChange={(e) =>
                        patchBackField(preset.key, {
                          label: currentLabel,
                          value: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                {(preset.type === "phone" || preset.type === "email" || preset.type === "url") && currentValue && (
                  <p className="text-[11px] text-[var(--muted)]">
                    {preset.type === "phone" && "☎️ Bağlantı linkħi otomatik oluşturulur (tel:...)"}
                    {preset.type === "email" && "✉️ Bağlantı linkħi otomatik oluşturulur (mailto:...)"}
                    {preset.type === "url" && "🔗 URL, tap’ta açılır"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <ColorField
              label="Kartın rengi"
              value={draft.primaryColor}
              onChange={(v) => onChange({ ...draft, primaryColor: v })}
            />
            <ColorField
              label="Yazı rengi"
              value={draft.foregroundColor}
              onChange={(v) => onChange({ ...draft, foregroundColor: v })}
            />
            <ColorField
              label="Küçük yazı rengi"
              value={draft.labelColor}
              onChange={(v) => onChange({ ...draft, labelColor: v })}
            />
          </div>

          <SoftBox className="space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">
                Wallet görselleri
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Logonuzu ve kart görsellerinizi yükleyin; boyutlandırmayı biz yaparız.
              </p>
            </div>
            {/* Teknik ölçüler — tasarımcı için, varsayılan kapalı */}
            <details className="group rounded-lg border border-[var(--line)] bg-[var(--panel)]">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]">
                Teknik ölçüler (tasarımcınız için)
                <span aria-hidden="true" className="transition-transform group-open:rotate-90">›</span>
              </summary>
              <p className="px-3 pb-2 text-[11px] text-[var(--muted)]">
                Apple Wallet storeCard ölçüleri —{" "}
                <a
                  href="https://developer.apple.com/documentation/walletpasses"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Apple dokümantasyonu
                </a>
              </p>
            <div className="overflow-x-auto border-t border-[var(--line)]">
              <table className="w-full min-w-[420px] text-left text-[11px]">
                <thead className="bg-[var(--surface)] text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Slot</th>
                    <th className="px-3 py-2 font-medium">Apple boyutu</th>
                    <th className="px-3 py-2 font-medium">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {STORE_CARD_IMAGE_SPECS.map((spec) => (
                    <tr key={spec.id} className="border-t border-[var(--line)]">
                      <td className="px-3 py-2 font-medium">{spec.label}</td>
                      <td className="px-3 py-2 tabular-nums text-[var(--muted)]">
                        {formatPassImageSize(spec)}
                      </td>
                      <td className="px-3 py-2 text-[var(--muted)]">
                        {spec.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </details>
            <div className="grid gap-3 sm:grid-cols-2">
              <IconUploadField
                label="Logo (işletme adı yerine)"
                hint="Yatay bir logo. Boş bırakırsan işletme adı yazılır."
                value={draft.logoUrl}
                slot="logo"
                programId={programId}
                busy={uploadBusy}
                setBusy={setUploadBusy}
                onError={setUploadError}
                onUploaded={(url) => onChange({ ...draft, logoUrl: url })}
                onClear={() => onChange({ ...draft, logoUrl: "" })}
              />
              <IconUploadField
                label="Arka plan resmi"
                hint="İsteğe bağlı. Eklersen kartın rengi yerine bu resim görünür."
                value={draft.backgroundImageUrl}
                slot="passBackground"
                programId={programId}
                busy={uploadBusy}
                setBusy={setUploadBusy}
                onError={setUploadError}
                onUploaded={(url) =>
                  onChange({ ...draft, backgroundImageUrl: url })
                }
                onClear={() => onChange({ ...draft, backgroundImageUrl: "" })}
              />
              {showStampStrip && (
                <IconUploadField
                  label="Damga şeridi resmi"
                  hint="İsteğe bağlı. Eklersen damga simgeleri yerine bu resim görünür."
                  value={draft.stripImageUrl}
                  slot="passStrip"
                  programId={programId}
                  busyKey="passStrip"
                  busy={uploadBusy}
                  setBusy={setUploadBusy}
                  onError={setUploadError}
                  onUploaded={(url) => onChange({ ...draft, stripImageUrl: url })}
                  onClear={() => onChange({ ...draft, stripImageUrl: "" })}
                />
              )}
            </div>
          </SoftBox>
        </>
      )}

      {showStampStrip && (
        <>
          {!isMultiStampCombined && (
            <>
              <Field label="Damga simgesi">
                <div className="flex flex-wrap gap-2">
                  {STAMP_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`rounded-lg border px-3 py-2 text-sm transition ${draft.stampTheme === t.id
                        ? "border-[var(--ink)] bg-[var(--surface)] font-medium"
                        : "border-[var(--line)] hover:bg-[var(--surface)]"
                        }`}
                      onClick={() => onChange({ ...draft, stampTheme: t.id })}
                    >
                      {t.id !== "CUSTOM" ? (
                        <span className="inline-flex items-center gap-1">
                          <StampGlyph
                            theme={t.id}
                            filled={false}
                            color="#666"
                            size={18}
                          />
                          <StampGlyph
                            theme={t.id}
                            filled
                            color="#666"
                            size={18}
                          />
                          <span>{t.label}</span>
                        </span>
                      ) : (
                        <>
                          {t.emoji} {t.label}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </Field>

              {draft.stampTheme === "CUSTOM" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <IconUploadField
                    label="Dolu damga simgesi"
                    hint="İsteğe bağlı. Boş bırakırsan hazır simge kullanılır."
                    value={draft.stampIconFilledUrl || effectiveFilledUrl || ""}
                    slot="stampFilled"
                    busy={uploadBusy}
                    setBusy={setUploadBusy}
                    onError={setUploadError}
                    onUploaded={(url) =>
                      onChange({ ...draft, stampIconFilledUrl: url })
                    }
                    onClear={() =>
                      onChange({ ...draft, stampIconFilledUrl: "" })
                    }
                  />
                  <IconUploadField
                    label="Boş damga simgesi"
                    hint="Dolu simgeden farklı olabilir."
                    value={draft.stampIconEmptyUrl || effectiveEmptyUrl || ""}
                    slot="stampEmpty"
                    busy={uploadBusy}
                    setBusy={setUploadBusy}
                    onError={setUploadError}
                    onUploaded={(url) =>
                      onChange({ ...draft, stampIconEmptyUrl: url })
                    }
                    onClear={() =>
                      onChange({ ...draft, stampIconEmptyUrl: "" })
                    }
                  />
                </div>
              )}
            </>
          )}

          {isMultiStampCombined && multiStamp && onMultiStampChange && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[var(--ink)]">
                Grup damga ikonları
              </p>
              <p className="text-xs text-[var(--muted)]">
                Her ürün grubu için ayrı tema veya özel ikon seçin.
              </p>
              {groupPreviewItems.map((group, groupIndex) => {
                const stamp = getGroupStampStyle(
                  multiStamp,
                  group.groupId,
                  defaultGroupStampTheme(groupIndex),
                );
                return (
                  <SoftBox
                    key={group.groupId}
                    className="space-y-3 border border-[var(--line)]"
                  >
                    <p className="text-sm font-medium">
                      {group.label}{" "}
                      <span className="text-xs font-normal text-[var(--muted)]">
                        · {group.threshold} damga
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {STAMP_THEMES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${stamp.stampTheme === t.id
                            ? "border-[var(--ink)] bg-[var(--surface)] font-medium"
                            : "border-[var(--line)] hover:bg-[var(--surface)]"
                            }`}
                          onClick={() =>
                            patchGroupStamp(group.groupId, {
                              stampTheme: t.id,
                            })
                          }
                        >
                          {t.id !== "CUSTOM" ? (
                            <span className="inline-flex items-center gap-1">
                              <StampGlyph
                                theme={t.id}
                                filled={false}
                                color="#666"
                                size={16}
                              />
                              <StampGlyph
                                theme={t.id}
                                filled
                                color="#666"
                                size={16}
                              />
                              <span>{t.label}</span>
                            </span>
                          ) : (
                            <>
                              {t.emoji} {t.label}
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                    {stamp.stampTheme === "CUSTOM" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <IconUploadField
                          label="Dolu simge"
                          value={stamp.stampIconFilledUrl || ""}
                          slot="stampFilled"
                          busyKey={`stampFilled-${group.groupId}`}
                          busy={uploadBusy}
                          setBusy={setUploadBusy}
                          onError={setUploadError}
                          onUploaded={(url) =>
                            patchGroupStamp(group.groupId, {
                              stampIconFilledUrl: url,
                            })
                          }
                          onClear={() =>
                            patchGroupStamp(group.groupId, {
                              stampIconFilledUrl: "",
                            })
                          }
                        />
                        <IconUploadField
                          label="Boş simge"
                          value={stamp.stampIconEmptyUrl || ""}
                          slot="stampEmpty"
                          busyKey={`stampEmpty-${group.groupId}`}
                          busy={uploadBusy}
                          setBusy={setUploadBusy}
                          onError={setUploadError}
                          onUploaded={(url) =>
                            patchGroupStamp(group.groupId, {
                              stampIconEmptyUrl: url,
                            })
                          }
                          onClear={() =>
                            patchGroupStamp(group.groupId, {
                              stampIconEmptyUrl: "",
                            })
                          }
                        />
                      </div>
                    )}
                  </SoftBox>
                );
              })}
            </div>
          )}

          <Field label="Damgaların kenar boşluğu">
            <div className="flex flex-wrap gap-2">
              {INSETS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  title={opt.hint}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${draft.stampInset === opt.id
                    ? "border-[var(--ink)] bg-[var(--surface)] font-medium"
                    : "border-[var(--line)] hover:bg-[var(--surface)]"
                    }`}
                  onClick={() => onChange({ ...draft, stampInset: opt.id })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kartın üst yazısı">
          <input
            className={inputClassName()}
            value={draft.logoText}
            onChange={(e) => onChange({ ...draft, logoText: e.target.value })}
            placeholder={programName}
            maxLength={40}
          />
        </Field>
        <Field label="Kartın kısa açıklaması">
          <input
            className={inputClassName()}
            value={draft.passDescription}
            onChange={(e) =>
              onChange({ ...draft, passDescription: e.target.value })
            }
            placeholder={programName}
            maxLength={120}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Damga yazısı">
          <input
            className={inputClassName()}
            value={draft.stampFieldLabel}
            onChange={(e) =>
              onChange({ ...draft, stampFieldLabel: e.target.value })
            }
          />
        </Field>
        <Field label="Ödül yazısı">
          <input
            className={inputClassName()}
            value={draft.rewardFieldLabel}
            onChange={(e) =>
              onChange({ ...draft, rewardFieldLabel: e.target.value })
            }
          />
        </Field>
        <Field label="Durum yazısı">
          <input
            className={inputClassName()}
            value={draft.statusFieldLabel}
            onChange={(e) =>
              onChange({ ...draft, statusFieldLabel: e.target.value })
            }
          />
        </Field>
      </div>
    </div>
  );
}
