"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Badge,
  ErrorBanner,
  ListSkeleton,
  PageHeader,
  Panel,
  RequireAuth,
  Skeleton,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { displayPhone, formatPhoneLabel } from "../../lib/pii-display";
import { useApiQuery } from "../../lib/use-api-query";

type Person = { id: string; phone: string; displayName: string | null };

type ReferralCodeRow = {
  id: string;
  code: string;
  rewardStamps: number;
  isActive: boolean;
  createdAt: string;
  customer: Person;
  _count: { redemptions: number };
};

type RecentUse = {
  id: string;
  createdAt: string;
  code: string;
  rewardStamps: number;
  referrer: Person;
  referee: Person;
};

/** Sayfa açılışında tek istek */
type Overview = {
  codes: ReferralCodeRow[];
  recent: RecentUse[];
  stats: { activeCodes: number; totalRedemptions: number; last30Days: number };
};

type Mode = "give" | "use";
type Sort = "new" | "top";

export default function ReferralsPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <ReferralsContent />
    </RequireAuth>
  );
}

/** Sadece rakam, en fazla 11 hane */
const digitsOf = (v: string) => v.replace(/\D/g, "").slice(0, 11);
const phoneOk = (v: string) => {
  const d = digitsOf(v);
  return d.length === 10 || (d.length === 11 && d.startsWith("0"));
};

