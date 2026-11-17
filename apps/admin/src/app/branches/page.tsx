"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  ListSkeleton,
  Panel,
  PanelHeader,
  SoftBox,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";
import { SettingsSectionHeader } from "../settings/_components/settings-section-header";

type Branch = {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function BranchesPage() {
  return <BranchesRedirect />;
}

function BranchesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings/branches");
  }, [router]);
  return null;
}

export function BranchesSettingsPanel() {
  const { data, error: loadError, loading, reload } = useApiQuery<Branch[]>(
    "branches",
    "/branches",
  );
  const { data: branchCtx } = useApiQuery<{
    maxBranches: number;
    branchCount: number;
    canAddBranch: boolean;
  }>("branches:context", "/branches/context");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = data ?? [];

  async function createBranch(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api("/branches", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || undefined,
        }),
      });
      setName("");
      setAddress("");
      setOk("Şube eklendi");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Şube eklenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(branch: Branch) {
    setError(null);
    setOk(null);
    try {
      await api(`/branches/${branch.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !branch.isActive }),
      });
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncellenemedi");
    }
  }

  if (loading && !data) {
    return <ListSkeleton rows={4} />;
  }

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Şubeler"
        subtitle="Birden fazla şubeniz varsa buradan ekleyin ve yönetin."
        help="Her şube için ad ve adres girin. Pasif şubeler listede kalır ama yeni işlemde seçilmez."
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      {branchCtx ? (
        <SoftBox>
          <p className="text-sm text-[var(--muted)]">
            Paketinizde{" "}
            <span className="font-medium text-[var(--ink)]">
              {branchCtx.branchCount} / {branchCtx.maxBranches}
            </span>{" "}
            şube kullanılıyor.
            {!branchCtx.canAddBranch
              ? " Yeni şube için paket yükseltin."
              : null}
          </p>
        </SoftBox>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader
              title="Şube listesi"
              description={`${rows.length} kayıt`}
            />
          </div>
          {rows.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                title="Henüz şube yok"
                description="Sağdaki formdan ilk şubenizi ekleyin."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {rows.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
                >
                  <div>
                    <p className="font-medium text-[var(--ink)]">{b.name}</p>
                    {b.address ? (
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {b.address}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={b.isActive ? "success" : "neutral"}>
                      {b.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                    <button
                      type="button"
                      className={btnGhost()}
                      onClick={() => void toggleActive(b)}
                    >
                      {b.isActive ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Yeni şube" description="Paket kotanıza tabidir." />
          <form onSubmit={(e) => void createBranch(e)} className="space-y-3">
            <Field label="Şube adı">
              <input
                className={inputClassName()}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Kadıköy"
                required
              />
            </Field>
            <Field label="Adres (opsiyonel)">
              <input
                className={inputClassName()}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Açık adres"
              />
            </Field>
            <button
              type="submit"
              className={btnPrimary()}
              disabled={saving || !name.trim()}
            >
              {saving ? "Ekleniyor…" : "Şube ekle"}
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
