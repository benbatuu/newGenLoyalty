/** Blok tabanlı e-posta belgesi — admin builder ve API gönderimi */

import {
  blockStyleToInlineCss,
  defaultsForBlockType,
  getBlockStyle,
  resolveFontSizePx,
  resolvePadding,
  type EmailBlockStyle,
} from './email-block-style';

export type { EmailBlockStyle } from './email-block-style';
export {
  FONT_SIZE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  SPACING_OPTIONS,
  blockStyleToReactCss,
  defaultsForBlockType,
  getBlockStyle,
  patchBlockStyle,
} from './email-block-style';

type Styled = { style?: EmailBlockStyle };

export type EmailTheme = {
  logoUrl?: string;
  primaryColor?: string;
  backgroundColor?: string;
  cardBackground?: string;
  textColor?: string;
  headingColor?: string;
};

export type EmailBlock =
  | ({ id: string; type: 'heading'; text: string; level: 1 | 2 } & Styled)
  | ({ id: string; type: 'paragraph'; text: string } & Styled)
  | ({ id: string; type: 'button'; label: string; url: string } & Styled)
  | ({
      id: string;
      type: 'image';
      url: string;
      alt: string;
      linkUrl?: string;
      align?: 'left' | 'center' | 'right';
    } & Styled)
  | ({
      id: string;
      type: 'highlight';
      text: string;
      variant?: 'neutral' | 'brand' | 'success';
    } & Styled)
  | ({ id: string; type: 'list'; items: string[] } & Styled)
  | ({ id: string; type: 'columns'; left: string; right: string } & Styled)
  | ({
      id: string;
      type: 'social';
      links: { label: string; url: string }[];
    } & Styled)
  | ({ id: string; type: 'coupon'; code: string; hint: string } & Styled)
  | ({ id: string; type: 'footer'; text: string } & Styled)
  | ({ id: string; type: 'divider' } & Styled)
  | ({ id: string; type: 'spacer'; size: 'sm' | 'md' | 'lg' } & Styled)
  | ({ id: string; type: 'quote'; text: string; author: string } & Styled)
  | ({
      id: string;
      type: 'product';
      imageUrl: string;
      title: string;
      description: string;
      price: string;
      buttonLabel: string;
      url: string;
    } & Styled)
  | ({
      id: string;
      type: 'video';
      thumbnailUrl: string;
      videoUrl: string;
      caption: string;
    } & Styled)
  /** Yapay zekadan veya dışarıdan alınan HTML parçası (sanitize edilerek gönderilir) */
  | ({ id: string; type: 'html'; html: string } & Styled);

export type EmailDocument = {
  version: 1;
  theme?: EmailTheme;
  blocks: EmailBlock[];
};

export const DEFAULT_EMAIL_THEME: Required<
  Pick<
    EmailTheme,
    | 'primaryColor'
    | 'backgroundColor'
    | 'cardBackground'
    | 'textColor'
    | 'headingColor'
  >
> = {
  primaryColor: '#111111',
  backgroundColor: '#f7f6f3',
  cardBackground: '#ffffff',
  textColor: '#333333',
  headingColor: '#111111',
};

export function resolveEmailTheme(theme?: EmailTheme): Required<
  Pick<
    EmailTheme,
    | 'primaryColor'
    | 'backgroundColor'
    | 'cardBackground'
    | 'textColor'
    | 'headingColor'
  >
> & { logoUrl?: string } {
  return {
    primaryColor: theme?.primaryColor ?? DEFAULT_EMAIL_THEME.primaryColor,
    backgroundColor: theme?.backgroundColor ?? DEFAULT_EMAIL_THEME.backgroundColor,
    cardBackground: theme?.cardBackground ?? DEFAULT_EMAIL_THEME.cardBackground,
    textColor: theme?.textColor ?? DEFAULT_EMAIL_THEME.textColor,
    headingColor: theme?.headingColor ?? DEFAULT_EMAIL_THEME.headingColor,
    logoUrl: theme?.logoUrl,
  };
}

