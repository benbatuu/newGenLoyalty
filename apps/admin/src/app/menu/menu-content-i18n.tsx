"use client";

import { useEffect, useState } from "react";
import {
  getMenuLangMeta,
  type MenuContentI18n,
  type MenuLang,
} from "@ngl/shared";
import { Field, inputClassName } from "../../components/ui";
import { useApiQuery } from "../../lib/use-api-query";

type ThemePayload = {
  document?: {
    blocks?: Array<{
      type?: string;
      languages?: string[];
      defaultLanguage?: string;
    }>;
  };
};

/**
 * İşletmenin etkin menü dilleri. Veri gelene kadar boş dizi döner (arayüz skeleton gösterir);
 * sabit bir dil listesi kullanılmaz.
 */
export function useMenuContentLangs(): MenuLang[] {
  const { data, loading } = useApiQuery<ThemePayload>("menu:theme", "/menu/theme");
  const langs =
    data?.document?.blocks?.find((b) => b.type === "header")?.languages ??
    null;
  if (langs?.length) return langs;
  if (!data) return loading ? [] : ["tr"];
  return ["tr"];
}

export function ContentLocaleFields({
  langs,
  primaryName,
  onPrimaryName,
  description,
  onDescription,
  translations,
  onTranslations,
  nameRequired,
}: {
  langs: MenuLang[];
  primaryName: string;
  onPrimaryName: (v: string) => void;
  description: string;
  onDescription: (v: string) => void;
  translations: MenuContentI18n;
  onTranslations: (v: MenuContentI18n) => void;
  nameRequired?: boolean;
}) {
  const list = langs.length ? langs : (["tr"] as MenuLang[]);
  const [tab, setTab] = useState<MenuLang>(list[0]!);
  const loadingLangs = langs.length === 0;
  useEffect(() => {
    if (!list.includes(tab)) setTab(list[0]!);
  }, [list, tab]);

  const isPrimary = tab === list[0];
  const entry = translations[tab] ?? {};

  if (loadingLangs) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Diller yükleniyor">
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-[var(--surface)]" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-[var(--surface)]" />
        </div>
        <div className="h-11 w-full animate-pulse rounded-lg bg-[var(--surface)]" />
        <div className="h-16 w-full animate-pulse rounded-lg bg-[var(--surface)]" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1"
        role="tablist"
      >
        {list.map((l) => {
          const meta = getMenuLangMeta(l);
          const on = tab === l;
          return (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={on}
              className={`min-h-9 rounded-md px-2.5 text-xs font-medium ${
                on
                  ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
              onClick={() => setTab(l)}
            >
              {meta.flag} {meta.native}
            </button>
          );
        })}
      </div>
      <Field label={isPrimary ? "Ad *" : `Ad (${getMenuLangMeta(tab).native})`}>
        <input
          className={inputClassName()}
          value={isPrimary ? primaryName : entry.name ?? ""}
          required={Boolean(nameRequired && isPrimary)}
          onChange={(e) => {
            const v = e.target.value;
            if (isPrimary) {
              onPrimaryName(v);
              return;
            }
            onTranslations({
              ...translations,
              [tab]: { ...entry, name: v },
            });
          }}
        />
      </Field>
      <Field label={`Açıklama (${getMenuLangMeta(tab).native})`}>
        <textarea
          className={inputClassName()}
          rows={2}
          value={isPrimary ? description : entry.description ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (isPrimary) {
              onDescription(v);
              return;
            }
            onTranslations({
              ...translations,
              [tab]: { ...entry, description: v },
            });
          }}
        />
      </Field>
      {isPrimary ? (
        <p className="text-[11px] text-[var(--muted)]">
          İlk dil birincil kayıttır. Diğer diller çeviri olarak saklanır.
        </p>
      ) : null}
    </div>
  );
}

export function seedTranslationsFromLegacy(opts: {
  nameTr?: string | null;
  nameEn?: string | null;
  translations?: MenuContentI18n | null;
}): MenuContentI18n {
  const base: MenuContentI18n = { ...(opts.translations ?? {}) };
  if (opts.nameTr?.trim() && !base.tr?.name) {
    base.tr = { ...base.tr, name: opts.nameTr.trim() };
  }
  if (opts.nameEn?.trim() && !base.en?.name) {
    base.en = { ...base.en, name: opts.nameEn.trim() };
  }
  return base;
}
