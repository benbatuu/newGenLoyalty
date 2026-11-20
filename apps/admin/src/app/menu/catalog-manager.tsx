"use client";

import { useEffect, useRef, useState } from "react";
import { EmptyState, ErrorBanner, ListRowsSkeleton, inputClassName } from "../../components/ui";
import { Btn } from "../../components/btn";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";

export type CatalogKind = "ALLERGEN" | "EXTRA";

export type CatalogRow = {
  id: string;
  kind: CatalogKind;
  /** Ana (Türkçe) ad; ürünlerde bu değer saklanır */
  label: string;
  translations: Record<string, { name?: string }>;
  /** Yalnız ekstralarda: ürüne eklendiğinde kopyalanan varsayılan ücret */
  defaultPrice: number | null;
};

export function useCatalog(kind: CatalogKind) {
  return useApiQuery<CatalogRow[]>(`menu:catalog:${kind}`, `/menu/catalog/${kind}`);
}

/** İngilizce ad; yoksa ana ad */
export function catalogEnName(row: CatalogRow): string {
  return row.translations?.en?.name?.trim() || row.label;
}

const COPY: Record<CatalogKind, { add: string; empty: string; trHint: string }> = {
  ALLERGEN: {
    add: "Yeni alerjen",
    empty: "Henüz alerjen yok.",
    trHint: "Türkçe ad",
  },
  EXTRA: {
    add: "Yeni ekstra",
    empty: "Henüz ekstra yok. Eklediğiniz ekstralar ürün düzenlerken tek tıkla seçilir.",
    trHint: "Türkçe ad",
  },
};

/** Etiket ve alerjen kataloğunu hazır listeyle sıfırlar (mevcut kayıtlar silinir, TR + EN yeniden yazılır). */
export function ResetCatalogButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const ok = window.confirm(
      "Etiket ve alerjen kataloğu silinip hazır listeyle yeniden yazılacak (Türkçe + İngilizce). Ürünlerde hazır listede olmayan etiket ve alerjenler kaldırılacak. Devam edilsin mi?",
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api("/menu/catalog/reset-defaults", { method: "POST" });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sıfırlanamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <ErrorBanner message={error} />
      <Btn variant="ghost" className="h-8 px-3" disabled={busy} onClick={() => void run()}>
        {busy ? "Yenileniyor…" : "Varsayılanlarla sıfırla"}
      </Btn>
    </div>
  );
}