export function createEmptyEmailDocument(
  theme?: Partial<EmailTheme>,
): EmailDocument {
  return {
    version: 1,
    theme: theme ? { ...DEFAULT_EMAIL_THEME, ...theme } : { ...DEFAULT_EMAIL_THEME },
    blocks: [
      {
        id: cryptoRandomId(),
        type: 'heading',
        text: 'Merhaba!',
        level: 1,
      },
      {
        id: cryptoRandomId(),
        type: 'paragraph',
        text: 'Müşterilerinize duyurmak istediğiniz mesajı buraya yazın.',
      },
    ],
  };
}

export function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `blk_${Math.random().toString(36).slice(2, 11)}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/** Dışarıdan gelen HTML'den tehlikeli öğeleri ayıklar (script, iframe, on* olayları, javascript: linkleri). */
export function sanitizeEmailHtml(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|base|form)[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|link|meta|base|form)[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"');
}

function spacerPx(size: 'sm' | 'md' | 'lg'): number {
  if (size === 'sm') return 12;
  if (size === 'lg') return 32;
  return 20;
}

function highlightStyles(
  variant: 'neutral' | 'brand' | 'success',
  primaryColor: string,
): { bg: string; color: string; border: string } {
  if (variant === 'brand') {
    return { bg: `${primaryColor}14`, color: primaryColor, border: `${primaryColor}33` };
  }
  if (variant === 'success') {
    return { bg: '#EDF3EC', color: '#346538', border: '#34653833' };
  }
  return { bg: '#F7F6F3', color: '#333333', border: '#EAEAEA' };
}

function renderImageBlock(
  block: Extract<EmailBlock, { type: 'image' }>,
  theme: ReturnType<typeof resolveEmailTheme>,
): string {
  if (!block.url.trim()) return '';
  const st = getBlockStyle(block);
  const align = st.textAlign ?? block.align ?? 'center';
  const width = st.widthPercent ?? 100;
  const radius = st.borderRadius ?? 6;
  const pad = resolvePadding(st);
  const img = `<img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt || 'Görsel')}" style="display:block;width:${width}%;max-width:${Math.round(504 * (width / 100))}px;height:auto;border:0;border-radius:${radius}px;" />`;
  const inner = block.linkUrl?.trim()
    ? `<a href="${escapeHtml(normalizeUrl(block.linkUrl))}" style="text-decoration:none;">${img}</a>`
    : img;
  return `<tr><td align="${align}" style="padding:${pad.top}px 0 ${pad.bottom}px;">${inner}</td></tr>`;
}

function cellPad(st: EmailBlockStyle): string {
  const p = resolvePadding(st);
  return `padding:${p.top}px 0 ${p.bottom}px;`;
}

