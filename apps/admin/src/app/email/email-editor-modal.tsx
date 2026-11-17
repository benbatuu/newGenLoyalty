"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  personalizeEmailDocument,
  renderEmailHtml,
  sampleMergeContext,
  type EmailBlock,
  type EmailDocument,
  type EmailTheme,
} from "@ngl/shared";
import { ApiError, apiUpload } from "../../lib/api";
import { Field, Tabs, btnGhost, btnPrimary, inputClassName } from "../../components/ui";
import { BlockStylePanel } from "./block-style-panel";
import { EmailCanvas } from "./email-canvas";
import {
  EmailEditorSidebar,
  type EditorSidebarTab,
} from "./email-editor-sidebar";
import {
  createBlock,
  insertBlockAfter,
  insertMergeTokenIntoBlock,
  mergeTheme,
  moveBlockInDocument,
  removeBlockFromDocument,
  updateBlockInDocument,
} from "./email-block-utils";

export type EmailEditorSession = {
  editingId: string | null;
  draftCampaignId: string | null;
  name: string;
  subject: string;
  document: EmailDocument;
  segmentId: string;
};

type Segment = { id: string; name: string; isActive: boolean };

type EmailEditorModalProps = {
  open: boolean;
  session: EmailEditorSession;
  tenantLogoUrl?: string | null;
  businessName?: string | null;
  businessPhone?: string | null;
  businessWebsite?: string | null;
  segments: Segment[];
  busy?: boolean;
  onClose: () => void;
  onSessionChange: (patch: Partial<EmailEditorSession>) => void;
  onSave: (session: EmailEditorSession) => Promise<string | null>;
  onCreateCampaign: (templateId: string, segmentId: string) => Promise<string>;
  onSend: (campaignId: string) => Promise<void>;
};

