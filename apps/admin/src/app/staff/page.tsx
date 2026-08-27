"use client";

import { FormEvent, useState } from "react";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  ListSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { bustCache, useApiQuery } from "../../lib/use-api-query";

type Staff = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function StaffPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <StaffContent />
    </RequireAuth>
  );
}

function StaffContent() {
  const { data: rows, error: loadError, loading, reload } = useApiQuery<Staff[]>(
    "staff:me",
    "/tenants/me/staff",
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    setResetUrl(null);
    try {
      await api("/tenants/me/staff", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setOk("Kasiyer eklendi");
      setName("");
      setEmail("");
      bustCache("staff");
      bustCache("metrics");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Davet başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function copyResetLink(userId: string) {
    setBusyId(userId);
    setError(null);
    setOk(null);
    setResetUrl(null);
    try {
      const data = await api<{ resetUrl: string; email: string }>(
        `/tenants/me/staff/${userId}/reset-link`,
        { method: "POST" },
      );
      setResetUrl(data.resetUrl);
      try {
        await navigator.clipboard.writeText(data.resetUrl);
        setOk(`${data.email} için sıfırlama linki kopyalandı`);
      } catch {
        setOk(`${data.email} için sıfırlama linki hazır (aşağıda)`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Link oluşturulamadı");
    } finally {
      setBusyId(null);
    }
  }

  async function setNewPassword(userId: string, email: string) {
    const next = window.prompt(
      `${email} için yeni şifre (min 8 karakter):`,
      "Password123!",
    );
    if (!next) return;
    setBusyId(userId);
    setError(null);
    setOk(null);
    try {
      await api(`/tenants/me/staff/${userId}/password`, {
        method: "POST",
        body: JSON.stringify({ password: next }),
      });
      setOk(`${email} şifresi güncellendi`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Şifre güncellenemedi");
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !rows) {
    return <ListSkeleton />;
  }

  const list = rows ?? [];

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Ekip"
        title="Kasiyerler"
        subtitle="Personel hesabı oluştur; aynı şifre ile panele giriş yapabilirler."
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />
      {resetUrl ? (
        <SoftBox>
          <p className="break-all text-xs leading-relaxed text-[var(--ink)]">
            Sıfırlama linki:{" "}
            <a href={resetUrl} className="text-[var(--accent)] underline">
              {resetUrl}
            </a>
          </p>
        </SoftBox>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
        <Panel>
          <PanelHeader
            title="Davet et"
            description="Yeni kasiyer için geçici şifre belirle."
          />
          <form onSubmit={invite} className="space-y-3">
            <Field label="Ad">
              <input
                className={inputClassName()}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field label="E-posta">
              <input
                className={inputClassName()}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Geçici şifre">
              <input
                className={inputClassName()}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <button type="submit" className={`${btnPrimary()} w-full`} disabled={saving}>
              {saving ? "Ekleniyor…" : "Kasiyer ekle"}
            </button>
          </form>
        </Panel>

        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader
              title="Ekip"
              description={`${list.length} hesap`}
            />
          </div>
          {list.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                title="Henüz kasiyer yok"
                description="Soldan ilk hesabı oluştur."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {list.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                      {u.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {u.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={u.role === "STORE_OWNER" ? "success" : "neutral"}>
                      {u.role === "STORE_OWNER" ? "Sahip" : "Kasiyer"}
                    </Badge>
                    <button
                      type="button"
                      className={btnGhost()}
                      disabled={busyId === u.id}
                      onClick={() => void copyResetLink(u.id)}
                    >
                      Reset link
                    </button>
                    {u.role === "CASHIER" ? (
                      <button
                        type="button"
                        className={btnGhost()}
                        disabled={busyId === u.id}
                        onClick={() => void setNewPassword(u.id, u.email)}
                      >
                        Şifre ata
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <SoftBox>
        <p className="text-xs leading-relaxed text-[var(--muted)]">
          Kasiyerler yalnızca Tezgâh ekranına erişir. Reset linki 2 saat
          geçerlidir; şifre atanınca mevcut oturumlar düşer.
        </p>
      </SoftBox>
    </div>
  );
}
