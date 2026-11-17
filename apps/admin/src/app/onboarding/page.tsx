"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ErrorBanner,
  PageHeader,
  PageSkeleton,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  btnGhost,
  btnPrimary,
} from "../../components/ui";
import { useApiQuery } from "../../lib/use-api-query";
import { setSessionData } from "../../lib/session-data";

type OnboardingStep = {
  id: string;
  label: string;
  done: boolean;
  path: string;
};

type OnboardingStatus = {
  steps: OnboardingStep[];
  progress: number;
  complete: boolean;
};

export default function OnboardingPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <OnboardingContent />
    </RequireAuth>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const { data, error, loading, refreshing, reload } =
    useApiQuery<OnboardingStatus>("onboarding:status", "/tenants/me/onboarding", {
    });

  // Menüdeki "Kurulum" öğesi de güncel kalsın (oturum verisine yaz)
  useEffect(() => {
    if (data) setSessionData("onboarding", data);
  }, [data]);

  useEffect(() => {
    if (data?.complete) {
      router.replace("/reports");
    }
  }, [data?.complete, router]);

  if (loading && !data) {
    return <PageSkeleton cards={3} />;
  }

  if (data?.complete) {
    return null;
  }

  const pending = data?.steps.filter((s) => !s.done) ?? [];

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="İşletmem"
        title="Kurulum adımları"
        subtitle="Açılışa hazır olmak için adım adım ilerleyin."
        help="Tamamlanan adımlar otomatik işaretlenir. Eksik kalan adıma tıklayarak doğrudan ilgili sayfaya gidebilirsiniz."
        actions={
          <button
            type="button"
            className={btnGhost()}
            disabled={refreshing}
            onClick={() => void reload(true)}
          >
            {refreshing ? "Yenileniyor…" : "Yenile"}
          </button>
        }
      />
      <ErrorBanner message={error} />

      <SoftBox>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              İlerleme
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tabular-nums">
              %{data?.progress ?? 0}
            </p>
          </div>
          {data?.complete ? (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700">
              Tüm adımlar tamam — pilot için hazırsın.
            </p>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              {pending.length} adım kaldı
            </p>
          )}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${data?.progress ?? 0}%` }}
          />
        </div>
      </SoftBox>

      <Panel padded={false}>
        <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <PanelHeader
            title="Adımlar"
            description="Her adım tamamlandığında otomatik işaretlenir."
          />
        </div>
        <ol className="divide-y divide-[var(--line)]">
          {(data?.steps ?? []).map((step, i) => (
            <li
              key={step.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.done
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-[var(--line)] text-[var(--muted)]"
                  }`}
                  aria-hidden
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <div>
                  <p
                    className={`font-medium ${step.done ? "text-[var(--muted)] line-through" : "text-[var(--ink)]"}`}
                  >
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      Bu adımı tamamlamak için sayfaya git.
                    </p>
                  )}
                </div>
              </div>
              {!step.done && (
                <Link href={step.path} className={btnPrimary()}>
                  Git →
                </Link>
              )}
              {step.done && (
                <Link href={step.path} className={btnGhost()}>
                  Görüntüle
                </Link>
              )}
            </li>
          ))}
        </ol>
      </Panel>

      <SoftBox>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Detaylı pilot kontrol listesi için{" "}
          <code className="rounded bg-[var(--line)] px-1.5 py-0.5 text-xs">
            docs/pilot/onboarding-checklist.md
          </code>{" "}
          dosyasına bak. Takıldığın yerde{" "}
          <Link href="/help" className="text-[var(--accent)] hover:underline">
            Yardım
          </Link>{" "}
          sayfasından geri bildirim gönderebilirsin.
        </p>
      </SoftBox>
    </div>
  );
}