function ReferralsContent() {
  const { data, error: loadError, loading, setData } = useApiQuery<Overview>(
    "referrals:overview",
    "/referrals/overview",
  );
  const codes = useMemo(() => data?.codes ?? [], [data]);
  const firstLoad = loading && !data;

  const [mode, setMode] = useState<Mode>("give");
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<ReferralCodeRow | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("new");

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 4000);
    return () => clearTimeout(t);
  }, [ok]);

  const reward = codes[0]?.rewardStamps ?? 1;

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const qDigits = q.replace(/\D/g, "");
    const list = q
      ? codes.filter(
          (c) =>
            c.code.toLocaleLowerCase("tr").includes(q) ||
            (c.customer.displayName ?? "").toLocaleLowerCase("tr").includes(q) ||
            (qDigits.length >= 2 && c.customer.phone.replace(/\D/g, "").endsWith(qDigits)),
        )
      : codes;
    return sort === "top"
      ? [...list].sort((a, b) => b._count.redemptions - a._count.redemptions)
      : list;
  }, [codes, query, sort]);

  /** Yeni/var olan kodu listeye yerelde ekle — ekstra GET yok */
  function upsertCode(row: ReferralCodeRow) {
    setData((prev) => {
      if (!prev) return prev;
      const exists = prev.codes.some((c) => c.id === row.id);
      return {
        ...prev,
        codes: exists
          ? prev.codes.map((c) => (c.id === row.id ? row : c))
          : [row, ...prev.codes],
        stats: exists ? prev.stats : { ...prev.stats, activeCodes: prev.stats.activeCodes + 1 },
      };
    });
  }

  /** Kullanım sonrası sayaçları yerelde artır */
  function bumpUse(code: string) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        codes: prev.codes.map((c) =>
          c.code === code ? { ...c, _count: { redemptions: c._count.redemptions + 1 } } : c,
        ),
        stats: {
          ...prev.stats,
          totalRedemptions: prev.stats.totalRedemptions + 1,
          last30Days: prev.stats.last30Days + 1,
        },
      };
    });
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Sadakat programı"
        title="Arkadaşını getir"
        subtitle="Müşterileriniz arkadaşlarını getirsin, ikisi de kazansın. Kod verin, gelen arkadaş kodu söylesin, damgalar otomatik eklensin."
        help="Her müşterinin tek bir kodu olur. Yeni gelen arkadaş bu kodu söylediğinde arkadaşa 1 damga, kodu paylaşana da ödül damgası eklenir. Bir kişi aynı kodu bir kez kullanabilir; kendi kodunu kullanamaz."
      />

      <div aria-live="polite">
        <ErrorBanner message={loadError} />
        <SuccessBanner message={ok} />
      </div>

      {/* Nasıl çalışır */}
      <ol className="grid gap-2 sm:grid-cols-3 sm:gap-3" aria-label="Nasıl çalışır">
        <Step n={1} title="Kodu verin" text="Müşterinin telefonunu yazın, ona özel kodu alın." />
        <Step n={2} title="Arkadaşı gelsin" text="Arkadaşı ilk gelişinde kasada kodu söyler." />
        <Step
          n={3}
          title="İkisi de kazansın"
          text={`Yeni müşteriye 1 damga, kodu paylaşana +${reward} damga.`}
        />
      </ol>

      {/* Özet */}
      <section aria-label="Özet" className="grid grid-cols-3 gap-3 lg:gap-5">
        {firstLoad ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="attio-surface p-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-6 w-10" />
            </div>
          ))
        ) : (
          <>
            <Stat label="Kodlu müşteri" value={data?.stats.activeCodes ?? 0} />
            <Stat label="Getirilen" value={data?.stats.totalRedemptions ?? 0} hint="Toplam müşteri" />
            <Stat label="Son 30 gün" value={data?.stats.last30Days ?? 0} hint="Yeni gelen" />
          </>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Sağ: işlem kartı (mobilde üstte) */}
        <div className="space-y-5 lg:order-2">
          <Panel padded={false}>
            <div
              role="tablist"
              aria-label="İşlem seç"
              className="grid grid-cols-2 gap-0.5 border-b border-[var(--line)] bg-[var(--surface)] p-1"
            >
              {(
                [
                  ["give", "Kod ver"],
                  ["use", "Kod kullan"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => {
                    setMode(id);
                    setError(null);
                  }}
                  className={`min-h-9 rounded-md text-[0.8125rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)] ${
                    mode === id
                      ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {mode === "give" ? (
                <GiveForm
                  error={error}
                  setError={setError}
                  lastCode={lastCode}
                  onDone={(row, created) => {
                    upsertCode(row);
                    setLastCode(row);
                    setOk(created ? "Kod oluşturuldu." : "Bu müşterinin kodu zaten vardı.");
                  }}
                />
              ) : (
                <UseForm
                  reward={reward}
                  error={error}
                  setError={setError}
                  onDone={(code) => {
                    bumpUse(code);
                    setOk("Kod kullanıldı, damgalar eklendi.");
                  }}
                />
              )}
            </div>
          </Panel>

          {/* Son kullanımlar */}
          {data && data.recent.length > 0 ? (
            <Panel padded={false}>
              <h2 className="border-b border-[var(--line)] px-4 py-3 font-display text-[0.95rem] tracking-tight text-[var(--ink)]">
                Son gelenler
              </h2>
              <ul className="divide-y divide-[var(--line)]">
                {data.recent.map((r) => (
                  <li key={r.id} className="px-4 py-2.5 text-[0.8125rem]">
                    <p className="text-[var(--ink)]">
                      <strong className="font-medium">
                        {formatPhoneLabel(r.referee.displayName, r.referee.phone)}
                      </strong>{" "}
                      <span className="text-[var(--muted)]">geldi,</span>{" "}
                      <strong className="font-medium">
                        {formatPhoneLabel(r.referrer.displayName, r.referrer.phone)}
                      </strong>{" "}
                      <span className="text-[var(--muted)]">sayesinde</span>
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {timeAgo(r.createdAt)} · +{r.rewardStamps} damga kazandı
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        {/* Sol: kod listesi */}
        <Panel padded={false} className="lg:order-1 lg:col-span-2">
          <div className="flex flex-col gap-2 border-b border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-[0.95rem] tracking-tight text-[var(--ink)]">
              Müşteri kodları
            </h2>
            {codes.length > 0 ? (
              <div className="flex gap-2">
                <label className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
                  <span className="sr-only">Kod, isim veya telefonun son haneleri</span>
                  <input
                    className={`${inputClassName()} pl-8`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ara: kod, isim, son haneler"
                  />
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </label>
                <select
                  aria-label="Sırala"
                  className={`${inputClassName()} w-auto`}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                >
                  <option value="new">En yeni</option>
                  <option value="top">En çok getiren</option>
                </select>
              </div>
            ) : null}
          </div>

          {firstLoad ? (
            <div className="p-4">
              <ListSkeleton rows={4} />
            </div>
          ) : codes.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface)] text-[var(--muted)]">
                <GiftIcon />
              </span>
              <p className="mt-3 font-medium text-[var(--ink)]">Henüz kod yok</p>
              <p className="mx-auto mt-1 max-w-sm text-[0.8125rem] leading-snug text-[var(--muted)]">
                En sadık müşterinizle başlayın. Telefonunu yazın, kodunu ona verin.
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="px-4 py-8 text-center text-[0.8125rem] text-[var(--muted)]">
              «{query}» ile eşleşen kod yok.{" "}
              <button
                type="button"
                className="font-medium text-[var(--ink)] underline"
                onClick={() => setQuery("")}
              >
                Aramayı temizle
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[0.8125rem]">
                <thead className="border-b border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--muted)]">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">Müşteri</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Kod</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Gelen kişi</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Oluşturulma</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Paylaş</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {visible.map((c) => (
                    <CodeRow key={c.id} row={c} highlight={lastCode?.id === c.id} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function GiveForm({
  error,
  setError,
  lastCode,
  onDone,
}: {
  error: string | null;
  setError: (v: string | null) => void;
  lastCode: ReferralCodeRow | null;
  onDone: (row: ReferralCodeRow, created: boolean) => void;
}) {
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const invalid = touched && phone.length > 0 && !phoneOk(phone);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone)) {
      setError("Telefonu 10 hane yazın. Örn. 532 123 45 67");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ created: boolean; code: ReferralCodeRow }>(
        "/referrals/generate-by-phone",
        { method: "POST", body: JSON.stringify({ phone: digitsOf(phone) }) },
      );
      onDone(res.code, res.created);
      setPhone("");
      setTouched(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kod alınamadı. Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => void submit(e)} className="space-y-3" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--ink)]">
            Müşterinin telefonu
          </span>
          <input
            className={inputClassName()}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (error) setError(null);
            }}
            onBlur={() => setTouched(true)}
            placeholder="5xx xxx xx xx"
            inputMode="tel"
            autoComplete="off"
            aria-invalid={invalid}
          />
          <span className="mt-1 block text-[0.6875rem] text-[var(--muted)]">
            Müşteri kayıtlı olmalı. Kodu varsa aynı kod gösterilir.
          </span>
        </label>
        {error ? (
          <p role="alert" className="text-[0.8125rem] text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <button type="submit" className={`${btnPrimary()} h-9 w-full`} disabled={busy}>
          {busy ? "Kod alınıyor…" : "Kodu göster"}
        </button>
      </form>

      {lastCode ? <CodeCard row={lastCode} /> : null}
    </div>
  );
}

function UseForm({
  reward,
  error,
  setError,
  onDone,
}: {
  reward: number;
  error: string | null;
  setError: (v: string | null) => void;
  onDone: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) {
      setError("Arkadaşının verdiği kodu yazın.");
      return;
    }
    if (!phoneOk(phone)) {
      setError("Yeni müşterinin telefonunu 10 hane yazın.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/referrals/redeem-by-phone", {
        method: "POST",
        body: JSON.stringify({ code: c, phone: digitsOf(phone) }),
      });
      onDone(c);
      setCode("");
      setPhone("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kod kullanılamadı. Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3" noValidate>
      <label className="block">
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--ink)]">
          Arkadaşının kodu
        </span>
        <input
          className={`${inputClassName()} font-mono uppercase tracking-widest`}
          value={code}
          maxLength={20}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          placeholder="A1B2C3D4"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--ink)]">
          Yeni müşterinin telefonu
        </span>
        <input
          className={inputClassName()}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (error) setError(null);
          }}
          placeholder="5xx xxx xx xx"
          inputMode="tel"
          autoComplete="off"
        />
        <span className="mt-1 block text-[0.6875rem] text-[var(--muted)]">
          Yeni müşteri önce tezgâhta kayıt olmalı.
        </span>
      </label>
      <p className="rounded-lg bg-[var(--surface)] px-3 py-2 text-xs leading-snug text-[var(--ink)]/80">
        Yeni müşteriye <strong className="font-medium">1 damga</strong>, kodu paylaşana{" "}
        <strong className="font-medium">+{reward} damga</strong> eklenir. Her kişi bir kodu bir kez
        kullanabilir.
      </p>
      {error ? (
        <p role="alert" className="text-[0.8125rem] text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      <button type="submit" className={`${btnPrimary()} h-9 w-full`} disabled={busy}>
        {busy ? "Ekleniyor…" : "Kodu kullan ve damga ekle"}
      </button>
    </form>
  );
}

/** Yeni alınan kod — büyük, kopyala/paylaş */
function CodeCard({ row }: { row: ReferralCodeRow }) {
  const share = `${row.code} kodumla gel, ilk gelişinde hediye damga kazan!`;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-gradient-to-br from-[var(--accent-soft)] to-[var(--panel)] p-4 text-center">
      <p className="text-xs text-[var(--muted)]">
        {formatPhoneLabel(row.customer.displayName, row.customer.phone)} için kod
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em] text-[var(--ink)]">
        {row.code}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {row._count.redemptions > 0
          ? `${row._count.redemptions} arkadaş getirdi`
          : "Henüz kullanılmadı"}
      </p>
      <div className="mt-3 flex justify-center gap-2">
        <CopyButton text={row.code} label="Kodu kopyala" />
        <a
          className={btnGhost()}
          href={`https://wa.me/?text=${encodeURIComponent(share)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp ile paylaş
        </a>
      </div>
    </div>
  );
}

function CodeRow({
  row: c,
  highlight,
}: {
  row: ReferralCodeRow;
  highlight: boolean;
}) {
  const uses = c._count.redemptions;
  const created = new Date(c.createdAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const share = `${c.code} kodumla gel, ilk gelişinde hediye damga kazan!`;
  return (
    <tr className={`transition-colors ${highlight ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--surface)]"}`}>
      <td className="px-4 py-3">
        <p className="font-medium text-[var(--ink)]">
          {c.customer.displayName || displayPhone(c.customer.phone)}
        </p>
        {c.customer.displayName ? (
          <p className="text-xs text-[var(--muted)]">{displayPhone(c.customer.phone)}</p>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="font-mono tracking-wider text-[var(--ink)]">{c.code}</span>
          <CopyButton text={c.code} label={`${c.code} kodunu kopyala`} compact />
        </span>
      </td>
      <td className="px-4 py-3">
        {uses > 0 ? (
          <Badge tone="success">{uses} kişi</Badge>
        ) : (
          <span className="text-[var(--muted)]">0 kişi</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{created}</td>
      <td className="px-4 py-3 text-right">
        <a
          className={btnGhost()}
          href={`https://wa.me/?text=${encodeURIComponent(share)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${c.code} kodunu WhatsApp ile paylaş`}
        >
          WhatsApp
        </a>
      </td>
    </tr>
  );
}

function CopyButton({ text, label, compact }: { text: string; label: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* pano izni yoksa sessiz geç */
    }
  }
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={label}
        title={copied ? "Kopyalandı" : "Kopyala"}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)]"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    );
  }
  return (
    <button type="button" className={btnPrimary()} onClick={() => void copy()}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Kopyalandı" : label}
    </button>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="attio-surface flex items-start gap-3 px-3 py-2.5 sm:p-4">
      <span className="mt-0.5 grid h-6 w-6 sm:h-7 sm:w-7 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-medium text-[var(--ink)] sm:text-sm">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-[var(--muted)] sm:text-[0.8125rem]">{text}</p>
      </div>
    </li>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="attio-surface p-3.5 sm:p-4">
      <p className="section-label truncate">{label}</p>
      <p className="mt-1.5 font-display text-xl tabular-nums tracking-tight text-[var(--ink)] sm:text-2xl">
        {value.toLocaleString("tr-TR")}
      </p>
      {hint ? <p className="mt-0.5 text-[0.6875rem] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

function initials(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase("tr"))
    .join("");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const CopyIcon = () => (
  <Icon>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Icon>
);
const CheckIcon = () => (
  <Icon>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);
const GiftIcon = () => (
  <Icon>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
  </Icon>
);
