"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorBanner, RequireAuth, SuccessBanner, btnPrimary, inputClassName } from "../../../components/ui";
import { ApiError, api, apiUpload } from "../../../lib/api";
import { useApiQuery } from "../../../lib/use-api-query";

type BlockType = "card" | "text" | "image" | "spacer" | "divider" | "wallet" | "form" | "legal" | "policies";
type Block = { id: string; type: BlockType; props: Record<string, unknown> };

type Tenant = {
  inviteLayout: Block[] | null;
  inviteHeadline: string | null;
  inviteSubtitle: string | null;
  inviteStatusText: string | null;
  inviteBgColor: string | null;
  inviteCardColor: string | null;
  primaryColor: string | null;
};

const BLOCK_META: Record<BlockType, { label: string; hint: string; defaults: Record<string, unknown> }> = {
  card: { label: "Kart", hint: "Logo, başlık, damga", defaults: { headline: "", subtitle: "", statusText: "", showLogo: true, showDots: true } },
  text: { label: "Metin", hint: "Serbest paragraf", defaults: { text: "Yeni metin", align: "left", size: "md" } },
  image: { label: "Görsel", hint: "Kampanya ya da ürün", defaults: { url: "", height: 160 } },
  spacer: { label: "Boşluk", hint: "Dikey aralık", defaults: { height: 24 } },
  divider: { label: "Çizgi", hint: "Bölüm ayırıcı", defaults: {} },
  wallet: { label: "Wallet düğmeleri", hint: "Apple / Google", defaults: { ctaHint: "" } },
  form: { label: "Bilgi formu", hint: "Ad ve doğum günü", defaults: {} },
  legal: { label: "KVKK / not", hint: "Alt metin", defaults: { text: "" } },
  policies: { label: "Politikalar", hint: "Bağlantılı metinler", defaults: {} },
};

const DEFAULT_LAYOUT: Block[] = [
  { id: "card", type: "card", props: { ...BLOCK_META.card.defaults } },
  { id: "form", type: "form", props: {} },
  { id: "wallet", type: "wallet", props: {} },
  { id: "legal", type: "legal", props: {} },
  { id: "policies", type: "policies", props: {} },
];

const DEVICES = [
  { key: "mobile", label: "Telefon", width: 390 },
  { key: "tablet", label: "Tablet", width: 820 },
  { key: "desktop", label: "Masaüstü", width: 0 },
] as const;

export default function InviteDesignPage() {
  return (
    <RequireAuth roles={["STORE_OWNER", "SUPER_ADMIN"]}>
      <InviteDesignContent />
    </RequireAuth>
  );
}

