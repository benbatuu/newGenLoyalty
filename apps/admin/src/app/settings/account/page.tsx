"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ErrorBanner,
  Field,
  ListRowsSkeleton,
  SuccessBanner,
  Tabs,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../../components/ui";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { Dialog } from "../../../components/dialog";
import { ApiError, api, getStoredTokens } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { refreshSessionData, useSessionData } from "../../../lib/session-data";
import { resolveAdminAssetUrl } from "../../../lib/public-urls";
import { useApiQuery } from "../../../lib/use-api-query";

type AccountTenant = {
  name: string;
  logoUrl?: string | null;
  notifyIconUrl?: string | null;
  slug: string;
  isActive: boolean;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "CANCELLED" | "SUSPENDED";
  subscriptionAccessEndsAt?: string | null;
  deletionScheduledAt?: string | null;
  planCode: string;
  passPhone?: string | null;
  passWebsiteUrl?: string | null;
};

type PublicPlan = {
  code: string;
  labelTr: string;
  priceTry: number;
  maxPrograms: number;
  maxBranches: number;
  includesTr: string[];
};

type Session = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
};

/** Tarayıcı ve işletim sistemi adını User-Agent'tan çıkarır. */
function deviceLabel(ua: string | null): string {
  if (!ua) return "Bilinmeyen cihaz";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Tarayıcı";
  return os ? `${browser} · ${os}` : browser;
}

type TabId = "profile" | "security" | "business" | "plan" | "danger";

const STATUS_LABEL: Record<AccountTenant["subscriptionStatus"], string> = {
  TRIAL: "Deneme",
  ACTIVE: "Aktif",
  CANCELLED: "İptal edildi",
  SUSPENDED: "Askıda",
};

function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

