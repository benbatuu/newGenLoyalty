"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { CardCarousel, PreviewStage, StudioStep, cardColor } from "./studio";
import type { BarcodeFormat } from "./_panels/wallet-types";
import { stampEditorDraftKey } from "./_panels/wallet-helpers";
import { PassPreviewCard } from "./pass-preview-card";
import { ApplePreviewPane } from "./_panels/passkit-preview";
import {
  BarcodeSection,
  FieldsSection,
  RelevanceSection,
} from "./_panels/passkit-sections";
import {
  ErrorBanner,
  Field,
  FormSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  Skeleton,
  SoftBox,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";
import {
  MultiStampPanel,
  defaultMultiStampDraft,
  draftFromProgram,
  type MultiStampDraft,
} from "./multi-stamp-panel";
import {
  CashbackCardPanel,
  cashbackCardConfigPayload,
  defaultCashbackCardDraft,
  draftFromCashbackProgram,
  type CashbackCardDraft,
} from "./cashback-card-panel";
import {
  DiscountCardPanel,
  defaultDiscountCardDraft,
  discountCardConfigPayload,
  draftFromDiscountProgram,
  type DiscountCardDraft,
} from "./discount-card-panel";
import {
  EventCardPanel,
  defaultEventCardDraft,
  draftFromEventProgram,
  eventCardConfigPayload,
  type EventCardDraft,
} from "./event-card-panel";
import {
  MembershipCardPanel,
  defaultMembershipCardDraft,
  draftFromMembershipProgram,
  membershipCardConfigPayload,
  type MembershipCardDraft,
} from "./membership-card-panel";
import {
  PointCardPanel,
  defaultPointCardDraft,
  draftFromPointProgram,
  pointCardConfigPayload,
  type PointCardDraft,
} from "./point-card-panel";
import {
  StaffCardPanel,
  defaultStaffCardDraft,
  draftFromStaffProgram,
  staffCardConfigPayload,
  type StaffCardDraft,
} from "./staff-card-panel";
import {
  CardGallerySidebar,
  CardGalleryStrip,
  CreateCardPicker,
  TypeGlyph,
  programTypeLabel,
  type ProgramCard,
  type ProgramQuota,
} from "./program-cards-hub";
import {
  ProgramWalletPanel,
  BarcodeTypePicker,
  draftFromProgramWallet,
  isWalletEligibleProgram,
  walletTemplatePayload,
  type ProgramWalletDraft,
  type TenantWalletDefaults,
} from "./program-wallet-panel";

type RewardTab =
  | "rule"
  | "wallet"
  | "stamps"
  | "fields"
  | "back"
  | "barcode"
  | "relevance"
  | "notify";

type ProgramHubResponse = {
  quota: ProgramQuota;
  programs: (ProgramCard & {
    config: Record<string, unknown>;
    validFrom?: string | null;
    validUntil?: string | null;
    tiers: {
      id: string;
      sortOrder: number;
      threshold: number;
      rewardLabel: string;
      redeemCost: number;
      laneId: string | null;
    }[];
  })[];
};

type RewardEditorBundle = {
  tenant: TenantReward;
  hub: ProgramHubResponse | null;
  branches: {
    multiBranch: boolean;
    defaultBranchId: string | null;
    branches: { id: string; name: string; isActive: boolean }[];
  };
};

type TenantReward = {
  name: string;
  primaryColor: string | null;
  foregroundColor: string | null;
  labelColor: string | null;
  stampTheme: string | null;
  stampInset: string | null;
  logoText: string | null;
  headerFieldLabel?: string | null;
  logoUrl: string | null;
  passDescription: string | null;
  stampIconFilledUrl: string | null;
  stampIconEmptyUrl: string | null;
  stampFieldLabel: string | null;
  rewardFieldLabel: string | null;
  statusFieldLabel: string | null;
  rewardRule: {
    stampsRequired: number;
    rewardLabel: string;
  } | null;
  rewardReadyText: string | null;
  barcodeFormat?: string | null;
  stampsRemainingTemplate: string | null;
  stampChangeMessage: string | null;
  rewardChangeMessage: string | null;
  redeemChangeMessage: string | null;
};

function formatNotifyPreview(template: string, sample: string): string {
  const t = template.trim() || "%@";
  return t.includes("%@") ? t.replace(/%@/g, sample) : `${t} ${sample}`;
}

function mergeConfigWithWallet(
  existing: Record<string, unknown> | undefined,
  typeConfig: Record<string, unknown> | undefined,
  wallet: ProgramWalletDraft,
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    ...(typeConfig ?? {}),
    walletTemplate: walletTemplatePayload(wallet),
  };
}

