import { resolveStampIconSrc } from '@ngl/shared';
import { presetIconSvg } from './stamp-presets';
export type InvitePolicy = { title: string; body: string };

/** Sayfa blokları — sahip panelden sürükleyip ekleyebilir */
export const INVITE_BLOCK_TYPES = [
  'card', 'text', 'image', 'spacer', 'divider', 'wallet', 'form', 'legal', 'policies',
] as const;
export type InviteBlockType = (typeof INVITE_BLOCK_TYPES)[number];
export type InviteBlock = { id: string; type: InviteBlockType; props: Record<string, unknown> };

const MAX_BLOCKS = 30;

function clampStr(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
}

/** Ham JSON'u güvenli bloklara çevirir; geçersiz ya da boşsa null (varsayılan düzen) */
export function sanitizeInviteLayout(raw: unknown): InviteBlock[] | null {
  if (!Array.isArray(raw)) return null;
  const out: InviteBlock[] = [];
  let hasWallet = false;
  for (const item of raw.slice(0, MAX_BLOCKS)) {
    if (!item || typeof item !== 'object') continue;
    const b = item as { id?: unknown; type?: unknown; props?: unknown };
    if (typeof b.type !== 'string' || !(INVITE_BLOCK_TYPES as readonly string[]).includes(b.type)) continue;
    const type = b.type as InviteBlockType;
    // Cüzdan düğmeleri ve form sayfada tek kez olabilir
    if (type === 'wallet') { if (hasWallet) continue; hasWallet = true; }
    const pr = (b.props && typeof b.props === 'object' ? b.props : {}) as Record<string, unknown>;
    const props: Record<string, unknown> = {};
    switch (type) {
      case 'card':
        props.headline = clampStr(pr.headline, 80);
        props.subtitle = clampStr(pr.subtitle, 160);
        props.statusText = clampStr(pr.statusText, 120);
        props.showLogo = pr.showLogo !== false;
        props.showDots = pr.showDots !== false;
        const hex = (v: unknown) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim() : null);
        props.bgColor = hex(pr.bgColor);
        props.fgColor = hex(pr.fgColor);
        const num = (v: unknown, min: number, max: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), min), max) : d; };
        props.logoWidth = num(pr.logoWidth, 40, 320, 150);
        props.logoHeight = num(pr.logoHeight, 16, 140, 40);
        props.logoUrl = clampStr(pr.logoUrl, 500) && /^https?:\/\//i.test(String(pr.logoUrl)) ? clampStr(pr.logoUrl, 500) : null;
        break;
      case 'text':
        props.text = clampStr(pr.text, 600) ?? '';
        props.align = pr.align === 'center' ? 'center' : 'left';
        props.size = pr.size === 'lg' ? 'lg' : pr.size === 'sm' ? 'sm' : 'md';
        break;
      case 'image': {
        const url = clampStr(pr.url, 500);
        props.url = url && /^https?:\/\//i.test(url) ? url : null;
        const h = Number(pr.height);
        props.height = Number.isFinite(h) ? Math.min(Math.max(Math.round(h), 40), 400) : 160;
        break;
      }
      case 'spacer': {
        const h = Number(pr.height);
        props.height = Number.isFinite(h) ? Math.min(Math.max(Math.round(h), 4), 160) : 24;
        break;
      }
      case 'wallet':
        props.ctaHint = clampStr(pr.ctaHint, 160);
        break;
      case 'legal':
        props.text = clampStr(pr.text, 1000);
        break;
      case 'policies':
        props.items = Array.isArray(pr.items)
          ? pr.items
              .slice(0, 8)
              .map((x: unknown) => {
                const o = (x && typeof x === 'object' ? x : {}) as { title?: unknown; body?: unknown };
                return { title: clampStr(o.title, 60) ?? '', body: clampStr(o.body, 12000) ?? '' };
              })
              .filter((x) => x.title && x.body)
          : null;
        break;
      default:
        break;
    }
    out.push({
      id: clampStr(b.id, 40) ?? `${type}-${out.length}`,
      type,
      props,
    });
  }
  return out.length ? out : null;
}

/** Varsayılan düzen: mevcut sayfanın birebir karşılığı */
export const DEFAULT_INVITE_LAYOUT: InviteBlock[] = [
  { id: 'card', type: 'card', props: { showLogo: true, showDots: true } },
  { id: 'form', type: 'form', props: {} },
  { id: 'wallet', type: 'wallet', props: {} },
  { id: 'legal', type: 'legal', props: {} },
  { id: 'policies', type: 'policies', props: {} },
];

export type InviteLocale = 'tr' | 'en';

export type InviteWalletCard = {
  programId: string;
  name: string;
  type: string;
  typeLabel: string;
  summary: string;
  appleDownloadUrl: string | null;
  googleSaveUrl?: string | null;
};

