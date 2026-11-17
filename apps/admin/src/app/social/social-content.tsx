"use client";

import { useState } from "react";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  SuccessBanner,
  btnGhost,
  btnPrimary,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { displayPhone } from "../../lib/pii-display";
import { useApiQuery } from "../../lib/use-api-query";

type SocialClaim = {
  id: string;
  customerId: string;
  platform: string;
  status: string;
  createdAt: string;
  proofUrl?: string | null;
  actionType?: string | null;
  customer?: {
    id: string;
    phone: string;
    displayName: string | null;
    stampCount: number;
  };
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  google: "Google",
};

export function SocialContent() {
  const { data, loading, reload } = useApiQuery<SocialClaim[]>(
    "social:pending",
    "/social/claims/pending",
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = data ?? [];

  async function act(id: string, verb: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    setOk(null);
    try {
      await api(`/social/claims/${id}/${verb}`, { method: "PATCH" });
      setOk(verb === "approve" ? "Talep onaylandı" : "Talep reddedildi");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Sadakat programı"
        title="Paylaşım ödülleri"
        subtitle="Müşterilerin sosyal paylaşım taleplerini onaylayın veya reddedin."
        help="Onaylanan talepler tek seferlik ödül akışına bağlanır (yapılandırmaya göre)."
      />
      <ErrorBanner message={error} />
      <SuccessBanner message={ok} />

      <Panel padded={false}>
        <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <PanelHeader title="Bekleyen talepler" />
        </div>
        {loading && !rows.length ? (
          <div className="p-6">
            <ListSkeleton rows={4} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Bekleyen talep yok"
              description="Müşteri sosyal paylaşım talebi geldiğinde burada görünür."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {rows.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {PLATFORM_LABEL[c.platform] ?? c.platform}
                    {c.actionType ? (
                      <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                        · {c.actionType}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--ink)]">
                    {c.customer?.displayName?.trim() || "İsimsiz müşteri"}
                    {c.customer?.phone ? (
                      <span className="ml-2 tabular-nums text-[var(--muted)]">
                        {displayPhone(c.customer.phone)}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {new Date(c.createdAt).toLocaleString("tr-TR")}
                    {c.proofUrl ? (
                      <>
                        {" · "}
                        <a
                          href={c.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--accent)] hover:underline"
                        >
                          Kanıtı gör →
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge tone="warning">Bekliyor</Badge>
                  <button
                    type="button"
                    className={btnPrimary()}
                    disabled={busyId === c.id}
                    onClick={() => void act(c.id, "approve")}
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    className={btnGhost()}
                    disabled={busyId === c.id}
                    onClick={() => void act(c.id, "reject")}
                  >
                    Reddet
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