/** Tam genişlik kart: tüm bölümler aynı yapıda. */
function Card({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-[var(--ink)]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-medium text-[var(--ink)]">{value}</dd>
    </div>
  );
}

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<TabId>("profile");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Marka ve paket bilgileri oturum önbelleğinden: sayfa açılınca istek atılmaz.
  const { data: tenant, error: tenantError } = useSessionData<AccountTenant>("tenant");
  const { data: planInfo } = useSessionData<{ planCode: string; priceTry: number }>("plan");

  // Ek veriler yalnızca ilgili sekme açılınca istenir.
  // Oturumlar: mevcut refresh token başlıkla gönderilir; "bu oturum" böylece doğru bulunur.
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const loadSessions = useCallback(async () => {
    const rt = getStoredTokens()?.refreshToken;
    const list = await api<Session[]>("/auth/sessions", {
      headers: rt ? { "x-session-token": rt } : {},
    });
    setSessions(list);
    return list;
  }, []);
  useEffect(() => {
    void loadSessions().catch(() => {});
  }, [tab, loadSessions]);

  /** Bu oturum da kapandıysa (ör. başka cihazdan veya şifre değişimiyle) giriş ekranına dön. */
  async function refreshSessionsOrLogout() {
    const list = await loadSessions();
    if (!list.some((x) => x.current)) {
      logout();
    }
  }
  const { data: plans, reload: reloadPlans } = useApiQuery<PublicPlan[]>(
    "public:plans",
    "/public/plans",
  );

  // Form alanları
  const [fullName, setFullName] = useState<string | null>(null);
  const [bizName, setBizName] = useState<string | null>(null);
  const [bizPhone, setBizPhone] = useState<string | null>(null);
  const [bizWeb, setBizWeb] = useState<string | null>(null);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  const currentPrice = planInfo?.priceTry;
  const status = tenant?.subscriptionStatus ?? "ACTIVE";
  const [confirmAction, setConfirmAction] = useState<"cancel" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteNote, setDeleteNote] = useState("");
  const [deleteAck, setDeleteAck] = useState(false);

  function flash(message: string) {
    setOk(message);
    setError(null);
  }

  function fail(err: unknown, fallback: string) {
    setError(err instanceof ApiError ? err.message : fallback);
    setOk(null);
  }

  async function run(fn: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await fn();
    } catch (err) {
      fail(err, fallback);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    const next = (fullName ?? user?.name ?? "").trim();
    await run(async () => {
      await api("/auth/me", { method: "PATCH", body: JSON.stringify({ name: next }) });
      setFullName(null);
      flash("Profil kaydedildi");
    }, "Profil kaydedilemedi");
  }

  async function saveBusiness(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      await api("/tenants/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: (bizName ?? tenant?.name ?? "").trim(),
          passPhone: (bizPhone ?? tenant?.passPhone ?? "") || null,
          passWebsiteUrl: (bizWeb ?? tenant?.passWebsiteUrl ?? "") || null,
        }),
      });
      setBizName(null);
      setBizPhone(null);
      setBizWeb(null);
      refreshSessionData("tenant");
      flash("İşletme bilgileri kaydedildi");
    }, "İşletme bilgileri kaydedilemedi");
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (newPw !== newPw2) {
      setError("Yeni şifreler eşleşmiyor");
      return;
    }
    await run(async () => {
      await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: curPw,
          newPassword: newPw,
          refreshToken: getStoredTokens()?.refreshToken,
        }),
      });
      setCurPw("");
      setNewPw("");
      setNewPw2("");
      await refreshSessionsOrLogout();
      flash("Şifreniz değiştirildi. Diğer cihazlardaki oturumlar kapatıldı.");
    }, "Şifre değiştirilemedi");
  }

  async function revokeSession(id: string) {
    await run(async () => {
      await api(`/auth/sessions/${id}`, { method: "DELETE" });
      await refreshSessionsOrLogout();
      flash("Oturum kapatıldı");
    }, "Oturum kapatılamadı");
  }

  async function revokeOthers() {
    const rt = getStoredTokens()?.refreshToken;
    if (!rt) return;
    await run(async () => {
      await api("/auth/sessions/revoke-others", {
        method: "POST",
        body: JSON.stringify({ refreshToken: rt }),
      });
      await refreshSessionsOrLogout();
      flash("Diğer tüm oturumlar kapatıldı");
    }, "Oturumlar kapatılamadı");
  }

  async function changePlan(code: string) {
    await run(async () => {
      await api("/tenants/me/subscription/plan", {
        method: "POST",
        body: JSON.stringify({ planCode: code }),
      });
      refreshSessionData("tenant", "plan");
      await reloadPlans(true);
      flash("Paketiniz güncellendi");
    }, "Paket değiştirilemedi");
  }

  async function subscriptionAction(path: string, _confirmText: string, done: string) {
    await run(async () => {
      await api(path, { method: "POST" });
      refreshSessionData("tenant");
      flash(done);
    }, "İşlem tamamlanamadı");
  }

  if (!tenant && !tenantError) {
    return <ListRowsSkeleton rows={4} />;
  }

  const tabs: { id: TabId; label: string; hint: string }[] = [
    { id: "profile", label: "Profil", hint: "Ad ve giriş" },
    { id: "security", label: "Güvenlik", hint: "Şifre ve oturumlar" },
    { id: "business", label: "İşletme", hint: "Ad ve iletişim" },
    { id: "plan", label: "Paket", hint: "Plan ve fatura" },
    { id: "danger", label: "İptal ve silme", hint: "Abonelik" },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Üst kart */}
      <section className="relative w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {tenant?.notifyIconUrl || tenant?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveAdminAssetUrl(tenant.notifyIconUrl || tenant.logoUrl)} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-[0_8px_24px_rgba(239,35,60,0.3)]" />
            ) : (
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--accent)] font-display text-lg font-semibold text-white shadow-[0_8px_24px_rgba(239,35,60,0.3)]">
                {initials(user?.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">{tenant?.name ?? "İşletmeniz"}</p>
              <h1 className="truncate font-display text-xl font-semibold tracking-tight text-[var(--ink)] sm:text-2xl">{user?.name ?? "—"}</h1>
              <p className="truncate text-sm text-[var(--muted)]">{user?.email ?? "—"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip>{tenant?.isActive ? "Hesap açık" : "Hesap dondurulmuş"}</Chip>
            <Chip>{STATUS_LABEL[status]}</Chip>
            <Chip>{tenant?.planCode ?? "—"} paketi</Chip>
          </div>
        </div>
      </section>

      <ErrorBanner message={tenantError ?? error} />
      <SuccessBanner message={ok} />

      {true ? (
        <Card eyebrow="Profil" title="Kişisel bilgiler">
          <form className="grid gap-5 md:grid-cols-2" onSubmit={saveProfile}>
            <Field label="Ad soyad">
              <input
                className={inputClassName()}
                value={fullName ?? user?.name ?? ""}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
              />
            </Field>
            <Field label="E-posta" hint="Değiştirmek için destek ile iletişime geçin">
              <input className={inputClassName()} value={user?.email ?? ""} readOnly disabled />
            </Field>
            <Field label="Yetki">
              <input className={inputClassName()} value="İşletme sahibi" readOnly disabled />
            </Field>
            <div className="flex items-end">
              <button type="submit" className={btnPrimary()} disabled={busy}>
                Profili kaydet
              </button>
            </div>
          </form>
          <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--line)] pt-6">
            <button type="button" className={btnGhost()} onClick={() => logout()}>
              Çıkış yap
            </button>
          </div>
        </Card>
      ) : null}

      {true ? (
        <div className="space-y-6">
          <Card eyebrow="Şifre" title="Şifreyi değiştir">
            <form className="grid gap-5 md:grid-cols-3" onSubmit={changePassword}>
              <Field label="Mevcut şifre">
                <input type="password" className={inputClassName()} value={curPw} onChange={(e) => setCurPw(e.target.value)} required autoComplete="current-password" />
              </Field>
              <Field label="Yeni şifre" hint="En az 8 karakter">
                <input type="password" className={inputClassName()} value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} autoComplete="new-password" />
              </Field>
              <Field label="Yeni şifre (tekrar)">
                <input type="password" className={inputClassName()} value={newPw2} onChange={(e) => setNewPw2(e.target.value)} required minLength={8} autoComplete="new-password" />
              </Field>
              <div className="md:col-span-3">
                <button type="submit" className={btnPrimary()} disabled={busy}>
                  Şifreyi değiştir
                </button>
              </div>
            </form>
            <p className="mt-4 text-xs text-[var(--muted)]">
              Şifrenizi unuttuysanız{" "}
              <Link href="/forgot-password" className="font-medium text-[var(--ink)] underline-offset-4 hover:underline">
                sıfırlama bağlantısı
              </Link>{" "}
              isteyebilirsiniz.
            </p>
          </Card>

          <Card eyebrow="Oturumlar" title="Açık oturumlar">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted)]">Her cihaz tek satırdır (en fazla 10). Tanımadığınız bir cihazı kapatın.</p>
              <button type="button" className={btnGhost()} onClick={() => void revokeOthers()} disabled={busy}>
                Diğer oturumları kapat
              </button>
            </div>
            {!sessions ? (
              <ListRowsSkeleton rows={2} />
            ) : sessions.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Açık oturum yok.</p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {sessions.map((sess) => (
                  <li key={sess.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
                        {deviceLabel(sess.userAgent)}
                        {sess.current ? (
                          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-medium text-white">Bu cihaz</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        IP: {sess.ip ?? "—"} · Son kullanım: {fmtDate(sess.lastUsedAt)}
                      </p>
                    </div>
                    {sess.current ? null : (
                      <button type="button" className={btnGhost()} onClick={() => void revokeSession(sess.id)} disabled={busy}>
                        Kapat
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {true ? (
        <Card eyebrow="İşletme" title="İşletme bilgileri">
          <form className="grid gap-5 md:grid-cols-2" onSubmit={saveBusiness}>
            <Field label="İşletme adı" hint="Müşteri kartlarında ve davet sayfasında görünür">
              <input className={inputClassName()} value={bizName ?? tenant?.name ?? ""} onChange={(e) => setBizName(e.target.value)} required />
            </Field>
            <Field label="Kısa adres" hint="Değiştirilemez">
              <input className={inputClassName()} value={tenant?.slug ? `/${tenant.slug}` : "—"} readOnly disabled />
            </Field>
            <Field label="Telefon">
              <input className={inputClassName()} value={bizPhone ?? tenant?.passPhone ?? ""} onChange={(e) => setBizPhone(e.target.value)} placeholder="0532 000 00 00" />
            </Field>
            <Field label="Web sitesi">
              <input className={inputClassName()} value={bizWeb ?? tenant?.passWebsiteUrl ?? ""} onChange={(e) => setBizWeb(e.target.value)} placeholder="https://" />
            </Field>
            <div className="md:col-span-2">
              <button type="submit" className={btnPrimary()} disabled={busy}>
                İşletme bilgilerini kaydet
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      {true ? (
        <Card eyebrow="Paket ve fatura" title={`Mevcut paket: ${planInfo?.planCode ?? tenant?.planCode ?? "—"}`}>
          <dl className="divide-y divide-[var(--line)]">
            <Row label="Aylık ücret" value={currentPrice !== undefined ? `₺${currentPrice}` : "—"} />
            <Row label="Durum" value={STATUS_LABEL[status]} />
          </dl>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {!plans ? (
              <div className="md:col-span-2 xl:col-span-4"><ListRowsSkeleton rows={2} /></div>
            ) : (
              plans.map((p) => {
                const isCurrent = p.code === tenant?.planCode;
                const isUp = currentPrice !== undefined && p.priceTry > currentPrice;
                return (
                  <article key={p.code} className={`flex flex-col rounded-xl border p-5 ${isCurrent ? "border-[var(--ink)] ring-1 ring-[var(--ink)]/15" : "border-[var(--line)]"}`}>
                    <p className="font-display text-base font-semibold text-[var(--ink)]">{p.labelTr}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">₺{p.priceTry}<span className="text-xs font-normal text-[var(--muted)]"> /ay</span></p>
                    <ul className="mt-3 flex-1 space-y-1 text-[0.8125rem] text-[var(--muted)]">
                      <li>{p.maxPrograms} sadakat kartı</li>
                      <li>{p.maxBranches} şube</li>
                    </ul>
                    {isCurrent ? (
                      <span className="mt-4 text-center text-xs font-medium text-[var(--muted)]">Mevcut paketiniz</span>
                    ) : (
                      <button type="button" className={`mt-4 w-full ${isUp ? btnPrimary() : btnGhost()}`} disabled={busy} onClick={() => void changePlan(p.code)}>
                        {currentPrice === undefined ? "Bu paketi seç" : isUp ? "Yükselt" : "Düşür"}
                      </button>
                    )}
                  </article>
                );
              })
            )}
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Düşürme hemen uygulanır. Yeni paketin limitlerini aşan kart veya şube varsa önce onları kaldırın. Yükseltme için ödeme gerekir.
          </p>
          <div className="mt-6 border-t border-[var(--line)] pt-5">
            <Link href="/settings/billing" className="text-sm font-medium text-[var(--ink)] underline-offset-4 hover:underline">
              Fatura ve abonelik geçmişi
            </Link>
          </div>
        </Card>
      ) : null}

      <Card eyebrow="Abonelik" title="İptal ve silme">
        <div className="divide-y divide-[var(--line)]">
          {status === "CANCELLED" ? (
            <div className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">Abonelik iptal edildi</p>
                <p className="text-xs text-[var(--muted)]">
                  {tenant?.subscriptionAccessEndsAt
                    ? `Erişiminiz ${new Date(tenant.subscriptionAccessEndsAt).toLocaleDateString("tr-TR")} tarihine kadar devam ediyor.`
                    : "Erişiminiz dönem sonuna kadar devam ediyor."}
                </p>
              </div>
              <button type="button" className={btnPrimary()} disabled={busy} onClick={() => void run(async () => {
                await api("/tenants/me/subscription/resume", { method: "POST" });
                refreshSessionData("tenant");
                flash("İptal geri alındı");
              }, "İptal geri alınamadı")}>
                İptali geri al
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">Aboneliği iptal et</p>
                <p className="text-xs text-[var(--muted)]">Ayın sonuna kadar kullanmaya devam edersiniz. Sonrasında giriş kapanır.</p>
              </div>
              <button type="button" className={btnGhost()} disabled={busy} onClick={() => setConfirmAction("cancel")}>
                İptal et
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">Hesabı kalıcı olarak sil</p>
              <p className="text-xs text-[var(--muted)]">Bu işlem geri alınamaz. Destek ekibi üzerinden yapılır.</p>
            </div>
            {tenant?.deletionScheduledAt ? (
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                <span>Silme planlandı: {new Date(tenant.deletionScheduledAt).toLocaleDateString("tr-TR")}</span>
                <button type="button" className={btnGhost()} disabled={busy} onClick={() => void run(async () => {
                  await api("/tenants/me/deletion/cancel", { method: "POST" });
                  refreshSessionData("tenant");
                  flash("Silme talebi iptal edildi");
                }, "İptal edilemedi")}>
                  Silmeyi iptal et
                </button>
              </div>
            ) : (
              <button type="button" className={btnGhost()} disabled={busy} onClick={() => setDeleteOpen(true)}>
                Hesabı sil
              </button>
            )}
          </div>
        </div>
      </Card>

      <Dialog
        open={deleteOpen}
        size="md"
        title="Hesabı silme talebi"
        description="Talebiniz 14 gün içinde kesinleşir. Bu süre boyunca iptal edebilirsiniz."
        onClose={() => setDeleteOpen(false)}
      >
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!deleteReason || !deleteAck) return;
            void run(async () => {
              await api("/tenants/me/deletion", { method: "POST", body: JSON.stringify({ reason: deleteReason, note: deleteNote }) });
              refreshSessionData("tenant");
              setDeleteOpen(false);
              setDeleteReason("");
              setDeleteNote("");
              setDeleteAck(false);
              flash("Silme talebi alındı. 14 gün içinde iptal edebilirsiniz.");
            }, "Talep oluşturulamadı");
          }}
        >
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[0.8125rem] font-medium text-[var(--ink)]">Neden ayrılmak istiyorsunuz?</legend>
            {[
              ["NO_LONGER_USING", "Artık kullanmıyorum"],
              ["PRICE", "Fiyat uygun değil"],
              ["MISSING_FEATURES", "İhtiyacım olan özellikler yok"],
              ["TECHNICAL", "Teknik sorunlar yaşadım"],
              ["SWITCHED", "Başka bir sisteme geçtim"],
              ["OTHER", "Diğer"],
            ].map(([id, label]) => (
              <label key={id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${deleteReason === id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] hover:bg-[var(--surface)]"}`}>
                <input type="radio" name="delete-reason" value={id} checked={deleteReason === id} onChange={() => setDeleteReason(id)} className="accent-[var(--accent)]" />
                <span className="text-[var(--ink)]">{label}</span>
              </label>
            ))}
          </fieldset>
          <Field label="Eklemek istediğiniz bir şey var mı? (isteğe bağlı)">
            <textarea className={inputClassName()} rows={3} value={deleteNote} onChange={(e) => setDeleteNote(e.target.value)} maxLength={1000} />
          </Field>
          <label className="flex items-start gap-3 text-sm text-[var(--ink)]">
            <input type="checkbox" checked={deleteAck} onChange={(e) => setDeleteAck(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
            <span>Hesabımın, işletme verilerimin ve müşteri kartlarının 14 gün sonra kalıcı olarak silineceğini ve bunun geri alınamayacağını anlıyorum.</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnGhost()} onClick={() => setDeleteOpen(false)}>Vazgeç</button>
            <button type="submit" disabled={!deleteReason || !deleteAck || busy} className="h-9 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-deep)] disabled:opacity-50">
              Silme talebi oluştur
            </button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmAction === "cancel"}
        title="Abonelik iptal edilsin mi?"
        confirmLabel="Evet, iptal et"
        cancelLabel="Vazgeç"
        danger
        busy={busy}
        onConfirm={() => {
          setConfirmAction(null);
          void subscriptionAction("/tenants/me/subscription/cancel", "", "Abonelik iptal edildi");
        }}
        onCancel={() => setConfirmAction(null)}
      >
        Ayın sonuna kadar hesabınızı kullanmaya devam edersiniz. Dönem bitince giriş kapanır; iptali dilediğiniz zaman bu sayfadan geri alabilirsiniz.
      </ConfirmDialog>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--ink)]">
      {children}
    </span>
  );
}