export type InvitePageRenderData = {
  token: string;
  tenantName: string;
  logoText: string | null;
  logoUrl: string | null;
  primaryColor: string;
  foregroundColor: string;
  inviteHeadline: string | null;
  inviteSubtitle: string | null;
  inviteCtaHint: string | null;
  inviteBgColor: string | null;
  inviteCardColor: string | null;
  inviteStatusText: string | null;
  inviteAppleBtnLabel: string | null;
  inviteGoogleBtnLabel: string | null;
  inviteFormTitle: string | null;
  inviteLegalText: string | null;
  invitePolicies: InvitePolicy[];
  stampCount: number;
  stampsRequired: number;
  rewardLabel: string;
  rewardReady: boolean;
  appleAvailable: boolean;
  googleSaveUrl: string | null;
  appleDownloadUrl: string | null;
  walletCards?: InviteWalletCard[];
  profileComplete: boolean;
  collect: { name: boolean; birthday: boolean };
  profile: {
    displayName: string;
    birthMonth: number | null;
    birthDay: number | null;
  };
  locale: InviteLocale;
  /** Sahibin tanımladığı blok düzeni (yoksa varsayılan) */
  layout?: unknown;
  stampIconFilledUrl?: string | null;
  stampIconEmptyUrl?: string | null;
  stampTheme?: string | null;
  /** Cihaz OS — apple | google | both */
  platform: InvitePlatform;
  /** Owner önizleme — Wallet indirimi kapalı, banner göster */
  isPreview?: boolean;
};

export type InvitePlatform = 'apple' | 'google' | 'both';

type InviteStrings = {
  pageTitleSuffix: string;
  previewBanner: string;
  defaultSubtitle: (reward: string) => string;
  defaultCta: string;
  statusReady: string;
  statusContinue: string;
  appleBtn: string;
  googleBtn: string;
  formTitle: string;
  yourName: string;
  namePlaceholder: string;
  birthMonth: string;
  birthDay: string;
  month: string;
  day: string;
  birthdayHint: string;
  saveContinue: string;
  saveFailed: string;
  fieldsMissing: string;
  nameShort: string;
  birthdayMissing: string;
  appleUnavailable: string;
  googleUnavailable: string;
  cardsTitle: string;
  addAllApple: string;
  addCardApple: string;
  close: string;
  policiesLabel: string;
  defaultLegal: string;
  months: string[];
};

const STRINGS: Record<InviteLocale, InviteStrings> = {
  tr: {
    pageTitleSuffix: 'Damga Kartı',
    previewBanner: 'Önizleme — müşterinin göreceği SMS davet sayfası',
    defaultSubtitle: (reward) => `Dijital damga kartı · ${reward}`,
    defaultCta: 'Kartını Wallet’a ekle — uygulama indirmene gerek yok.',
    statusReady: 'Ödül hazır!',
    statusContinue: 'Damgalarını tamamla, ödülünü kap.',
    appleBtn: 'Apple Wallet’a Ekle',
    googleBtn: 'Google Wallet’a Ekle',
    formTitle: 'Kartını eklemeden önce',
    yourName: 'Adınız',
    namePlaceholder: 'Örn. Ayşe',
    birthMonth: 'Doğum ayı',
    birthDay: 'Gün',
    month: 'Ay',
    day: 'Gün',
    birthdayHint: 'Yıl sormuyoruz — sadece doğum günü sürprizi için.',
    saveContinue: 'Kaydet ve devam et',
    saveFailed: 'Kayıt başarısız',
    fieldsMissing: 'Devam etmek için lütfen eksik alanları doldurun.',
    nameShort: 'Adınız en az 2 karakter olmalı.',
    birthdayMissing: 'Doğum ayı ve günü seçin.',
    appleUnavailable: 'Apple Wallet şu an yapılandırılmamış.',
    googleUnavailable: 'Google Wallet şu an yapılandırılmamış.',
    cardsTitle: 'Kartlarınız',
    addAllApple: 'Tümünü Apple Wallet’a ekle',
    addCardApple: 'Ekle',
    close: 'Kapat',
    policiesLabel: 'Politikalar',
    defaultLegal:
      'KVKK: Bu sayfa sadakat kartı ekleme davetidir. Girdiğiniz bilgiler yalnızca bu kafe sadakat programı içindir.\nDamga sonrası Wallet güncellemesi için kartı buradan eklemiş olmanız gerekir.',
    months: [
      '',
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık',
    ],
  },
  en: {
    pageTitleSuffix: 'Stamp Card',
    previewBanner: 'Preview — the SMS invite page your customers will see',
    defaultSubtitle: (reward) => `Digital stamp card · ${reward}`,
    defaultCta: 'Add your card to Wallet — no app download needed.',
    statusReady: 'Reward ready!',
    statusContinue: 'Collect stamps and claim your reward.',
    appleBtn: 'Add to Apple Wallet',
    googleBtn: 'Add to Google Wallet',
    formTitle: 'Before you add your card',
    yourName: 'Your name',
    namePlaceholder: 'e.g. Alex',
    birthMonth: 'Birth month',
    birthDay: 'Day',
    month: 'Month',
    day: 'Day',
    birthdayHint: 'We don’t ask for the year — only for a birthday surprise.',
    saveContinue: 'Save and continue',
    saveFailed: 'Could not save',
    fieldsMissing: 'Please fill in the missing fields to continue.',
    nameShort: 'Your name must be at least 2 characters.',
    birthdayMissing: 'Please choose your birth month and day.',
    appleUnavailable: 'Apple Wallet is not configured yet.',
    googleUnavailable: 'Google Wallet is not configured yet.',
    cardsTitle: 'Your cards',
    addAllApple: 'Add all to Apple Wallet',
    addCardApple: 'Add',
    close: 'Close',
    policiesLabel: 'Policies',
    defaultLegal:
      'Privacy: This page invites you to add a loyalty stamp card. The information you enter is used only for this café’s loyalty program.\nWallet updates after stamps require adding the card from this page.',
    months: [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  },
};

/**
 * Cihaz / tarayıcı dilini çöz.
 * `?lang=tr|en` varsa onu kullan; yoksa Accept-Language.
 * Türkçe yoksa İngilizce (uluslararası cihazlar).
 */
export function resolveInviteLocale(
  acceptLanguage?: string | null,
  queryLang?: string | null,
): InviteLocale {
  const q = (queryLang || '').trim().toLowerCase();
  if (q === 'tr' || q === 'en') return q;

  const header = (acceptLanguage || '').trim();
  if (!header) return 'tr';

  const ranked = header
    .split(',')
    .map((part) => {
      const [tagRaw, ...params] = part.trim().split(';');
      const tag = (tagRaw || '').trim().toLowerCase();
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const quality = qParam ? Number(qParam.split('=')[1]) : 1;
      return { tag, quality: Number.isFinite(quality) ? quality : 1 };
    })
    .filter((p) => p.tag)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    if (tag.startsWith('tr')) return 'tr';
    if (tag.startsWith('en')) return 'en';
  }
  return 'en';
}

