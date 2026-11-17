export type EnrollPageData = {
  slug: string;
  tenantName: string;
  logoUrl: string | null;
  primaryColor: string;
  inviteHeadline: string | null;
  inviteSubtitle: string | null;
  inviteLegalText: string | null;
  invitePolicies: unknown;
  stampsRequired: number;
  rewardLabel: string;
  locale: 'tr' | 'en';
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const COPY = {
  tr: {
    title: 'Sadakat kartına katıl',
    phone: 'Telefon numaranız',
    phoneHint: '05XX XXX XX XX',
    consent: 'KVKK kapsamında kişisel verilerimin işlenmesini kabul ediyorum.',
    submit: 'Devam et',
    loading: 'Kaydediliyor…',
    welcome: 'Hoş geldiniz! Cüzdan kartınızı ekleyin.',
    existing: 'Zaten kayıtlısınız. Cüzdan kartınızı ekleyin.',
    error: 'Bir hata oluştu. Tekrar deneyin.',
  },
  en: {
    title: 'Join loyalty program',
    phone: 'Your phone number',
    phoneHint: '05XX XXX XX XX',
    consent: 'I consent to processing of my personal data under privacy policy.',
    submit: 'Continue',
    loading: 'Saving…',
    welcome: 'Welcome! Add your wallet pass.',
    existing: 'Already registered. Add your wallet pass.',
    error: 'Something went wrong. Try again.',
  },
} as const;

export function renderEnrollHtml(data: EnrollPageData): string {
  const c = COPY[data.locale];
  const bg = data.primaryColor;
  const headline = escapeHtml(data.inviteHeadline || data.tenantName);
  const subtitle = escapeHtml(
    data.inviteSubtitle ||
      `${data.stampsRequired} damga → ${data.rewardLabel}`,
  );

  return `<!DOCTYPE html>
<html lang="${data.locale}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(data.tenantName)} — ${c.title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;background:#faf9f7;color:#1a1a1a;min-height:100dvh;padding:24px 16px}
    .card{max-width:420px;margin:0 auto;background:#fff;border-radius:20px;padding:28px 24px;box-shadow:0 8px 32px rgba(0,0,0,.08)}
    .brand{font-size:13px;font-weight:600;color:${bg};text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
    h1{font-size:22px;font-weight:700;line-height:1.25;margin-bottom:6px}
    p.sub{font-size:14px;color:#555;line-height:1.5;margin-bottom:24px}
    label{display:block;font-size:12px;font-weight:600;color:#666;margin-bottom:6px}
    input[type=tel]{width:100%;padding:14px 16px;border:1px solid #ddd;border-radius:12px;font-size:16px;margin-bottom:16px}
    .check{display:flex;gap:10px;align-items:flex-start;margin-bottom:20px;font-size:13px;color:#444;line-height:1.4}
    .check input{margin-top:3px;accent-color:${bg}}
    button{width:100%;padding:14px;border:none;border-radius:12px;background:${bg};color:#fff;font-size:16px;font-weight:600;cursor:pointer}
    button:disabled{opacity:.6;cursor:not-allowed}
    .legal{margin-top:20px;font-size:11px;color:#888;line-height:1.5}
    .msg{margin-top:16px;padding:12px;border-radius:10px;font-size:14px;display:none}
    .msg.ok{background:#ecfdf5;color:#065f46;display:block}
    .msg.err{background:#fef2f2;color:#991b1b;display:block}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">${escapeHtml(data.tenantName)}</div>
    <h1>${headline}</h1>
    <p class="sub">${subtitle}</p>
    <form id="enrollForm">
      <label for="phone">${c.phone}</label>
      <input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="${c.phoneHint}" required/>
      <label class="check">
        <input type="checkbox" id="consent" name="consent" required/>
        <span>${c.consent}</span>
      </label>
      <button type="submit" id="submitBtn">${c.submit}</button>
    </form>
    <div id="msg" class="msg"></div>
    ${data.inviteLegalText ? `<p class="legal">${escapeHtml(data.inviteLegalText)}</p>` : ''}
  </div>
  <script>
    const slug = ${JSON.stringify(data.slug)};
    const copy = ${JSON.stringify(c)};
    const form = document.getElementById('enrollForm');
    const msg = document.getElementById('msg');
    const btn = document.getElementById('submitBtn');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = 'msg';
      msg.textContent = '';
      btn.disabled = true;
      btn.textContent = copy.loading;
      try {
        const phone = document.getElementById('phone').value;
        const consent = document.getElementById('consent').checked;
        const res = await fetch('/wallet/enroll/' + slug + '/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, consent }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          msg.className = 'msg err';
          msg.textContent = body.message || copy.error;
          return;
        }
        if (body.redirectPath) {
          window.location.href = body.redirectPath;
          return;
        }
        msg.className = 'msg ok';
        msg.textContent = body.isNew ? copy.welcome : copy.existing;
      } catch {
        msg.className = 'msg err';
        msg.textContent = copy.error;
      } finally {
        btn.disabled = false;
        btn.textContent = copy.submit;
      }
    });
  </script>
</body>
</html>`;
}

export function resolveEnrollLocale(
  acceptLanguage?: string,
  lang?: string,
): 'tr' | 'en' {
  if (lang === 'en') return 'en';
  if (lang === 'tr') return 'tr';
  if (acceptLanguage?.toLowerCase().startsWith('en')) return 'en';
  return 'tr';
}
