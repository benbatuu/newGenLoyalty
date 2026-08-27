"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ErrorBanner,
  Field,
  FormSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  SuccessBanner,
  Tabs,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api, apiUpload } from "../../lib/api";
import { bustCache } from "../../lib/use-api-query";

const SETTINGS_TABS = [
  { id: "stamp", label: "Damga", hint: "İkon & ödül kuralı" },
  { id: "brand", label: "Marka", hint: "Logo & renkler" },
  { id: "front", label: "Ön yüz", hint: "Alanlar & etiketler" },
  { id: "back", label: "Arka yüz", hint: "Bilgi satırları" },
  { id: "notify", label: "Bildirim", hint: "Metin & barkod" },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

type StampTheme = "COFFEE" | "DESSERT" | "STAR" | "HEART" | "DONUT" | "CUSTOM";
type StampInset = "TIGHT" | "NORMAL" | "WIDE";
type BarcodeFormat = "QR" | "PDF417" | "AZTEC" | "CODE128";
type AssetSlot = "stampFilled" | "stampEmpty" | "logo" | "icon";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  logoText: string | null;
  foregroundColor: string | null;
  labelColor: string | null;
  stampFieldLabel: string | null;
  rewardFieldLabel: string | null;
  statusFieldLabel: string | null;
  broadcastFieldLabel: string | null;
  broadcastEmptyText: string | null;
  showStampField: boolean;
  showRewardField: boolean;
  showStatusField: boolean;
  showBroadcastField: boolean;
  rewardReadyText: string | null;
  stampsRemainingTemplate: string | null;
  headerFieldLabel: string | null;
  passDescription: string | null;
  passHowItWorks: string | null;
  passTerms: string | null;
  passLocations: string | null;
  passHours: string | null;
  passWebsiteUrl: string | null;
  passPhone: string | null;
  passDescriptionLabel: string | null;
  passHowItWorksLabel: string | null;
  passTermsLabel: string | null;
  passLocationsLabel: string | null;
  passHoursLabel: string | null;
  passWebsiteLabel: string | null;
  passPhoneLabel: string | null;
  passExtra1Label: string | null;
  passExtra1Value: string | null;
  passExtra2Label: string | null;
  passExtra2Value: string | null;
  passExtra3Label: string | null;
  passExtra3Value: string | null;
  notifyIconUrl: string | null;
  stampChangeMessage: string | null;
  rewardChangeMessage: string | null;
  statusChangeMessage: string | null;
  headerChangeMessage: string | null;
  barcodeFormat: string | null;
  stampTheme: string | null;
  stampIconFilledUrl: string | null;
  stampIconEmptyUrl: string | null;
  stampInset: string | null;
  planCode: string;
  planPriceTry: number;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "CANCELLED" | "SUSPENDED";
  subscriptionActivatedAt: string | null;
  rewardRule: {
    stampsRequired: number;
    rewardLabel: string;
  } | null;
};

const THEMES: { id: StampTheme; label: string; emoji: string; hint: string }[] =
  [
    { id: "COFFEE", label: "Kahve", emoji: "☕", hint: "Kupa — dolu / boş" },
    { id: "DESSERT", label: "Tatlı", emoji: "🍰", hint: "Pasta dilimi" },
    { id: "DONUT", label: "Donut", emoji: "🍩", hint: "Halka tatlı" },
    { id: "STAR", label: "Yıldız", emoji: "⭐", hint: "Klasik damga" },
    { id: "HEART", label: "Kalp", emoji: "♥", hint: "Sevilenler" },
    { id: "CUSTOM", label: "Özel", emoji: "🖼️", hint: "Kendi ikon yükle" },
  ];

const INSETS: { id: StampInset; label: string; hint: string }[] = [
  { id: "TIGHT", label: "Dar", hint: "Kenara yakın" },
  { id: "NORMAL", label: "Normal", hint: "Dengeli boşluk" },
  { id: "WIDE", label: "Geniş", hint: "Bol kenar" },
];

const PREVIEW_PAD: Record<StampInset, string> = {
  TIGHT: "0.5rem 0.65rem",
  NORMAL: "0.75rem 1.35rem",
  WIDE: "0.85rem 1.85rem",
};

const BARCODES: { id: BarcodeFormat; label: string; hint: string }[] = [
  { id: "QR", label: "QR", hint: "Kare — önerilen" },
  { id: "AZTEC", label: "Aztec", hint: "Kare benzeri" },
  { id: "PDF417", label: "PDF417", hint: "Yatay 2D" },
  { id: "CODE128", label: "Code 128", hint: "1D çizgi" },
];

