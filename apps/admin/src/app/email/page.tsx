"use client";

import { useCallback, useState } from "react";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  ListRowsSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SuccessBanner,
  btnGhost,
  btnPrimary,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";
import { applyEmailBranding, createEmptyEmailDocument } from "@ngl/shared";
import { parseTemplateDocument } from "./email-builder";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { Dialog } from "../../components/dialog";
import {
  EmailEditorModal,
  type EmailEditorSession,
} from "./email-editor-modal";
import {
  EmailStarterGallery,
  type EmailStarterSummary,
} from "./email-starter-gallery";

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  bodyMd?: string;
  bodyJson?: unknown;
  bodyHtml?: string | null;
  updatedAt: string;
};

type EmailCampaign = {
  id: string;
  status: string;
  templateId: string;
  segmentId: string | null;
  sentCount?: number;
  createdAt: string;
  template?: { id: string; name: string; subject: string };
};

type Segment = { id: string; name: string; isActive: boolean };

type TenantMe = {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  passPhone?: string | null;
  passWebsiteUrl?: string | null;
};

export default function EmailPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <EmailContent />
    </RequireAuth>
  );
}

function emptySession(branding?: {
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
}): EmailEditorSession {
  return {
    editingId: null,
    draftCampaignId: null,
    name: "",
    subject: "",
    document: applyEmailBranding(createEmptyEmailDocument(), {
      businessName: branding?.name,
      logoUrl: branding?.logoUrl,
      primaryColor: branding?.primaryColor,
    }),
    segmentId: "",
  };
}

function sessionFromTemplate(
  tpl: EmailTemplate,
  extra?: { draftCampaignId?: string | null; segmentId?: string },
): EmailEditorSession {
  return {
    editingId: tpl.id,
    draftCampaignId: extra?.draftCampaignId ?? null,
    name: tpl.name,
    subject: tpl.subject,
    document: parseTemplateDocument(tpl.bodyJson, tpl.bodyMd),
    segmentId: extra?.segmentId ?? "",
  };
}

