"use client";

import { useMemo } from "react";
import { Panel, PanelHeader } from "../../../../components/ui";
import { FieldsSection, RelevanceSection } from "../../../reward/_panels/passkit-sections";
import { draftFromProgramWallet, walletTemplatePayload } from "../../../reward/_panels/wallet-helpers";
import type { ProgramWalletDraft, TenantWalletDefaults } from "../../../reward/_panels/wallet-types";

const BRAND_KEYS = [
  "headerFields",
  "locations",
  "relevantDate",
  "expirationDate",
  "suppressStripShine",
  "sharingProhibited",
] as const;

/**
 * Marka düzeyi kart alanları (Alanlar + Kilit ekranı). Kart detayındaki editörlerin aynısı;
 * değerler tenant.walletDefaults'a yazılır ve "marka varsayılanını kullan" açık kartlara uygulanır.
 */
export function BrandFieldsTab({
  tab,
  walletDefaults,
  setWalletDefaults,
  tenantName,
  tenantHasHeader,
}: {
  tab: "fields" | "relevance";
  walletDefaults: Record<string, unknown>;
  setWalletDefaults: (v: Record<string, unknown>) => void;
  tenantName: string;
  tenantHasHeader: boolean;
}) {
  const draft = useMemo<ProgramWalletDraft>(
    () =>
      draftFromProgramWallet(
        { walletTemplate: { ...walletDefaults, inheritBrandFields: false } },
        { name: tenantName } as TenantWalletDefaults,
        tenantName,
      ),
    [walletDefaults, tenantName],
  );

  const onChange = (d: ProgramWalletDraft) => {
    const payload = walletTemplatePayload({ ...d, inheritBrandFields: false }) as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const k of BRAND_KEYS) next[k] = payload[k];
    setWalletDefaults({ ...walletDefaults, ...next });
  };

  return (
    <Panel>
      <PanelHeader
        step={tab === "fields" ? 6 : 7}
        title={tab === "fields" ? "Alanlar" : "Kilit ekranı"}
        description="Tüm kartlarda kullanılacak marka varsayılanı. Kart ayarında 'marka varsayılanını kullan' açık olan kartlar bu değerleri devralır."
      />
      {tab === "fields" ? (
        <FieldsSection draft={draft} onChange={onChange} tenantHasHeader={tenantHasHeader} />
      ) : (
        <RelevanceSection draft={draft} onChange={onChange} />
      )}
    </Panel>
  );
}