function formatChangePreview(template: string, sample: string): string {
  const t = template.trim() || "%@";
  return t.includes("%@") ? t.replace(/%@/g, sample) : `${t} ${sample}`;
}

function BarcodePreview({ format }: { format: BarcodeFormat }) {
  if (format === "PDF417") {
    return (
      <div className="flex h-10 w-40 flex-col justify-center gap-0.5 rounded bg-white px-1 py-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[2px] bg-black/80"
            style={{ width: `${70 + ((i * 17) % 30)}%` }}
          />
        ))}
      </div>
    );
  }
  if (format === "CODE128") {
    return (
      <div className="flex h-12 w-44 items-end justify-center gap-px rounded bg-white px-2 py-1">
        {Array.from({ length: 36 }).map((_, i) => (
          <div
            key={i}
            className="bg-black"
            style={{
              width: i % 3 === 0 ? 2 : 1,
              height: `${60 + ((i * 13) % 40)}%`,
            }}
          />
        ))}
      </div>
    );
  }
  // QR + Aztec — square grid mock
  return (
    <div className="grid h-16 w-16 grid-cols-5 gap-0.5 rounded bg-white p-1">
      {Array.from({ length: 25 }).map((_, i) => (
        <div
          key={i}
          className={
            [0, 1, 2, 4, 5, 6, 10, 14, 18, 20, 21, 22, 24].includes(i)
              ? "bg-black"
              : "bg-black/15"
          }
        />
      ))}
    </div>
  );
}

function computeStampGrid(stampsRequired: number): { cols: number; rows: number } {
  const n = Math.max(1, Math.min(Math.floor(stampsRequired) || 1, 16));
  if (n <= 5) return { cols: n, rows: 1 };
  for (const cols of [5, 4, 3] as const) {
    if (n % cols === 0) {
      const rows = n / cols;
      if (rows <= 4) return { cols, rows };
    }
  }
  if (n <= 8) return { cols: 4, rows: Math.ceil(n / 4) };
  return { cols: 5, rows: Math.ceil(n / 5) };
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-[var(--line)] bg-white"
        />
        <input
          className={inputClassName()}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
          required
        />
      </div>
    </Field>
  );
}

function IconUploadField({
  label,
  hint,
  value,
  onUploaded,
  onClear,
  slot,
  busy,
  setBusy,
  onError,
}: {
  label: string;
  hint?: string;
  value: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
  slot: AssetSlot;
  busy: string | null;
  setBusy: (s: string | null) => void;
  onError: (msg: string) => void;
}) {
  const uploading = busy === slot;
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="text-xs text-[var(--muted)]">—</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm hover:bg-[var(--surface)]">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="sr-only"
              disabled={!!busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(slot);
                onError("");
                try {
                  const res = await apiUpload<{ url: string }>(
                    `/tenants/me/assets?slot=${slot}`,
                    file,
                  );
                  onUploaded(res.url);
                } catch (err) {
                  onError(
                    err instanceof ApiError
                      ? err.message
                      : "Yükleme başarısız",
                  );
                } finally {
                  setBusy(null);
                }
              }}
            />
            {uploading ? "Yükleniyor…" : value ? "Değiştir" : "Dosya seç"}
          </label>
          {value ? (
            <button
              type="button"
              className="text-xs text-[var(--muted)] underline"
              onClick={onClear}
              disabled={!!busy}
            >
              Kaldır
            </button>
          ) : null}
          {hint ? (
            <p className="text-[11px] text-[var(--muted)]">{hint}</p>
          ) : null}
        </div>
      </div>
    </Field>
  );
}

function LabelValuePair({
  labelTitle,
  valueTitle,
  label,
  value,
  onLabel,
  onValue,
  rows = 1,
  labelPlaceholder,
  valuePlaceholder,
}: {
  labelTitle: string;
  valueTitle: string;
  label: string;
  value: string;
  onLabel: (v: string) => void;
  onValue: (v: string) => void;
  rows?: number;
  labelPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
      <Field label={labelTitle}>
        <input
          className={inputClassName()}
          value={label}
          onChange={(e) => onLabel(e.target.value)}
          placeholder={labelPlaceholder}
        />
      </Field>
      <Field label={valueTitle}>
        {rows > 1 ? (
          <textarea
            className={inputClassName() + " min-h-20"}
            value={value}
            onChange={(e) => onValue(e.target.value)}
            placeholder={valuePlaceholder}
            rows={rows}
          />
        ) : (
          <input
            className={inputClassName()}
            value={value}
            onChange={(e) => onValue(e.target.value)}
            placeholder={valuePlaceholder}
          />
        )}
      </Field>
    </div>
  );
}

