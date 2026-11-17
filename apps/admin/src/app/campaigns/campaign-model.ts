/**
 * Kampanya sayfası için tipler, varsayılanlar ve sade dilde özet üreticiler.
 * Sunucu `config` alanını bütün olarak değiştirir — burada her zaman tam config üretilir.
 */

export type CampaignType = "MULTIPLIER" | "WIN_BACK" | "SCHEDULED_BROADCAST";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";
export type WinBackChannel = "OWNER_PUSH" | "SMS";

export type Campaign = {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  config: Record<string, unknown>;
  startsAt: string | null;
  endsAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Segment = { id: string; name: string; isActive: boolean };

export type CampaignSuggestion = {
  id: string;
  title: string;
  description: string;
  preset: {
    type: CampaignType;
    multiplier?: number;
    daysOfWeek?: number[];
    label?: string;
    inactiveDays?: number;
    message?: string;
    channel?: WinBackChannel;
  };
};

/** Formda düzenlenen tüm alanlar — tipe göre bir kısmı kullanılır */
export type CampaignDraft = {
  type: CampaignType;
  name: string;
  // 2x damga
  multiplier: number;
  daysOfWeek: number[];
  useHours: boolean;
  startTime: string;
  endTime: string;
  label: string;
  // Geri çağırma
  inactiveDays: number;
  channel: WinBackChannel;
  // Ortak
  message: string;
  segmentId: string;
  // Duyuru
  sendNow: boolean;
  scheduledAt: string; // datetime-local (yerel saat)
};

/** 0 = Pazar … 6 = Cumartesi (sunucu ile aynı) */
export const DAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
export const DAY_LONG = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];
/** Haftayı pazartesiden başlat */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const BROADCAST_MAX = 200;
export const WINBACK_MAX = 500;

export const TYPE_META: Record<
  CampaignType,
  {
    title: string;
    goal: string;
    description: string;
    example: string;
    tone: string;
    stripe: string;
  }
> = {
  MULTIPLIER: {
    title: "Ekstra damga günü",
    goal: "Sakin günleri hareketlendir",
    description:
      "Seçtiğiniz günlerde müşteriler her alışverişte 2 veya 3 kat damga kazanır.",
    example: "Örn. her salı 2 kat damga",
    tone: "bg-indigo-50 text-indigo-600",
    stripe: "bg-indigo-500",
  },
  WIN_BACK: {
    title: "Kayıp müşteriyi geri çağır",
    goal: "Uzun süredir gelmeyenleri hatırla",
    description:
      "Belirli bir süredir uğramayan müşterileri her sabah bulur; size haber verir veya onlara SMS atar.",
    example: "Örn. 30 gündür gelmeyene «Sizi özledik»",
    tone: "bg-amber-50 text-amber-600",
    stripe: "bg-amber-500",
  },
  SCHEDULED_BROADCAST: {
    title: "Kart duyurusu",
    goal: "Herkese haber ver",
    description:
      "Sadakat kartını telefonuna ekleyen tüm müşterilere kısa bir bildirim gönderin.",
    example: "Örn. «Cumartesi tatlılar %20 indirimli»",
    tone: "bg-emerald-50 text-emerald-600",
    stripe: "bg-emerald-500",
  },
};

export const STATUS_META: Record<
  CampaignStatus,
  { label: string; tone: "neutral" | "success" | "warning" | "info" }
> = {
  ACTIVE: { label: "Açık", tone: "success" },
  DRAFT: { label: "Taslak", tone: "neutral" },
  PAUSED: { label: "Durduruldu", tone: "warning" },
  ENDED: { label: "Bitti", tone: "neutral" },
};

export const STATUS_ORDER: Record<CampaignStatus, number> = {
  ACTIVE: 0,
  DRAFT: 1,
  PAUSED: 2,
  ENDED: 3,
};

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Date → `datetime-local` değeri (yerel saat; toISOString UTC'ye kaydırır) */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function inOneHour() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return toLocalInput(d);
}

export function emptyDraft(type: CampaignType): CampaignDraft {
  const base: CampaignDraft = {
    type,
    name: "",
    multiplier: 2,
    daysOfWeek: [6],
    useHours: false,
    startTime: "14:00",
    endTime: "17:00",
    label: "",
    inactiveDays: 30,
    channel: "OWNER_PUSH",
    message: "",
    segmentId: "",
    sendNow: false,
    scheduledAt: inOneHour(),
  };
  if (type === "MULTIPLIER") base.name = "Cumartesi 2x damga";
  if (type === "WIN_BACK") {
    base.name = "30 gündür gelmeyenler";
    base.message = "Sizi özledik! Bu hafta uğrayın, kahveniz bizden.";
  }
  if (type === "SCHEDULED_BROADCAST") base.name = "Duyuru";
  return base;
}

