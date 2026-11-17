"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ErrorBanner,
  FormSkeleton,
  SoftBox,
  SuccessBanner,
  Tabs,
  btnPrimary,
} from "../../../../components/ui";
import { ApiError, api } from "../../../../lib/api";
import { refreshSessionData, useSessionData } from "../../../../lib/session-data";
import { SettingsSectionHeader } from "../../_components/settings-section-header";
import { BackTab } from "./back-tab";
import { BrandTab } from "./brand-tab";
import { FrontTab } from "./front-tab";
import { NotifyTab } from "./notify-tab";
import { StampTab } from "./stamp-tab";
import {
  SETTINGS_TABS,
  type BarcodeFormat,
  type SettingsTab,
  type StampInset,
  type StampTheme,
  type Tenant,
} from "./types";
import { computeStampGrid, formatChangePreview } from "./utils";
import { WalletPreview } from "./wallet-preview";

/** Yükleme ekranı: iç içe kutu yok, sadece düz çizgiler. */
function CardSettingsSkeleton() {
  return (
    <div className="w-full space-y-5" aria-busy aria-label="Yükleniyor">
      <div className="space-y-2">
        <div className="h-6 w-56 animate-pulse rounded-md bg-[var(--wash)]" />
        <div className="h-3 w-full max-w-lg animate-pulse rounded-md bg-[var(--wash)]" />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 animate-pulse rounded-md bg-[var(--wash)]" />
        ))}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-28 animate-pulse rounded-md bg-[var(--wash)]" />
              <div className="h-9 w-full animate-pulse rounded-md bg-[var(--wash)]" />
            </div>
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-[var(--radius)] bg-[var(--wash)]" />
      </div>
    </div>
  );
}