export function EmailEditorModal({
  open,
  session,
  tenantLogoUrl,
  businessName,
  businessPhone,
  businessWebsite,
  segments,
  busy,
  onClose,
  onSessionChange,
  onSave,
  onCreateCampaign,
  onSend,
}: EmailEditorModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<EditorSidebarTab>("blocks");
  const [previewMode, setPreviewMode] = useState<"edit" | "html">("edit");
  const [previewPersonalized, setPreviewPersonalized] = useState(true);
  const [localBusy, setLocalBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = session.document.blocks.find((b) => b.id === selectedId) ?? null;
  const theme = mergeTheme(session.document);

  const sampleCtx = useMemo(
    () =>
      sampleMergeContext({
        businessName: businessName ?? undefined,
        businessPhone: businessPhone ?? undefined,
        businessWebsite: businessWebsite ?? undefined,
      }),
    [businessName, businessPhone, businessWebsite],
  );

  const previewDoc = useMemo(() => {
    if (!previewPersonalized) return session.document;
    return personalizeEmailDocument(session.document, sampleCtx);
  }, [session.document, previewPersonalized, sampleCtx]);

  const previewHtml = useMemo(
    () => renderEmailHtml(previewDoc, { preview: true }),
    [previewDoc],
  );

  function insertMergeToken(token: string) {
    if (selectedId) {
      const block = session.document.blocks.find((b) => b.id === selectedId);
      if (block) {
        const updated = insertMergeTokenIntoBlock(block, token);
        patchDoc({
          ...session.document,
          blocks: session.document.blocks.map((b) =>
            b.id === selectedId ? updated : b,
          ),
        });
        return;
      }
    }
    onSessionChange({
      subject: `${session.subject}${session.subject ? " " : ""}${token}`,
    });
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const patchDoc = useCallback(
    (doc: EmailDocument) => onSessionChange({ document: doc }),
    [onSessionChange],
  );

  function patchTheme(patch: Partial<EmailTheme>) {
    onSessionChange({
      document: {
        ...session.document,
        theme: { ...session.document.theme, ...patch },
      },
    });
  }

  function addBlock(type: EmailBlock["type"]) {
    const block = createBlock(type);
    patchDoc(insertBlockAfter(session.document, selectedId, block));
    setSelectedId(block.id);
  }

  async function handleSave(e?: FormEvent) {
    e?.preventDefault();
    setLocalBusy(true);
    setErr(null);
    try {
      const id = await onSave(session);
      if (id) onSessionChange({ editingId: id });
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Kayıt başarısız");
    } finally {
      setLocalBusy(false);
    }
  }

  async function handleSendFlow() {
    // Onay önce sorulur: iptal edilirse hiçbir istek atılmaz, boş taslak oluşmaz.
    const groupName =
      session.segmentId
        ? (segments.find((s) => s.id === session.segmentId)?.name ?? "seçili grup")
        : "tüm müşteriler";
    if (
      !window.confirm(
        `Bu e-posta ${groupName} kişisine gönderilecek. Emin misiniz?`,
      )
    ) {
      return;
    }
    setLocalBusy(true);
    setErr(null);
    try {
      let templateId = session.editingId;
      if (!templateId || !session.draftCampaignId) {
        templateId = await onSave(session);
        if (!templateId) throw new Error("E-posta kaydedilemedi");
        onSessionChange({ editingId: templateId });
      }
      let campaignId = session.draftCampaignId;
      if (!campaignId) {
        campaignId = await onCreateCampaign(templateId, session.segmentId);
        onSessionChange({ draftCampaignId: campaignId });
      }
      await onSend(campaignId);
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "İşlem başarısız");
    } finally {
      setLocalBusy(false);
    }
  }

  if (!open) return null;

  const isBusy = busy || localBusy;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--canvas)]">
      <header className="shrink-0 space-y-2.5 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button type="button" className={btnGhost()} onClick={onClose} disabled={isBusy}>
              ← Geri dön
            </button>
            <span className="text-[0.9375rem] font-semibold text-[var(--ink)]">E-posta düzenle</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Tabs
              tabs={[
                { id: "edit", label: "Düzenle" },
                { id: "html", label: "Önizleme" },
              ]}
              value={previewMode}
              onChange={(id) => setPreviewMode(id as "edit" | "html")}
            />
            <button
              type="button"
              className={btnGhost()}
              disabled={isBusy}
              onClick={() => void handleSave()}
            >
              Taslak kaydet
            </button>
            <button
              type="button"
              className={btnPrimary()}
              disabled={isBusy}
              onClick={() => void handleSendFlow()}
            >
              Gönder
            </button>
          </div>
        </div>
        <div className="grid gap-2.5 md:grid-cols-[1fr_2fr_1fr]">
          <Field label="E-posta adı" hint="Sadece sizin görürsünüz">
            <input
              className={inputClassName()}
              value={session.name}
              onChange={(e) => onSessionChange({ name: e.target.value })}
              placeholder="Örn: Hafta sonu indirimi"
              disabled={isBusy}
            />
          </Field>
          <Field label="Konu" hint="Alıcı bunu e-postada görür">
            <input
              className={inputClassName()}
              value={session.subject}
              onChange={(e) => onSessionChange({ subject: e.target.value })}
              placeholder="Örn: Bu hafta sonu %20 indirim"
              disabled={isBusy}
            />
          </Field>
          <Field label="Alıcılar">
            <select
              className={inputClassName()}
              value={session.segmentId}
              disabled={isBusy}
              onChange={(e) => onSessionChange({ segmentId: e.target.value })}
            >
              <option value="">Tüm müşterilerim</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </header>

      {err ? (
        <div className="shrink-0 border-b border-[var(--danger)] bg-[#FDEBEC] px-5 py-2 text-sm text-[#9F2F2D]">
          {err}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <EmailEditorSidebar
          className="hidden w-56 shrink-0 border-r lg:flex xl:w-60"
          tab={sidebarTab}
          onTabChange={setSidebarTab}
          disabled={isBusy}
          onAddBlock={addBlock}
          onInsertTag={insertMergeToken}
          theme={theme}
          tenantLogoUrl={tenantLogoUrl}
          onThemeChange={patchTheme}
        />

        <main
          className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6"
          style={{ background: theme.backgroundColor }}
        >
          {previewMode === "edit" ? (
            <EmailCanvas
              document={session.document}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={patchDoc}
              disabled={isBusy}
            />
          ) : (
            <div className="mx-auto w-full max-w-[560px]">
              <label className="mb-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={previewPersonalized}
                  onChange={(e) => setPreviewPersonalized(e.target.checked)}
                />
                Örnek müşteri verisiyle doldur ({String(sampleCtx.customerFirstName)})
              </label>
              <div className="overflow-hidden rounded-lg border border-[var(--line)]">
                <iframe
                  title="E-posta HTML önizleme"
                  srcDoc={previewHtml}
                  className="h-[min(720px,80vh)] w-full border-0"
                  sandbox=""
                />
              </div>
            </div>
          )}
        </main>

        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-[var(--line)] bg-[var(--panel)] p-4 md:block xl:w-80">
          <PropertiesPanel
            block={selected}
            disabled={isBusy}
            onChange={(patch) => {
              if (!selectedId) return;
              patchDoc(updateBlockInDocument(session.document, selectedId, patch));
            }}
            onMove={(dir) => {
              if (!selectedId) return;
              patchDoc(moveBlockInDocument(session.document, selectedId, dir));
            }}
            onRemove={() => {
              if (!selectedId) return;
              patchDoc(removeBlockFromDocument(session.document, selectedId));
              setSelectedId(null);
            }}
            onAddListItem={() => {
              if (!selected || selected.type !== "list") return;
              patchDoc(
                updateBlockInDocument(session.document, selected.id, {
                  items: [...selected.items, "Yeni madde"],
                }),
              );
            }}
          />
        </aside>
      </div>

      <EmailEditorSidebar
        className="max-h-[42vh] shrink-0 border-t lg:hidden"
        tab={sidebarTab}
        onTabChange={setSidebarTab}
        disabled={isBusy}
        onAddBlock={addBlock}
        onInsertTag={insertMergeToken}
        theme={theme}
        tenantLogoUrl={tenantLogoUrl}
        onThemeChange={patchTheme}
      />
    </div>
  );
}