function tenantWalletDefaults(data: TenantReward | null | undefined): TenantWalletDefaults {
  return {
    name: data?.name ?? "İşletme",
    primaryColor: data?.primaryColor ?? null,
    foregroundColor: data?.foregroundColor ?? null,
    labelColor: data?.labelColor ?? null,
    stampTheme: data?.stampTheme ?? null,
    stampInset: data?.stampInset ?? null,
    logoText: data?.logoText ?? null,
    headerFieldLabel: data?.headerFieldLabel ?? null,
    logoUrl: data?.logoUrl ?? null,
    passDescription: data?.passDescription ?? null,
    stampIconFilledUrl: data?.stampIconFilledUrl ?? null,
    stampIconEmptyUrl: data?.stampIconEmptyUrl ?? null,
    stampFieldLabel: data?.stampFieldLabel ?? null,
    rewardFieldLabel: data?.rewardFieldLabel ?? null,
    statusFieldLabel: data?.statusFieldLabel ?? null,
    rewardReadyText: data?.rewardReadyText ?? null,
  };
}

function multiStampConfigPayload(draft: MultiStampDraft) {
  return draft.mode === "MULTIPLIER"
    ? {
        mode: "MULTIPLIER" as const,
        productGroups: draft.productGroups,
        dailyCapUnit: "STAMPS" as const,
      }
    : {
        mode: "LANES" as const,
        lanes: draft.lanes,
        maxStampsPerDayPerLane: 1,
      };
}

function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Panel>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left sm:px-6"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="font-medium text-[var(--ink)]">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
          )}
        </div>
        <span className="shrink-0 text-lg leading-none text-[var(--muted)]">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-[var(--line)] px-5 py-4 sm:px-6">
          {children}
        </div>
      )}
    </Panel>
  );
}

export default function RewardPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <RewardContent />
    </RequireAuth>
  );
}

