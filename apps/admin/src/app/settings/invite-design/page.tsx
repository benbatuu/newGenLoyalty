"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBanner, RequireAuth, SuccessBanner, btnPrimary, inputClassName } from "../../../components/ui";
import { ApiError, api, apiUpload } from "../../../lib/api";
import { useApiQuery } from "../../../lib/use-api-query";

type BlockType = "card" | "text" | "image" | "spacer" | "divider" | "wallet" | "form" | "legal" | "policies";
type Block = { id: string; type: BlockType; props: Record<string, unknown> };
type RawBlock = { id: string; type: string; props: Record<string, unknown> };

type Tenant = {
  inviteLayout: RawBlock[] | null;
  inviteHeadline: string | null;
  inviteSubtitle: string | null;
  inviteStatusText: string | null;
  inviteBgColor: string | null;
  inviteCardColor: string | null;
  primaryColor: string | null;
};

type Device = "mobile" | "tablet" | "desktop";

/** Ekrana özel yerleşim — API'deki DEFAULT_INVITE_DEVICES ile aynı varsayılanlar */
type DeviceLayout = {
  columns: 1 | 2;
  maxWidth: number;
  padX: number;
  padY: number;
  gap: number;
  split: number;
  valign: "top" | "center";
  sticky: boolean;
};

type PageSettings = { devices: Record<Device, DeviceLayout>; bgImage: string; bgOverlay: number };

const DEVICE_DEFAULTS: Record<Device, DeviceLayout> = {
  mobile: { columns: 1, maxWidth: 460, padX: 16, padY: 20, gap: 32, split: 46, valign: "top", sticky: false },
  tablet: { columns: 1, maxWidth: 560, padX: 32, padY: 40, gap: 40, split: 46, valign: "top", sticky: false },
  desktop: { columns: 2, maxWidth: 1080, padX: 40, padY: 56, gap: 64, split: 46, valign: "center", sticky: true },
};

const DEVICES: { key: Device; label: string; width: number; range: string }[] = [
  { key: "mobile", label: "Telefon", width: 390, range: "768px altı" },
  { key: "tablet", label: "Tablet", width: 820, range: "768–1099px" },
  { key: "desktop", label: "Masaüstü", width: 1280, range: "1100px ve üstü" },
];

const DESKTOP_WIDTHS = [1100, 1280, 1440, 1920];