export function CardSettingsContent() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoText, setLogoText] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#ef233c");
  const [foregroundColor, setForegroundColor] = useState("#ffffff");
  const [labelColor, setLabelColor] = useState("#fbe3e6");
  const [stampFieldLabel, setStampFieldLabel] = useState("DAMGA");
  const [rewardFieldLabel, setRewardFieldLabel] = useState("ÖDÜL");
  const [statusFieldLabel, setStatusFieldLabel] = useState("DURUM");
  const [broadcastFieldLabel, setBroadcastFieldLabel] = useState("NOTICE");
  const [broadcastEmptyText, setBroadcastEmptyText] = useState(
    "No announcement",
  );
  const [showStampField, setShowStampField] = useState(true);
  const [showRewardField, setShowRewardField] = useState(true);
  const [showStatusField, setShowStatusField] = useState(true);
  const [showBroadcastField, setShowBroadcastField] = useState(true);
  const [rewardReadyText, setRewardReadyText] = useState("Ödül hazır!");
  const [stampsRemainingTemplate, setStampsRemainingTemplate] = useState(
    "{remaining} damga kaldı",
  );
  const [headerFieldLabel, setHeaderFieldLabel] = useState("");
  const [stampTheme, setStampTheme] = useState<StampTheme>("COFFEE");
  const [stampIconFilledUrl, setStampIconFilledUrl] = useState("");
  const [stampIconEmptyUrl, setStampIconEmptyUrl] = useState("");
  const [stampInset, setStampInset] = useState<StampInset>("NORMAL");
  const [passDescription, setPassDescription] = useState("");
  const [passHowItWorks, setPassHowItWorks] = useState("");
  const [passTerms, setPassTerms] = useState("");
  const [passLocations, setPassLocations] = useState("");
  const [passHours, setPassHours] = useState("");
  const [passWebsiteUrl, setPassWebsiteUrl] = useState("");
  const [passPhone, setPassPhone] = useState("");
  const [passDescriptionLabel, setPassDescriptionLabel] = useState("");
  const [passHowItWorksLabel, setPassHowItWorksLabel] = useState("");
  const [passTermsLabel, setPassTermsLabel] = useState("");
  const [passLocationsLabel, setPassLocationsLabel] = useState("");
  const [passHoursLabel, setPassHoursLabel] = useState("");
  const [passWebsiteLabel, setPassWebsiteLabel] = useState("");
  const [passPhoneLabel, setPassPhoneLabel] = useState("");
  const [passExtra1Label, setPassExtra1Label] = useState("");
  const [passExtra1Value, setPassExtra1Value] = useState("");
  const [passExtra2Label, setPassExtra2Label] = useState("");
  const [passExtra2Value, setPassExtra2Value] = useState("");
  const [passExtra3Label, setPassExtra3Label] = useState("");
  const [passExtra3Value, setPassExtra3Value] = useState("");
  const [notifyIconUrl, setNotifyIconUrl] = useState("");
  const [stampChangeMessage, setStampChangeMessage] = useState(
    "Damga güncellendi: %@",
  );
  const [rewardChangeMessage, setRewardChangeMessage] = useState("Ödül: %@");
  const [statusChangeMessage, setStatusChangeMessage] = useState("%@");
  const [headerChangeMessage, setHeaderChangeMessage] = useState("Damga: %@");
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>("QR");
  const [stampsRequired, setStampsRequired] = useState(10);
  const [rewardLabel, setRewardLabel] = useState("1 bedava kahve");
  const [previewFilled, setPreviewFilled] = useState(3);
  const [previewSide, setPreviewSide] = useState<"front" | "back" | "notify">(
    "front",
  );
  const [previewNotifyKind, setPreviewNotifyKind] = useState<
    "stamp" | "reward" | "status" | "header"
  >("stamp");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("stamp");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && SETTINGS_TABS.some((t) => t.id === tab)) {
      setSettingsTab(tab as SettingsTab);
    }
  }, [searchParams]);

  /** Form alanlarını marka bilgisiyle bir kez doldurur. */
  const hydrate = useCallback((t: Tenant) => {

    setName(t.name);
    setLogoUrl(t.logoUrl ?? "");
    setLogoText(t.logoText ?? "");
    setPrimaryColor(t.primaryColor ?? "#ef233c");
    setForegroundColor(t.foregroundColor ?? "#ffffff");
    setLabelColor(t.labelColor ?? "#fbe3e6");
    setStampFieldLabel(t.stampFieldLabel ?? "DAMGA");
    setRewardFieldLabel(t.rewardFieldLabel ?? "ÖDÜL");
    setStatusFieldLabel(t.statusFieldLabel ?? "DURUM");
    setBroadcastFieldLabel(t.broadcastFieldLabel ?? "NOTICE");
    setBroadcastEmptyText(t.broadcastEmptyText ?? "No announcement");
    setShowStampField(t.showStampField ?? true);
    setShowRewardField(t.showRewardField ?? true);
    setShowStatusField(t.showStatusField ?? true);
    setShowBroadcastField(t.showBroadcastField ?? true);
    setRewardReadyText(t.rewardReadyText ?? "Ödül hazır!");
    setStampsRemainingTemplate(
      t.stampsRemainingTemplate ?? "{remaining} damga kaldı",
    );
    setHeaderFieldLabel(t.headerFieldLabel ?? "");
    setStampTheme(
      ((t.stampTheme || "COFFEE").toUpperCase() as StampTheme) || "COFFEE",
    );
    setStampIconFilledUrl(t.stampIconFilledUrl ?? "");
    setStampIconEmptyUrl(t.stampIconEmptyUrl ?? "");
    setStampInset(
      ((t.stampInset || "NORMAL").toUpperCase() as StampInset) || "NORMAL",
    );
    setPassDescription(t.passDescription ?? "");
    setPassHowItWorks(t.passHowItWorks ?? "");
    setPassTerms(t.passTerms ?? "");
    setPassLocations(t.passLocations ?? "");
    setPassHours(t.passHours ?? "");
    setPassWebsiteUrl(t.passWebsiteUrl ?? "");
    setPassPhone(t.passPhone ?? "");
    setPassDescriptionLabel(t.passDescriptionLabel ?? "");
    setPassHowItWorksLabel(t.passHowItWorksLabel ?? "");
    setPassTermsLabel(t.passTermsLabel ?? "");
    setPassLocationsLabel(t.passLocationsLabel ?? "");
    setPassHoursLabel(t.passHoursLabel ?? "");
    setPassWebsiteLabel(t.passWebsiteLabel ?? "");
    setPassPhoneLabel(t.passPhoneLabel ?? "");
    setPassExtra1Label(t.passExtra1Label ?? "");
    setPassExtra1Value(t.passExtra1Value ?? "");
    setPassExtra2Label(t.passExtra2Label ?? "");
    setPassExtra2Value(t.passExtra2Value ?? "");
    setPassExtra3Label(t.passExtra3Label ?? "");
    setPassExtra3Value(t.passExtra3Value ?? "");
    setNotifyIconUrl(t.notifyIconUrl ?? "");
    setStampChangeMessage(t.stampChangeMessage ?? "Damga güncellendi: %@");
    setRewardChangeMessage(t.rewardChangeMessage ?? "Ödül: %@");
    setStatusChangeMessage(t.statusChangeMessage ?? "%@");
    setHeaderChangeMessage(t.headerChangeMessage ?? "Damga: %@");
    setBarcodeFormat(
      ((t.barcodeFormat || "QR").toUpperCase() as BarcodeFormat) || "QR",
    );
    setStampsRequired(t.rewardRule?.stampsRequired ?? 10);
    setRewardLabel(t.rewardRule?.rewardLabel ?? "1 bedava kahve");
    setPreviewFilled(Math.min(3, t.rewardRule?.stampsRequired ?? 10));
  }, []);

  // Marka bilgisi oturum önbelleğinden gelir; aynı sayfada ikinci istek atılmaz.
  const { data: tenant, error: tenantError } = useSessionData<Tenant>("tenant");
  const hydrated = useRef(false);
  useEffect(() => {
    if (tenant && !hydrated.current) {
      hydrated.current = true;
      hydrate(tenant);
      setLoading(false);
    }
  }, [tenant, hydrate]);
  useEffect(() => {
    if (tenantError) {
      setError(tenantError);
      setLoading(false);
    }
  }, [tenantError]);

  useEffect(() => {
    setPreviewFilled((n) => Math.min(n, stampsRequired));
  }, [stampsRequired]);

  const previewStampLabel = stampFieldLabel.trim() || "DAMGA";
  const previewRewardLabel = rewardFieldLabel.trim() || "ÖDÜL";
  const previewStatusLabel = statusFieldLabel.trim() || "DURUM";
  const previewBroadcastLabel = broadcastFieldLabel.trim() || "NOTICE";
  const previewBroadcastEmpty =
    broadcastEmptyText.trim() || "No announcement";
  const previewLogo = logoText.trim() || name || "Kafe";
  const stampGrid = computeStampGrid(stampsRequired);
  const remaining = Math.max(stampsRequired - previewFilled, 0);
  const rewardReady = remaining === 0;
  const previewStatus = rewardReady
    ? rewardReadyText.trim() || "Ödül hazır!"
    : (stampsRemainingTemplate.trim() || "{remaining} damga kaldı").replace(
        /\{remaining\}/gi,
        String(remaining),
      );

  const notifyPreviewText = useMemo(() => {
    switch (previewNotifyKind) {
      case "reward":
        return formatChangePreview(rewardChangeMessage, rewardLabel);
      case "status":
        return formatChangePreview(statusChangeMessage, previewStatus);
      case "header":
        return formatChangePreview(
          headerChangeMessage,
          `${previewFilled}/${stampsRequired}`,
        );
      case "stamp":
      default:
        return formatChangePreview(
          stampChangeMessage,
          `${previewFilled} / ${stampsRequired}`,
        );
    }
  }, [
    previewNotifyKind,
    rewardChangeMessage,
    rewardLabel,
    statusChangeMessage,
    previewStatus,
    headerChangeMessage,
    previewFilled,
    stampsRequired,
    stampChangeMessage,
  ]);

  const backPreviewItems = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    const push = (
      defaultLabel: string,
      customLabel: string,
      value: string,
    ) => {
      const v = value.trim();
      if (!v) return;
      items.push({ label: customLabel.trim() || defaultLabel, value: v });
    };
    push("Hakkında", passDescriptionLabel, passDescription);
    push("Nasıl çalışır?", passHowItWorksLabel, passHowItWorks);
    push("Koşullar", passTermsLabel, passTerms);
    push("Şubeler / Adres", passLocationsLabel, passLocations);
    push("Çalışma saatleri", passHoursLabel, passHours);
    push("Web", passWebsiteLabel, passWebsiteUrl);
    push("Telefon", passPhoneLabel, passPhone);
    push("Not", passExtra1Label, passExtra1Value);
    push("Not", passExtra2Label, passExtra2Value);
    push("Not", passExtra3Label, passExtra3Value);
    if (items.length === 0) {
      items.push({
        label: "Hakkında",
        value: `${name || "Kafe"} dijital damga kartı.`,
      });
    }
    return items;
  }, [
    name,
    passDescription,
    passHowItWorks,
    passTerms,
    passLocations,
    passHours,
    passWebsiteUrl,
    passPhone,
    passDescriptionLabel,
    passHowItWorksLabel,
    passTermsLabel,
    passLocationsLabel,
    passHoursLabel,
    passWebsiteLabel,
    passPhoneLabel,
    passExtra1Label,
    passExtra1Value,
    passExtra2Label,
    passExtra2Value,
    passExtra3Label,
    passExtra3Value,
  ]);

  async function saveAll(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const design = await api<{ walletSync?: { synced: number } }>(
        "/tenants/me",
        {
          method: "PATCH",
          body: JSON.stringify({
            name,
            logoUrl: logoUrl || null,
            logoText: logoText || null,
            primaryColor,
            foregroundColor,
            labelColor,
            stampFieldLabel: stampFieldLabel || null,
            rewardFieldLabel: rewardFieldLabel || null,
            statusFieldLabel: statusFieldLabel || null,
            broadcastFieldLabel: broadcastFieldLabel || null,
            broadcastEmptyText: broadcastEmptyText || null,
            showStampField,
            showRewardField,
            showStatusField,
            showBroadcastField,
            rewardReadyText: rewardReadyText || null,
            stampsRemainingTemplate: stampsRemainingTemplate || null,
            headerFieldLabel: headerFieldLabel || null,
            stampTheme,
            stampIconFilledUrl: stampIconFilledUrl || null,
            stampIconEmptyUrl: stampIconEmptyUrl || null,
            stampInset,
            passDescription: passDescription || null,
            passHowItWorks: passHowItWorks || null,
            passTerms: passTerms || null,
            passLocations: passLocations || null,
            passHours: passHours || null,
            passWebsiteUrl: passWebsiteUrl || null,
            passPhone: passPhone || null,
            passDescriptionLabel: passDescriptionLabel || null,
            passHowItWorksLabel: passHowItWorksLabel || null,
            passTermsLabel: passTermsLabel || null,
            passLocationsLabel: passLocationsLabel || null,
            passHoursLabel: passHoursLabel || null,
            passWebsiteLabel: passWebsiteLabel || null,
            passPhoneLabel: passPhoneLabel || null,
            passExtra1Label: passExtra1Label || null,
            passExtra1Value: passExtra1Value || null,
            passExtra2Label: passExtra2Label || null,
            passExtra2Value: passExtra2Value || null,
            passExtra3Label: passExtra3Label || null,
            passExtra3Value: passExtra3Value || null,
            notifyIconUrl: notifyIconUrl || null,
            stampChangeMessage: stampChangeMessage || null,
            rewardChangeMessage: rewardChangeMessage || null,
            statusChangeMessage: statusChangeMessage || null,
            headerChangeMessage: headerChangeMessage || null,
            barcodeFormat,
          }),
        },
      );
      const rule = await api<{ walletSync?: { synced: number } }>(
        "/tenants/me/reward-rule",
        {
          method: "PATCH",
          body: JSON.stringify({ stampsRequired, rewardLabel }),
        },
      );
      const n = Math.max(
        design.walletSync?.synced ?? 0,
        rule.walletSync?.synced ?? 0,
      );
      refreshSessionData("tenant");
      setOk(
        n > 0
          ? `Kart kaydedildi · ${n} Wallet kartı güncellendi`
          : "Kart kaydedildi (güncellenecek kayıtlı Wallet yok)",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <CardSettingsSkeleton />;
  }

  return (
    <div className="w-full space-y-5">
      <div className="w-full space-y-5">
        <SettingsSectionHeader
          title="Logo ve kart tasarımı"
          subtitle="Telefondaki sadakat kartının rengini, logosunu ve yazılarını ayarlayın."
          help="Kaydettiğinizde mevcut dijital kartlar da otomatik güncellenir. Sağdaki önizlemeden sonucu anında görürsünüz."
        />
        <ErrorBanner message={error} />
        <SuccessBanner message={ok} />
        <SoftBox className="text-sm text-[var(--muted)]">
          Birden fazla kart tipiniz varsa kart başına Wallet tasarımı için{" "}
          <Link
            href="/reward"
            className="font-medium text-[var(--accent)] hover:underline"
          >
            Kartlarım
          </Link>{" "}
          sayfasını kullanın. Bu sayfa birincil damga kartı ve genel marka
          ayarları içindir.
        </SoftBox>
        <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[...SETTINGS_TABS]}
          value={settingsTab}
          onChange={(id) => {
            setSettingsTab(id as SettingsTab);
            // Sekmeye karşılık gelen kart yüzünü önizlemede aç
            if (id === "front") setPreviewSide("front");
            if (id === "back") setPreviewSide("back");
            if (id === "notify") setPreviewSide("notify");
          }}
        />
          <button
            type="submit"
            form="card-design-form"
            className={`${btnPrimary()} shrink-0`}
            disabled={saving}
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      <form
        id="card-design-form"
        onSubmit={saveAll}
        className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="space-y-5">
          {settingsTab === "stamp" ? (
            <StampTab
              stampTheme={stampTheme}
              setStampTheme={setStampTheme}
              stampIconFilledUrl={stampIconFilledUrl}
              setStampIconFilledUrl={setStampIconFilledUrl}
              stampIconEmptyUrl={stampIconEmptyUrl}
              setStampIconEmptyUrl={setStampIconEmptyUrl}
              stampInset={stampInset}
              setStampInset={setStampInset}
              primaryColor={primaryColor}
              stampsRequired={stampsRequired}
              setStampsRequired={setStampsRequired}
              rewardLabel={rewardLabel}
              setRewardLabel={setRewardLabel}
              uploadBusy={uploadBusy}
              setUploadBusy={setUploadBusy}
              setError={setError}
            />
          ) : null}

          {settingsTab === "brand" ? (
            <BrandTab
              name={name}
              setName={setName}
              logoText={logoText}
              setLogoText={setLogoText}
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              primaryColor={primaryColor}
              setPrimaryColor={setPrimaryColor}
              foregroundColor={foregroundColor}
              setForegroundColor={setForegroundColor}
              labelColor={labelColor}
              setLabelColor={setLabelColor}
              uploadBusy={uploadBusy}
              setUploadBusy={setUploadBusy}
              setError={setError}
            />
          ) : null}

          {settingsTab === "front" ? (
            <FrontTab
              showStampField={showStampField}
              setShowStampField={setShowStampField}
              showRewardField={showRewardField}
              setShowRewardField={setShowRewardField}
              showStatusField={showStatusField}
              setShowStatusField={setShowStatusField}
              showBroadcastField={showBroadcastField}
              setShowBroadcastField={setShowBroadcastField}
              stampFieldLabel={stampFieldLabel}
              setStampFieldLabel={setStampFieldLabel}
              rewardFieldLabel={rewardFieldLabel}
              setRewardFieldLabel={setRewardFieldLabel}
              statusFieldLabel={statusFieldLabel}
              setStatusFieldLabel={setStatusFieldLabel}
              headerFieldLabel={headerFieldLabel}
              setHeaderFieldLabel={setHeaderFieldLabel}
              broadcastFieldLabel={broadcastFieldLabel}
              setBroadcastFieldLabel={setBroadcastFieldLabel}
              broadcastEmptyText={broadcastEmptyText}
              setBroadcastEmptyText={setBroadcastEmptyText}
              rewardReadyText={rewardReadyText}
              setRewardReadyText={setRewardReadyText}
              stampsRemainingTemplate={stampsRemainingTemplate}
              setStampsRemainingTemplate={setStampsRemainingTemplate}
            />
          ) : null}

          {settingsTab === "back" ? (
            <BackTab
              passDescriptionLabel={passDescriptionLabel}
              setPassDescriptionLabel={setPassDescriptionLabel}
              passDescription={passDescription}
              setPassDescription={setPassDescription}
              passHowItWorksLabel={passHowItWorksLabel}
              setPassHowItWorksLabel={setPassHowItWorksLabel}
              passHowItWorks={passHowItWorks}
              setPassHowItWorks={setPassHowItWorks}
              passTermsLabel={passTermsLabel}
              setPassTermsLabel={setPassTermsLabel}
              passTerms={passTerms}
              setPassTerms={setPassTerms}
              passLocationsLabel={passLocationsLabel}
              setPassLocationsLabel={setPassLocationsLabel}
              passLocations={passLocations}
              setPassLocations={setPassLocations}
              passHoursLabel={passHoursLabel}
              setPassHoursLabel={setPassHoursLabel}
              passHours={passHours}
              setPassHours={setPassHours}
              passPhoneLabel={passPhoneLabel}
              setPassPhoneLabel={setPassPhoneLabel}
              passPhone={passPhone}
              setPassPhone={setPassPhone}
              passWebsiteLabel={passWebsiteLabel}
              setPassWebsiteLabel={setPassWebsiteLabel}
              passWebsiteUrl={passWebsiteUrl}
              setPassWebsiteUrl={setPassWebsiteUrl}
              passExtra1Label={passExtra1Label}
              setPassExtra1Label={setPassExtra1Label}
              passExtra1Value={passExtra1Value}
              setPassExtra1Value={setPassExtra1Value}
              passExtra2Label={passExtra2Label}
              setPassExtra2Label={setPassExtra2Label}
              passExtra2Value={passExtra2Value}
              setPassExtra2Value={setPassExtra2Value}
              passExtra3Label={passExtra3Label}
              setPassExtra3Label={setPassExtra3Label}
              passExtra3Value={passExtra3Value}
              setPassExtra3Value={setPassExtra3Value}
            />
          ) : null}

          {settingsTab === "notify" ? (
            <NotifyTab
              notifyIconUrl={notifyIconUrl}
              setNotifyIconUrl={setNotifyIconUrl}
              stampChangeMessage={stampChangeMessage}
              setStampChangeMessage={setStampChangeMessage}
              rewardChangeMessage={rewardChangeMessage}
              setRewardChangeMessage={setRewardChangeMessage}
              statusChangeMessage={statusChangeMessage}
              setStatusChangeMessage={setStatusChangeMessage}
              headerChangeMessage={headerChangeMessage}
              setHeaderChangeMessage={setHeaderChangeMessage}
              headerFieldLabel={headerFieldLabel}
              barcodeFormat={barcodeFormat}
              setBarcodeFormat={setBarcodeFormat}
              primaryColor={primaryColor}
              uploadBusy={uploadBusy}
              setUploadBusy={setUploadBusy}
              setError={setError}
            />
          ) : null}
        </div>

        <WalletPreview
          previewSide={previewSide}
          setPreviewSide={setPreviewSide}
          primaryColor={primaryColor}
          foregroundColor={foregroundColor}
          labelColor={labelColor}
          logoUrl={logoUrl}
          previewLogo={previewLogo}
          headerFieldLabel={headerFieldLabel}
          previewFilled={previewFilled}
          stampsRequired={stampsRequired}
          stampGrid={stampGrid}
          stampInset={stampInset}
          stampTheme={stampTheme}
          stampIconFilledUrl={stampIconFilledUrl}
          stampIconEmptyUrl={stampIconEmptyUrl}
          showStampField={showStampField}
          showRewardField={showRewardField}
          showStatusField={showStatusField}
          showBroadcastField={showBroadcastField}
          previewStampLabel={previewStampLabel}
          previewRewardLabel={previewRewardLabel}
          previewStatusLabel={previewStatusLabel}
          previewBroadcastLabel={previewBroadcastLabel}
          previewBroadcastEmpty={previewBroadcastEmpty}
          rewardLabel={rewardLabel}
          previewStatus={previewStatus}
          barcodeFormat={barcodeFormat}
          backPreviewItems={backPreviewItems}
          name={name}
          notifyIconUrl={notifyIconUrl}
          notifyPreviewText={notifyPreviewText}
          previewNotifyKind={previewNotifyKind}
          setPreviewNotifyKind={setPreviewNotifyKind}
          rewardReady={rewardReady}
          setPreviewFilled={setPreviewFilled}
        />

        <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]/95 p-3 shadow-[var(--shadow-lg)] backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
          <p className="px-1 text-xs text-[var(--muted)]">
            Tüm sekmelerdeki değişiklikler tek kayıtta Wallet&apos;a gönderilir.
          </p>
          <button type="submit" className={btnPrimary()} disabled={saving}>
            {saving
              ? "Kaydediliyor…"
              : "Tümünü kaydet ve Wallet'a gönder"}
          </button>
        </div>
      </form>
    </div>
  );
}