function PropertiesPanel({
  block,
  disabled,
  onChange,
  onMove,
  onRemove,
  onAddListItem,
}: {
  block: EmailBlock | null;
  disabled?: boolean;
  onChange: (patch: Partial<EmailBlock>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onAddListItem: () => void;
}) {
  return (
    <div className="space-y-5">
      {!block ? (
        <p className="text-sm text-[var(--muted)]">
          Değiştirmek istediğiniz parçaya ortada tıklayın. Burada ayarlarını görürsünüz.
        </p>
      ) : (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            Seçili parça
          </p>
          <div className="space-y-3">
            {block.type === "heading" ? (
              <Field label="Boyut">
                <select
                  className={inputClassName()}
                  value={block.level}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({ level: Number(e.target.value) as 1 | 2 })
                  }
                >
                  <option value={1}>Büyük</option>
                  <option value={2}>Küçük</option>
                </select>
              </Field>
            ) : null}

            {block.type === "button" ? (
              <Field label="Link URL">
                <input
                  className={inputClassName()}
                  value={block.url}
                  disabled={disabled}
                  onChange={(e) => onChange({ url: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
            ) : null}

            {block.type === "image" ? (
              <>
                <Field label="Alt metin">
                  <input
                    className={inputClassName()}
                    value={block.alt}
                    disabled={disabled}
                    onChange={(e) => onChange({ alt: e.target.value })}
                  />
                </Field>
                <Field label="Tıklama linki">
                  <input
                    className={inputClassName()}
                    value={block.linkUrl ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange({ linkUrl: e.target.value })}
                    placeholder="Opsiyonel"
                  />
                </Field>
              </>
            ) : null}

            {block.type === "highlight" ? (
              <Field label="Stil">
                <select
                  className={inputClassName()}
                  value={block.variant ?? "neutral"}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({
                      variant: e.target.value as "neutral" | "brand" | "success",
                    })
                  }
                >
                  <option value="neutral">Nötr</option>
                  <option value="brand">Marka rengi</option>
                  <option value="success">Yeşil</option>
                </select>
              </Field>
            ) : null}

            {block.type === "social"
              ? block.links.map((link, i) => (
                  <Field key={i} label={`Link ${i + 1} URL`}>
                    <input
                      className={inputClassName()}
                      value={link.url}
                      disabled={disabled}
                      onChange={(e) => {
                        const links = [...block.links];
                        links[i] = { ...links[i], url: e.target.value };
                        onChange({ links });
                      }}
                      placeholder="https://…"
                    />
                  </Field>
                ))
              : null}

            {block.type === "list" ? (
              <button
                type="button"
                className={btnGhost()}
                disabled={disabled}
                onClick={onAddListItem}
              >
                + Madde ekle
              </button>
            ) : null}

            {block.type === "spacer" ? (
              <Field label="Boyut">
                <select
                  className={inputClassName()}
                  value={block.size}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({ size: e.target.value as "sm" | "md" | "lg" })
                  }
                >
                  <option value="sm">Küçük</option>
                  <option value="md">Orta</option>
                  <option value="lg">Büyük</option>
                </select>
              </Field>
            ) : null}

            {block.type === "quote" ? (
              <>
                <Field label="Alıntı metni">
                  <textarea
                    className={`${inputClassName()} h-20 py-2`}
                    value={block.text}
                    disabled={disabled}
                    onChange={(e) => onChange({ text: e.target.value })}
                  />
                </Field>
                <Field label="Kişi" hint="Örn: Ayşe K.">
                  <input
                    className={inputClassName()}
                    value={block.author}
                    disabled={disabled}
                    onChange={(e) => onChange({ author: e.target.value })}
                  />
                </Field>
              </>
            ) : null}

            {block.type === "product" ? (
              <>
                <ImageUploadField
                  label="Ürün fotoğrafı"
                  value={block.imageUrl}
                  disabled={disabled}
                  onUploaded={(url) => onChange({ imageUrl: url })}
                />
                <Field label="Ürün adı">
                  <input
                    className={inputClassName()}
                    value={block.title}
                    disabled={disabled}
                    onChange={(e) => onChange({ title: e.target.value })}
                  />
                </Field>
                <Field label="Açıklama">
                  <textarea
                    className={`${inputClassName()} h-16 py-2`}
                    value={block.description}
                    disabled={disabled}
                    onChange={(e) => onChange({ description: e.target.value })}
                  />
                </Field>
                <Field label="Fiyat" hint="Örn: 249,90 TL">
                  <input
                    className={inputClassName()}
                    value={block.price}
                    disabled={disabled}
                    onChange={(e) => onChange({ price: e.target.value })}
                  />
                </Field>
                <Field label="Buton yazısı">
                  <input
                    className={inputClassName()}
                    value={block.buttonLabel}
                    disabled={disabled}
                    onChange={(e) => onChange({ buttonLabel: e.target.value })}
                  />
                </Field>
                <Field label="Buton linki" hint="https:// ile başlayan adres">
                  <input
                    className={inputClassName()}
                    value={block.url}
                    disabled={disabled}
                    onChange={(e) => onChange({ url: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
              </>
            ) : null}

            {block.type === "video" ? (
              <>
                <ImageUploadField
                  label="Kapak görseli"
                  value={block.thumbnailUrl}
                  disabled={disabled}
                  onUploaded={(url) => onChange({ thumbnailUrl: url })}
                />
                <Field label="Video linki" hint="YouTube veya Instagram adresi">
                  <input
                    className={inputClassName()}
                    value={block.videoUrl}
                    disabled={disabled}
                    onChange={(e) => onChange({ videoUrl: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Açıklama">
                  <input
                    className={inputClassName()}
                    value={block.caption}
                    disabled={disabled}
                    onChange={(e) => onChange({ caption: e.target.value })}
                  />
                </Field>
              </>
            ) : null}

            {block.type === "html" ? (
              <Field
                label="HTML kodu"
                hint="Yapay zekadan aldığınız HTML'i buraya yapıştırın. Script ve iframe otomatik temizlenir."
              >
                <textarea
                  className={`${inputClassName()} h-56 py-2 font-mono text-[0.75rem]`}
                  value={block.html}
                  disabled={disabled}
                  spellCheck={false}
                  onChange={(e) => onChange({ html: e.target.value })}
                />
              </Field>
            ) : null}

            <BlockStylePanel block={block} disabled={disabled} onChange={onChange} />

            <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
              <button type="button" className={btnGhost()} disabled={disabled} onClick={() => onMove(-1)}>
                Yukarı
              </button>
              <button type="button" className={btnGhost()} disabled={disabled} onClick={() => onMove(1)}>
                Aşağı
              </button>
              <button type="button" className={btnGhost()} disabled={disabled} onClick={onRemove}>
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImageUploadField({
  label,
  value,
  disabled,
  onUploaded,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiUpload<{ url: string }>("/email/media", file);
      onUploaded(res.url);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Yükleme başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-[0.8125rem] font-medium text-[var(--ink)]">{label}</span>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-20 w-full rounded-md object-cover" />
      ) : null}
      <div className="flex gap-1.5">
        <input
          className={inputClassName()}
          value={value}
          disabled={disabled}
          placeholder="Görsel adresi veya yükleyin"
          onChange={(e) => onUploaded(e.target.value)}
        />
        <label className={`${btnGhost()} cursor-pointer`}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            disabled={disabled || busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
          {busy ? "Yükleniyor…" : "Yükle"}
        </label>
      </div>
      {err ? <p className="text-[0.6875rem] text-[var(--danger)]">{err}</p> : null}
    </div>
  );
}
