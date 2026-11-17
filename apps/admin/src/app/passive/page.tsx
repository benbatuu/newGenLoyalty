"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthShell, authButtonClass, authFieldClass } from "../../components/auth-shell";
import { getApiUrl } from "../../lib/public-urls";

type Tab = "new" | "track";

export default function PassivePage() {
  return (
    <Suspense fallback={null}>
      <PassiveContent />
    </Suspense>
  );
}

function PassiveContent() {
  const params = useSearchParams();
  const reason = params.get("reason");
  const [tab, setTab] = useState<Tab>("new");

  return (
    <AuthShell
      image="/login-hero.png"
      asideTitle="Hesabınız şu an pasif"
      asideText="Destek ekibimizle iletişime geçin. Talebinizi açtığınızda size bir takip kodu verilir; bu kodla durumu her zaman görebilirsiniz."
      eyebrow="Hesap durumu"
      title="Hesabınız pasif"
      subtitle={reason || "Hesabınız şu an erişime kapalı. Aşağıdan destek talebi oluşturabilirsiniz."}
    >
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1">
        {(
          [
            ["new", "Talep oluştur"],
            ["track", "Talebimi takip et"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`h-9 rounded-lg text-sm font-medium transition ${
              tab === key ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "new" ? <NewTicketForm /> : <TrackTicket />}

      <p className="mt-6 text-center text-xs text-[var(--muted)]">
        <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
          Girişe dön
        </Link>
      </p>
    </AuthShell>
  );
}

/** Multipart POST — auth gerektirmez */
async function postForm(path: string, form: FormData): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  try {
    const res = await fetch(`${getApiUrl()}${path}`, { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    if (!res.ok) {
      const message = Array.isArray(data.message) ? data.message.join(" · ") : data.message || "İşlem tamamlanamadı.";
      return { ok: false, message };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, message: "Sunucuya ulaşılamadı. Bağlantınızı kontrol edin." };
  }
}

async function postJson(path: string, body: unknown): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    if (!res.ok) {
      const message = Array.isArray(data.message) ? data.message.join(" · ") : data.message || "İşlem tamamlanamadı.";
      return { ok: false, message };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, message: "Sunucuya ulaşılamadı. Bağlantınızı kontrol edin." };
  }
}

function FileInput({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Ekler (isteğe bağlı, en fazla 5 dosya, 10 MB)</span>
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          onChange={(e) => onChange(Array.from(e.target.files ?? []).slice(0, 5))}
          className="block w-full text-xs text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface)] file:px-3 file:py-2 file:text-xs file:font-medium file:text-[var(--ink)]"
        />
      </label>
      {files.length ? (
        <ul className="space-y-1 text-xs text-[var(--muted)]">
          {files.map((f) => (
            <li key={f.name + f.size} className="truncate">{f.name}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NewTicketForm() {
  const [form, setForm] = useState({ requesterName: "", requesterEmail: "", cafe: "", phone: "", subject: "", message: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v) fd.append(k, v);
    });
    files.forEach((f) => fd.append("files", f));
    const res = await postForm("/public/support/tickets", fd);
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setCode((res.data as { code: string }).code);
  }

  if (code) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-[var(--muted)]">Talebiniz alındı. Takip kodunuzu not edin:</p>
        <p className="rounded-xl border border-[var(--accent-glow)] bg-[var(--accent-soft)] px-4 py-5 font-display text-2xl font-semibold tracking-widest text-[var(--accent)]">
          {code}
        </p>
        <button
          type="button"
          className={authButtonClass}
          onClick={() => {
            void navigator.clipboard?.writeText(code);
            setCopied(true);
          }}
        >
          {copied ? "Kopyalandı" : "Kodu kopyala"}
        </button>
        <p className="text-xs text-[var(--muted)]">Durumu görmek için “Talebimi takip et” sekmesini kullanın; kodunuz ve e-posta adresiniz gerekir.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ad soyad" value={form.requesterName} onChange={(v) => setForm({ ...form, requesterName: v })} required />
        <Field label="E-posta" type="email" value={form.requesterEmail} onChange={(v) => setForm({ ...form, requesterEmail: v })} required />
        <Field label="Kafe adı" value={form.cafe} onChange={(v) => setForm({ ...form, cafe: v })} required />
        <Field label="Telefon (isteğe bağlı)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
      </div>
      <Field label="Konu" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} required />
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Mesaj</span>
        <textarea
          className="min-h-[120px] w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-[0.9375rem] text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)]"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
          minLength={10}
        />
      </label>
      <FileInput files={files} onChange={setFiles} />
      {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
      <button type="submit" className={authButtonClass} disabled={busy}>
        {busy ? "Gönderiliyor…" : "Talebi gönder"}
      </button>
    </form>
  );
}

type Thread = {
  code: string;
  subject: string;
  cafe: string;
  status: string;
  createdAt: string;
  messages: Array<{
    id: string;
    authorType: string;
    authorName: string;
    body: string;
    createdAt: string;
    attachments: Array<{ id: string; fileName: string; url: string }>;
  }>;
};

const STATUS_TR: Record<string, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "İnceleniyor",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapandı",
};

function TrackTicket() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [thread, setThread] = useState<Thread | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await postJson("/public/support/tickets/lookup", { code: code.trim(), email: email.trim() });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setThread(res.data as Thread);
  }

  if (thread) {
    return (
      <Thread
        thread={thread}
        code={code.trim().toUpperCase()}
        email={email.trim()}
        onRefresh={async () => {
          const res = await postJson("/public/support/tickets/lookup", { code: thread.code, email: email.trim() });
          if (res.ok) setThread(res.data as Thread);
        }}
        onBack={() => setThread(null)}
      />
    );
  }

  return (
    <form onSubmit={lookup} className="space-y-4">
      <Field label="Takip kodu" value={code} onChange={setCode} placeholder="DK-XXXX-XXXX" required />
      <Field label="Talepte kullandığınız e-posta" type="email" value={email} onChange={setEmail} required />
      {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
      <button type="submit" className={authButtonClass} disabled={busy}>
        {busy ? "Kontrol ediliyor…" : "Talebi görüntüle"}
      </button>
    </form>
  );
}

function Thread({
  thread,
  code,
  email,
  onRefresh,
  onBack,
}: {
  thread: Thread;
  code: string;
  email: string;
  onRefresh: () => Promise<void>;
  onBack: () => void;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("code", code);
    fd.append("email", email);
    fd.append("body", body);
    files.forEach((f) => fd.append("files", f));
    const res = await postForm("/public/support/tickets/reply", fd);
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setBody("");
    setFiles([]);
    await onRefresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-widest text-[var(--accent)]">{thread.code}</p>
          <p className="truncate font-medium text-[var(--ink)]">{thread.subject}</p>
          <p className="text-xs text-[var(--muted)]">{thread.cafe} · {STATUS_TR[thread.status] ?? thread.status}</p>
        </div>
        <button type="button" onClick={onBack} className="shrink-0 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]">
          Kapat
        </button>
      </div>

      <ol className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {thread.messages.map((m) => (
          <li
            key={m.id}
            className={`rounded-xl border px-4 py-3 text-sm ${
              m.authorType === "ADMIN" ? "border-[var(--accent-glow)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface)]"
            }`}
          >
            <p className="text-[11px] font-medium text-[var(--muted)]">
              {m.authorType === "ADMIN" ? "Destek ekibi" : m.authorName} · {new Date(m.createdAt).toLocaleString("tr-TR")}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-[var(--ink)]">{m.body}</p>
            {m.attachments.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {m.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex max-w-[220px] truncate rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-xs text-[var(--accent)] hover:underline">
                      {a.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>

      {thread.status !== "CLOSED" ? (
        <form onSubmit={send} className="space-y-3 border-t border-[var(--line)] pt-4">
          <textarea
            className="min-h-[90px] w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)]"
            placeholder="Yanıtınızı yazın…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <FileInput files={files} onChange={setFiles} />
          {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
          <button type="submit" className={authButtonClass} disabled={busy}>
            {busy ? "Gönderiliyor…" : "Yanıtla"}
          </button>
        </form>
      ) : (
        <p className="border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">Bu talep kapatılmış. Yeni bir talep oluşturabilirsiniz.</p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">{label}</span>
      <input type={type} className={authFieldClass} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} />
    </label>
  );
}