/** E-posta istemcileri için basit tablo tabanlı HTML */
export function renderEmailHtml(
  doc: EmailDocument,
  opts?: { preview?: boolean },
): string {
  const theme = resolveEmailTheme(doc.theme);
  const outerBg = opts?.preview ? theme.backgroundColor : theme.backgroundColor;

  const logoRow = theme.logoUrl
    ? `<tr><td align="center" style="padding:0 0 20px;"><img src="${escapeHtml(theme.logoUrl)}" alt="Logo" height="48" style="display:block;height:48px;width:auto;max-width:200px;border:0;" /></td></tr>`
    : '';

  const inner = doc.blocks
    .map((block) => {
      switch (block.type) {
        case 'heading': {
          const st = getBlockStyle(block);
          const levelDefault: '2xl' | 'xl' = block.level === 1 ? '2xl' : 'xl';
          const css = blockStyleToInlineCss(st, {
            ...defaultsForBlockType('heading', theme),
            fontSize: levelDefault,
          });
          return `<tr><td style="${cellPad(st)}${css}">${escapeHtml(block.text)}</td></tr>`;
        }
        case 'paragraph': {
          const st = getBlockStyle(block);
          const css = blockStyleToInlineCss(st, defaultsForBlockType('paragraph', theme));
          const lines = escapeHtml(block.text).replace(/\n/g, '<br>');
          return `<tr><td style="${cellPad(st)}${css}">${lines}</td></tr>`;
        }
        case 'button': {
          const st = getBlockStyle(block);
          const bg = st.backgroundColor ?? theme.primaryColor;
          const fg = st.buttonTextColor ?? st.color ?? '#ffffff';
          const fs = resolveFontSizePx(st, 'sm');
          const fw = st.fontWeight === 'bold' ? 700 : st.fontWeight === 'semibold' ? 600 : 600;
          const radius = st.borderRadius ?? 6;
          const pad = resolvePadding(st);
          const px = st.paddingX ?? 24;
          const py = st.paddingTop || st.paddingBottom ? Math.max(st.paddingTop ?? 12, st.paddingBottom ?? 12) : 12;
          const width = st.fullWidth ? 'display:block;width:100%;text-align:center;box-sizing:border-box;' : 'display:inline-block;';
          const align = st.textAlign ?? 'left';
          return `<tr><td align="${align}" style="padding:${pad.top}px 0 ${pad.bottom}px;"><a href="${escapeHtml(normalizeUrl(block.url))}" style="${width}padding:${py}px ${px}px;background:${bg};color:${fg};text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:${fs}px;font-weight:${fw};border-radius:${radius}px;">${escapeHtml(block.label)}</a></td></tr>`;
        }
        case 'image':
          return renderImageBlock(block, theme);
        case 'highlight': {
          const st = getBlockStyle(block);
          const v = block.variant ?? 'neutral';
          const hs = highlightStyles(v, theme.primaryColor);
          const bg = st.backgroundColor ?? hs.bg;
          const color = st.color ?? hs.color;
          const css = blockStyleToInlineCss(st, defaultsForBlockType('highlight', theme));
          const lines = escapeHtml(block.text).replace(/\n/g, '<br>');
          const pad = resolvePadding(st);
          const innerPad = pad.x || 18;
          return `<tr><td style="${cellPad(st)}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};border:1px solid ${hs.border};border-radius:${st.borderRadius ?? 8}px;"><tr><td style="padding:${Math.max(pad.top, 16)}px ${innerPad}px ${Math.max(pad.bottom, 16)}px;${css}color:${color};">${lines}</td></tr></table></td></tr>`;
        }
        case 'list': {
          const st = getBlockStyle(block);
          const css = blockStyleToInlineCss(st, defaultsForBlockType('list', theme));
          const fs = resolveFontSizePx(st, 'md');
          const color = st.color ?? theme.textColor;
          const items = block.items
            .filter((i) => i.trim())
            .map(
              (i) =>
                `<li style="margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:${fs}px;line-height:1.5;color:${color};">${escapeHtml(i)}</li>`,
            )
            .join('');
          return `<tr><td style="${cellPad(st)}${css}"><ul style="margin:0;padding-left:20px;text-align:${st.textAlign ?? 'left'};">${items}</ul></td></tr>`;
        }
        case 'columns': {
          const st = getBlockStyle(block);
          const css = blockStyleToInlineCss(st, defaultsForBlockType('columns', theme));
          return `<tr><td style="${cellPad(st)}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
<td width="48%" valign="top" style="padding-right:8px;${css}">${escapeHtml(block.left).replace(/\n/g, '<br>')}</td>
<td width="48%" valign="top" style="padding-left:8px;${css}">${escapeHtml(block.right).replace(/\n/g, '<br>')}</td>
</tr></table></td></tr>`;
        }
        case 'social': {
          const st = getBlockStyle(block);
          const fs = resolveFontSizePx(st, 'sm');
          const color = st.color ?? theme.primaryColor;
          const bg = st.backgroundColor;
          const radius = st.borderRadius ?? 6;
          const links = block.links
            .filter((l) => l.label.trim() && l.url.trim())
            .map(
              (l) =>
                `<a href="${escapeHtml(normalizeUrl(l.url))}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;${bg ? `background:${bg};` : 'border:1px solid #eaeaea;'}border-radius:${radius}px;font-family:Helvetica,Arial,sans-serif;font-size:${fs}px;color:${color};text-decoration:none;">${escapeHtml(l.label)}</a>`,
            )
            .join('');
          const align = st.textAlign ?? 'center';
          return `<tr><td align="${align}" style="${cellPad(st)}">${links}</td></tr>`;
        }
        case 'coupon': {
          const st = getBlockStyle(block);
          const border = st.color ?? theme.primaryColor;
          const hintColor = st.color ? st.color : theme.textColor;
          const codeColor = st.backgroundColor ? theme.primaryColor : theme.primaryColor;
          const fsHint = resolveFontSizePx(st, 'sm');
          const fsCode = resolveFontSizePx({ ...st, fontSize: st.fontSize ?? '2xl' }, '2xl');
          const pad = resolvePadding(st);
          return `<tr><td style="${cellPad(st)}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:2px dashed ${border};border-radius:${st.borderRadius ?? 8}px;${st.backgroundColor ? `background:${st.backgroundColor};` : ''}"><tr><td align="center" style="padding:${Math.max(pad.top, 20)}px ${st.paddingX ?? 20}px ${Math.max(pad.bottom, 20)}px;font-family:Helvetica,Arial,sans-serif;"><p style="margin:0 0 8px;font-size:${fsHint}px;color:${hintColor};">${escapeHtml(block.hint)}</p><p style="margin:0;font-size:${fsCode}px;font-weight:700;letter-spacing:${st.letterSpacing === 'wide' ? '0.08em' : '0.04em'};color:${codeColor};">${escapeHtml(block.code)}</p></td></tr></table></td></tr>`;
        }
        case 'footer': {
          const st = getBlockStyle(block);
          const css = blockStyleToInlineCss(st, defaultsForBlockType('footer', theme));
          const align = st.textAlign ?? 'center';
          return `<tr><td style="${cellPad(st)}${css}text-align:${align};">${escapeHtml(block.text).replace(/\n/g, '<br>')}</td></tr>`;
        }
        case 'divider': {
          const st = getBlockStyle(block);
          const color = st.dividerColor ?? '#eaeaea';
          const thick = st.dividerThickness ?? 1;
          return `<tr><td style="${cellPad(st)}"><hr style="border:none;border-top:${thick}px solid ${color};margin:0;" /></td></tr>`;
        }
        case 'spacer':
          return `<tr><td style="height:${spacerPx(block.size)}px;line-height:${spacerPx(block.size)}px;font-size:0;">&nbsp;</td></tr>`;
        case 'quote': {
          const st = getBlockStyle(block);
          const accent = st.color ?? theme.primaryColor;
          const text = escapeHtml(block.text).replace(/\n/g, '<br>');
          const author = block.author.trim()
            ? `<p style="margin:10px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${theme.textColor};">— ${escapeHtml(block.author)}</p>`
            : '';
          return `<tr><td style="${cellPad(st)}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="border-left:4px solid ${accent};padding:8px 0 8px 16px;font-family:Helvetica,Arial,sans-serif;font-size:17px;font-style:italic;line-height:1.6;color:${theme.textColor};">${text}${author}</td></tr></table></td></tr>`;
        }
        case 'product': {
          const st = getBlockStyle(block);
          const btnBg = st.backgroundColor ?? theme.primaryColor;
          const img = block.imageUrl.trim()
            ? `<img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.title)}" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:8px;" />`
            : '';
          const price = block.price.trim()
            ? `<p style="margin:6px 0 0;font-size:18px;font-weight:700;color:${theme.headingColor};">${escapeHtml(block.price)}</p>`
            : '';
          const desc = block.description.trim()
            ? `<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:${theme.textColor};">${escapeHtml(block.description)}</p>`
            : '';
          const cta = `<p style="margin:14px 0 0;"><a href="${escapeHtml(normalizeUrl(block.url))}" style="display:inline-block;padding:10px 20px;background:${btnBg};color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;border-radius:6px;">${escapeHtml(block.buttonLabel || 'İncele')}</a></p>`;
          return `<tr><td style="${cellPad(st)}">${img}<p style="margin:12px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;color:${theme.headingColor};">${escapeHtml(block.title)}</p>${desc}${price}${cta}</td></tr>`;
        }
        case 'video': {
          const st = getBlockStyle(block);
          const link = normalizeUrl(block.videoUrl);
          const thumb = block.thumbnailUrl.trim()
            ? `<img src="${escapeHtml(block.thumbnailUrl)}" alt="${escapeHtml(block.caption || 'Video')}" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:8px;" />`
            : `<div style="padding:60px 0;background:#111;border-radius:8px;text-align:center;color:#fff;font-family:Helvetica,Arial,sans-serif;font-size:16px;">▶ Videoyu izle</div>`;
          const cap = block.caption.trim()
            ? `<p style="margin:8px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${theme.textColor};">${escapeHtml(block.caption)}</p>`
            : '';
          return `<tr><td style="${cellPad(st)}"><a href="${escapeHtml(link)}" style="text-decoration:none;">${thumb}</a>${cap}</td></tr>`;
        }
        case 'html': {
          const st = getBlockStyle(block);
          return `<tr><td style="${cellPad(st)}">${sanitizeEmailHtml(block.html)}</td></tr>`;
        }
        default:
          return '';
      }
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${outerBg};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${outerBg};">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${theme.cardBackground};border:1px solid #eaeaea;border-radius:8px;">
<tr><td style="padding:32px 28px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
${logoRow}
${inner}
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function isEmailDocument(value: unknown): value is EmailDocument {
  if (!value || typeof value !== 'object') return false;
  const v = value as EmailDocument;
  return v.version === 1 && Array.isArray(v.blocks);
}

/** Eski markdown şablonlarından geçiş */
export function emailDocumentFromMarkdown(bodyMd: string): EmailDocument {
  const paragraphs = bodyMd
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) {
    return createEmptyEmailDocument();
  }
  return {
    version: 1,
    theme: { ...DEFAULT_EMAIL_THEME },
    blocks: paragraphs.map((text) => ({
      id: cryptoRandomId(),
      type: 'paragraph' as const,
      text,
    })),
  };
}

export function plainTextFromDocument(doc: EmailDocument): string {
  return doc.blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return block.text;
        case 'paragraph':
          return block.text;
        case 'button':
          return `${block.label}: ${block.url}`;
        case 'image':
          return block.alt || block.url;
        case 'highlight':
          return block.text;
        case 'list':
          return block.items.join('\n');
        case 'columns':
          return `${block.left}\n${block.right}`;
        case 'social':
          return block.links.map((l) => `${l.label}: ${l.url}`).join('\n');
        case 'coupon':
          return `${block.hint}: ${block.code}`;
        case 'footer':
          return block.text;
        case 'divider':
          return '---';
        case 'spacer':
          return '';
        case 'quote':
          return `${block.text}\n— ${block.author}`;
        case 'product':
          return `${block.title}\n${block.description}\n${block.price}\n${block.url}`;
        case 'video':
          return `${block.caption}\n${block.videoUrl}`;
        case 'html':
          return '';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}

export type EmailBrandingInput = {
  logoUrl?: string | null;
  primaryColor?: string | null;
  businessName?: string | null;
};

/** Tenant markasını şablona uygular — metin etiketleri gönderimde doldurulur */
export function applyEmailBranding(
  doc: EmailDocument,
  branding: EmailBrandingInput,
): EmailDocument {
  return {
    ...doc,
    theme: {
      ...doc.theme,
      logoUrl: branding.logoUrl ?? doc.theme?.logoUrl,
      primaryColor:
        branding.primaryColor ?? doc.theme?.primaryColor ?? DEFAULT_EMAIL_THEME.primaryColor,
      backgroundColor: doc.theme?.backgroundColor ?? DEFAULT_EMAIL_THEME.backgroundColor,
      cardBackground: doc.theme?.cardBackground ?? DEFAULT_EMAIL_THEME.cardBackground,
      textColor: doc.theme?.textColor ?? DEFAULT_EMAIL_THEME.textColor,
      headingColor: doc.theme?.headingColor ?? DEFAULT_EMAIL_THEME.headingColor,
    },
  };
}

export function normalizeEmailDocument(doc: EmailDocument): EmailDocument {
  return {
    version: 1,
    theme: { ...DEFAULT_EMAIL_THEME, ...doc.theme },
    blocks: doc.blocks,
  };
}