export function draftFromSuggestion(s: CampaignSuggestion): CampaignDraft {
  const d = emptyDraft(s.preset.type);
  const p = s.preset;
  if (p.multiplier) d.multiplier = clampInt(p.multiplier, 2, 4, 2);
  if (p.daysOfWeek) d.daysOfWeek = p.daysOfWeek.filter((x) => x >= 0 && x <= 6);
  if (p.label) {
    d.label = p.label;
    d.name = p.label;
  } else {
    d.name = s.title;
  }
  if (p.inactiveDays) d.inactiveDays = clampInt(p.inactiveDays, 7, 365, 30);
  if (p.message) d.message = p.message;
  if (p.channel) d.channel = p.channel;
  return d;
}

export function draftFromCampaign(c: Campaign): CampaignDraft {
  const cfg = c.config ?? {};
  const d = emptyDraft(c.type);
  d.name = c.name;
  d.segmentId = typeof cfg.segmentId === "string" ? cfg.segmentId : "";
  if (c.type === "MULTIPLIER") {
    d.multiplier = clampInt(cfg.multiplier, 2, 4, 2);
    d.daysOfWeek = Array.isArray(cfg.daysOfWeek)
      ? (cfg.daysOfWeek as unknown[])
          .map(Number)
          .filter((x) => Number.isInteger(x) && x >= 0 && x <= 6)
      : [];
    const st = typeof cfg.startTime === "string" ? cfg.startTime : "";
    const et = typeof cfg.endTime === "string" ? cfg.endTime : "";
    d.useHours = HHMM.test(st) && HHMM.test(et);
    if (d.useHours) {
      d.startTime = st;
      d.endTime = et;
    }
    d.label = typeof cfg.label === "string" ? cfg.label : "";
  }
  if (c.type === "WIN_BACK") {
    d.inactiveDays = clampInt(cfg.inactiveDays, 7, 365, 30);
    d.channel = cfg.channel === "SMS" ? "SMS" : "OWNER_PUSH";
    d.message = typeof cfg.message === "string" ? cfg.message : "";
  }
  if (c.type === "SCHEDULED_BROADCAST") {
    d.message = typeof cfg.message === "string" ? cfg.message : "";
    const at = cfg.scheduledAt ? new Date(String(cfg.scheduledAt)) : null;
    if (at && !Number.isNaN(at.getTime()) && at.getTime() > Date.now()) {
      d.scheduledAt = toLocalInput(at);
    }
  }
  return d;
}

export function defaultLabel(d: Pick<CampaignDraft, "multiplier">) {
  return `${d.multiplier}x damga`;
}

/** Sunucuya giden tam config (PATCH config'i bütün olarak değiştirir) */
export function draftToConfig(
  d: CampaignDraft,
  base: Record<string, unknown> = {},
): Record<string, unknown> {
  const segmentId = d.segmentId || undefined;
  if (d.type === "MULTIPLIER") {
    const cfg: Record<string, unknown> = {
      ...base,
      multiplier: clampInt(d.multiplier, 2, 4, 2),
      daysOfWeek: [...d.daysOfWeek].sort(),
      label: d.label.trim().slice(0, 40) || defaultLabel(d),
      segmentId,
    };
    if (d.useHours && HHMM.test(d.startTime) && HHMM.test(d.endTime)) {
      cfg.startTime = d.startTime;
      cfg.endTime = d.endTime;
    } else {
      delete cfg.startTime;
      delete cfg.endTime;
    }
    return cfg;
  }
  if (d.type === "WIN_BACK") {
    return {
      ...base,
      inactiveDays: clampInt(d.inactiveDays, 7, 365, 30),
      channel: d.channel,
      message: d.message.trim().slice(0, WINBACK_MAX),
      segmentId,
    };
  }
  return {
    ...base,
    message: d.message.trim().slice(0, BROADCAST_MAX),
    scheduledAt: d.sendNow
      ? new Date().toISOString()
      : new Date(d.scheduledAt).toISOString(),
  };
}

/** Formdaki eksikler — boşsa kaydedilebilir */
export function validateDraft(d: CampaignDraft): string | null {
  if (!d.name.trim()) return "Kampanyaya bir ad verin.";
  if (d.type === "MULTIPLIER") {
    if (d.useHours && !(d.startTime < d.endTime))
      return "Bitiş saati başlangıçtan sonra olmalı.";
  }
  if (d.type === "WIN_BACK") {
    if (d.inactiveDays < 7 || d.inactiveDays > 365)
      return "Gün sayısı 7 ile 365 arasında olmalı.";
    if (d.channel === "SMS" && !d.message.trim())
      return "Müşterilere gidecek mesajı yazın.";
  }
  if (d.type === "SCHEDULED_BROADCAST") {
    if (!d.message.trim()) return "Gönderilecek mesajı yazın.";
    if (!d.sendNow) {
      const at = new Date(d.scheduledAt);
      if (Number.isNaN(at.getTime())) return "Gönderim zamanını seçin.";
      if (at.getTime() <= Date.now())
        return "Gönderim zamanı ileri bir tarih olmalı.";
    }
  }
  return null;
}