function RewardContent() {
  // Tek istek: işletme + kartlar + kota + şubeler
  const {
    data: bundle,
    error: loadError,
    loading,
    reload: reloadBundle,
  } = useApiQuery<RewardEditorBundle>("reward-editor", "/tenants/me/reward-editor");
  const data = bundle?.tenant ?? null;
  const hub = bundle?.hub ?? null;
  const branchCtx = bundle?.branches ?? null;
  const hubError: string | null = null;
  /** Kart ekleme/silme sonrası listeyi tazele (tek istek) */
  const reloadHub = (force?: boolean) => reloadBundle(force);
  const activeBranches =
    branchCtx?.branches.filter((b) => b.isActive) ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** URL'deki ?programId= — yoksa kart ızgarası, varsa o kartın düzenleyicisi */
  const [routeProgramId, setRouteProgramId] = useState<string | null>(null);
  const [routeReady, setRouteReady] = useState(false);
  useEffect(() => {
    const read = () => {
      setRouteProgramId(new URLSearchParams(window.location.search).get("programId"));
      setRouteReady(true);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  const [cardName, setCardName] = useState("");
  const [multiStamp, setMultiStamp] = useState<MultiStampDraft>(() =>
    defaultMultiStampDraft(10, "1 bedava kahve"),
  );
  const [pointCard, setPointCard] = useState<PointCardDraft>(() =>
    defaultPointCardDraft(),
  );
  const [discountCard, setDiscountCard] = useState<DiscountCardDraft>(() =>
    defaultDiscountCardDraft(),
  );
  const [cashbackCard, setCashbackCard] = useState<CashbackCardDraft>(() =>
    defaultCashbackCardDraft(),
  );
  const [eventCard, setEventCard] = useState<EventCardDraft>(() =>
    defaultEventCardDraft(),
  );
  const [membershipCard, setMembershipCard] = useState<MembershipCardDraft>(
    () => defaultMembershipCardDraft(),
  );
  const [staffCard, setStaffCard] = useState<StaffCardDraft>(() =>
    defaultStaffCardDraft(),
  );
  const [walletDraft, setWalletDraft] = useState<ProgramWalletDraft>(() =>
    draftFromProgramWallet(undefined, tenantWalletDefaults(null), "Kart"),
  );

  const [stampsRequired, setStampsRequired] = useState(10);
  const [rewardLabel, setRewardLabel] = useState("1 bedava kahve");
  const [rewardReadyText, setRewardReadyText] = useState("Ödül hazır!");
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>("QR");
  const [remainingTpl, setRemainingTpl] = useState("{remaining} damga kaldı");
  const [stampChangeMessage, setStampChangeMessage] = useState(
    "Damga güncellendi: %@",
  );
  const [rewardChangeMessage, setRewardChangeMessage] = useState("Ödül hazır: %@");
  const [redeemChangeMessage, setRedeemChangeMessage] = useState(
    "Ödül kullanıldı: %@",
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mobileCreateOpen, setMobileCreateOpen] = useState(false);
  const [tab, setTab] = useState<RewardTab>("rule");
  /** Vazgeç → formu sunucudaki değerlere döndür */
  const [resetToken, setResetToken] = useState(0);
  /** Form sunucudan doldurulduğunda artar → o anki değerler "kaydedilmiş" kabul edilir */
  const [hydrateToken, setHydrateToken] = useState(0);
  const [baseline, setBaseline] = useState<string | null>(null);

  const typeCatalog = hub?.quota.typeCatalog ?? [];
  const canAddCard = typeCatalog.length > 0;

  const selectedProgram = useMemo(
    () => hub?.programs.find((p) => p.id === selectedId) ?? null,
    [hub, selectedId],
  );

  useEffect(() => {
    if (!hub) return;
    if (routeProgramId && hub.programs.some((p) => p.id === routeProgramId)) {
      setSelectedId(routeProgramId);
    } else {
      setSelectedId(null);
    }
  }, [hub, routeProgramId]);

  useEffect(() => {
    if (!data) return;
    setStampsRequired(data.rewardRule?.stampsRequired ?? 10);
    setRewardLabel(data.rewardRule?.rewardLabel ?? "1 bedava kahve");
    setRewardReadyText(data.rewardReadyText ?? "Ödül hazır!");
    setBarcodeFormat(((data.barcodeFormat ?? "QR").toUpperCase() as BarcodeFormat));
    setRemainingTpl(data.stampsRemainingTemplate ?? "{remaining} damga kaldı");
    setStampChangeMessage(data.stampChangeMessage ?? "Damga güncellendi: %@");
    setRewardChangeMessage(data.rewardChangeMessage ?? "Ödül hazır: %@");
    setRedeemChangeMessage(data.redeemChangeMessage ?? "Ödül kullanıldı: %@");
    setHydrateToken((t) => t + 1);
  }, [data, resetToken]);

  useEffect(() => {
    if (!selectedProgram) return;
    setCardName(selectedProgram.name);
    if (selectedProgram.type === "MULTI_STAMP") {
      setMultiStamp(
        draftFromProgram(
          {
            type: selectedProgram.type,
            config: selectedProgram.config as {
              mode?: "LANES" | "MULTIPLIER";
              productGroups?: MultiStampDraft["productGroups"];
              lanes?: MultiStampDraft["lanes"];
            },
            tiers: selectedProgram.tiers,
          },
          defaultMultiStampDraft(
            selectedProgram.tiers[0]?.threshold ?? 10,
            selectedProgram.tiers[0]?.rewardLabel ?? "Ödül",
          ),
        ),
      );
    } else if (selectedProgram.type === "STAMP_CARD") {
      const t = selectedProgram.tiers[0];
      if (t) {
        setStampsRequired(t.threshold);
        setRewardLabel(t.rewardLabel);
      }
    } else if (selectedProgram.type === "POINT_CARD") {
      setPointCard(
        draftFromPointProgram({
          config: selectedProgram.config as Parameters<
            typeof draftFromPointProgram
          >[0]["config"],
        }),
      );
    } else if (selectedProgram.type === "CASHBACK_CARD") {
      setCashbackCard(
        draftFromCashbackProgram({
          config: selectedProgram.config as Parameters<
            typeof draftFromCashbackProgram
          >[0]["config"],
        }),
      );
    } else if (selectedProgram.type === "DISCOUNT_CARD") {
      setDiscountCard(
        draftFromDiscountProgram({
          config: selectedProgram.config as Parameters<
            typeof draftFromDiscountProgram
          >[0]["config"],
        }),
      );
    } else if (selectedProgram.type === "EVENT_CARD") {
      setEventCard(
        draftFromEventProgram({
          config: selectedProgram.config as Parameters<
            typeof draftFromEventProgram
          >[0]["config"],
          validFrom: selectedProgram.validFrom ?? null,
          validUntil: selectedProgram.validUntil ?? null,
        }),
      );
    } else if (selectedProgram.type === "MEMBERSHIP_CARD") {
      setMembershipCard(
        draftFromMembershipProgram({
          config: selectedProgram.config as Parameters<
            typeof draftFromMembershipProgram
          >[0]["config"],
        }),
      );
    } else if (selectedProgram.type === "STAFF_CARD") {
      setStaffCard(
        draftFromStaffProgram({
          config: selectedProgram.config as Parameters<
            typeof draftFromStaffProgram
          >[0]["config"],
        }),
      );
    }
    if (data && isWalletEligibleProgram(selectedProgram.type)) {
      // Bu kartın arka yüz alanı yoksa, dolu bir Wallet kartındaki bilgileri taslağa getir.
      // Kullanıcı görür, değiştirir ve kaydeder; kayıt olmadan hiçbir şey yazılmaz.
      const own = (selectedProgram.config?.walletTemplate ?? {}) as Record<string, unknown>;
      const ownBack = Array.isArray(own.backFields) ? (own.backFields as unknown[]) : [];
      const donor = hub?.programs.find(
        (p) =>
          p.id !== selectedProgram.id &&
          isWalletEligibleProgram(p.type) &&
          Array.isArray((p.config?.walletTemplate as { backFields?: unknown[] } | undefined)?.backFields) &&
          ((p.config!.walletTemplate as { backFields: unknown[] }).backFields.length ?? 0) > 0,
      );
      const donorTpl = (donor?.config?.walletTemplate ?? null) as Record<string, unknown> | null;
      const config =
        donorTpl && ownBack.length === 0
          ? {
              ...(selectedProgram.config ?? {}),
              walletTemplate: { ...own, backFields: donorTpl.backFields },
            }
          : selectedProgram.config;
      // Düzenleyici sayfasından dönüşte taslağı geri yükle
      const carriedKey = stampEditorDraftKey(selectedProgram.id);
      const carried = sessionStorage.getItem(carriedKey);
      if (carried) {
        sessionStorage.removeItem(carriedKey);
        setWalletDraft(JSON.parse(carried) as ProgramWalletDraft);
      } else {
        setWalletDraft(
          draftFromProgramWallet(config, tenantWalletDefaults(data), selectedProgram.name),
        );
      }
    }
    setHydrateToken((t) => t + 1);
  }, [selectedProgram, data, resetToken]);

  const draftKey = JSON.stringify({
    cardName,
    multiStamp,
    pointCard,
    discountCard,
    cashbackCard,
    eventCard,
    membershipCard,
    staffCard,
    walletDraft,
    stampsRequired,
    rewardLabel,
    rewardReadyText,
    remainingTpl,
    stampChangeMessage,
    rewardChangeMessage,
    redeemChangeMessage,
  });
  useEffect(() => {
    setBaseline(draftKey);
    // Yalnızca form doldurulduğunda yakala
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrateToken]);
  const dirty = baseline !== null && baseline !== draftKey;

  // Kaydedilmemiş değişiklik varken sayfadan çıkışta uyar
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /** Kart değiştirirken kaydedilmemiş değişiklikleri koru */
  function navigateTo(id: string | null) {
    window.history.pushState(null, "", id ? `/reward?programId=${encodeURIComponent(id)}` : "/reward");
    setRouteProgramId(id);
    setSelectedId(id);
    setTab("rule");
  }

  function selectCard(id: string) {
    if (id === selectedId) return;
    if (dirty && !window.confirm("Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?")) {
      return;
    }
    navigateTo(id);
  }

  function backToGrid() {
    if (dirty && !window.confirm("Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?")) {
      return;
    }
    navigateTo(null);
  }

  async function createCard(type: string, branchId?: string) {
    setCreating(true);
    setError(null);
    setOk(null);
    try {
      const body: Record<string, string> = {
        type,
        name: programTypeLabel(type),
      };
      if (branchCtx?.multiBranch) {
        const bid = branchId || branchCtx.defaultBranchId;
        if (!bid) {
          setError("Lütfen kart için bir şube seçin");
          setCreating(false);
          return;
        }
        body.branchId = bid;
      }
      const created = await api<{ id: string }>("/programs", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // Mevcut bir kartın Wallet bilgilerini (arka yüz, renkler, logo…) yeni karta taşı:
      // kullanıcı boş form değil, dolu bir taslakla başlasın ve dilediği yeri değiştirsin.
      const source =
        hub?.programs.find(
          (p) => p.isPrimary && isWalletEligibleProgram(p.type) && p.config?.walletTemplate,
        ) ??
        hub?.programs.find(
          (p) => isWalletEligibleProgram(p.type) && p.config?.walletTemplate,
        );
      if (source && isWalletEligibleProgram(type)) {
        await api(`/programs/${created.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            config: {
              walletTemplate: {
                backFields: (source.config!.walletTemplate as { backFields?: unknown[] }).backFields ?? [],
              },
            },
          }),
        });
      }

      setOk(`${programTypeLabel(type)} eklendi.`);
      await reloadHub(true);
      navigateTo(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kart oluşturulamadı");
    } finally {
      setCreating(false);
    }
  }

  async function archiveProgram() {
    if (!selectedProgram || selectedProgram.isPrimary) return;
    if (
      !window.confirm(
        "Kart arşivlensin mi? Tezgâh ve davet listesinde görünmez; mevcut pass'ler geçerli kalır.",
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(`/programs/${selectedProgram.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      setOk("Kart arşivlendi");
      await reloadHub(true);
      navigateTo(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Arşivlenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProgramCard() {
    if (!selectedProgram || selectedProgram.isPrimary) return;
    if (
      !window.confirm(
        "Kart kalıcı olarak silinsin mi? İşlem geçmişi varsa silinemez.",
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(`/programs/${selectedProgram.id}`, { method: "DELETE" });
      setOk("Kart silindi");
      await reloadHub(true);
      navigateTo(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Silinemedi");
    } finally {
      setSaving(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!selectedProgram) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const saves: Promise<unknown>[] = [];

      // Barkod türü işletme genelinde saklanır; her kart türünde kaydedilir.
      if (data && barcodeFormat !== ((data.barcodeFormat ?? "QR").toUpperCase())) {
        saves.push(
          api("/tenants/me", {
            method: "PATCH",
            body: JSON.stringify({ barcodeFormat }),
          }),
        );
      }

      if (selectedProgram.type === "STAMP_CARD" && selectedProgram.isPrimary) {
        saves.push(
          api<{ walletSync?: { synced: number } }>("/tenants/me", {
            method: "PATCH",
            body: JSON.stringify({
              rewardReadyText: rewardReadyText.trim() || null,
              stampsRemainingTemplate: remainingTpl.trim() || null,
              stampChangeMessage: stampChangeMessage.trim() || null,
              rewardChangeMessage: rewardChangeMessage.trim() || null,
              redeemChangeMessage: redeemChangeMessage.trim() || null,
            }),
          }),
          api("/tenants/me/reward-rule", {
            method: "PATCH",
            body: JSON.stringify({
              stampsRequired,
              rewardLabel: rewardLabel.trim(),
            }),
          }),
        );
      }

      if (hub) {
        const body: Record<string, unknown> = {
          name: cardName.trim() || selectedProgram.name,
        };

        if (selectedProgram.type === "MULTI_STAMP") {
          body.config = mergeConfigWithWallet(
            selectedProgram.config,
            multiStampConfigPayload(multiStamp),
            walletDraft,
          );
          body.tiers = multiStamp.tiers.map((t, i) => ({
            id: t.id,
            sortOrder: t.sortOrder ?? i,
            threshold: t.threshold,
            rewardLabel: t.rewardLabel.trim(),
            redeemCost: t.redeemCost ?? t.threshold,
            laneId: multiStamp.mode === "LANES" ? t.laneId : null,
          }));
        } else if (selectedProgram.type === "STAMP_CARD") {
          body.config = mergeConfigWithWallet(
            selectedProgram.config,
            undefined,
            walletDraft,
          );
          body.tiers = [
            {
              id: selectedProgram.tiers[0]?.id,
              sortOrder: 0,
              threshold: stampsRequired,
              rewardLabel: rewardLabel.trim(),
              redeemCost: stampsRequired,
            },
          ];
        } else if (selectedProgram.type === "POINT_CARD") {
          body.config = mergeConfigWithWallet(
            selectedProgram.config,
            pointCardConfigPayload(pointCard),
            walletDraft,
          );
        } else if (selectedProgram.type === "CASHBACK_CARD") {
          body.config = mergeConfigWithWallet(
            selectedProgram.config,
            cashbackCardConfigPayload(cashbackCard),
            walletDraft,
          );
        } else if (selectedProgram.type === "DISCOUNT_CARD") {
          body.config = mergeConfigWithWallet(
            selectedProgram.config,
            discountCardConfigPayload(discountCard),
            walletDraft,
          );
        } else if (selectedProgram.type === "EVENT_CARD") {
          const eventPayload = eventCardConfigPayload(eventCard);
          body.config = mergeConfigWithWallet(
            selectedProgram.config,
            eventPayload,
            walletDraft,
          );
          body.validFrom = eventPayload.validFrom;
          body.validUntil = eventPayload.validUntil;
        } else if (selectedProgram.type === "MEMBERSHIP_CARD") {
          body.config = membershipCardConfigPayload(membershipCard);
        } else if (selectedProgram.type === "STAFF_CARD") {
          const branchIds = selectedProgram.branchId
            ? [selectedProgram.branchId]
            : [];
          body.config = staffCardConfigPayload(staffCard, branchIds);
        }

        saves.push(
          api(`/programs/${selectedProgram.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          }),
        );
      }

      const results = await Promise.all(saves);
      let synced = 0;
      let devices = 0;
      let hadWalletSync = false;
      for (const result of results) {
        const ws = (result as { walletSync?: { synced?: number; devices?: number } })
          ?.walletSync;
        if (ws) {
          hadWalletSync = true;
          synced += ws.synced ?? 0;
          devices += ws.devices ?? 0;
        }
      }
      setOk(
        synced > 0
          ? `Kaydedildi · ${synced} müşteri kartı güncellendi${devices > 0 ? ` (${devices} cihaz)` : ""}`
          : hadWalletSync
            ? "Kaydedildi · Tasarım kaydedildi. Wallet güncellemesi için kartın cihazda kayıtlı olması gerekir; görünmüyorsa davet linkinden yeniden ekleyin."
            : "Değişiklikler kaydedildi",
      );
      // Form zaten kaydedilen değerleri gösteriyor — beklemeden arka planda tazele
      setBaseline(draftKey);
      void reloadBundle(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  const previewFilled = Math.min(3, stampsRequired);
  const previewRemaining = remainingTpl.replace(
    /\{remaining\}/g,
    String(Math.max(stampsRequired - previewFilled, 0)),
  );
  const stampNotifyPreview = useMemo(
    () =>
      formatNotifyPreview(
        stampChangeMessage,
        `${previewFilled} / ${stampsRequired}`,
      ),
    [stampChangeMessage, previewFilled, stampsRequired],
  );

  if (loading && !bundle) {
    return <RewardSkeleton />;
  }

  const isPrimaryStamp =
    selectedProgram?.type === "STAMP_CARD" && selectedProgram.isPrimary;
  const isMultiStamp = selectedProgram?.type === "MULTI_STAMP";
  const isStampCard = selectedProgram?.type === "STAMP_CARD";
  const isPointCard = selectedProgram?.type === "POINT_CARD";
  const isCashbackCard = selectedProgram?.type === "CASHBACK_CARD";
  const isDiscountCard = selectedProgram?.type === "DISCOUNT_CARD";
  const isEventCard = selectedProgram?.type === "EVENT_CARD";
  const isMembershipCard = selectedProgram?.type === "MEMBERSHIP_CARD";
  const isStaffCard = selectedProgram?.type === "STAFF_CARD";

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Sadakat programı"
        title="Sadakat kartları"
        subtitle="Damga, puan, cashback veya indirim kartlarınızı buradan oluşturun ve düzenleyin."
        help="Soldan bir kart seçin veya yeni kart ekleyin. Paketinizdeki limite kadar farklı kart tipi açabilirsiniz."
        actions={
          <Link href="/billing" className={btnGhost()}>
            Paketim
          </Link>
        }
      />
      <ErrorBanner message={error || loadError || hubError} />
      <SuccessBanner message={ok} />

      {hub && routeReady ? (
        <div className="space-y-5">
          {routeProgramId ? (
            <button
              type="button"
              onClick={backToGrid}
              className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
            >
              ← Tüm kartlar
            </button>
          ) : (
          <CardCarousel
            programs={hub.programs}
            selectedId={selectedId}
            onSelect={selectCard}
            renderPreview={(p) => (
              <PassPreviewCard
                program={p}
                tenant={
                  p.id === selectedId && isWalletEligibleProgram(p.type)
                    ? { ...tenantWalletDefaults(data), primaryColor: walletDraft.primaryColor }
                    : tenantWalletDefaults(data)
                }
                barcodeFormat={barcodeFormat}
              />
            )}
            quota={hub.quota}
            creating={creating}
            onCreate={(type, branchId) => void createCard(type, branchId)}
            multiBranch={branchCtx?.multiBranch}
            branches={activeBranches}
            defaultBranchId={branchCtx?.defaultBranchId}
          />
          )}

          {!routeProgramId ? null : !selectedProgram ? (
            <div className="rounded-3xl border border-dashed border-[var(--line-strong)] px-6 py-16 text-center">
              <p className="text-[1rem] font-semibold text-[var(--ink)]">Bir kart seçin</p>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                Yukarıdaki kartlardan birine dokunun ya da yeni bir kart ekleyin.
              </p>
            </div>
          ) : (
            <form onSubmit={save} className="space-y-4">
              {(() => {
                const walletEligible = !!data && isWalletEligibleProgram(selectedProgram.type);
                const ruleSummary = isStampCard
                  ? `${stampsRequired} damga → ${rewardLabel}`
                  : isMultiStamp
                    ? `${multiStamp.tiers.length} ödül kademesi`
                    : programTypeLabel(selectedProgram.type);

                const tabs = [
                  { id: "rule" as const, title: "Ödül ve kurallar", summary: ruleSummary },
                  ...(walletEligible
                    ? [
                        { id: "wallet" as const, title: "Görünüm", summary: "Renk, logo, üst yazı" },
                        ...(isStampCard || isMultiStamp ? [{ id: "stamps" as const, title: "Damgalar", summary: "Simge, şerit, dizilim" }] : []),
                        { id: "fields" as const, title: "Alanlar", summary: "Başlıklar, header, ek alan" },
                        { id: "back" as const, title: "Arka yüz", summary: "İletişim, koşullar" },
                        { id: "barcode" as const, title: "Barkod", summary: "Biçim, paylaşım" },
                        { id: "relevance" as const, title: "Kilit ekranı", summary: "Konum, tarih" },
                      ]
                    : []),
                  ...(isPrimaryStamp ? [{ id: "notify" as const, title: "Bildirimler", summary: stampNotifyPreview }] : []),
                ];
                const inspector = (form: ReactNode, error: ReactNode) => (
                  <div className="space-y-3">
                    {/* Kart kimliği */}
                    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                          {selectedProgram.isPrimary ? "Ana kart" : programTypeLabel(selectedProgram.type)}
                        </p>
                        {!selectedProgram.isPrimary ? (
                          <div className="flex gap-1">
                            <button type="button" disabled={saving} onClick={() => void archiveProgram()} className="h-7 rounded-md px-2 text-[0.75rem] font-medium text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:opacity-50">
                              Arşivle
                            </button>
                            <button type="button" disabled={saving} onClick={() => void deleteProgramCard()} className="h-7 rounded-md px-2 text-[0.75rem] font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-50">
                              Sil
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <label htmlFor="card-name" className="sr-only">Kartın görünen adı</label>
                      <input
                        id="card-name"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Kartın adı"
                        maxLength={80}
                        className="mt-1 w-full rounded-md border border-transparent bg-transparent px-1 py-1 font-display text-[1.375rem] leading-tight tracking-tight text-[var(--ink)] outline-none transition hover:border-[var(--line)] focus:border-black/20 focus:bg-[var(--surface)]"
                      />
                    </section>

                    <div role="tablist" aria-label="Kart ayarları" className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1">
                      {tabs.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          role="tab"
                          aria-selected={tab === t.id}
                          onClick={() => setTab(t.id)}
                          className={`flex min-w-[112px] flex-1 shrink-0 flex-col items-start rounded-xl px-3 py-2 text-left transition ${
                            tab === t.id ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]" : "text-[var(--ink)] hover:bg-[var(--surface)]"
                          }`}
                        >
                          <span className="text-[0.8125rem] font-semibold">{t.title}</span>
                          <span className={`mt-0.5 block w-full truncate text-[0.6875rem] ${tab === t.id ? "text-white/70" : "text-[var(--muted)]"}`}>{t.summary}</span>
                        </button>
                      ))}
                    </div>
                    <div role="tabpanel" className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
                    {tab === "rule" ? (
                    <>
                {isStampCard && (
                  <>
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Kaç damgada ödül verilsin?">
                          <input
                            className={inputClassName()}
                            type="number"
                            min={1}
                            max={16}
                            value={stampsRequired}
                            onChange={(e) =>
                              setStampsRequired(Number(e.target.value))
                            }
                            required
                          />
                        </Field>
                        <Field label="Ödül ne?">
                          <input
                            className={inputClassName()}
                            value={rewardLabel}
                            onChange={(e) => setRewardLabel(e.target.value)}
                            placeholder="1 bedava kahve"
                            required
                          />
                        </Field>
                      </div>

                      {isPrimaryStamp && (
                        <Field label="Ödül hazır olunca müşteri ne görsün?">
                          <input
                            className={inputClassName()}
                            value={rewardReadyText}
                            onChange={(e) => setRewardReadyText(e.target.value)}
                            placeholder="Ödül hazır!"
                          />
                        </Field>
                      )}
                    </div>
                  </>
                )}

                {isMultiStamp && (
                  <MultiStampPanel
                    draft={multiStamp}
                    onChange={setMultiStamp}
                    stampsRequired={
                      selectedProgram.tiers[0]?.threshold ?? stampsRequired
                    }
                    rewardLabel={
                      selectedProgram.tiers[0]?.rewardLabel ?? rewardLabel
                    }
                  />
                )}

                {isPointCard && (
                  <PointCardPanel draft={pointCard} onChange={setPointCard} />
                )}

                {isCashbackCard && (
                  <CashbackCardPanel
                    draft={cashbackCard}
                    onChange={setCashbackCard}
                  />
                )}

                {isDiscountCard && (
                  <DiscountCardPanel
                    draft={discountCard}
                    onChange={setDiscountCard}
                  />
                )}

                {isEventCard && (
                  <EventCardPanel draft={eventCard} onChange={setEventCard} />
                )}

                {isMembershipCard && (
                  <MembershipCardPanel
                    draft={membershipCard}
                    onChange={setMembershipCard}
                  />
                )}

                {isStaffCard && (
                  <StaffCardPanel draft={staffCard} onChange={setStaffCard} />
                )}

                    </>
                    ) : null}

                    {walletEligible && (tab === "wallet" || tab === "stamps" || tab === "fields" || tab === "back") ? (
                    <div className="space-y-6">
                      {tab === "wallet" ? (
                        <div className="flex justify-end">
                          <Link href="/settings/card" className="text-[0.75rem] font-medium text-[var(--brand)] hover:underline">
                            Marka varsayılanlarını düzenle →
                          </Link>
                        </div>
                      ) : null}
                      {error}
                      {form}
                      {tab === "fields" ? (
                        <FieldsSection draft={walletDraft} onChange={setWalletDraft} tenantHasHeader={Boolean(data?.headerFieldLabel?.trim())} />
                      ) : null}
                    </div>
                    ) : null}
                    {tab === "barcode" && walletEligible ? (
                      <>
                        <BarcodeTypePicker value={barcodeFormat} onChange={setBarcodeFormat} />
                        <BarcodeSection draft={walletDraft} onChange={setWalletDraft} />
                      </>
                    ) : null}
                    {tab === "relevance" && walletEligible ? (
                      <RelevanceSection draft={walletDraft} onChange={setWalletDraft} />
                    ) : null}

                    {tab === "notify" && isPrimaryStamp ? (
                    <>
                                          <Field label="'Kaç damga kaldı' yazısı">
                      <input
                        className={inputClassName()}
                        value={remainingTpl}
                        onChange={(e) => setRemainingTpl(e.target.value)}
                        placeholder="{remaining} damga kaldı"
                      />
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {"{remaining}"} yerine kalan damga sayısı yazılır.
                      </p>
                    </Field>
                    <Field label="Damga verilince gelen mesaj">
                      <input
                        className={inputClassName()}
                        value={stampChangeMessage}
                        onChange={(e) => setStampChangeMessage(e.target.value)}
                      />
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        Önizleme: {stampNotifyPreview}
                      </p>
                    </Field>
                    <Field label="Ödül hazır olunca gelen mesaj">
                      <input
                        className={inputClassName()}
                        value={rewardChangeMessage}
                        onChange={(e) => setRewardChangeMessage(e.target.value)}
                      />
                    </Field>
                    <Field label="Ödül kullanılınca gelen mesaj">
                      <input
                        className={inputClassName()}
                        value={redeemChangeMessage}
                        onChange={(e) => setRedeemChangeMessage(e.target.value)}
                      />
                    </Field>
                    </>
                    ) : null}
                    </div>
                  </div>
                );

                const previewStamps = isMultiStamp
                  ? multiStamp.tiers[0]?.threshold ?? selectedProgram.tiers[0]?.threshold ?? 10
                  : isStampCard
                    ? stampsRequired
                    : selectedProgram.tiers[0]?.threshold ?? 100;
                const previewReward = isMultiStamp
                  ? multiStamp.tiers[0]?.rewardLabel ?? selectedProgram.tiers[0]?.rewardLabel ?? "Ödül"
                  : isStampCard
                    ? rewardLabel
                    : isCashbackCard
                      ? `%${cashbackCard.earnPercent} cashback`
                      : selectedProgram.tiers[0]?.rewardLabel ?? "Ödül";
                const studio = (preview: ReactNode, form: ReactNode, error: ReactNode) =>
                  preview ? (
                    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
                      <div className="xl:sticky xl:top-4">
                        <ApplePreviewPane
                          draft={walletDraft}
                          tenant={tenantWalletDefaults(data)}
                          isStamp={isStampCard || isMultiStamp}
                          stampsRequired={previewStamps}
                          rewardLabel={previewReward}
                          remainingTemplate={remainingTpl}
                          programName={cardName || selectedProgram.name}
                        />
                      </div>
                      {inspector(form, error)}
                    </div>
                  ) : (
                    <div>{inspector(null, null)}</div>
                  );

                return walletEligible ? (
                  <ProgramWalletPanel
                      programId={selectedProgram.id}
                      programType={selectedProgram.type}
                      programName={cardName || selectedProgram.name}
                      stampsRequired={
                        isMultiStamp
                          ? multiStamp.tiers[0]?.threshold ??
                            selectedProgram.tiers[0]?.threshold ??
                            10
                          : isStampCard
                            ? stampsRequired
                            : selectedProgram.tiers[0]?.threshold ?? 100
                      }
                      rewardLabel={
                        isMultiStamp
                          ? multiStamp.tiers[0]?.rewardLabel ??
                            selectedProgram.tiers[0]?.rewardLabel ??
                            "Ödül"
                          : isStampCard
                            ? rewardLabel
                            : isCashbackCard
                              ? `%${cashbackCard.earnPercent} cashback`
                              : selectedProgram.tiers[0]?.rewardLabel ?? "Ödül"
                      }
                      tenant={tenantWalletDefaults(data)}
                      barcodeFormat={barcodeFormat}
                      onBarcodeFormatChange={setBarcodeFormat}
                      formSection={tab === "stamps" ? "stamps" : tab === "fields" ? "fields" : tab === "back" ? "back" : "brand"}
                      draft={walletDraft}
                      onChange={setWalletDraft}
                      multiStamp={isMultiStamp ? multiStamp : null}
                      onMultiStampChange={isMultiStamp ? setMultiStamp : undefined}
                    renderLayout={({ form, preview, error }) => studio(preview, form, error)}
                  />
                ) : (
                  studio(null, null, null)
                );
              })()}

              {/* Yapışkan kaydet çubuğu */}
              <div
                className={`sticky bottom-3 z-20 transition-all duration-200 ${
                  dirty || saving ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
                }`}
                aria-hidden={!(dirty || saving)}
              >
                <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-full border border-[var(--line)] bg-[var(--accent)] py-2 pl-5 pr-2 text-white shadow-[var(--shadow-lg)]">
                  <p className="text-[0.8125rem] font-medium">
                    {saving ? "Kaydediliyor…" : "Kaydedilmemiş değişiklikler"}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setResetToken((t) => t + 1)}
                      className="h-9 rounded-full px-4 text-[0.8125rem] font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !dirty}
                      className="h-9 rounded-full bg-[var(--panel)] px-4 text-[0.8125rem] font-semibold text-[var(--ink)] transition hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? "Kaydediliyor…" : "Kaydet"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RewardSkeleton() {
  return (
    <div className="w-full space-y-5" aria-busy="true" aria-label="Kartlar yükleniyor">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3 w-80" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <div className="hidden space-y-3 lg:block">
          <Skeleton className="h-24 rounded-xl" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-36" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="attio-surface space-y-4 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <Skeleton className="h-8 w-full" />
            <div className="flex gap-3">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
          <div className="attio-surface space-y-3 p-4">
            <Skeleton className="h-4 w-28" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
