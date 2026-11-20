"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeTagLabel, tagKey } from "@ngl/shared";
import { ErrorBanner, EmptyState, ListRowsSkeleton, inputClassName } from "../../components/ui";
import { Btn } from "../../components/btn";
import { ApiError, api } from "../../lib/api";
import { ResetCatalogButton } from "./catalog-manager";
import { useApiQuery } from "../../lib/use-api-query";

export type MenuTagRow = {
  id: string;
  label: string;
  translations: Record<string, { name?: string }> | null;
};

const TAG_QUERY_KEY = "menu:tags";
const TAG_PATH = "/menu/tags";

/** Etiket kataloğunu yükler (tüm menü ekranları aynı önbelleği kullanır). */
export function useTagCatalog() {
  return useApiQuery<MenuTagRow[]>(TAG_QUERY_KEY, TAG_PATH);
}

function enName(tag: MenuTagRow): string {
  return tag.translations?.en?.name?.trim() || tag.label;
}

/**
 * Ürün etiketi seçici: yazdıkça katalogdan öneri çıkar. Katalogda yoksa
 * yazılan etiket oluşturulur ve ürüne eklenir. Adlar baş harfi büyük olarak kaydedilir.
 */
export function TagPicker({
  selected,
  onChange,
  catalog,
  onCatalogChanged,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  catalog: MenuTagRow[];
  onCatalogChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedKeys = useMemo(() => new Set(selected.map(tagKey)), [selected]);
  const normalized = normalizeTagLabel(query);
  const queryKey = normalized ? tagKey(normalized) : "";

  const suggestions = useMemo(() => {
    return catalog
      .filter((t) => !selectedKeys.has(tagKey(t.label)))
      .filter((t) => !queryKey || tagKey(t.label).includes(queryKey) || tagKey(enName(t)).includes(queryKey))
      .slice(0, 8);
  }, [catalog, selectedKeys, queryKey]);

  const exact = catalog.find((t) => tagKey(t.label) === queryKey);
  const canCreate = Boolean(normalized) && !exact && !selectedKeys.has(queryKey);

  function add(label: string) {
    if (selectedKeys.has(tagKey(label))) return;
    onChange([...selected, label]);
    setQuery("");
    inputRef.current?.focus();
  }

  async function createAndAdd() {
    if (!normalized) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api<MenuTagRow>("/menu/tags", {
        method: "POST",
        body: JSON.stringify({ label: normalized }),
      });
      onCatalogChanged();
      add(created.label);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Etiket eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <ErrorBanner message={error} />
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((label) => {
            const row = catalog.find((t) => tagKey(t.label) === tagKey(label));
            return (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-sky-800"
              >
                {label}
                {row?.translations?.en?.name ? (
                  <span className="text-[10px] text-sky-600/80">· {enName(row)}</span>
                ) : null}
                <button
                  type="button"
                  aria-label={`${label} etiketini kaldır`}
                  onClick={() => onChange(selected.filter((x) => x !== label))}
                  className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-sky-700 hover:bg-sky-100"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-[var(--muted)]">Henüz etiket seçilmedi.</p>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (exact && !selectedKeys.has(tagKey(exact.label))) add(exact.label);
              else if (canCreate) void createAndAdd();
              else if (suggestions[0]) add(suggestions[0].label);
            }
          }}
          placeholder="Etiket ara veya yeni yaz (örn. vegan)"
          className={`${inputClassName()} h-9 rounded-xl`}
          aria-label="Etiket ara"
        />
        {focused && (suggestions.length > 0 || canCreate) ? (
          <div className="mt-2 mb-1 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-md)]">
            <ul className="max-h-60 overflow-y-auto py-1">
              {suggestions.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => add(t.label)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--surface)]"
                  >
                    <span className="text-[var(--ink)]">{t.label}</span>
                    <span className="text-[11px] text-[var(--muted)]">EN: {enName(t)}</span>
                  </button>
                </li>
              ))}
              {canCreate ? (
                <li>
                  <button
                    type="button"
                    disabled={busy}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void createAndAdd()}
                    className="flex w-full items-center gap-2 border-t border-[var(--line)] px-3 py-2 text-left text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-50"
                  >
                    <span>+</span>
                    <span>&ldquo;{normalized}&rdquo; etiketini oluştur</span>
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Etiket kataloğu yönetimi: TR ve EN adları düzenler, yeni etiket ekler, siler. */
export function TagManager({ onChanged }: { onChanged?: () => void }) {
  const { data, loading, reload } = useTagCatalog();
  const [error, setError] = useState<string | null>(null);
  const [newTr, setNewTr] = useState("");
  const [newEn, setNewEn] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const seeded = useRef(false);

  // Katalog boşsa varsayılan etiketleri bir kez ekle
  useEffect(() => {
    if (!data || data.length > 0 || seeded.current) return;
    seeded.current = true;
    void api("/menu/tags/seed-defaults", { method: "POST" })
      .then(() => reload(true))
      .catch(() => undefined);
  }, [data, reload]);

  async function refresh() {
    await reload(true);
    onChanged?.();
  }

  async function saveRow(tag: MenuTagRow, label: string, en: string) {
    const nextLabel = normalizeTagLabel(label);
    if (!nextLabel) {
      setError("Etiket adı boş olamaz");
      return;
    }
    setBusyId(tag.id);
    setError(null);
    try {
      await api(`/menu/tags/${tag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ label: nextLabel, translations: { en: { name: en.trim() || nextLabel } } }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(tag: MenuTagRow) {
    if (!confirm(`"${tag.label}" etiketi kataloktan ve tüm ürünlerden kaldırılacak. Emin misiniz?`)) return;
    setBusyId(tag.id);
    setError(null);
    try {
      await api(`/menu/tags/${tag.id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Silinemedi");
    } finally {
      setBusyId(null);
    }
  }

  async function addNew() {
    const label = normalizeTagLabel(newTr);
    if (!label) return;
    setError(null);
    try {
      await api("/menu/tags", {
        method: "POST",
        body: JSON.stringify({ label, translations: { en: { name: newEn.trim() || label } } }),
      });
      setNewTr("");
      setNewEn("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Eklenemedi");
    }
  }

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />
      <div className="flex justify-end">
        <ResetCatalogButton
          onDone={() => {
            void reload(true);
            onChanged?.();
          }}
        />
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        <span>Türkçe</span>
        <span>English</span>
        <span />
      </div>
      {loading && !data ? (
        <ListRowsSkeleton rows={4} />
      ) : !data?.length ? (
        <EmptyState title="Etiket yok" description="Aşağıdan ilk etiketinizi ekleyin." />
      ) : (
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)]">
          {data.map((tag) => (
            <TagRow key={`${tag.id}-${tag.label}-${enName(tag)}`} tag={tag} busy={busyId === tag.id} onSave={saveRow} onDelete={remove} />
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-dashed border-[var(--line)] p-3">
        <p className="mb-2 text-xs font-medium text-[var(--ink)]">Yeni etiket</p>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input className={`${inputClassName()} h-9 rounded-lg`} placeholder="Örn. Şef Önerisi" value={newTr} onChange={(e) => setNewTr(e.target.value)} />
          <input className={`${inputClassName()} h-9 rounded-lg`} placeholder="Chef's Pick" value={newEn} onChange={(e) => setNewEn(e.target.value)} />
          <Btn variant="primary" className="h-9" disabled={!normalizeTagLabel(newTr)} onClick={() => void addNew()}>Ekle</Btn>
        </div>
      </div>
    </div>
  );
}

function TagRow({
  tag,
  busy,
  onSave,
  onDelete,
}: {
  tag: MenuTagRow;
  busy: boolean;
  onSave: (tag: MenuTagRow, label: string, en: string) => void;
  onDelete: (tag: MenuTagRow) => void;
}) {
  const [tr, setTr] = useState(tag.label);
  const [en, setEn] = useState(enName(tag));
  useEffect(() => {
    setTr(tag.label);
    setEn(enName(tag));
  }, [tag.label, tag.translations]);
  const dirty = normalizeTagLabel(tr) !== tag.label || en.trim() !== enName(tag);

  return (
    <li className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 px-3 py-2">
      <input
        className={`${inputClassName()} h-8 rounded-lg`}
        value={tr}
        onChange={(e) => setTr(e.target.value)}
        aria-label="Türkçe etiket"
      />
      <input
        className={`${inputClassName()} h-8 rounded-lg`}
        value={en}
        onChange={(e) => setEn(e.target.value)}
        aria-label="İngilizce etiket"
      />
      <div className="flex items-center gap-1">
        {dirty ? (
          <Btn variant="primary" className="h-8 px-2.5" disabled={busy} onClick={() => onSave(tag, tr, en)}>
            Kaydet
          </Btn>
        ) : null}
        <Btn variant="danger" className="h-8 px-2.5" disabled={busy} onClick={() => onDelete(tag)}>
          Sil
        </Btn>
      </div>
    </li>
  );
}