/** Hafta günlerini insan diliyle yaz */
export function describeDays(days: number[]): string {
  if (!days.length || days.length === 7) return "Her gün";
  const set = new Set(days);
  if (set.size === 5 && [1, 2, 3, 4, 5].every((x) => set.has(x)))
    return "Hafta içi her gün";
  if (set.size === 2 && set.has(0) && set.has(6)) return "Hafta sonları";
  const names = WEEK_ORDER.filter((x) => set.has(x)).map((x) => DAY_LONG[x]);
  if (names.length === 1) return `Her ${names[0]}`;
  return `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]} günleri`;
}

function formatWhen(iso: unknown): string | null {
  if (!iso) return null;
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tek cümlelik, teknik olmayan özet */
export function summarize(
  d: CampaignDraft,
  segmentName: string | null,
  opts?: { status?: CampaignStatus },
): string {
  if (d.type === "MULTIPLIER") {
    const who = segmentName ? `«${segmentName}» grubundaki müşteriler` : "tüm müşteriler";
    const hours = d.useHours ? ` ${d.startTime}–${d.endTime} arası` : "";
    return `${describeDays(d.daysOfWeek)}${hours} ${who} her alışverişte ${d.multiplier} kat damga kazanır.`;
  }
  if (d.type === "WIN_BACK") {
    const target = segmentName
      ? `«${segmentName}» grubunda ${d.inactiveDays} gündür gelmeyen müşteriler`
      : `${d.inactiveDays} gündür gelmeyen müşteriler`;
    return d.channel === "SMS"
      ? `Her sabah ${target} bulunur ve onlara SMS gönderilir.`
      : `Her sabah ${target} bulunur ve listesi size bildirim olarak gelir.`;
  }
  if (opts?.status === "ENDED") return "Duyuru gönderildi.";
  if (d.sendNow) return "Başlatınca kartı olan tüm müşterilere hemen gönderilir.";
  const when = formatWhen(new Date(d.scheduledAt).toISOString());
  return when
    ? `${when} tarihinde kartı olan tüm müşterilere gönderilir.`
    : "Gönderim zamanı seçilmedi.";
}

/** Liste için: kayıttan özet (duyuruda geçmiş zamanı da doğru yazar) */
export function summarizeCampaign(c: Campaign, segmentName: string | null) {
  if (c.type === "SCHEDULED_BROADCAST") {
    const msg = typeof c.config.message === "string" ? c.config.message.trim() : "";
    if (c.status === "ENDED") return "Duyuru gönderildi.";
    if (!msg) return "Mesaj henüz yazılmadı — düzenleyip tamamlayın.";
    const when = formatWhen(c.config.scheduledAt);
    return when
      ? `${when} tarihinde kartı olan tüm müşterilere gönderilir.`
      : "Gönderim zamanı seçilmedi.";
  }
  return summarize(draftFromCampaign(c), segmentName);
}

/** Duyuru açılmadan önce hazır mı? (boş mesaj veya geçmiş zaman = hemen gönderilir) */
export function broadcastReadiness(c: Campaign): "ok" | "empty" | "past" {
  if (c.type !== "SCHEDULED_BROADCAST") return "ok";
  const msg = typeof c.config.message === "string" ? c.config.message.trim() : "";
  if (!msg) return "empty";
  const at = c.config.scheduledAt ? new Date(String(c.config.scheduledAt)) : null;
  if (!at || Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) return "past";
  return "ok";
}

/** Bugün kasada geçerli olabilecek açık ekstra damga kampanyaları */
export function multipliersToday(rows: Campaign[]): Campaign[] {
  const today = new Date().getDay();
  return rows.filter((c) => {
    if (c.type !== "MULTIPLIER" || c.status !== "ACTIVE") return false;
    const days = Array.isArray(c.config.daysOfWeek)
      ? (c.config.daysOfWeek as number[])
      : [];
    return days.length === 0 || days.includes(today);
  });
}

/** Kasada görünen ad (yoksa kampanya adı) */
export function cashierLabel(c: Campaign): string {
  return typeof c.config.label === "string" && c.config.label ? c.config.label : c.name;
}

/** En yakın zamanlanmış (açık, gelecekteki) duyuru */
export function nextBroadcast(rows: Campaign[]): { campaign: Campaign; at: Date } | null {
  let best: { campaign: Campaign; at: Date } | null = null;
  const now = Date.now();
  for (const c of rows) {
    if (c.type !== "SCHEDULED_BROADCAST" || c.status !== "ACTIVE") continue;
    const at = c.config.scheduledAt ? new Date(String(c.config.scheduledAt)) : null;
    if (!at || Number.isNaN(at.getTime()) || at.getTime() <= now) continue;
    if (!best || at < best.at) best = { campaign: c, at };
  }
  return best;
}

/** «3 gün sonra», «yarın», «bugün 14:00» gibi kısa zaman yazısı */
export function relativeWhen(at: Date): string {
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(at) - startOf(now)) / 86_400_000);
  const time = at.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (days <= 0) return `Bugün ${time}`;
  if (days === 1) return `Yarın ${time}`;
  if (days < 7) return `${DAY_LONG[at.getDay()]} ${time}`;
  return at.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}