/**
 * User-Agent → hangi Wallet butonu.
 * iOS / Mac → Apple · Android → Google · bilinmeyen masaüstü → ikisi
 */
export function resolveInvitePlatform(
  userAgent?: string | null,
): InvitePlatform {
  const ua = (userAgent || '').toLowerCase();
  if (!ua) return 'both';

  // iPhone / iPod
  if (/iphone|ipod/.test(ua)) return 'apple';
  // iPad (eski UA) veya iPadOS 13+ (Macintosh + Mobile)
  if (/ipad/.test(ua)) return 'apple';
  if (/macintosh/.test(ua) && (/mobile/.test(ua) || /touch/.test(ua))) {
    return 'apple';
  }
  if (/android/.test(ua)) return 'google';
  // masaüstü Mac → Apple Wallet
  if (/macintosh|mac os x/.test(ua)) return 'apple';
  // Windows / Linux / ChromeOS → Google Wallet
  if (/windows|linux|cros|crimson/.test(ua)) return 'google';
  return 'both';
}

export function parseInvitePolicies(raw: unknown): InvitePolicy[] {
  if (!Array.isArray(raw)) return [];
  const out: InvitePolicy[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const title = String((item as { title?: unknown }).title ?? '').trim();
    const body = String((item as { body?: unknown }).body ?? '').trim();
    if (!title || !body) continue;
    out.push({ title: title.slice(0, 80), body: body.slice(0, 12000) });
    if (out.length >= 8) break;
  }
  return out;
}

/** Inline marka logoları (Apple + Google “G”) */
const APPLE_LOGO_SVG = `<svg class="btn-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/></svg>`;

const GOOGLE_LOGO_SVG = `<svg class="btn-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>`;