function StampGlyph({
  theme,
  filled,
  color,
  filledUrl,
  emptyUrl,
}: {
  theme: StampTheme;
  filled: boolean;
  color: string;
  filledUrl?: string;
  emptyUrl?: string;
}) {
  const opacity = filled ? 1 : 0.32;
  const common = { width: 28, height: 28, viewBox: "0 0 64 64" as const };
  if (theme === "CUSTOM") {
    const src = filled ? filledUrl || emptyUrl : emptyUrl || filledUrl;
    if (src) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={28}
          height={28}
          className="object-contain"
          style={{ opacity: filled ? 1 : emptyUrl ? 1 : 0.35 }}
        />
      );
    }
    return (
      <span style={{ opacity, fontSize: 22, lineHeight: 1 }}>
        {filled ? "●" : "○"}
      </span>
    );
  }
  if (theme === "STAR") {
    return (
      <svg {...common} style={{ opacity }}>
        <path
          d="M32 10 L38 24 L54 26 L42 36 L46 52 L32 44 L18 52 L22 36 L10 26 L26 24 Z"
          fill={filled ? color : "none"}
          stroke={color}
          strokeWidth="3"
        />
      </svg>
    );
  }
  if (theme === "HEART") {
    return (
      <svg {...common} style={{ opacity }}>
        <path
          d="M32 50 C32 50 12 36 12 24 C12 16 18 12 24 12 C28 12 31 14 32 18 C33 14 36 12 40 12 C46 12 52 16 52 24 C52 36 32 50 32 50 Z"
          fill={filled ? color : "none"}
          stroke={color}
          strokeWidth="3"
        />
      </svg>
    );
  }
  if (theme === "DONUT") {
    return (
      <svg {...common} style={{ opacity }}>
        <circle
          cx="32"
          cy="32"
          r="18"
          fill={filled ? color : "none"}
          stroke={color}
          strokeWidth="3"
        />
        <circle cx="32" cy="32" r="7" fill="none" stroke={color} strokeWidth="3" />
      </svg>
    );
  }
  if (theme === "DESSERT") {
    return (
      <svg {...common} style={{ opacity }}>
        <path
          d="M14 48 C14 28 50 28 50 48"
          fill={filled ? color : "none"}
          stroke={color}
          strokeWidth="3"
        />
        <ellipse
          cx="32"
          cy="48"
          rx="18"
          ry="6"
          fill={filled ? color : "none"}
          stroke={color}
          strokeWidth="3"
        />
      </svg>
    );
  }
  return (
    <svg {...common} style={{ opacity }}>
      <path
        d="M18 22 h28 v22 c0 10 -8 16 -14 16 s-14 -6 -14 -16 z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth="3"
      />
      <path
        d="M46 28 h6 c6 0 10 4 10 10 s-4 10 -10 10 h-6"
        fill="none"
        stroke={color}
        strokeWidth="3"
      />
    </svg>
  );
}

