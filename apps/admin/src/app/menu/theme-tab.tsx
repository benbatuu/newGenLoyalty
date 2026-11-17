"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { EmptyState, ErrorBanner, ListRowsSkeleton, SuccessBanner } from "../../components/ui";
import { Btn } from "../../components/btn";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";
import type { MenuThemePreset } from "@ngl/shared";

type SavedTheme = {
  id: string;
  name: string;
  preset: MenuThemePreset;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PresetCard = {
  id: string;
  name: string;
  hint: string;
  preset: MenuThemePreset;
};

type ThemesResponse = {
  themes: SavedTheme[];
  presets: PresetCard[];
};

type Swatch = { bg: string; surface: string; accent: string; ink: string; muted: string };

const PRESET_SWATCH: Record<MenuThemePreset, Swatch & { label: string; blurb: string }> = {
  editorial: {
    label: "Editorial",
    blurb: "Sakin, dergi tadında tipografi",
    bg: "#f4efe6",
    surface: "#ffffff",
    accent: "#2f5d50",
    ink: "#1a1916",
    muted: "#6f6a62",
  },
  catalog: {
    label: "Katalog",
    blurb: "Sıcak tonlar, ürün odaklı",
    bg: "#f7f1ea",
    surface: "#fffdf9",
    accent: "#c45c26",
    ink: "#1a1916",
    muted: "#8a6f5c",
  },
  showcase: {
    label: "Vitrin",
    blurb: "Koyu zemin, vurgulu görseller",
    bg: "#1c1714",
    surface: "#2a2320",
    accent: "#c9a0a8",
    ink: "#f5f0ea",
    muted: "#a89b90",
  },
};

// ── Küçük telefon önizlemesi (CSS ile, ağır render yok) ──

function ThemeMock({ s, size = "md" }: { s: Swatch; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-36" : "h-44";
  return (
    <div className={`${h} relative overflow-hidden rounded-t-2xl p-3`} style={{ background: s.bg }}>
      <div className="mx-auto flex h-full w-[70%] flex-col gap-2 rounded-[1.1rem] p-2.5 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)]" style={{ background: s.surface }}>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: s.accent }} />
          <span className="h-1.5 w-12 rounded-full" style={{ background: s.ink, opacity: 0.8 }} />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-3 flex-1 rounded-full" style={{ background: i === 0 ? s.accent : s.bg }} />
          ))}
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg p-1.5" style={{ background: s.bg }}>
            <span className="h-7 w-7 shrink-0 rounded-md" style={{ background: s.muted, opacity: 0.35 }} />
            <div className="flex-1 space-y-1">
              <span className="block h-1.5 w-3/4 rounded-full" style={{ background: s.ink, opacity: 0.8 }} />
              <span className="block h-1 w-1/2 rounded-full" style={{ background: s.muted, opacity: 0.6 }} />
            </div>
            <span className="h-1.5 w-5 rounded-full" style={{ background: s.accent }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[0.9375rem] font-semibold tracking-tight text-[var(--ink)]">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-[var(--ink)]">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function ThemeTab() {
  const router = useRouter();
  const { data, loading, reload } = useApiQuery<ThemesResponse>("menu:themes", "/menu/themes");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ preset: MenuThemePreset; name: string } | null>(null);
  const [query, setQuery] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 3000);
    return () => clearTimeout(t);
  }, [ok]);

  async function createFromPreset(preset: MenuThemePreset, name: string) {
    setBusyId(preset);
    setError(null);
    try {
      const created = await api<{ id: string }>("/menu/themes", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() || PRESET_SWATCH[preset].label, preset }),
      });
      router.push(`/qr-design/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tema oluşturulamadı");
      setBusyId(null);
    }
  }

  async function activate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/menu/themes/${id}/activate`, { method: "POST" });
      setOk("Tema yayına alındı.");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aktifleştirilemedi");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Bu temayı silmek istediğinize emin misiniz?")) return;
    setBusyId(id);
    setError(null);
    try {
      await api(`/menu/themes/${id}`, { method: "DELETE" });
      setOk("Tema silindi.");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Silinemedi");
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) return <ListRowsSkeleton rows={6} />;

  const themes = data?.themes ?? [];
  const presets = data?.presets ?? [];
  const active = themes.find((t) => t.isActive) ?? null;
  const filtered = themes.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-8">
      <ErrorBanner message={error} />
      <SuccessBanner message={ok} />

      {/* Özet */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Toplam tema" value={themes.length} hint="Kaydettiğiniz tasarımlar" />
        <StatTile
          label="Yayındaki tema"
          value={active ? active.name : "—"}
          hint={active ? `Son güncelleme ${new Date(active.updatedAt).toLocaleDateString("tr-TR")}` : "Henüz yayında tema yok"}
        />
        <StatTile label="Hazır şablon" value={presets.length || Object.keys(PRESET_SWATCH).length} hint="Tek tıkla başlayın" />
      </div>

      {/* Aktif tema vitrini */}
      {active ? (
        <div className="grid overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_1px_2px_rgba(26,25,22,0.04)] md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="flex flex-col justify-center gap-4 p-7">
            <span className="w-fit rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent)]">
              ● Müşterilerinize açık
            </span>
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">{active.name}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {PRESET_SWATCH[active.preset]?.blurb ?? "Özel tema"} · Şablon: {PRESET_SWATCH[active.preset]?.label ?? active.preset}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn variant="primary" onClick={() => router.push(`/qr-design/${active.id}`)}>
                Düzenle
              </Btn>
              <Btn variant="secondary" onClick={() => router.push("/menu?tab=share")}>
                Paylaş
              </Btn>
            </div>
          </div>
          <div className="border-t border-[var(--line)] bg-[var(--surface)] md:border-l md:border-t-0">
            <ThemeMock s={PRESET_SWATCH[active.preset] ?? PRESET_SWATCH.editorial} />
          </div>
        </div>
      ) : null}

      {/* Hazır temalar */}
      <Section title="Yeni tema" description="Bir şablon seçin; kopyası oluşturulur ve tasarım editörü açılır.">
        <div className="grid gap-4 sm:grid-cols-3">
          {(presets.length ? presets : (Object.keys(PRESET_SWATCH) as MenuThemePreset[]).map((p) => ({ id: p, name: PRESET_SWATCH[p].label, hint: PRESET_SWATCH[p].blurb, preset: p }))).map((p) => {
            const s = PRESET_SWATCH[p.preset];
            return (
              <button
                key={p.id}
                type="button"
                disabled={busyId === p.preset}
                onClick={() => setCreating({ preset: p.preset, name: p.name })}
                className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] text-left shadow-[0_1px_2px_rgba(26,25,22,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-20px_rgba(26,25,22,0.35)] disabled:opacity-60"
              >
                <ThemeMock s={s} size="sm" />
                <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--ink)]">{p.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{p.hint}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-medium text-white opacity-90 transition group-hover:opacity-100">
                    Başla
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Temalarım */}
      <Section
        title="Temalarım"
        description="Düzenleyin, yayına alın veya kopyalayın. Yayındaki tema müşteri menüsünde görünür."
        action={
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tema ara…"
              className="h-9 w-48 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 text-[0.8125rem] outline-none focus:border-[var(--ink)]/30 focus:ring-2 focus:ring-[var(--accent-glow)]"
            />
          </div>
        }
      >
        {themes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)]">
            <EmptyState title="Henüz tema yok" description="Yukarıdaki şablonlardan birini seçerek ilk temanızı oluşturun." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)]">
            <EmptyState title="Sonuç yok" description={`"${query}" ile eşleşen tema bulunamadı.`} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((theme) => {
              const s = PRESET_SWATCH[theme.preset] ?? PRESET_SWATCH.editorial;
              const busy = busyId === theme.id;
              return (
                <article key={theme.id} className={`relative overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-[0_1px_2px_rgba(26,25,22,0.04)] ${theme.isActive ? "border-emerald-300 ring-1 ring-emerald-200" : "border-[var(--line)]"}`}>
                  <button type="button" className="block w-full text-left" onClick={() => router.push(`/qr-design/${theme.id}`)} aria-label={`${theme.name} temasını düzenle`}>
                    <div className="relative">
                      <ThemeMock s={s} size="sm" />
                      <span className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${theme.isActive ? "bg-[var(--accent)] text-white" : "bg-white/90 text-[var(--muted)]"}`}>
                        {theme.isActive ? "Yayında" : "Taslak"}
                      </span>
                    </div>
                    <div className="px-4 pt-3">
                      <p className="truncate text-sm font-semibold text-[var(--ink)]">{theme.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {PRESET_SWATCH[theme.preset]?.label ?? theme.preset} · {new Date(theme.updatedAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 px-3 py-3">
                    <Btn variant="primary" className="h-8 px-3" onClick={() => router.push(`/qr-design/${theme.id}`)} disabled={busy}>
                      Düzenle
                    </Btn>
                    {!theme.isActive ? (
                      <Btn variant="secondary" className="h-8 px-3" disabled={busy} onClick={() => void activate(theme.id)}>
                        Yayınla
                      </Btn>
                    ) : null}
                    <div className="ml-auto relative">
                      <button
                        type="button"
                        aria-label="Diğer işlemler"
                        aria-expanded={menuOpenId === theme.id}
                        onClick={() => setMenuOpenId(menuOpenId === theme.id ? null : theme.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                      >
                        ⋯
                      </button>
                      {menuOpenId === theme.id ? (
                        <div className="absolute bottom-9 right-0 z-10 w-40 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] py-1 shadow-xl">
                          <button type="button" className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--surface)]" onClick={() => { setMenuOpenId(null); setCreating({ preset: theme.preset, name: `${theme.name} (kopya)` }); }}>
                            Şablonla yeni oluştur
                          </button>
                          <button type="button" className="block w-full px-3 py-2 text-left text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)]" disabled={busy} onClick={() => { setMenuOpenId(null); void remove(theme.id); }}>
                            Sil
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Section>

      {/* Yeni tema modal */}
      {creating ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1916]/35 p-4 backdrop-blur-[3px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreating(null);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Yeni tema" className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
            <ThemeMock s={PRESET_SWATCH[creating.preset]} size="sm" />
            <div className="space-y-5 p-6">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-[var(--ink)]">Yeni tema oluştur</h3>
                <p className="mt-0.5 text-xs text-[var(--muted)]">Bir ad verin; tasarım editörü açılacak.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PRESET_SWATCH) as MenuThemePreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCreating({ ...creating, preset: p })}
                    aria-pressed={creating.preset === p}
                    className={`rounded-xl border p-2 text-xs font-medium transition ${creating.preset === p ? "border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"}`}
                  >
                    <span className="mx-auto mb-1.5 block h-5 w-full rounded-md" style={{ background: PRESET_SWATCH[p].bg, boxShadow: `inset 0 0 0 6px ${PRESET_SWATCH[p].accent}` }} />
                    {PRESET_SWATCH[p].label}
                  </button>
                ))}
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--muted)]">Tema adı</span>
                <input
                  className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--ink)]/30 focus:ring-2 focus:ring-[var(--accent-glow)]"
                  value={creating.name}
                  onChange={(e) => setCreating({ ...creating, name: e.target.value })}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && creating.name.trim()) void createFromPreset(creating.preset, creating.name);
                  }}
                />
              </label>
              <div className="flex justify-end gap-2">
                <Btn variant="ghost" onClick={() => setCreating(null)}>İptal</Btn>
                <Btn variant="primary" disabled={!creating.name.trim() || !!busyId} onClick={() => void createFromPreset(creating.preset, creating.name)}>
                  {busyId ? "Oluşturuluyor…" : "Oluştur ve düzenle"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
