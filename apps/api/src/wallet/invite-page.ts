export type InvitePolicy = { title: string; body: string };

export type InviteLocale = 'tr' | 'en';

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
  profileComplete: boolean;
  collect: { name: boolean; birthday: boolean };
  profile: {
    displayName: string;
    birthMonth: number | null;
    birthDay: number | null;
  };
  locale: InviteLocale;
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
  appleUnavailable: string;
  googleUnavailable: string;
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
    appleUnavailable: 'Apple Wallet şu an yapılandırılmamış.',
    googleUnavailable: 'Google Wallet şu an yapılandırılmamış.',
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
    appleUnavailable: 'Apple Wallet is not configured yet.',
    googleUnavailable: 'Google Wallet is not configured yet.',
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

  let appleBtn = '';
  let googleBtn = '';
  const appleInner = `${APPLE_LOGO_SVG}<span>${escapeHtml(appleLabel)}</span>`;
  const googleInner = `${GOOGLE_LOGO_SVG}<span>${escapeHtml(googleLabel)}</span>`;
  if (preview) {
    appleBtn = `<span class="btn apple disabled" data-wallet="apple">${appleInner}</span>`;
    googleBtn = `<span class="btn google disabled" data-wallet="google">${googleInner}</span>`;
  } else if (data.profileComplete) {
    if (showApple) {
      appleBtn = data.appleDownloadUrl
        ? `<a class="btn apple" data-wallet="apple" href="${escapeHtml(data.appleDownloadUrl)}">${appleInner}</a>`
        : data.appleAvailable
          ? ''
          : `<p class="muted" data-wallet="apple">${escapeHtml(t.appleUnavailable)}</p>`;
    }
    if (showGoogle) {
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
    ? `<form id="profile-form" class="form">
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
        ${appleBtn}
        ${googleBtn}
      </div>`
    : `<div class="actions" id="wallet-actions" hidden></div>`;

  const policiesHtml =
    data.invitePolicies.length > 0
      ? `<nav class="policies" aria-label="${escapeHtml(t.policiesLabel)}">
        ${data.invitePolicies
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
      <script type="application/json" id="policy-data">${JSON.stringify(data.invitePolicies).replace(/</g, '\\u003c')}</script>`
      : '';

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
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        err.hidden = true;
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

  return `<!doctype html>
<html lang="${data.locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.tenantName)} — ${escapeHtml(t.pageTitleSuffix)}${previewSuffix}</title>
  ${localeSyncScript}
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 0; background: ${escapeHtml(pageBg)}; color: #f4f4f4; min-height: 100vh; }
    .preview-banner { background: #f59e0b; color: #1a1a1a; text-align: center; font-size: .8rem; font-weight: 600; padding: 8px 12px; }
    .wrap { max-width: 420px; margin: 0 auto; padding: 32px 20px 48px; }
    .card {
      background: ${escapeHtml(color)};
      color: ${escapeHtml(fg)};
      border-radius: 22px;
      padding: 28px 24px;
      box-shadow: 0 16px 48px rgba(0,0,0,.28);
    }
    .logo { display: block; max-height: 48px; max-width: 160px; margin: 0 0 16px; object-fit: contain; }
    h1 { font-size: 1.45rem; margin: 0 0 8px; letter-spacing: -0.02em; line-height: 1.2; }
    .meta { opacity: .88; font-size: .95rem; line-height: 1.45; }
    .stamp { font-size: 2.1rem; font-weight: 700; margin: 18px 0 6px; letter-spacing: -0.03em; }
    .actions, .form { display: grid; gap: 12px; margin-top: 24px; }
    .cta-hint { margin: 0 0 4px; font-size: .9rem; opacity: .75; line-height: 1.4; }
    .btn { display: flex; align-items: center; justify-content: center; gap: 10px; text-align: center; text-decoration: none; padding: 14px 16px; border-radius: 12px; font-weight: 600; border: none; cursor: pointer; font-size: 1rem; box-sizing: border-box; }
    .btn-logo { width: 24px; height: 24px; flex-shrink: 0; display: block; }
    .btn.apple { background: #000; color: #fff; border: 1px solid #333; }
    .btn.google { background: #fff; color: #1f1f1f; border: 1px solid #dadce0; }
    .btn.save { background: #fff; color: #111; display: block; }
    .btn.disabled { opacity: .85; cursor: default; pointer-events: none; }
    .muted { opacity: .7; font-size: .9rem; }
    .note { margin-top: 28px; font-size: .78rem; opacity: .55; line-height: 1.45; white-space: pre-wrap; }
    .form-title { font-weight: 600; margin: 0; }
    label { display: grid; gap: 6px; font-size: .85rem; opacity: .9; }
    input, select { padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.28); color: #fff; font-size: 1rem; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .hint { font-size: .75rem; opacity: .6; margin: 0; }
    .error { color: #ffb4a8; font-size: .85rem; margin: 0; }
    .policies { margin-top: 18px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 4px; }
    .policy-link { background: none; border: none; padding: 0; color: rgba(255,255,255,.65); font-size: .78rem; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; font-family: inherit; }
    .policy-link:hover { color: #fff; }
    .policy-sep { color: rgba(255,255,255,.35); font-size: .78rem; user-select: none; }
    .policy-modal { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; padding: 16px; }
    .policy-modal[hidden] { display: none !important; }
    .policy-modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.55); }
    .policy-modal-sheet { position: relative; width: 100%; max-width: 420px; max-height: min(72vh, 560px); overflow: auto; background: #1a1f1c; color: #f4f4f4; border-radius: 18px; border: 1px solid rgba(255,255,255,.12); box-shadow: 0 20px 50px rgba(0,0,0,.45); padding: 18px 18px 22px; }
    .policy-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .policy-modal-head h2 { margin: 0; font-size: 1.05rem; line-height: 1.3; }
    .policy-modal-x { background: rgba(255,255,255,.08); border: none; color: #fff; width: 32px; height: 32px; border-radius: 999px; font-size: 1.25rem; line-height: 1; cursor: pointer; flex-shrink: 0; }
    .policy-modal-body { font-size: .88rem; line-height: 1.55; opacity: .88; white-space: pre-wrap; }
    .lang-switch { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 12px; }
    .lang-switch a { color: rgba(255,255,255,.55); font-size: .75rem; text-decoration: none; font-weight: 600; }
    .lang-switch a.active { color: #fff; }
    [data-wallet][hidden] { display: none !important; }
    @media (min-width: 480px) {
      .policy-modal { align-items: center; }
    }
  </style>
</head>
<body>
  ${previewBanner}
  <div class="wrap">
    <div class="lang-switch">
      <a href="?lang=tr" class="${data.locale === 'tr' ? 'active' : ''}">TR</a>
      <a href="?lang=en" class="${data.locale === 'en' ? 'active' : ''}">EN</a>
    </div>
    <div class="card">
      ${logoBlock}
      <h1>${escapeHtml(headline)}</h1>
      <div class="meta">${escapeHtml(subtitle)}</div>
      <div class="stamp">${data.stampCount} / ${data.stampsRequired}</div>
      <div class="meta">${escapeHtml(statusLine)}</div>
    </div>
    ${formBlock}
    ${actionsBlock}
    <p class="note">${escapeHtml(legalText).replace(/\n/g, '<br/>')}</p>
    ${policiesHtml}
  </div>
  ${platformRefineScript}
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