function SettingsPage() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoText, setLogoText] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1B4332");
  const [foregroundColor, setForegroundColor] = useState("#FFFFFF");
  const [labelColor, setLabelColor] = useState("#DCDCDC");
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

  const load = useCallback(async () => {
    try {
      const t = await api<Tenant>("/tenants/me");
      setName(t.name);
      setLogoUrl(t.logoUrl ?? "");
      setLogoText(t.logoText ?? "");
      setPrimaryColor(t.primaryColor ?? "#1B4332");
      setForegroundColor(t.foregroundColor ?? "#FFFFFF");
      setLabelColor(t.labelColor ?? "#DCDCDC");
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
      setStampChangeMessage(
        t.stampChangeMessage ?? "Damga güncellendi: %@",
      );
      setRewardChangeMessage(t.rewardChangeMessage ?? "Ödül: %@");
      setStatusChangeMessage(t.statusChangeMessage ?? "%@");
      setHeaderChangeMessage(t.headerChangeMessage ?? "Damga: %@");
      setBarcodeFormat(
        ((t.barcodeFormat || "QR").toUpperCase() as BarcodeFormat) || "QR",
      );
      setStampsRequired(t.rewardRule?.stampsRequired ?? 10);
      setRewardLabel(t.rewardRule?.rewardLabel ?? "1 bedava kahve");
      setPreviewFilled(Math.min(3, t.rewardRule?.stampsRequired ?? 10));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ayarlar alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      setOk(
        n > 0
          ? `Kart kaydedildi · ${n} Wallet kartı güncellendi`
          : "Kart kaydedildi (güncellenecek kayıtlı Wallet yok)",
      );
      bustCache("settings");
      bustCache("metrics");
      bustCache("notifications");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <FormSkeleton rows={5} />;
  }

  return (
    <div className="w-full space-y-5">
      <div className="w-full space-y-5">
        <PageHeader
          eyebrow="Kart & Wallet"
          title="Kart tasarımı"
          subtitle="Her sekme Wallet kartının bir yüzünü kontrol eder; sağda canlı önizleme."
          actions={
            <button
              type="submit"
              form="card-design-form"
              className={btnPrimary()}
              disabled={saving}
            >
              {saving ? "Kaydediliyor…" : "Kaydet ve Wallet’a gönder"}
            </button>
          }
        />
        <ErrorBanner message={error} />
        <SuccessBanner message={ok} />
        <Tabs
          tabs={[...SETTINGS_TABS]}
          value={settingsTab}
          onChange={(id) => setSettingsTab(id as SettingsTab)}
        />
      </div>

      <form
        id="card-design-form"
        onSubmit={saveAll}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="space-y-5">
          {settingsTab === "stamp" ? (
          <Panel>
            <PanelHeader
              step={1}
              title="Damga görseli"
              description="Tema, kenar boşluğu ve ödül için gereken damga sayısı."
            />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {THEMES.map((t) => {
                  const active = stampTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setStampTheme(t.id)}
                      className={`rounded-[var(--radius-sm)] border px-3 py-3 text-left transition ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]"
                          : "border-[var(--line)] bg-white hover:border-[var(--line-strong)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      <div className="text-xl">{t.emoji}</div>
                      <div className="mt-1 text-sm font-semibold">{t.label}</div>
                      <div
                        className={`text-[11px] ${active ? "text-white/70" : "text-[var(--muted)]"}`}
                      >
                        {t.hint}
                      </div>
                    </button>
                  );
                })}
              </div>

              {stampTheme === "CUSTOM" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <IconUploadField
                    label="Dolu damga ikonu"
                    hint="PNG · şeffaf arka plan"
                    value={stampIconFilledUrl}
                    onUploaded={setStampIconFilledUrl}
                    onClear={() => setStampIconFilledUrl("")}
                    slot="stampFilled"
                    busy={uploadBusy}
                    setBusy={setUploadBusy}
                    onError={(msg) => setError(msg || null)}
                  />
                  <IconUploadField
                    label="Boş damga ikonu"
                    hint="Opsiyonel"
                    value={stampIconEmptyUrl}
                    onUploaded={setStampIconEmptyUrl}
                    onClear={() => setStampIconEmptyUrl("")}
                    slot="stampEmpty"
                    busy={uploadBusy}
                    setBusy={setUploadBusy}
                    onError={(msg) => setError(msg || null)}
                  />
                </div>
              ) : null}

              <Field label="Kenar boşluğu">
                <div className="grid grid-cols-3 gap-2">
                  {INSETS.map((opt) => {
                    const active = stampInset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStampInset(opt.id)}
                        className={`rounded-[var(--radius-sm)] border px-2 py-2.5 text-left transition ${
                          active
                            ? "border-transparent text-white"
                            : "border-[var(--line)] bg-white hover:bg-[var(--surface)]"
                        }`}
                        style={
                          active ? { background: primaryColor } : undefined
                        }
                      >
                        <div className="text-sm font-semibold">{opt.label}</div>
                        <div
                          className={`text-[11px] ${active ? "text-white/70" : "text-[var(--muted)]"}`}
                        >
                          {opt.hint}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <SoftBox>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Ödül kuralı
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Gerekli damga sayısı">
                    <input
                      className={inputClassName()}
                      type="number"
                      min={1}
                      max={16}
                      value={stampsRequired}
                      onChange={(e) => setStampsRequired(Number(e.target.value))}
                      required
                    />
                  </Field>
                  <Field label="Ödül metni (ön yüz)">
                    <input
                      className={inputClassName()}
                      value={rewardLabel}
                      onChange={(e) => setRewardLabel(e.target.value)}
                      required
                    />
                  </Field>
                </div>
              </SoftBox>
            </div>
          </Panel>
          ) : null}

          {settingsTab === "brand" ? (
          <Panel>
            <PanelHeader
              step={2}
              title="Marka & renkler"
              description="Logo varsa Wallet üstünde yalnızca logo görünür; isim bildirim başlığında kalır."
            />
            <div className="space-y-4">
              <Field label="Kafe adı (organizasyon)">
                <input
                  className={inputClassName()}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Kart üst yazısı (logo yokken)">
                <input
                  className={inputClassName()}
                  value={logoText}
                  onChange={(e) => setLogoText(e.target.value)}
                  placeholder={name || "Boşsa kafe adı"}
                />
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  Logo yüklüyken Wallet’ta yalnızca logo görünür; bu yazı
                  gizlenir. Bildirim başlığı için kafe adı kullanılır.
                </p>
              </Field>
              <IconUploadField
                label="Logo"
                hint="Wallet üst logosuna basılır"
                value={logoUrl}
                onUploaded={setLogoUrl}
                onClear={() => setLogoUrl("")}
                slot="logo"
                busy={uploadBusy}
                setBusy={setUploadBusy}
                onError={(msg) => setError(msg || null)}
              />
              <SoftBox>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Renk paleti
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <ColorField
                    label="Arka plan"
                    value={primaryColor}
                    onChange={setPrimaryColor}
                  />
                  <ColorField
                    label="İkon / yazı"
                    value={foregroundColor}
                    onChange={setForegroundColor}
                  />
                  <ColorField
                    label="Etiket"
                    value={labelColor}
                    onChange={setLabelColor}
                  />
                </div>
              </SoftBox>
            </div>
          </Panel>
          ) : null}

          {settingsTab === "front" ? (
          <Panel>
            <PanelHeader
              step={3}
              title="Ön yüz metinleri"
              description="Header, Wallet yığınında (kartlar üst üste) sağ üstte görünür. İstemediğin alanları kapatabilirsin."
            />
            <div className="space-y-4">
              <SoftBox>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  Ön yüzde göster
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["Damga", showStampField, setShowStampField],
                      ["Ödül", showRewardField, setShowRewardField],
                      ["Durum", showStatusField, setShowStatusField],
                      ["Duyuru", showBroadcastField, setShowBroadcastField],
                    ] as const
                  ).map(([label, on, set]) => (
                    <label
                      key={label}
                      className={`flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-2.5 text-sm transition ${
                        on
                          ? "border-[var(--accent)]/30 bg-white shadow-[var(--shadow-sm)]"
                          : "border-[var(--line)] bg-white/60 opacity-70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => set(e.target.checked)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  Duyuru kapalıysa kilit ekranı bildirimi yine çalışır (arka
                  yüzde tutulur).
                </p>
              </SoftBox>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Damga alanı etiketi">
                  <input
                    className={inputClassName()}
                    value={stampFieldLabel}
                    onChange={(e) => setStampFieldLabel(e.target.value)}
                    disabled={!showStampField}
                  />
                </Field>
                <Field label="Ödül alanı etiketi">
                  <input
                    className={inputClassName()}
                    value={rewardFieldLabel}
                    onChange={(e) => setRewardFieldLabel(e.target.value)}
                    disabled={!showRewardField}
                  />
                </Field>
                <Field label="Durum alanı etiketi">
                  <input
                    className={inputClassName()}
                    value={statusFieldLabel}
                    onChange={(e) => setStatusFieldLabel(e.target.value)}
                    disabled={!showStatusField}
                  />
                </Field>
                <Field label="Header etiketi (opsiyonel)">
                  <input
                    className={inputClassName()}
                    value={headerFieldLabel}
                    onChange={(e) => setHeaderFieldLabel(e.target.value)}
                    placeholder="Boş = header yok · örn. DAMGA"
                  />
                </Field>
                <Field label="Duyuru alanı etiketi">
                  <input
                    className={inputClassName()}
                    value={broadcastFieldLabel}
                    onChange={(e) => setBroadcastFieldLabel(e.target.value)}
                    placeholder="NOTICE veya DUYURU"
                    disabled={!showBroadcastField}
                  />
                </Field>
                <Field label="Duyuru yokken metin">
                  <input
                    className={inputClassName()}
                    value={broadcastEmptyText}
                    onChange={(e) => setBroadcastEmptyText(e.target.value)}
                    placeholder="No announcement / Yeni duyuru yok"
                    disabled={!showBroadcastField}
                  />
                </Field>
              </div>
              <SoftBox>
                <div className="space-y-3">
                  <Field label="Ödül hazır metni">
                    <input
                      className={inputClassName()}
                      value={rewardReadyText}
                      onChange={(e) => setRewardReadyText(e.target.value)}
                    />
                  </Field>
                  <Field label="Kalan damga şablonu">
                    <input
                      className={inputClassName()}
                      value={stampsRemainingTemplate}
                      onChange={(e) => setStampsRemainingTemplate(e.target.value)}
                    />
                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                      {"{remaining}"} otomatik kalan sayıya dönüşür.
                    </p>
                  </Field>
                </div>
              </SoftBox>
            </div>
          </Panel>
          ) : null}

          {settingsTab === "back" ? (
          <Panel>
            <PanelHeader
              step={4}
              title="Arka yüz"
              description="Her satır için etiket + içerik. Boş içerik kartta gösterilmez."
            />
            <div className="space-y-4">
              <LabelValuePair
                labelTitle="Etiket"
                valueTitle="Hakkında"
                label={passDescriptionLabel}
                value={passDescription}
                onLabel={setPassDescriptionLabel}
                onValue={setPassDescription}
                labelPlaceholder="Hakkında"
                rows={3}
              />
              <LabelValuePair
                labelTitle="Etiket"
                valueTitle="Nasıl çalışır?"
                label={passHowItWorksLabel}
                value={passHowItWorks}
                onLabel={setPassHowItWorksLabel}
                onValue={setPassHowItWorks}
                labelPlaceholder="Nasıl çalışır?"
                rows={3}
              />
              <LabelValuePair
                labelTitle="Etiket"
                valueTitle="Koşullar"
                label={passTermsLabel}
                value={passTerms}
                onLabel={setPassTermsLabel}
                onValue={setPassTerms}
                labelPlaceholder="Koşullar"
                rows={3}
              />
              <LabelValuePair
                labelTitle="Etiket"
                valueTitle="Şubeler / adres"
                label={passLocationsLabel}
                value={passLocations}
                onLabel={setPassLocationsLabel}
                onValue={setPassLocations}
                labelPlaceholder="Şubeler / Adres"
                rows={2}
              />
              <LabelValuePair
                labelTitle="Etiket"
                valueTitle="Çalışma saatleri"
                label={passHoursLabel}
                value={passHours}
                onLabel={setPassHoursLabel}
                onValue={setPassHours}
                labelPlaceholder="Çalışma saatleri"
              />
              <LabelValuePair
                labelTitle="Etiket"
                valueTitle="Telefon"
                label={passPhoneLabel}
                value={passPhone}
                onLabel={setPassPhoneLabel}
                onValue={setPassPhone}
                labelPlaceholder="Telefon"
              />
              <LabelValuePair
                labelTitle="Etiket"
                valueTitle="Web"
                label={passWebsiteLabel}
                value={passWebsiteUrl}
                onLabel={setPassWebsiteLabel}
                onValue={setPassWebsiteUrl}
                labelPlaceholder="Web"
              />

              <SoftBox>
                <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">
                  Ek satırlar (serbest)
                </h3>
                <div className="space-y-4">
                  <LabelValuePair
                    labelTitle="Etiket 1"
                    valueTitle="İçerik 1"
                    label={passExtra1Label}
                    value={passExtra1Value}
                    onLabel={setPassExtra1Label}
                    onValue={setPassExtra1Value}
                    rows={2}
                  />
                  <LabelValuePair
                    labelTitle="Etiket 2"
                    valueTitle="İçerik 2"
                    label={passExtra2Label}
                    value={passExtra2Value}
                    onLabel={setPassExtra2Label}
                    onValue={setPassExtra2Value}
                    rows={2}
                  />
                  <LabelValuePair
                    labelTitle="Etiket 3"
                    valueTitle="İçerik 3"
                    label={passExtra3Label}
                    value={passExtra3Value}
                    onLabel={setPassExtra3Label}
                    onValue={setPassExtra3Value}
                    rows={2}
                  />
                </div>
              </SoftBox>
            </div>
          </Panel>
          ) : null}

          {settingsTab === "notify" ? (
          <Panel>
            <PanelHeader
              step={5}
              title="Bildirim & barkod"
              description={`Kilit ekranı metinleri olaya göre tek bildirim gönderir: damga, ödül hazır veya ödül kullanıldı. %@ yeni değere dönüşür.`}
            />
            <div className="space-y-4">
              <IconUploadField
                label="Bildirim ikonu"
                hint="Kilit ekranı / bildirim — kare PNG"
                value={notifyIconUrl}
                onUploaded={setNotifyIconUrl}
                onClear={() => setNotifyIconUrl("")}
                slot="icon"
                busy={uploadBusy}
                setBusy={setUploadBusy}
                onError={(msg) => setError(msg || null)}
              />
              <SoftBox>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Değişim mesajları
                </p>
                <div className="space-y-3">
                  <Field label="Damga bildirim metni">
                    <input
                      className={inputClassName()}
                      value={stampChangeMessage}
                      onChange={(e) => setStampChangeMessage(e.target.value)}
                      placeholder="Damga güncellendi: %@"
                    />
                  </Field>
                  <Field label="Ödül bildirim metni">
                    <input
                      className={inputClassName()}
                      value={rewardChangeMessage}
                      onChange={(e) => setRewardChangeMessage(e.target.value)}
                      placeholder="Ödül: %@"
                    />
                  </Field>
                  <Field label="Durum bildirim metni">
                    <input
                      className={inputClassName()}
                      value={statusChangeMessage}
                      onChange={(e) => setStatusChangeMessage(e.target.value)}
                      placeholder="%@"
                    />
                  </Field>
                  {headerFieldLabel.trim() ? (
                    <Field label="Header bildirim metni">
                      <input
                        className={inputClassName()}
                        value={headerChangeMessage}
                        onChange={(e) => setHeaderChangeMessage(e.target.value)}
                        placeholder="Damga: %@"
                      />
                    </Field>
                  ) : null}
                </div>
              </SoftBox>
              <Field label="Barkod formatı">
                <div className="grid grid-cols-2 gap-2">
                  {BARCODES.map((b) => {
                    const active = barcodeFormat === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBarcodeFormat(b.id)}
                        className={`rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition ${
                          active
                            ? "border-transparent text-white"
                            : "border-[var(--line)] bg-white hover:bg-[var(--surface)]"
                        }`}
                        style={
                          active ? { background: primaryColor } : undefined
                        }
                      >
                        <div className="text-sm font-semibold">{b.label}</div>
                        <div
                          className={`text-[11px] ${active ? "text-white/70" : "text-[var(--muted)]"}`}
                        >
                          {b.hint}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          </Panel>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Panel>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-lg">
                Canlı önizleme
              </h2>
              <div className="flex rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] p-0.5 text-xs">
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1.5 font-medium transition ${previewSide === "front" ? "bg-white text-[var(--ink)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}
                  onClick={() => setPreviewSide("front")}
                >
                  Ön
                </button>
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1.5 font-medium transition ${previewSide === "back" ? "bg-white text-[var(--ink)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}
                  onClick={() => setPreviewSide("back")}
                >
                  Arka
                </button>
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1.5 font-medium transition ${previewSide === "notify" ? "bg-white text-[var(--ink)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}
                  onClick={() => setPreviewSide("notify")}
                >
                  Bildirim
                </button>
              </div>
            </div>

            {previewSide === "front" ? (
              <div
                className="overflow-hidden rounded-2xl shadow-lg"
                style={{ background: primaryColor, color: foregroundColor }}
              >
                <div className="flex items-start justify-between gap-3 px-4 pt-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt=""
                        className="h-8 w-16 object-contain"
                      />
                    ) : (
                      <p
                        className="truncate text-[11px] uppercase tracking-[0.14em]"
                        style={{ color: labelColor }}
                      >
                        {previewLogo}
                      </p>
                    )}
                  </div>
                  {headerFieldLabel.trim() ? (
                    <div className="shrink-0 text-right">
                      <p
                        className="text-[9px] uppercase tracking-wider"
                        style={{ color: labelColor }}
                      >
                        {headerFieldLabel.trim()}
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        {previewFilled}/{stampsRequired}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div
                  className="mx-3 mt-3 justify-items-center gap-x-1.5 gap-y-2 rounded-xl"
                  style={{
                    background: "rgba(0,0,0,0.12)",
                    display: "grid",
                    gridTemplateColumns: `repeat(${stampGrid.cols}, minmax(0, 1fr))`,
                    padding: PREVIEW_PAD[stampInset] || PREVIEW_PAD.NORMAL,
                  }}
                >
                  {Array.from({ length: Math.min(stampsRequired, 16) }).map(
                    (_, i) => (
                      <StampGlyph
                        key={i}
                        theme={stampTheme}
                        filled={i < previewFilled}
                        color={foregroundColor}
                        filledUrl={stampIconFilledUrl}
                        emptyUrl={stampIconEmptyUrl}
                      />
                    ),
                  )}
                </div>

                <div className="px-4 pb-4 pt-3">
                  <div
                    className="grid gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${
                        [
                          showStampField,
                          showRewardField,
                          showStatusField,
                          showBroadcastField,
                        ].filter(Boolean).length || 1
                      }, minmax(0, 1fr))`,
                    }}
                  >
                    {showStampField ? (
                      <div>
                        <p
                          className="text-[9px] uppercase tracking-wider"
                          style={{ color: labelColor }}
                        >
                          {previewStampLabel}
                        </p>
                        <p className="text-sm font-semibold tabular-nums">
                          {previewFilled}/{stampsRequired}
                        </p>
                      </div>
                    ) : null}
                    {showRewardField ? (
                      <div>
                        <p
                          className="text-[9px] uppercase tracking-wider"
                          style={{ color: labelColor }}
                        >
                          {previewRewardLabel}
                        </p>
                        <p className="text-xs font-medium leading-snug">
                          {rewardLabel}
                        </p>
                      </div>
                    ) : null}
                    {showStatusField ? (
                      <div>
                        <p
                          className="text-[9px] uppercase tracking-wider"
                          style={{ color: labelColor }}
                        >
                          {previewStatusLabel}
                        </p>
                        <p className="text-xs font-medium leading-snug">
                          {previewStatus}
                        </p>
                      </div>
                    ) : null}
                    {showBroadcastField ? (
                      <div>
                        <p
                          className="text-[9px] uppercase tracking-wider"
                          style={{ color: labelColor }}
                        >
                          {previewBroadcastLabel}
                        </p>
                        <p className="text-xs font-medium leading-snug">
                          {previewBroadcastEmpty}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-col items-center gap-1">
                    <BarcodePreview format={barcodeFormat} />
                    <p className="text-[10px] opacity-70">{barcodeFormat}</p>
                  </div>
                </div>
              </div>
            ) : previewSide === "back" ? (
              <div className="max-h-[480px] space-y-3 overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-4 text-sm">
                {backPreviewItems.map((item, idx) => (
                  <div key={`${item.label}-${idx}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {item.label}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-[var(--ink)]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#1c1c1e] to-[#2c2c2e] p-4 text-white shadow-lg">
                  <p className="mb-3 text-center text-[10px] font-medium tracking-wide text-white/50">
                    Kilit ekranı
                  </p>
                  <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px]"
                        style={{ background: primaryColor }}
                      >
                        {notifyIconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={notifyIconUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoUrl}
                            alt=""
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold text-white/80">
                            {(name || "K").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold">
                            {name || "Kafe"}
                          </p>
                          <span className="shrink-0 text-[11px] text-white/45">
                            şimdi
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] leading-snug text-white/85">
                          {notifyPreviewText}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[10px] text-white/40">
                    Wallet pass güncelleme bildirimi
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: "stamp" as const, label: "Damga" },
                      { id: "reward" as const, label: "Ödül" },
                      { id: "status" as const, label: "Durum" },
                      ...(headerFieldLabel.trim()
                        ? [{ id: "header" as const, label: "Header" }]
                        : []),
                    ] as { id: typeof previewNotifyKind; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPreviewNotifyKind(opt.id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${
                        previewNotifyKind === opt.id
                          ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                          : "border-[var(--line)] bg-white text-[var(--muted)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  İkon ve metin canlı güncellenir. Damga kaydırıcısı örnek
                  değerdeki sayıyı değiştirir.
                </p>
              </div>
            )}

            <div className="mt-3">
              <label className="text-xs text-[var(--muted)]">
                Önizleme dolu damga: {previewFilled}
                {rewardReady ? " · ödül hazır" : ""}
              </label>
              <input
                type="range"
                min={0}
                max={stampsRequired}
                value={previewFilled}
                onChange={(e) => setPreviewFilled(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Değişiklikler anında önizlenir. Kaydetince tüm müşteri Wallet
              kartları güncellenir.
            </p>
          </Panel>
        </aside>

        <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]/95 p-3 shadow-[var(--shadow-lg)] backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
          <p className="px-1 text-xs text-[var(--muted)]">
            Tüm sekmelerdeki değişiklikler tek kayıtta Wallet’a gönderilir.
          </p>
          <button type="submit" className={btnPrimary()} disabled={saving}>
            {saving
              ? "Kaydediliyor…"
              : "Tümünü kaydet ve Wallet’a gönder"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth roles={["STORE_OWNER", "SUPER_ADMIN"]}>
      <Suspense fallback={<FormSkeleton rows={6} />}>
        <SettingsPage />
      </Suspense>
    </RequireAuth>
  );
}