function EmailContent() {
  // Sayfa açılınca sadece gerekenler çekilir:
  // şablon + kampanya listesi + işletme bilgisi.
  // Segment, hazır şablon ve editör verisi yalnızca ihtiyaç olunca istenir.
  const {
    data: templates,
    loading: tplLoading,
    reload: reloadTemplates,
  } = useApiQuery<EmailTemplate[]>("email:templates", "/email/templates");
  const {
    data: campaigns,
    loading: campLoading,
    reload: reloadCampaigns,
  } = useApiQuery<EmailCampaign[]>("email:campaigns", "/email/campaigns");
  const { data: tenant } = useApiQuery<TenantMe>(
    "settings:me",
    "/tenants/me",
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [showStarters, setShowStarters] = useState(false);
  const { data: segments } = useApiQuery<Segment[]>(
    "crm-segments",
    "/crm/segments",
    { enabled: editorOpen },
  );
  const { data: starters } = useApiQuery<EmailStarterSummary[]>(
    "email:starters",
    "/email/starters",
    { enabled: showStarters },
  );

  const [session, setSession] = useState<EmailEditorSession>(() =>
    emptySession(),
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Silme onayı: tarayıcı uyarısı yerine kartın içinde sorulur */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openNew = useCallback(() => {
    setSession(
      emptySession({
        name: tenant?.name,
        logoUrl: tenant?.logoUrl,
        primaryColor: tenant?.primaryColor,
      }),
    );
    setEditorOpen(true);
    setOk(null);
    setError(null);
  }, [tenant?.name, tenant?.logoUrl, tenant?.primaryColor]);

  const openSession = useCallback((next: EmailEditorSession) => {
    setSession(next);
    setEditorOpen(true);
    setOk(null);
    setError(null);
  }, []);

  /** Şablon zaten listede var; ekstra GET yok. */
  const openTemplateRow = useCallback(
    async (
      templateId: string,
      extra?: { draftCampaignId?: string | null; segmentId?: string },
    ) => {
      const row = templates?.find((t) => t.id === templateId);
      if (row) {
        openSession(sessionFromTemplate(row, extra));
        return;
      }
      // Listede yoksa (nadir) tek sefer çek
      setBusy(true);
      try {
        const tpl = await api<EmailTemplate>(`/email/templates/${templateId}`);
        openSession(sessionFromTemplate(tpl, extra));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Şablon yüklenemedi");
      } finally {
        setBusy(false);
      }
    },
    [templates, openSession],
  );

  async function saveTemplate(
    current: EmailEditorSession,
  ): Promise<string | null> {
    if (!current.name.trim() || !current.subject.trim()) {
      throw new Error("Şablon adı ve konu gerekli");
    }
    const payload = {
      name: current.name.trim(),
      subject: current.subject.trim(),
      bodyJson: current.document,
    };
    if (current.editingId) {
      await api(`/email/templates/${current.editingId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await reloadTemplates(true);
      setOk("Kaydedildi");
      return current.editingId;
    }
    const created = await api<EmailTemplate>("/email/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await reloadTemplates(true);
    setOk("Kaydedildi");
    return created.id;
  }

  async function createCampaign(templateId: string, segmentId: string) {
    const camp = await api<EmailCampaign>("/email/campaigns", {
      method: "POST",
      body: JSON.stringify({
        templateId,
        ...(segmentId ? { segmentId } : {}),
      }),
    });
    return camp.id;
  }

  async function sendCampaign(id: string) {
    const result = await api<{ sent: number; failed?: number }>(
      `/email/campaigns/${id}/send`,
      { method: "POST" },
    );
    setOk(
      `E-posta gönderildi: ${result.sent} kişi${result.failed ? ` · ${result.failed} hata` : ""}`,
    );
    await reloadCampaigns(true);
    setEditorOpen(false);
  }

  /** Gönderilmiş kampanyayı yeni taslak olarak kopyalar ve açar. */
  async function duplicateCampaign(campaignId: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{
        template: EmailTemplate;
        campaign: EmailCampaign;
      }>(`/email/campaigns/${campaignId}/duplicate`, { method: "POST" });
      openSession(
        sessionFromTemplate(result.template, {
          draftCampaignId: result.campaign.id,
          segmentId: result.campaign.segmentId ?? "",
        }),
      );
      await Promise.all([reloadTemplates(true), reloadCampaigns(true)]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kopyalama başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function pickStarter(starterId: string) {
    setBusy(true);
    setError(null);
    try {
      const tpl = await api<EmailTemplate>("/email/templates/from-starter", {
        method: "POST",
        body: JSON.stringify({ starterId }),
      });
      openSession(sessionFromTemplate(tpl));
      await reloadTemplates(true);
      setOk("Hazır e-posta açıldı. Düzenleyip gönderebilirsiniz.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Şablon yüklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(templateId: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/email/templates/${templateId}`, { method: "DELETE" });
      setConfirmDeleteId(null);
      await reloadTemplates(true);
      setOk("Şablon silindi");
    } catch (err) {
      setConfirmDeleteId(null);
      setError(err instanceof ApiError ? err.message : "Şablon silinemedi");
    } finally {
      setBusy(false);
    }
  }

  async function copyTemplate(templateId: string) {
    setBusy(true);
    setError(null);
    try {
      const tpl = await api<EmailTemplate>(
        `/email/templates/${templateId}/duplicate`,
        { method: "POST" },
      );
      await reloadTemplates(true);
      setOk("Kopya oluşturuldu");
      openSession(sessionFromTemplate(tpl));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kopyalama başarısız");
    } finally {
      setBusy(false);
    }
  }

  const tpls = templates ?? [];
  const rows = campaigns ?? [];
  const segmentName = (id: string | null) =>
    id
      ? (segments?.find((s) => s.id === id)?.name ?? "Seçili grup")
      : "Tüm müşteriler";

  const sentCount = rows.filter((c) => c.status === "SENT").length;
  const draftCount = rows.length - sentCount;

  return (
    <>
      <div className="w-full space-y-6">
        <PageHeader
          eyebrow="Müşterilere mesaj"
          title="E-posta"
          subtitle="Şablon yazın, önizleyin, segmentinize gönderin."
          help="Müşterilerin e-posta adresi dolu olmalı."
          actions={
            <button type="button" className={btnPrimary()} onClick={openNew}>
              Yeni e-posta
            </button>
          }
        />
        <ErrorBanner message={error} />
        <SuccessBanner message={ok} />

        {/* Özet */}
        <section aria-label="Özet" className="grid grid-cols-3 gap-5">
          <div className="attio-surface p-3 sm:p-4">
            <p className="truncate text-[11px] font-medium text-[var(--muted)] sm:text-xs">Şablon</p>
            <p className="mt-1 font-display text-xl tabular-nums tracking-tight text-[var(--ink)] sm:text-2xl">{tpls.length}</p>
          </div>
          <div className="attio-surface p-3 sm:p-4">
            <p className="truncate text-[11px] font-medium text-[var(--muted)] sm:text-xs">Gönderilen</p>
            <p className="mt-1 font-display text-xl tabular-nums tracking-tight text-[var(--ink)] sm:text-2xl">{sentCount}</p>
          </div>
          <div className="attio-surface p-3 sm:p-4">
            <p className="truncate text-[11px] font-medium text-[var(--muted)] sm:text-xs">Taslak</p>
            <p className="mt-1 font-display text-xl tabular-nums tracking-tight text-[var(--ink)] sm:text-2xl">{draftCount}</p>
          </div>
        </section>

        {/* Adımlar */}
        <ol className="grid gap-5 sm:grid-cols-3" aria-label="Nasıl çalışır">
          {[
            ["Yazın", "Hazır örnekten başlayın ya da sıfırdan yazın."],
            ["Önizleyin", "Logonuz ve renkleriniz otomatik eklenir."],
            ["Gönderin", "Bir segment seçip gönderimi onaylayın."],
          ].map(([title, desc], i) => (
            <li key={title} className="flex gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-3.5 py-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-xs font-semibold tabular-nums text-[var(--ink)]">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-medium text-[var(--ink)]">{title}</p>
                <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">{desc}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Şablonlar */}
        <section aria-label="Şablonlarınız" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[0.95rem] tracking-tight text-[var(--ink)]">Şablonlarınız</h2>
            <p className="text-[0.75rem] text-[var(--muted)]">Aç: düzenle · Kopyala: aynısından yeni yap</p>
          </div>
          {tplLoading && !tpls.length ? (
            <ListRowsSkeleton rows={3} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tpls.map((t) => {
                const excerpt = (t.bodyMd ?? "")
                  .replace(/[#*_>`[\]()]/g, "")
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(" ");
                return (
                  <li key={t.id} className="flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-sm)]">
                    <div className="flex-1 space-y-2 p-4">
                      <div className="h-1.5 w-12 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 min-w-0 text-[0.875rem] font-semibold text-[var(--ink)]">{t.subject || "Konu yok"}</p>
                          <button
                            type="button"
                            aria-label={`${t.name} şablonunu sil`}
                            title="Sil"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--danger)]/40 bg-[var(--danger-soft)] text-[var(--danger)] transition hover:bg-[var(--danger)] hover:text-white disabled:opacity-50"
                            disabled={busy}
                            onClick={() => setConfirmDeleteId(t.id)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                            </svg>
                          </button>
                      </div>
                      <p className="line-clamp-3 text-[0.75rem] leading-relaxed text-[var(--muted)]">{excerpt || "İçerik henüz yazılmadı."}</p>
                    </div>
                    <div className="flex flex-col gap-2 border-t border-[var(--line)] bg-[var(--background)] px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[0.8125rem] font-medium text-[var(--ink)]">{t.name}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[0.6875rem] text-[var(--muted)]">
                          {new Date(t.updatedAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                        <div className="flex shrink-0 gap-1.5">
                          <button type="button" className={btnPrimary()} disabled={busy} onClick={() => void openTemplateRow(t.id)}>
                            Aç
                          </button>
                          <button type="button" className={btnGhost()} disabled={busy} onClick={() => void copyTemplate(t.id)}>
                            Kopyala
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  onClick={openNew}
                  className="flex h-full min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line-strong)] p-4 text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent-soft)] text-lg text-[var(--accent)]">+</span>
                  <span className="text-[0.8125rem] font-medium">Yeni şablon</span>
                </button>
              </li>
            </ul>
          )}
        </section>

        {/* Hazır örnekler: pencere içinde açılır */}
        <section aria-label="Hazır örnekler" className="attio-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-[0.95rem] tracking-tight text-[var(--ink)]">Hazır örnekler</h2>
            <p className="mt-0.5 text-[0.75rem] text-[var(--muted)]">Sektörünüze uygun hazır şablonlardan başlayın. Logonuz ve renkleriniz otomatik eklenir.</p>
          </div>
          <button type="button" className={`${btnPrimary()} shrink-0`} onClick={() => setShowStarters(true)}>
            Örnekleri göster
          </button>
        </section>

        <Dialog
          open={showStarters}
          size="xl"
          title="Hazır örnekler"
          description="Bir örnek seçin; logonuz ve renkleriniz otomatik eklenir."
          onClose={() => setShowStarters(false)}
        >
          <EmailStarterGallery
            starters={starters ?? []}
            busy={busy}
            onPick={(id) => {
              setShowStarters(false);
              void pickStarter(id);
            }}
          />
        </Dialog>

        {/* Kampanyalar */}
        <section aria-label="Kampanyalar" className="attio-surface overflow-hidden">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="font-display text-[0.95rem] tracking-tight text-[var(--ink)]">Kampanyalar</h2>
            <p className="mt-0.5 text-[0.75rem] text-[var(--muted)]">Gönderilmiş ve taslak e-postalar.</p>
          </div>
          {campLoading && !rows.length ? (
            <div className="p-4"><ListRowsSkeleton rows={3} /></div>
          ) : rows.length === 0 ? (
            <div className="p-4"><EmptyState title="Henüz e-posta gönderilmedi" /></div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {rows.map((c) => {
                const sent = c.status === "SENT";
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] font-medium text-[var(--ink)]">
                        {c.template?.name ?? tpls.find((t) => t.id === c.templateId)?.name ?? "E-posta"}
                      </p>
                      <p className="text-[0.6875rem] text-[var(--muted)]">
                        {segmentName(c.segmentId)}
                        {sent && c.sentCount != null ? ` · ${c.sentCount} kişi` : ""}
                        {" · "}
                        {new Date(c.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium ${
                          sent
                            ? "border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"
                        }`}
                      >
                        {sent ? "Gönderildi" : "Taslak"}
                      </span>
                      {sent ? (
                        <button type="button" className={btnGhost()} disabled={busy} onClick={() => void duplicateCampaign(c.id)}>
                          Kopyala
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={btnPrimary()}
                          disabled={busy}
                          onClick={() => void openTemplateRow(c.templateId, { draftCampaignId: c.id, segmentId: c.segmentId ?? "" })}
                        >
                          Devam et
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Şablon silinsin mi?"
        confirmLabel="Evet, sil"
        danger
        busy={busy}
        onConfirm={() => confirmDeleteId && void deleteTemplate(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      >
        <strong className="font-medium text-[var(--ink)]">
          {tpls.find((x) => x.id === confirmDeleteId)?.name ?? "Bu şablon"}
        </strong>{" "}
        kalıcı olarak silinecek. Bu işlem geri alınamaz.
      </ConfirmDialog>

      <EmailEditorModal
        open={editorOpen}
        session={session}
        tenantLogoUrl={tenant?.logoUrl}
        businessName={tenant?.name}
        businessPhone={tenant?.passPhone}
        businessWebsite={tenant?.passWebsiteUrl}
        segments={segments ?? []}
        busy={busy}
        onClose={() => setEditorOpen(false)}
        onSessionChange={(patch) => setSession((s) => ({ ...s, ...patch }))}
        onSave={saveTemplate}
        onCreateCampaign={createCampaign}
        onSend={sendCampaign}
      />
    </>
  );
}