/** Alerjen ve ekstra kataloğu: Türkçe ve İngilizce adlar bir kez girilir, ürünlerde seçilir. */
export function CatalogManager({ kind, onChanged }: { kind: CatalogKind; onChanged?: () => void }) {
  const { data, loading, reload } = useCatalog(kind);
  const [error, setError] = useState<string | null>(null);
  const [newTr, setNewTr] = useState("");
  const [newEn, setNewEn] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { tr: string; en: string; price: string }>>({});
  const seeded = useRef(false);

  // Alerjen kataloğu boşsa AB'nin 14 alerjenini bir kez ekle
  useEffect(() => {
    if (kind !== "ALLERGEN" || !data || data.length > 0 || seeded.current) return;
    seeded.current = true;
    void api("/menu/catalog/ALLERGEN/seed-defaults", { method: "POST" })
      .then(() => reload(true))
      .catch(() => undefined);
  }, [kind, data, reload]);

  async function refresh() {
    await reload(true);
    onChanged?.();
  }

  async function addNew() {
    const tr = newTr.trim();
    if (!tr) return;
    setError(null);
    setBusyId("new");
    try {
      await api("/menu/catalog", {
        method: "POST",
        body: JSON.stringify({
          kind,
          label: tr,
          translations: { en: { name: newEn.trim() || tr } },
          defaultPrice: kind === "EXTRA" && newPrice.trim() ? Number(newPrice) : null,
        }),
      });
      setNewTr("");
      setNewEn("");
      setNewPrice("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Eklenemedi");
    } finally {
      setBusyId(null);
    }
  }

  async function saveRow(row: CatalogRow) {
    const d = drafts[row.id];
    if (!d) return;
    const tr = d.tr.trim();
    if (!tr) {
      setError("Türkçe ad boş olamaz");
      return;
    }
    setError(null);
    setBusyId(row.id);
    try {
      await api(`/menu/catalog/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: tr,
          translations: { en: { name: d.en.trim() || tr } },
          ...(kind === "EXTRA" ? { defaultPrice: d.price.trim() ? Number(d.price) : null } : {}),
        }),
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: CatalogRow) {
    const note =
      kind === "ALLERGEN"
        ? `"${row.label}" alerjenini kataloktan siler ve ürünlerden kaldırır. Devam edilsin mi?`
        : `"${row.label}" ekstrasını kataloktan siler. Ürünlerdeki kopyalar kalır. Devam edilsin mi?`;
    if (!window.confirm(note)) return;
    setError(null);
    setBusyId(row.id);
    try {
      await api(`/menu/catalog/${row.id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Silinemedi");
    } finally {
      setBusyId(null);
    }
  }

  function setDraft(row: CatalogRow, patch: Partial<{ tr: string; en: string; price: string }>) {
    setDrafts((prev) => ({
      ...prev,
      [row.id]: {
        tr: prev[row.id]?.tr ?? row.label,
        en: prev[row.id]?.en ?? catalogEnName(row),
        price: prev[row.id]?.price ?? (row.defaultPrice != null ? String(row.defaultPrice) : ""),
        ...patch,
      },
    }));
  }

  if (loading && !data) return <ListRowsSkeleton rows={4} />;

  const rows = data ?? [];
  const copy = COPY[kind];

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />
      {kind === "ALLERGEN" ? (
        <div className="flex justify-end">
          <ResetCatalogButton onDone={() => void refresh()} />
        </div>
      ) : null}

      <div className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input className={inputClassName()} placeholder={copy.trHint} value={newTr} onChange={(e) => setNewTr(e.target.value)} />
        <input className={inputClassName()} placeholder="English name" value={newEn} onChange={(e) => setNewEn(e.target.value)} />
        {kind === "EXTRA" ? (
          <input
            className={`${inputClassName()} w-full sm:w-28`}
            type="number"
            min="0"
            step="0.01"
            placeholder="Ücret ₺"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />
        ) : null}
        <Btn variant="primary" onClick={() => void addNew()} disabled={!newTr.trim() || busyId === "new"}>
          {copy.add}
        </Btn>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={copy.empty} description="Türkçe adı girin; İngilizcesini de aynı satıra yazın." />
      ) : (
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)]">
          {rows.map((row) => {
            const d = drafts[row.id];
            const dirty = Boolean(d);
            const busy = busyId === row.id;
            return (
              <li key={row.id} className="grid items-center gap-2 bg-[var(--panel)] px-3 py-2 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
                <input
                  className={inputClassName()}
                  value={d ? d.tr : row.label}
                  onChange={(e) => setDraft(row, { tr: e.target.value })}
                  aria-label={`${row.label} Türkçe adı`}
                />
                <input
                  className={inputClassName()}
                  value={d ? d.en : catalogEnName(row)}
                  onChange={(e) => setDraft(row, { en: e.target.value })}
                  aria-label={`${row.label} İngilizce adı`}
                />
                {kind === "EXTRA" ? (
                  <input
                    className={`${inputClassName()} w-full sm:w-28`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ücret ₺"
                    value={d ? d.price : row.defaultPrice != null ? String(row.defaultPrice) : ""}
                    onChange={(e) => setDraft(row, { price: e.target.value })}
                    aria-label={`${row.label} varsayılan ücret`}
                  />
                ) : null}
                <Btn variant="primary" className="h-8 px-3" disabled={!dirty || busy} onClick={() => void saveRow(row)}>
                  Kaydet
                </Btn>
                <Btn variant="ghost" className="h-8 px-3 text-[var(--danger)]" disabled={busy} onClick={() => void remove(row)}>
                  Sil
                </Btn>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