const WIDTH_RANGE: Record<Device, [number, number]> = {
  mobile: [320, 600],
  tablet: [400, 1000],
  desktop: [640, 1600],
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

function readPage(raw: RawBlock[] | null | undefined): PageSettings {
  const p = (raw?.find((b) => b.type === "page")?.props ?? {}) as Record<string, unknown>;
  const dev = (p.devices ?? {}) as Partial<Record<Device, Partial<DeviceLayout>>>;
  const merge = (d: Device): DeviceLayout => ({
    ...DEVICE_DEFAULTS[d],
    ...(dev[d] ?? {}),
    ...(d === "mobile" ? { columns: 1 as const } : {}),
  });
  return {
    devices: { mobile: merge("mobile"), tablet: merge("tablet"), desktop: merge("desktop") },
    bgImage: typeof p.bgImage === "string" ? p.bgImage : "",
    bgOverlay: typeof p.bgOverlay === "number" ? p.bgOverlay : 55,
  };
}

const defaultPage = (): PageSettings => readPage(null);

/** Bloğun iki sütunlu ekranlardaki yeri: kart ve görsel solda, diğerleri sağda */
function blockColumn(b: Block): "a" | "b" {
  if (b.props.col === "a" || b.props.col === "b") return b.props.col;
  return b.type === "card" || b.type === "image" ? "a" : "b";
}

function isHidden(b: Block, d: Device): boolean {
  const h = b.props.hide as Partial<Record<Device, boolean>> | undefined;
  return Boolean(h?.[d]);
}

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
  const [page, setPage] = useState<PageSettings>(defaultPage);
  const [bg, setBg] = useState("");
  const [card, setCard] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_LAYOUT[0]?.id ?? null);
  const [device, setDevice] = useState<Device>("mobile");
  const [desktopWidth, setDesktopWidth] = useState(1280);
  const [html, setHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<"tr" | "en">("tr");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const seq = useRef(0);
  const hydrated = useRef(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const selectedRef = useRef<string | null>(selectedId);
  selectedRef.current = selectedId;

  useEffect(() => {
    if (!tenant || hydrated.current) return;
    hydrated.current = true;
    const saved = (tenant.inviteLayout ?? []).filter((b) => b.type !== "page" && b.type in BLOCK_META) as Block[];
    // Kayıtlı düzen yoksa varsayılan kart, mevcut metinlerle doldurulur
    const initial = saved.length
      ? saved
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
    setPage(readPage(tenant.inviteLayout));
    setSelectedId(initial[0]?.id ?? null);
    setBg(tenant.inviteBgColor ?? "");
    setCard(tenant.inviteCardColor ?? "");
  }, [tenant]);

  // Önizleme alanının boyutu: cihaz gerçek genişlikte çizilir, alana sığacak kadar küçültülür
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setStage({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const postSelection = useCallback((id: string | null, scroll: boolean) => {
    frameRef.current?.contentWindow?.postMessage({ source: "invite-editor", selected: id, scroll }, "*");
  }, []);

  // Önizlemede bloğa tıklayınca seç; önizleme yüklenince seçimi çerçevele
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = e.data as { source?: string; id?: string; ready?: boolean } | null;
      if (!d || d.source !== "invite-preview") return;
      if (d.ready) postSelection(selectedRef.current, false);
      else if (d.id) setSelectedId(d.id);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postSelection]);

  useEffect(() => {
    postSelection(selectedId, true);
  }, [selectedId, postSelection]);

  const selected = useMemo(() => blocks.find((b) => b.id === selectedId) ?? null, [blocks, selectedId]);

  const payload = useMemo(
    () => ({
      inviteLayout: [
        { id: "page", type: "page", props: { devices: page.devices, bgImage: page.bgImage || null, bgOverlay: page.bgOverlay } },
        ...blocks.map((b) => ({ id: b.id, type: b.type, props: b.props })),
      ],
      inviteBgColor: bg.trim() || null,
      inviteCardColor: card.trim() || null,
      previewLocale,
    }),
    [blocks, page, bg, card, previewLocale],
  );
  const key = JSON.stringify(payload);

  useEffect(() => {
    const id = ++seq.current;
    // Kısa bekleme: kaydırıcı sürüklenirken her adımda istek gitmesin; eski yanıtlar yok sayılır
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
    }, 120);
    return () => window.clearTimeout(timer);
  }, [key]);

  function update(id: string, props: Record<string, unknown>) {
    setDirty(true);
    setBlocks((list) => list.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...props } } : b)));
  }

  function patchDevice(d: Device, patch: Partial<DeviceLayout>) {
    setDirty(true);
    setPage((pg) => ({ ...pg, devices: { ...pg.devices, [d]: { ...pg.devices[d], ...patch } } }));
  }

  function patchPage(patch: Partial<Omit<PageSettings, "devices">>) {
    setDirty(true);
    setPage((pg) => ({ ...pg, ...patch }));
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
      // previewLocale yalnız önizleme isteğine aittir; kayıt uç noktası bilinmeyen alanı reddeder
      const { previewLocale: _locale, ...body } = payload;
      void _locale;
      await api("/tenants/me", { method: "PATCH", body: JSON.stringify(body) });
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
    if (!window.confirm("Bloklar ve tüm ekran yerleşimleri varsayılana dönecek. Devam edilsin mi?")) return;
    setDirty(true);
    setBlocks(DEFAULT_LAYOUT.map((b) => ({ ...b, props: { ...b.props } })));
    setPage(defaultPage());
    setSelectedId(null);
  }

  const deviceMeta = DEVICES.find((d) => d.key === device)!;
  const frameWidth = device === "desktop" ? desktopWidth : deviceMeta.width;
  const scale = stage.w ? Math.min(1, (stage.w - 24) / frameWidth) : 1;
  const frameHeight = stage.h ? (stage.h - 24) / scale : 800;
  const twoCol = device !== "mobile" && page.devices[device].columns === 2;

  return (
    <div className="-m-3 flex min-h-[calc(100vh-4rem)] flex-col sm:-m-5 lg:-m-6">
      {/* Üst çubuk */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--panel)] px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Müşteri davet sayfası</p>
          <h1 className="font-display text-lg font-semibold text-[var(--ink)]">Sayfayı tasarla</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-[11px] text-[var(--muted)] md:inline">Düzenlenen ekran</span>
          <div className="flex gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1" role="radiogroup" aria-label="Düzenlenen ekran">
            {DEVICES.map((d) => (
              <button
                key={d.key}
                type="button"
                role="radio"
                aria-checked={device === d.key}
                title={`${d.label} · ${d.range}`}
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

      <div className="grid flex-1 gap-4 p-4 sm:p-6 xl:grid-cols-[260px_minmax(0,1fr)_330px]">
        {/* Bloklar */}
        <aside className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Sayfadaki bloklar</h2>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${selectedId ? "text-[var(--muted)] hover:text-[var(--ink)]" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}
              >
                Sayfa ayarları
              </button>
            </div>
            <ol className="mt-3 space-y-2">
              {blocks.map((b, i) => {
                const hiddenHere = isHidden(b, device);
                return (
                  <li
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition ${
                      selectedId === b.id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]"
                    } ${hiddenHere ? "opacity-55" : ""}`}
                  >
                    <span className="w-5 text-xs tabular-nums text-[var(--muted)]">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-[var(--ink)]">{BLOCK_META[b.type].label}</span>
                        {twoCol ? (
                          <span className="shrink-0 rounded bg-[var(--panel)] px-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                            {blockColumn(b) === "a" ? "Sol" : "Sağ"}
                          </span>
                        ) : null}
                        {hiddenHere ? (
                          <span className="shrink-0 rounded bg-[var(--panel)] px-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">Gizli</span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--muted)]">{BLOCK_META[b.type].hint}</span>
                    </span>
                    <span className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                      <IconBtn label="Yukarı" onClick={() => move(b.id, -1)} disabled={i === 0}>↑</IconBtn>
                      <IconBtn label="Aşağı" onClick={() => move(b.id, 1)} disabled={i === blocks.length - 1}>↓</IconBtn>
                      <IconBtn label="Sil" onClick={() => remove(b.id)} danger>✕</IconBtn>
                    </span>
                  </li>
                );
              })}
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className="font-medium text-[var(--ink)]">{deviceMeta.label}</span>
              {device === "desktop" ? (
                <select
                  aria-label="Masaüstü genişliği"
                  value={desktopWidth}
                  onChange={(e) => setDesktopWidth(Number(e.target.value))}
                  className="h-7 rounded-md border border-[var(--line)] bg-[var(--surface)] px-1.5 text-xs text-[var(--ink)]"
                >
                  {DESKTOP_WIDTHS.map((w) => (
                    <option key={w} value={w}>{w}px</option>
                  ))}
                </select>
              ) : (
                <span>{frameWidth}px</span>
              )}
              <span>· %{Math.round(scale * 100)}</span>
              <span className="hidden sm:inline">· {twoCol ? "iki sütun" : "tek sütun"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-[var(--line)] p-0.5 text-xs" role="group" aria-label="Önizleme dili">
                {(["tr", "en"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setPreviewLocale(l)}
                    aria-pressed={previewLocale === l}
                    className={`min-h-[26px] rounded-md px-2.5 font-semibold uppercase ${previewLocale === l ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-[var(--muted)]" aria-live="polite">{previewBusy ? "Güncelleniyor…" : "Canlı"}</span>
              <button
                type="button"
                disabled={!html}
                onClick={() => {
                  if (!html) return;
                  // Kaydedilmemiş taslak dahil, önizlemenin aynısını yeni sekmede aç
                  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
                  window.open(url, "_blank", "noopener");
                  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
                }}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-2.5 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--surface)] disabled:opacity-40"
                title="Taslağı yeni sekmede açar; tarayıcıyı daraltıp genişleterek tüm ekranları deneyebilirsiniz"
              >
                Yeni sekmede önizle
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M14 4h6v6" />
                  <path d="M20 4 10 14" />
                  <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
                </svg>
              </button>
            </div>
          </div>
          {previewError ? <p className="mb-2 text-xs text-[var(--accent)]">{previewError}</p> : null}
          <div
            ref={stageRef}
            className="relative h-[calc(100vh-15rem)] min-h-[560px] overflow-hidden rounded-xl bg-[var(--background)] p-3"
          >
            <div style={{ width: frameWidth * scale, height: frameHeight * scale, margin: "0 auto" }}>
              <iframe
                ref={frameRef}
                title="Davet sayfası önizlemesi"
                srcDoc={html ?? "<p style='font-family:sans-serif;color:#999;padding:24px'>Yükleniyor…</p>"}
                style={{
                  width: frameWidth,
                  height: frameHeight,
                  border: 0,
                  borderRadius: 16 / scale,
                  background: "#0f1412",
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  display: "block",
                }}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">Önizlemede bir bloğa tıklayarak seçebilirsiniz.</p>
        </section>

        {/* Özellikler */}
        <aside className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto">
          {selected ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
              >
                ← Sayfa ayarları
              </button>
              <BlockProps block={selected} onChange={(p) => update(selected.id, p)} />
              <PlacementFields block={selected} device={device} twoCol={twoCol} onChange={(p) => update(selected.id, p)} />
            </>
          ) : (
            <PageSettingsPanel
              device={device}
              page={page}
              bg={bg}
              card={card}
              primaryColor={tenant?.primaryColor ?? "#1B4332"}
              onBg={(v) => { setDirty(true); setBg(v); }}
              onCard={(v) => { setDirty(true); setCard(v); }}
              onDevice={(patch) => patchDevice(device, patch)}
              onResetDevice={() => patchDevice(device, DEVICE_DEFAULTS[device])}
              onPage={patchPage}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

/** Sayfa ayarları: genel renkler ve arka plan + düzenlenen ekranın yerleşimi */
function PageSettingsPanel({
  device,
  page,
  bg,
  card,
  primaryColor,
  onBg,
  onCard,
  onDevice,
  onResetDevice,
  onPage,
}: {
  device: Device;
  page: PageSettings;
  bg: string;
  card: string;
  primaryColor: string;
  onBg: (v: string) => void;
  onCard: (v: string) => void;
  onDevice: (patch: Partial<DeviceLayout>) => void;
  onResetDevice: () => void;
  onPage: (patch: Partial<Omit<PageSettings, "devices">>) => void;
}) {
  const d = page.devices[device];
  const meta = DEVICES.find((x) => x.key === device)!;
  const [minW, maxW] = WIDTH_RANGE[device];
  const two = device !== "mobile" && d.columns === 2;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Sayfa ayarları</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
          Renk ve arka plan tüm ekranlarda ortaktır. Yerleşim her ekran için ayrı tutulur; üstten ekran seçin.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--surface)] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[var(--ink)]">{meta.label} yerleşimi</p>
          <span className="text-[10px] text-[var(--muted)]">{meta.range}</span>
        </div>

        {device === "mobile" ? (
          <p className="text-[11px] text-[var(--muted)]">Telefonda bloklar tek sütunda, sıraya göre dizilir.</p>
        ) : (
          <Segmented
            label="Düzen"
            value={String(d.columns)}
            options={[
              { value: "1", label: "Tek sütun" },
              { value: "2", label: "İki sütun" },
            ]}
            onChange={(v) =>
              // İki sütuna geçince dar genişlik kartı sıkıştırmasın
              onDevice(
                v === "2"
                  ? { columns: 2, maxWidth: Math.max(d.maxWidth, device === "tablet" ? 760 : 1000) }
                  : { columns: 1 },
              )
            }
          />
        )}

        <Range label="İçerik genişliği" unit="px" min={minW} max={maxW} step={10} value={d.maxWidth} onChange={(v) => onDevice({ maxWidth: v })} />
        <Range label="Yan boşluk" unit="px" min={0} max={96} value={d.padX} onChange={(v) => onDevice({ padX: v })} />
        <Range label="Üst ve alt boşluk" unit="px" min={0} max={160} value={d.padY} onChange={(v) => onDevice({ padY: v })} />

        {two ? (
          <>
            <Range label="Sol sütun" unit="%" min={30} max={70} value={d.split} onChange={(v) => onDevice({ split: v })} />
            <Range label="Sütun arası" unit="px" min={0} max={160} step={4} value={d.gap} onChange={(v) => onDevice({ gap: v })} />
            <Toggle label="Sol sütun kaydırırken sabit kalsın" checked={d.sticky} onChange={(v) => onDevice({ sticky: v })} />
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              Blokların hangi sütunda duracağını bloğa tıklayıp seçin. Varsayılan: kart ve görsel solda, form ve düğmeler sağda.
            </p>
          </>
        ) : null}

        <Segmented
          label="Dikey hizalama"
          value={d.valign}
          options={[
            { value: "top", label: "Üstte" },
            { value: "center", label: "Ortada" },
          ]}
          onChange={(v) => onDevice({ valign: v === "center" ? "center" : "top" })}
        />

        <button type="button" onClick={onResetDevice} className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--accent)]">
          {meta.label} yerleşimini varsayılana döndür
        </button>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold text-[var(--ink)]">Renkler</p>
        <ColorField label="Sayfa arka planı" value={bg} onChange={onBg} fallback="#0f1412" />
        <ColorField label="Kart rengi" value={card} onChange={onCard} fallback={primaryColor} />
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold text-[var(--ink)]">Arka plan görseli</p>
        <ImagePicker
          label="Görsel"
          value={page.bgImage}
          onChange={(url) => onPage({ bgImage: url })}
          hint="Geniş ekranlarda sayfanın arkasında görünür. Okunurluk için üstüne koyu katman eklenir."
        />
        {page.bgImage ? (
          <Range label="Karartma" unit="%" min={0} max={90} value={page.bgOverlay} onChange={(v) => onPage({ bgOverlay: v })} />
        ) : null}
      </section>
    </div>
  );
}

/** Blok yerleşimi: hangi ekranlarda görüneceği ve iki sütunlu ekranlarda hangi sütunda duracağı */
function PlacementFields({
  block,
  device,
  twoCol,
  onChange,
}: {
  block: Block;
  device: Device;
  twoCol: boolean;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const hide = (block.props.hide ?? {}) as Partial<Record<Device, boolean>>;
  const col = blockColumn(block);
  return (
    <section className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <p className="text-xs font-semibold text-[var(--ink)]">Yerleşim</p>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-[var(--muted)]">Bu ekranlarda göster</p>
        <div className="grid grid-cols-3 gap-1.5">
          {DEVICES.map((d) => {
            const on = !hide[d.key];
            return (
              <button
                key={d.key}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ hide: { ...hide, [d.key]: on ? true : undefined } })}
                className={`h-8 rounded-lg border text-[11px] font-medium transition ${
                  on
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                    : "border-[var(--line)] text-[var(--muted)] line-through"
                } ${d.key === device ? "ring-1 ring-[var(--accent)]/40" : ""}`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
      <Segmented
        label="Sütun (iki sütunlu ekranlarda)"
        value={col}
        options={[
          { value: "a", label: "Sol sütun" },
          { value: "b", label: "Sağ sütun" },
        ]}
        onChange={(v) => onChange({ col: v === "a" ? "a" : "b" })}
      />
      {!twoCol ? (
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">
          {DEVICES.find((d) => d.key === device)?.label} ekranı tek sütun. Sütun seçimi, iki sütun açık olan ekranlarda uygulanır.
        </p>
      ) : null}
      <SizeFields block={block} device={device} onChange={onChange} />
    </section>
  );
}

type BlockSize = { w?: number; h?: number; align?: "left" | "center" | "right" };

/** Bloğun düzenlenen ekrandaki boyutu. Tablet ve masaüstü ayarlanmadıysa önceki ekranı devralır. */
function SizeFields({ block, device, onChange }: { block: Block; device: Device; onChange: (p: Record<string, unknown>) => void }) {
  const sizes = (block.props.sizes ?? {}) as Partial<Record<Device, BlockSize>>;
  const order: Device[] = ["mobile", "tablet", "desktop"];
  // Devralınan değer: bu ekrandan geriye doğru ilk ayarlanan
  const inherited = (key: keyof BlockSize) => {
    for (let i = order.indexOf(device); i >= 0; i--) {
      const v = sizes[order[i]!]?.[key];
      if (v !== undefined) return v;
    }
    return undefined;
  };
  const own = sizes[device] ?? {};
  const w = (inherited("w") as number | undefined) ?? 100;
  const h = (inherited("h") as number | undefined) ?? 0;
  const align = (inherited("align") as BlockSize["align"]) ?? "center";
  const set = (patch: BlockSize) => onChange({ sizes: { ...sizes, [device]: { ...own, ...patch } } });
  const hasOwn = Object.keys(own).length > 0;
  const label = DEVICES.find((d) => d.key === device)?.label;

  return (
    <div className="space-y-3 border-t border-[var(--line)] pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--muted)]">Boyut · {label}</p>
        {hasOwn && device !== "mobile" ? (
          <button
            type="button"
            onClick={() => {
              const next = { ...sizes };
              delete next[device];
              onChange({ sizes: next });
            }}
            className="text-[11px] text-[var(--muted)] hover:text-[var(--accent)]"
          >
            Önceki ekranı kullan
          </button>
        ) : null}
      </div>
      <Range label="Genişlik" unit="%" min={20} max={100} value={w} onChange={(v) => set({ w: v })} />
      <Field label={`Yükseklik · ${h > 0 ? `${h}px` : "otomatik"}`}>
        <input
          type="range"
          min={0}
          max={block.type === "image" ? 800 : 1200}
          step={4}
          value={h}
          onChange={(e) => set({ h: Number(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
      </Field>
      {w < 100 ? (
        <Segmented
          label="Hizalama"
          value={align}
          options={[
            { value: "left", label: "Sol" },
            { value: "center", label: "Orta" },
            { value: "right", label: "Sağ" },
          ]}
          onChange={(v) => set({ align: v === "left" ? "left" : v === "right" ? "right" : "center" })}
        />
      ) : null}
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">
        Yükseklik 0 iken içerik kadar yer kaplar. Bloklar arasında otomatik boşluk yok; aralık için Boşluk bloğu ekleyin.
      </p>
    </div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <div className="grid gap-1 rounded-lg bg-[var(--panel)] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`h-8 rounded-md text-[12px] font-medium transition ${
              value === o.value ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Range({
  label,
  unit,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={`${label} · ${unit === "%" ? `%${value}` : `${value}${unit}`}`}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
    </Field>
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