function InviteDesignContent() {
  const { data: tenant, error: loadError, reload } = useApiQuery<Tenant>("tenant:me", "/tenants/me");
  const [blocks, setBlocks] = useState<Block[]>(DEFAULT_LAYOUT);
  const [bg, setBg] = useState("");
  const [card, setCard] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_LAYOUT[0]?.id ?? null);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["key"]>("mobile");
  const [html, setHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const seq = useRef(0);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!tenant || hydrated.current) return;
    hydrated.current = true;
    // Kayıtlı düzen yoksa varsayılan kart, mevcut metinlerle doldurulur
    const initial = tenant.inviteLayout?.length
      ? tenant.inviteLayout
      : DEFAULT_LAYOUT.map((b) =>
          b.type === "card"
            ? {
                ...b,
                props: {
                  ...b.props,
                  headline: tenant.inviteHeadline ?? "",
                  subtitle: tenant.inviteSubtitle ?? "",
                  statusText: tenant.inviteStatusText ?? "",
                },
              }
            : b,
        );
    setBlocks(initial);
    // İlk blok otomatik seçili gelsin
    setSelectedId(initial[0]?.id ?? null);
    setBg(tenant.inviteBgColor ?? "");
    setCard(tenant.inviteCardColor ?? "");
  }, [tenant]);

  const selected = useMemo(() => blocks.find((b) => b.id === selectedId) ?? null, [blocks, selectedId]);

  const payload = useMemo(
    () => ({
      inviteLayout: blocks.map((b) => ({ id: b.id, type: b.type, props: b.props })),
      inviteBgColor: bg.trim() || null,
      inviteCardColor: card.trim() || null,
    }),
    [blocks, bg, card],
  );
  const key = JSON.stringify(payload);

  useEffect(() => {
    const id = ++seq.current;
    // Bekleme yok: her değişiklikte hemen istek gider; eski yanıtlar yok sayılır
    const timer = window.setTimeout(() => {
      setPreviewBusy(true);
      api<{ html: string }>("/tenants/me/invite-draft-preview", { method: "POST", body: key })
        .then((res) => {
          if (id === seq.current) {
            setHtml(res.html);
            setPreviewError(null);
          }
        })
        .catch((err) => {
          if (id === seq.current) setPreviewError(err instanceof ApiError ? err.message : "Önizleme yüklenemedi");
        })
        .finally(() => {
          if (id === seq.current) setPreviewBusy(false);
        });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key]);

  function update(id: string, props: Record<string, unknown>) {
    setDirty(true);
    setBlocks((list) => list.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...props } } : b)));
  }

  function add(type: BlockType) {
    const id = `${type}-${Date.now().toString(36)}`;
    setDirty(true);
    setBlocks((list) => [...list, { id, type, props: { ...BLOCK_META[type].defaults } }]);
    setSelectedId(id);
  }

  function remove(id: string) {
    setDirty(true);
    setBlocks((list) => list.filter((b) => b.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  function move(id: string, dir: -1 | 1) {
    setDirty(true);
    setBlocks((list) => {
      const i = list.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api("/tenants/me", { method: "PATCH", body: JSON.stringify(payload) });
      setOk("Davet sayfası kaydedildi");
      setDirty(false);
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  function resetToDefault() {
    setDirty(true);
    setBlocks(DEFAULT_LAYOUT.map((b) => ({ ...b, props: { ...b.props } })));
    setSelectedId(null);
  }

  const width = DEVICES.find((d) => d.key === device)?.width ?? 0;

  return (
    <div className="-m-3 flex min-h-[calc(100vh-4rem)] flex-col sm:-m-5 lg:-m-6">
      {/* Üst çubuk */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--panel)] px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Müşteri davet sayfası</p>
          <h1 className="font-display text-lg font-semibold text-[var(--ink)]">Sayfayı tasarla</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1">
            {DEVICES.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDevice(d.key)}
                className={`h-7 rounded-full px-3 text-xs font-medium transition ${
                  device === d.key ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={resetToDefault} className="h-9 rounded-lg border border-[var(--line-strong)] px-3 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)]">
            Varsayılana dön
          </button>
          <button type="button" className={btnPrimary()} disabled={saving || !dirty} onClick={() => void save()}>
            {saving ? "Kaydediliyor…" : dirty ? "Kaydet" : "Kaydedildi"}
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-3 sm:px-6">
        <ErrorBanner message={error || loadError} />
        <SuccessBanner message={ok} />
      </div>

      <div className="grid flex-1 gap-4 p-4 sm:p-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* Bloklar */}
        <aside className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Sayfadaki bloklar</h2>
            <ol className="mt-3 space-y-2">
              {blocks.map((b, i) => (
                <li
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition ${
                    selectedId === b.id
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]"
                  }`}
                >
                  <span className="w-5 text-xs tabular-nums text-[var(--muted)]">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--ink)]">{BLOCK_META[b.type].label}</span>
                    <span className="block truncate text-[11px] text-[var(--muted)]">{BLOCK_META[b.type].hint}</span>
                  </span>
                  <span className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                    <IconBtn label="Yukarı" onClick={() => move(b.id, -1)} disabled={i === 0}>↑</IconBtn>
                    <IconBtn label="Aşağı" onClick={() => move(b.id, 1)} disabled={i === blocks.length - 1}>↓</IconBtn>
                    <IconBtn label="Sil" onClick={() => remove(b.id)} danger>✕</IconBtn>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Blok ekle</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(Object.keys(BLOCK_META) as BlockType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => add(t)}
                  className="rounded-xl border border-dashed border-[var(--line-strong)] px-3 py-2.5 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                >
                  <span className="block text-xs font-semibold text-[var(--ink)]">+ {BLOCK_META[t].label}</span>
                  <span className="block text-[10px] text-[var(--muted)]">{BLOCK_META[t].hint}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Canlı önizleme */}
        <section className="flex min-w-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-[var(--muted)]">
              {DEVICES.find((d) => d.key === device)?.label} görünümü · {width ? `${width}px` : "tam genişlik"}
            </p>
            <span className="text-[11px] text-[var(--muted)]">{previewBusy ? "Güncelleniyor…" : "Canlı"}</span>
          </div>
          {previewError ? <p className="mb-2 text-xs text-[var(--accent)]">{previewError}</p> : null}
          <div className="flex flex-1 justify-center overflow-auto rounded-xl bg-[var(--background)] p-3">
            <iframe
              title="Davet sayfası önizlemesi"
              srcDoc={html ?? "<p style='font-family:sans-serif;color:#999;padding:24px'>Yükleniyor…</p>"}
              style={{
                width: width ? `${width}px` : "100%",
                maxWidth: "100%",
                minHeight: "78vh",
                height: "100%",
                border: 0,
                borderRadius: 16,
                background: "#0f1412",
              }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </section>

        {/* Özellikler */}
        <aside className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          {selected ? (
            <BlockProps block={selected} onChange={(p) => update(selected.id, p)} />
          ) : (
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Sayfa ayarları</h2>
              <p className="text-xs text-[var(--muted)]">Bir bloğa tıklayarak metnini ve özelliklerini düzenleyin.</p>
              <ColorField label="Sayfa arka planı" value={bg} onChange={(v) => { setDirty(true); setBg(v); }} fallback="#0f1412" />
              <ColorField label="Kart rengi" value={card} onChange={(v) => { setDirty(true); setCard(v); }} fallback={tenant?.primaryColor ?? "#1B4332"} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-6 w-6 place-items-center rounded-md text-[11px] transition disabled:opacity-30 ${
        danger ? "text-[var(--accent)] hover:bg-[var(--accent-soft)]" : "text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function ColorField({ label, value, onChange, fallback }: { label: string; value: string; onChange: (v: string) => void; fallback: string }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--line)] bg-transparent p-0.5" value={value || fallback} onChange={(e) => onChange(e.target.value)} />
        <input className={inputClassName() + " h-9 flex-1 font-mono text-xs"} value={value} placeholder={fallback} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function BlockProps({ block, onChange }: { block: Block; onChange: (p: Record<string, unknown>) => void }) {
  const p = block.props;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  const num = (k: string, d: number) => (typeof p[k] === "number" ? (p[k] as number) : d);
  const bool = (k: string) => p[k] !== false;

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{BLOCK_META[block.type].label}</h2>

      {block.type === "card" ? (
        <>
          <Field label="Başlık (boşsa kafe adı)"><input className={inputClassName()} value={str("headline")} onChange={(e) => onChange({ headline: e.target.value })} /></Field>
          <Field label="Alt başlık"><input className={inputClassName()} value={str("subtitle")} onChange={(e) => onChange({ subtitle: e.target.value })} /></Field>
          <Field label="Durum metni"><input className={inputClassName()} value={str("statusText")} onChange={(e) => onChange({ statusText: e.target.value })} /></Field>
          <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <p className="text-xs font-medium text-[var(--muted)]">Logo boyutu</p>
            <Field label={`Genişlik: ${num("logoWidth", 150)}px`}>
              <input type="range" min={40} max={320} value={num("logoWidth", 150)} onChange={(e) => onChange({ logoWidth: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
            </Field>
            <Field label={`Yükseklik: ${num("logoHeight", 40)}px`}>
              <input type="range" min={16} max={140} value={num("logoHeight", 40)} onChange={(e) => onChange({ logoHeight: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
            </Field>
          </div>
          <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <p className="text-xs font-medium text-[var(--muted)]">Kart renkleri</p>
            <ColorField label="Arka plan" value={str("bgColor")} onChange={(v) => onChange({ bgColor: v })} fallback={"#1B4332"} />
            <ColorField label="Yazı rengi" value={str("fgColor")} onChange={(v) => onChange({ fgColor: v })} fallback={"#FFFFFF"} />
            <button type="button" onClick={() => onChange({ bgColor: null, fgColor: null })} className="text-xs font-medium text-[var(--accent)]">Renkleri sıfırla (sayfa ayarlarını kullan)</button>
          </div>
          <Toggle label="Logoyu göster" checked={bool("showLogo")} onChange={(v) => onChange({ showLogo: v })} />
          <ImagePicker
            label="Kart logosu"
            value={str("logoUrl")}
            onChange={(url) => onChange({ logoUrl: url })}
            hint="Boş bırakırsanız Marka ayarlarındaki logo kullanılır."
          />
          <p className="text-[11px] text-[var(--muted)]">Damga görünümü, Marka ayarlarında yüklediğiniz damga ikonlarını kullanır.</p>
          <Toggle label="Damga noktalarını göster" checked={bool("showDots")} onChange={(v) => onChange({ showDots: v })} />
        </>
      ) : null}

      {block.type === "text" ? (
        <>
          <Field label="Metin">
            <textarea className={`${inputClassName()} min-h-[120px]`} value={str("text")} onChange={(e) => onChange({ text: e.target.value })} />
          </Field>
          <Field label="Hizalama">
            <select className={inputClassName()} value={str("align") || "left"} onChange={(e) => onChange({ align: e.target.value })}>
              <option value="left">Sol</option>
              <option value="center">Orta</option>
            </select>
          </Field>
          <Field label="Boyut">
            <select className={inputClassName()} value={str("size") || "md"} onChange={(e) => onChange({ size: e.target.value })}>
              <option value="sm">Küçük</option>
              <option value="md">Normal</option>
              <option value="lg">Büyük</option>
            </select>
          </Field>
        </>
      ) : null}

      {block.type === "image" ? (
        <>
          <ImagePicker label="Görsel" value={str("url")} onChange={(url) => onChange({ url })} />
          <Field label={`Yükseklik: ${num("height", 160)}px`}>
            <input type="range" min={40} max={400} value={num("height", 160)} onChange={(e) => onChange({ height: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
          </Field>
        </>
      ) : null}

      {block.type === "spacer" ? (
        <Field label={`Yükseklik: ${num("height", 24)}px`}>
          <input type="range" min={4} max={160} value={num("height", 24)} onChange={(e) => onChange({ height: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
        </Field>
      ) : null}

      {block.type === "wallet" ? (
        <Field label="Düğmeler üstündeki yazı (boşsa varsayılan)">
          <textarea className={`${inputClassName()} min-h-[80px]`} value={str("ctaHint")} onChange={(e) => onChange({ ctaHint: e.target.value })} />
        </Field>
      ) : null}

      {block.type === "legal" ? (
        <Field label="KVKK / alt metin">
          <textarea className={`${inputClassName()} min-h-[120px]`} value={str("text")} onChange={(e) => onChange({ text: e.target.value })} />
        </Field>
      ) : null}

      {block.type === "policies" ? <PolicyEditor block={block} onChange={onChange} /> : null}

      {block.type === "form" || block.type === "divider" ? (
        <p className="text-xs leading-relaxed text-[var(--muted)]">
          {block.type === "form"
            ? "Ad ve doğum günü alanları, İşletme ayarlarındaki açık/kapalı seçeneklerine göre gösterilir."
            : "Bu blok ayırıcı çizgidir; ayarı yoktur."}
        </p>
      ) : null}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)]"
    >
      {label}
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

type MediaItem = { id: string; url: string; createdAt: string };

/** Görsel seç: kütüphaneden ya da yeni yükleyerek (https adresi kaydedilir) */
function ImagePicker({ label, value, onChange, hint }: { label: string; value: string; onChange: (url: string) => void; hint?: string }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLibrary() {
    setOpen(true);
    try {
      const res = await api<{ items: MediaItem[] }>("/tenants/me/media");
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kütüphane yüklenemedi");
    }
  }

  async function upload(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiUpload<{ id: string; url: string }>("/tenants/me/media", file);
      onChange(res.url);
      setItems(null);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Yüklenemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] text-[var(--muted)]">Yok</span>
          )}
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          <button type="button" onClick={() => void loadLibrary()} className="h-8 rounded-lg border border-[var(--line-strong)] px-3 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)]">
            Kütüphane
          </button>
          <label className={`inline-flex h-8 cursor-pointer items-center rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white ${busy ? "opacity-60" : ""}`}>
            {busy ? "Yükleniyor…" : "Yükle"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" disabled={busy} onChange={(e) => void upload(e.target.files?.[0] ?? null)} />
          </label>
          {value ? (
            <button type="button" onClick={() => onChange("")} className="h-8 px-2 text-xs text-[var(--muted)] hover:text-[var(--accent)]">
              Kaldır
            </button>
          ) : null}
        </div>
      </div>
      {hint ? <p className="text-[11px] text-[var(--muted)]">{hint}</p> : null}
      {error ? <p className="text-xs text-[var(--accent)]">{error}</p> : null}
      {open ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2">
          {items === null ? (
            <p className="p-2 text-xs text-[var(--muted)]">Yükleniyor…</p>
          ) : items.length === 0 ? (
            <p className="p-2 text-xs text-[var(--muted)]">Henüz yüklenmiş görsel yok.</p>
          ) : (
            <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
              {items.map((m) => (
                <button key={m.id} type="button" onClick={() => { onChange(m.url); setOpen(false); }} className={`aspect-square overflow-hidden rounded-lg border ${value === m.url ? "border-[var(--accent)]" : "border-[var(--line)]"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setOpen(false)} className="mt-2 text-xs text-[var(--muted)] hover:text-[var(--ink)]">Kapat</button>
        </div>
      ) : null}
    </div>
  );
}

type PolicyItem = { title: string; body: string };

/** Politika listesi: bloğun kendi metinleri (boşsa işletme politikaları gösterilir) */
function PolicyEditor({ block, onChange }: { block: Block; onChange: (p: Record<string, unknown>) => void }) {
  const items: PolicyItem[] = Array.isArray(block.props.items) ? (block.props.items as PolicyItem[]) : [];
  const set = (next: PolicyItem[]) => onChange({ items: next });
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[var(--muted)]">
        {items.length === 0 ? "Boşken işletme politikaları kullanılır. Burada yazdığınız politikalar yalnızca bu blokta görünür." : `${items.length}/8 politika`}
      </p>
      {items.map((it, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <div className="flex items-center gap-2">
            <input className={inputClassName() + " h-8 flex-1 text-xs"} placeholder="Başlık (örn. KVKK)" value={it.title} onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <button type="button" onClick={() => set(items.filter((_, j) => j !== i))} className="h-8 px-2 text-xs text-[var(--accent)]">Sil</button>
          </div>
          <textarea className={`${inputClassName()} min-h-[90px] text-xs`} placeholder="Metin" value={it.body} onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
        </div>
      ))}
      {items.length < 8 ? (
        <button type="button" onClick={() => set([...items, { title: "", body: "" }])} className="h-8 w-full rounded-lg border border-dashed border-[var(--line-strong)] text-xs font-medium text-[var(--ink)] hover:border-[var(--accent)]">
          + Politika ekle
        </button>
      ) : null}
    </div>
  );
}