export function renderInviteHtml(data: InvitePageRenderData): string {
  const t = STRINGS[data.locale] ?? STRINGS.tr;
  const color = data.inviteCardColor || data.primaryColor;
  const fg = data.foregroundColor;
  const pageBg = data.inviteBgColor || '#0f1412';
  // Owner metinleri birebir; boşsa dile göre varsayılan
  const headline =
    data.inviteHeadline || data.logoText || data.tenantName;
  const subtitle =
    data.inviteSubtitle || t.defaultSubtitle(data.rewardLabel);
  const ctaHint = data.inviteCtaHint || t.defaultCta;
  const statusLine =
    data.inviteStatusText ||
    (data.rewardReady ? t.statusReady : t.statusContinue);
  const appleLabel = data.inviteAppleBtnLabel || t.appleBtn;
  const googleLabel = data.inviteGoogleBtnLabel || t.googleBtn;
  const formTitle = data.inviteFormTitle || t.formTitle;
  const legalText = (data.inviteLegalText || t.defaultLegal).trim();
  const preview = Boolean(data.isPreview);
  // Önizlemede owner her iki butonu da görsün; gerçek müşteride OS’e göre
  const platform: InvitePlatform = preview ? 'both' : data.platform || 'both';
  const showApple = platform === 'apple' || platform === 'both';
  const showGoogle = platform === 'google' || platform === 'both';
  const needsForm =
    (data.collect.name || data.collect.birthday) &&
    (!data.profileComplete || preview);

  const logoBlock = data.logoUrl
    ? `<img class="logo" src="${escapeHtml(data.logoUrl)}" alt="" />`
    : '';

  const previewBanner = preview
    ? `<div class="preview-banner">${escapeHtml(t.previewBanner)}</div>`
    : '';

  const walletCards = data.walletCards ?? [];
  const multiApple =
    walletCards.length > 1 &&
    walletCards.some((c) => c.appleDownloadUrl);

  let appleBtn = '';
  let googleBtn = '';
  let multiCardBlock = '';
  const appleInner = `${APPLE_LOGO_SVG}<span>${escapeHtml(appleLabel)}</span>`;
  const googleInner = `${GOOGLE_LOGO_SVG}<span>${escapeHtml(googleLabel)}</span>`;
  if (preview) {
    appleBtn = `<span class="btn apple disabled" data-wallet="apple">${appleInner}</span>`;
    googleBtn = `<span class="btn google disabled" data-wallet="google">${googleInner}</span>`;
    if (walletCards.length > 1) {
      multiCardBlock = `<div class="card-list preview-list">${walletCards
        .map(
          (c) =>
            `<div class="wallet-card-row"><div><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.typeLabel)} · ${escapeHtml(c.summary)}</span></div><span class="btn apple disabled">${escapeHtml(t.addCardApple)}</span></div>`,
        )
        .join('')}</div>`;
    }
  } else if (data.profileComplete) {
    if (multiApple && showApple) {
      const appleLinks = walletCards
        .filter((c) => c.appleDownloadUrl)
        .map((c) => c.appleDownloadUrl!);
      multiCardBlock = `<div class="card-list">
        <p class="cards-title">${escapeHtml(t.cardsTitle)}</p>
        ${walletCards
          .map((c) =>
            c.appleDownloadUrl
              ? `<div class="wallet-card-row"><div><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.typeLabel)} · ${escapeHtml(c.summary)}</span></div><a class="btn apple card-add" data-wallet="apple" href="${escapeHtml(c.appleDownloadUrl)}">${escapeHtml(t.addCardApple)}</a></div>`
              : '',
          )
          .join('')}
        <button type="button" class="btn apple" id="add-all-apple" data-wallet="apple">${APPLE_LOGO_SVG}<span>${escapeHtml(t.addAllApple)}</span></button>
        <script type="application/json" id="apple-links">${JSON.stringify(appleLinks).replace(/</g, '\\u003c')}</script>
      </div>`;
    } else if (showApple) {
      appleBtn = data.appleDownloadUrl
        ? `<a class="btn apple" data-wallet="apple" href="${escapeHtml(data.appleDownloadUrl)}">${appleInner}</a>`
        : data.appleAvailable
          ? ''
          : `<p class="muted" data-wallet="apple">${escapeHtml(t.appleUnavailable)}</p>`;
    }
    if (showGoogle && !multiApple) {
      googleBtn = data.googleSaveUrl
        ? `<a class="btn google" data-wallet="google" href="${escapeHtml(data.googleSaveUrl)}">${googleInner}</a>`
        : `<p class="muted" data-wallet="google">${escapeHtml(t.googleUnavailable)}</p>`;
    }
  }

  const nameField = data.collect.name
    ? `<label>${escapeHtml(t.yourName)}<input name="displayName" ${preview ? 'disabled' : 'required'} minlength="2" maxlength="80" value="${escapeHtml(data.profile.displayName)}" placeholder="${escapeHtml(t.namePlaceholder)}" /></label>`
    : '';

  const bdayField = data.collect.birthday
    ? `<div class="row">
        <label>${escapeHtml(t.birthMonth)}
          <select name="birthMonth" ${preview ? 'disabled' : 'required'}>
            <option value="">${escapeHtml(t.month)}</option>
            ${monthOptions(data.profile.birthMonth, t.months)}
          </select>
        </label>
        <label>${escapeHtml(t.birthDay)}
          <select name="birthDay" ${preview ? 'disabled' : 'required'}>
            <option value="">${escapeHtml(t.day)}</option>
            ${dayOptions(data.profile.birthDay)}
          </select>
        </label>
      </div>
      <p class="hint">${escapeHtml(t.birthdayHint)}</p>`
    : '';

  const formBlock = needsForm
    ? `<form id="profile-form" class="form" novalidate>
        <p class="form-title">${escapeHtml(formTitle)}</p>
        ${nameField}
        ${bdayField}
        ${
          preview
            ? `<button type="button" class="btn save" disabled>${escapeHtml(t.saveContinue)}</button>`
            : `<button type="submit" class="btn save">${escapeHtml(t.saveContinue)}</button>`
        }
        <p id="form-error" class="error" hidden></p>
      </form>`
    : '';

  const showActions = data.profileComplete || preview;
  const actionsBlock = showActions
    ? `<div class="actions" id="wallet-actions">
        <p class="cta-hint">${escapeHtml(ctaHint)}</p>
        ${multiCardBlock}
        ${appleBtn}
        ${googleBtn}
      </div>`
    : `<div class="actions" id="wallet-actions" hidden></div>`;

  const addAllScript =
    !preview && multiApple
      ? `<script>
(function () {
  var btn = document.getElementById('add-all-apple');
  var raw = document.getElementById('apple-links');
  if (!btn || !raw) return;
  btn.addEventListener('click', function () {
    var links = [];
    try { links = JSON.parse(raw.textContent || '[]'); } catch (e) { return; }
    if (!links.length) return;
    var i = 0;
    function next() {
      if (i >= links.length) return;
      var a = document.createElement('a');
      a.href = links[i++];
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (i < links.length) setTimeout(next, 1400);
    }
    next();
  });
})();
</script>`
      : '';

  const renderPolicies = (policyList: InvitePolicy[]): string =>
    policyList.length > 0
      ? `<nav class="policies" aria-label="${escapeHtml(t.policiesLabel)}">
        ${policyList
          .map(
            (p, i) =>
              `<button type="button" class="policy-link" data-policy-open="${i}">${escapeHtml(p.title)}</button>`,
          )
          .join('<span class="policy-sep">·</span>')}
      </nav>
      <div id="policy-modal" class="policy-modal" hidden>
        <div class="policy-modal-backdrop" data-policy-close></div>
        <div class="policy-modal-sheet" role="dialog" aria-modal="true">
          <div class="policy-modal-head">
            <h2 id="policy-modal-title"></h2>
            <button type="button" class="policy-modal-x" data-policy-close aria-label="${escapeHtml(t.close)}">×</button>
          </div>
          <div id="policy-modal-body" class="policy-modal-body"></div>
        </div>
      </div>
      <script type="application/json" id="policy-data">${JSON.stringify(policyList).replace(/</g, '\\u003c')}</script>`
      : '';
  const policiesHtml = renderPolicies(data.invitePolicies);

  const policyModalScript =
    data.invitePolicies.length > 0
      ? `<script>
(function () {
  var modal = document.getElementById('policy-modal');
  var titleEl = document.getElementById('policy-modal-title');
  var bodyEl = document.getElementById('policy-modal-body');
  var raw = document.getElementById('policy-data');
  if (!modal || !raw) return;
  var policies = [];
  try { policies = JSON.parse(raw.textContent || '[]'); } catch (e) { return; }
  function openPolicy(i) {
    var p = policies[i];
    if (!p) return;
    titleEl.textContent = p.title || '';
    bodyEl.textContent = p.body || '';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closePolicy() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }
  document.querySelectorAll('[data-policy-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openPolicy(Number(btn.getAttribute('data-policy-open')));
    });
  });
  document.querySelectorAll('[data-policy-close]').forEach(function (el) {
    el.addEventListener('click', closePolicy);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closePolicy();
  });
})();
</script>`
      : '';

  const saveFailedMsg = JSON.stringify(t.saveFailed);
  const scriptBlock =
    preview || !needsForm
      ? ''
      : `<script>
    (function () {
      var form = document.getElementById('profile-form');
      if (!form) return;
      var err = document.getElementById('form-error');
      var saveFailed = ${saveFailedMsg};
      var msgs = ${JSON.stringify({ nameShort: t.nameShort, birthdayMissing: t.birthdayMissing, fieldsMissing: t.fieldsMissing })};
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        err.hidden = true;
        // Tarayıcının doğrulama balonu mobilde görünmeyebiliyor; hatayı kendimiz gösteriyoruz
        var nameEl = form.querySelector('input[name="displayName"]');
        var monthEl = form.querySelector('select[name="birthMonth"]');
        var dayEl = form.querySelector('select[name="birthDay"]');
        var problem = null, target = null;
        if (nameEl && (nameEl.value || '').trim().length < 2) { problem = msgs.nameShort; target = nameEl; }
        else if (monthEl && !monthEl.value) { problem = msgs.birthdayMissing; target = monthEl; }
        else if (dayEl && !dayEl.value) { problem = msgs.birthdayMissing; target = dayEl; }
        if (problem) {
          err.textContent = problem;
          err.hidden = false;
          if (target) { target.focus(); target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          return;
        }
        var fd = new FormData(form);
        var payload = {};
        if (fd.has('displayName')) payload.displayName = String(fd.get('displayName') || '').trim();
        if (fd.has('birthMonth')) payload.birthMonth = Number(fd.get('birthMonth'));
        if (fd.has('birthDay')) payload.birthDay = Number(fd.get('birthDay'));
        fetch('/wallet/invite/${escapeHtml(data.token)}/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept-Language': document.documentElement.lang || '${data.locale}'
          },
          body: JSON.stringify(payload),
        }).then(function (res) {
          return res.json().then(function (body) {
            if (!res.ok) {
              var msg = body && body.message;
              throw new Error(Array.isArray(msg) ? msg.join(', ') : (msg || saveFailed));
            }
            return body;
          });
        }).then(function () {
          window.location.reload();
        }).catch(function (ex) {
          err.textContent = ex.message || saveFailed;
          err.hidden = false;
        });
      });
    })();
  </script>`;

  // Cihaz dili SSR'dan farklıysa bir kez ?lang= ile hizala (navigator = sistem dili)
  const localeSyncScript = `<script>
(function () {
  try {
    if (location.search.indexOf('lang=') !== -1) return;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    var want = String(nav).toLowerCase().indexOf('tr') === 0 ? 'tr' : 'en';
    if (want === '${data.locale}') return;
    var u = new URL(location.href);
    u.searchParams.set('lang', want);
    location.replace(u.toString());
  } catch (e) {}
})();
</script>`;

  // Client-side OS doğrulama (SSR User-Agent bazen eksik kalır)
  const platformRefineScript = preview
    ? ''
    : `<script>
(function () {
  try {
    var ua = navigator.userAgent || '';
    var isIOS = /iPhone|iPod|iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/i.test(ua);
    var isMac = /Macintosh|Mac OS X/i.test(ua) && !isIOS;
    var showApple = isIOS || isMac || (!isAndroid && !isIOS && !isMac && !/Windows|Linux|CrOS/i.test(ua));
    var showGoogle = isAndroid || /Windows|Linux|CrOS/i.test(ua) || (!isIOS && !isMac && !isAndroid);
    // Çakışma: iOS/Mac → sadece Apple; Android → sadece Google
    if (isIOS || isMac) { showApple = true; showGoogle = false; }
    if (isAndroid) { showApple = false; showGoogle = true; }
    document.querySelectorAll('[data-wallet="apple"]').forEach(function (el) {
      el.hidden = !showApple;
      if (!showApple) el.style.display = 'none';
    });
    document.querySelectorAll('[data-wallet="google"]').forEach(function (el) {
      el.hidden = !showGoogle;
      if (!showGoogle) el.style.display = 'none';
    });
  } catch (e) {}
})();
</script>`;

  const previewSuffix = preview
    ? data.locale === 'en'
      ? ' (Preview)'
      : ' (Önizleme)'
    : '';

  const dotCount = Math.min(Math.max(data.stampsRequired, 1), 20);
  const filledIcon = data.stampIconFilledUrl ? escapeHtml(data.stampIconFilledUrl) : '';
  const emptyIcon = data.stampIconEmptyUrl ? escapeHtml(data.stampIconEmptyUrl) : '';
  // Kartın kendi damga görseli varsa onu, yoksa varsayılan daireleri kullan
  const themeName = (data.stampTheme || 'COFFEE').toUpperCase();
  const dotsFor = (fg: string) =>
    Array.from({ length: dotCount }, (_, i) => {
      const on = i < data.stampCount;
      if (on && filledIcon) return `<span class="dot on dot-img"><img src="${filledIcon}" alt="" /></span>`;
      if (!on && emptyIcon) return `<span class="dot dot-img"><img src="${emptyIcon}" alt="" /></span>`;
      // Hazır tema: cüzdan kartıyla aynı 3D görsel; yoksa çizim
      const src = resolveStampIconSrc(themeName, on);
      if (src) return `<span class="dot dot-img${on ? ' on' : ''}"><img src="${escapeHtml(src)}" alt="" /></span>`;
      const svg = presetIconSvg(themeName, on, fg);
      return `<span class="dot dot-svg${on ? ' on' : ''}"><svg viewBox="0 0 64 64" aria-hidden="true">${svg}</svg></span>`;
    }).join('');
  const customLayout = sanitizeInviteLayout(data.layout) !== null;
  const layout = sanitizeInviteLayout(data.layout) ?? DEFAULT_INVITE_LAYOUT;
  const hasWallet = layout.some((b) => b.type === 'wallet');
  const str = (v: unknown, fallback: string) =>
    typeof v === 'string' && v ? v : fallback;

  const renderBlock = (b: InviteBlock): string => {
    const p = b.props;
    switch (b.type) {
      case 'card': {
        const showLogo = p.showLogo !== false;
        const showDots = p.showDots !== false;
        const cardLogo = typeof p.logoUrl === 'string' && p.logoUrl
          ? `<img class="logo" src="${escapeHtml(p.logoUrl)}" alt="" />`
          : logoBlock;
        const sized = `<img class="logo" style="width:${Number(p.logoWidth) || 150}px;height:${Number(p.logoHeight) || 40}px" src="${escapeHtml(typeof p.logoUrl === 'string' && p.logoUrl ? p.logoUrl : (data.logoUrl ?? ''))}" alt="" />`;
        const logoOut = data.logoUrl || (typeof p.logoUrl === 'string' && p.logoUrl) ? sized : '';
        const cardStyle = [
          p.bgColor ? `background:${escapeHtml(String(p.bgColor))}` : '',
          p.fgColor ? `color:${escapeHtml(String(p.fgColor))}` : '',
        ].filter(Boolean).join(';');
        // Özel düzende boş alan hiç gösterilmez; varsayılan düzende genel ayarlar kullanılır
        const pick = (v: unknown, fallback: string) =>
          customLayout ? (typeof v === 'string' ? v.trim() : '') : str(v, fallback).trim();
        const hl = pick(p.headline, headline);
        const sub = pick(p.subtitle, subtitle);
        const status = pick(p.statusText, statusLine);
        return `<div class="card"${cardStyle ? ` style="${cardStyle}"` : ''}>
      ${showLogo ? logoOut || cardLogo : ''}
      ${hl ? `<h1>${escapeHtml(hl)}</h1>` : ''}
      ${sub ? `<div class="meta">${escapeHtml(sub)}</div>` : ''}
      ${showDots ? `<div class="dots" aria-hidden="true">${dotsFor(String(p.fgColor || fg || '#FFFFFF'))}</div>` : ''}
      <div class="stamp">${data.stampCount} / ${data.stampsRequired}</div>
      ${status ? `<div class="meta">${escapeHtml(status)}</div>` : ''}
    </div>`;
      }
      case 'text': {
        const align = p.align === 'center' ? 'center' : 'left';
        const size = p.size === 'lg' ? '1.15rem' : p.size === 'sm' ? '.85rem' : '1rem';
        return `<div class="block-text" style="text-align:${align};font-size:${size}">${escapeHtml(String(p.text ?? '')).replace(/\n/g, '<br/>')}</div>`;
      }
      case 'image':
        return p.url
          ? `<div class="block-image" style="height:${Number(p.height) || 160}px"><img src="${escapeHtml(String(p.url))}" alt="" /></div>`
          : '';
      case 'spacer':
        return `<div style="height:${Number(p.height) || 24}px" aria-hidden="true"></div>`;
      case 'divider':
        return '<hr class="block-divider" />';
      case 'wallet':
        if (!showActions) return '';
        return `<div class="actions" id="wallet-actions">
        <p class="cta-hint">${escapeHtml(str(p.ctaHint, ctaHint))}</p>
        ${multiCardBlock}
        ${appleBtn}
        ${googleBtn}
      </div>`;
      case 'form':
        return formBlock;
      case 'legal':
        return `<p class="note">${escapeHtml(str(p.text, legalText)).replace(/\n/g, '<br/>')}</p>`;
      case 'policies':
        return Array.isArray(p.items) && p.items.length
          ? renderPolicies(p.items as InvitePolicy[])
          : policiesHtml;
      default:
        return '';
    }
  };

  const blocksHtml =
    layout.map(renderBlock).join('\n') +
    (hasWallet ? '' : `<div class="actions" id="wallet-actions" hidden></div>`);

  return `<!doctype html>
<html lang="${data.locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.tenantName)} — ${escapeHtml(t.pageTitleSuffix)}${previewSuffix}</title>
  ${localeSyncScript}
  <style>
    :root { color-scheme: dark; --radius: 20px; }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(120% 80% at 50% -10%, ${escapeHtml(pageBg)}, #0b0f0d 70%);
      color: #f4f4f4; min-height: 100vh; -webkit-font-smoothing: antialiased;
    }
    .preview-banner { background: #f59e0b; color: #1a1a1a; text-align: center; font-size: .8rem; font-weight: 600; padding: 10px 12px; }
    .wrap { width: 100%; max-width: 460px; margin: 0 auto; padding: 20px 16px 40px; }
    @media (min-width: 640px) { .wrap { padding: 40px 24px 56px; } }

    .lang-switch { display: inline-flex; gap: 2px; padding: 3px; border-radius: 999px; background: rgba(255,255,255,.08); margin: 0 0 16px auto; width: max-content; }
    .lang-switch { display: flex; justify-content: flex-end; }
    .lang-switch a { color: rgba(255,255,255,.6); font-size: .75rem; text-decoration: none; font-weight: 600; padding: 5px 11px; border-radius: 999px; }
    .lang-switch a.active { background: #fff; color: #111; }

    .card {
      position: relative; overflow: hidden;
      background: ${escapeHtml(color)}; color: ${escapeHtml(fg)};
      border-radius: var(--radius); padding: 24px;
      box-shadow: 0 18px 50px rgba(0,0,0,.35);
    }
    .card::after { content: ""; position: absolute; inset: auto -40% -60% auto; width: 240px; height: 240px; border-radius: 50%; background: rgba(255,255,255,.08); pointer-events: none; }
    .logo { display: block; height: 40px; width: auto; max-width: 100%; margin: 0 0 14px; object-fit: contain; object-position: left center; }
    h1 { font-size: clamp(1.25rem, 4.5vw, 1.5rem); margin: 0 0 6px; letter-spacing: -0.02em; line-height: 1.2; }
    .meta { opacity: .88; font-size: .92rem; line-height: 1.45; }
    .stamp { font-size: clamp(1.9rem, 8vw, 2.4rem); font-weight: 750; margin: 18px 0 10px; letter-spacing: -0.03em; }
    .dots { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0 16px; width: 100%; }
    .dot-img img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }
    .dot-svg { border: none; background: transparent; padding: 0; opacity: 1; }
    .dot-svg svg { width: 100%; height: 100%; display: block; }
    .dot-img { padding: 0; overflow: hidden; border: none; background: transparent; }
    .dot { aspect-ratio: 1; border-radius: 50%; border: 1.5px dashed rgba(255,255,255,.55); display: grid; place-items: center; font-size: .7rem; font-weight: 700; opacity: .8; }
    .dot.on { background: #fff; color: ${escapeHtml(color)}; border: 1.5px solid #fff; opacity: 1; }

    .actions, .form { display: grid; gap: 12px; margin-top: 22px; }
    .cta-hint { margin: 0 0 2px; font-size: .9rem; opacity: .75; line-height: 1.45; }
    .btn { display: flex; align-items: center; justify-content: center; gap: 10px; text-align: center; text-decoration: none; min-height: 52px; padding: 14px 16px; border-radius: 14px; font-weight: 600; border: none; cursor: pointer; font-size: 1rem; width: 100%; font-family: inherit; transition: transform .15s ease, opacity .15s ease; }
    .btn:active { transform: scale(.985); }
    .btn-logo { width: 22px; height: 22px; flex-shrink: 0; display: block; }
    .btn.apple { background: #000; color: #fff; border: 1px solid #333; }
    .btn.google { background: #fff; color: #1f1f1f; border: 1px solid #dadce0; }
    .btn.save { background: #fff; color: #111; }
    .btn.disabled { opacity: .85; cursor: default; pointer-events: none; }
    .card-list { display: grid; gap: 10px; width: 100%; }
    .cards-title { margin: 0 0 2px; font-size: .78rem; font-weight: 600; opacity: .85; text-transform: uppercase; letter-spacing: .08em; }
    .wallet-card-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); }
    .wallet-card-row strong { display: block; font-size: .95rem; }
    .wallet-card-row span { display: block; font-size: .78rem; opacity: .7; margin-top: 2px; }
    .btn.card-add { width: auto; min-height: 40px; padding: 8px 14px; font-size: .85rem; flex-shrink: 0; }
    .muted { opacity: .7; font-size: .9rem; }
    .note { margin-top: 26px; font-size: .78rem; opacity: .6; line-height: 1.5; white-space: pre-wrap; }

    .form { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); border-radius: var(--radius); padding: 18px; }
    .form-title { font-weight: 650; margin: 0 0 2px; font-size: 1rem; }
    label { display: grid; gap: 6px; font-size: .85rem; opacity: .92; }
    input, select {
      width: 100%; min-height: 48px; padding: 12px 14px; border-radius: 12px;
      border: 1px solid rgba(255,255,255,.16); background: rgba(0,0,0,.3); color: #fff;
      font-size: 16px; /* iOS yakınlaştırmasını önler */ font-family: inherit; outline: none;
    }
    input:focus, select:focus { border-color: ${escapeHtml(color)}; box-shadow: 0 0 0 3px rgba(255,255,255,.12); }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .hint { font-size: .75rem; opacity: .6; margin: 0; }
    .error { color: #ffb4a8; font-size: .85rem; margin: 0; }
    .policies { margin-top: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 6px; }
    .policy-link { background: none; border: none; padding: 4px 0; color: rgba(255,255,255,.7); font-size: .8rem; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; font-family: inherit; }
    .policy-link:hover { color: #fff; }
    .policy-sep { color: rgba(255,255,255,.35); font-size: .8rem; user-select: none; }
    .policy-modal { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; padding: 12px; }
    .policy-modal[hidden] { display: none !important; }
    .policy-modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.6); }
    .policy-modal-sheet { position: relative; width: 100%; max-width: 480px; max-height: min(78vh, 600px); overflow: auto; background: #161b18; color: #f4f4f4; border-radius: 20px; border: 1px solid rgba(255,255,255,.12); box-shadow: 0 20px 50px rgba(0,0,0,.5); padding: 18px 18px 24px; }
    .policy-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .policy-modal-head h2 { margin: 0; font-size: 1.05rem; line-height: 1.3; }
    .policy-modal-x { background: rgba(255,255,255,.08); border: none; color: #fff; width: 36px; height: 36px; border-radius: 999px; font-size: 1.25rem; line-height: 1; cursor: pointer; flex-shrink: 0; }
    .policy-modal-body { font-size: .9rem; line-height: 1.6; opacity: .9; white-space: pre-wrap; }
    .block-text { margin: 18px 4px 0; line-height: 1.55; }
    .block-image { margin: 18px 0 0; border-radius: 16px; overflow: hidden; background: rgba(255,255,255,.04); }
    .block-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .block-divider { border: 0; border-top: 1px solid rgba(255,255,255,.12); margin: 22px 0; }
    .wrap > * + * { margin-top: 0; }
    [data-wallet][hidden] { display: none !important; }
    @media (min-width: 480px) {
      .policy-modal { align-items: center; }
      .actions.two { grid-template-columns: 1fr 1fr; }
    }
    @media (prefers-reduced-motion: reduce) { .btn { transition: none; } }
  </style>
</head>
<body>
  ${previewBanner}
  <div class="wrap">
    <div class="lang-switch">
      <a href="?lang=tr" class="${data.locale === 'tr' ? 'active' : ''}">TR</a>
      <a href="?lang=en" class="${data.locale === 'en' ? 'active' : ''}">EN</a>
    </div>
    ${blocksHtml}
  </div>
  ${platformRefineScript}
  ${addAllScript}
  ${policyModalScript}
  ${scriptBlock}
</body>
</html>`;
}

function monthOptions(selected: number | null, months: string[]): string {
  let html = '';
  for (let m = 1; m <= 12; m++) {
    html += `<option value="${m}"${selected === m ? ' selected' : ''}>${escapeHtml(months[m] || String(m))}</option>`;
  }
  return html;
}

function dayOptions(selected: number | null): string {
  let html = '';
  for (let d = 1; d <= 31; d++) {
    html += `<option value="${d}"${selected === d ? ' selected' : ''}>${d}</option>`;
  }
  return html;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
