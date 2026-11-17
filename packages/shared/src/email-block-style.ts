/** Blok düzeyinde tipografi ve düzen — e-posta builder */

export type EmailFontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
export type EmailFontWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type EmailFontFamily = 'sans' | 'serif';
export type EmailTextAlign = 'left' | 'center' | 'right';
export type EmailLineHeight = 'tight' | 'normal' | 'relaxed';
export type EmailSpacing = 0 | 4 | 8 | 12 | 16 | 24 | 32;
export type EmailBorderRadius = 0 | 4 | 8 | 12 | 24;
export type EmailImageWidth = 40 | 60 | 80 | 100;

export type EmailBlockStyle = {
  color?: string;
  backgroundColor?: string;
  fontSize?: EmailFontSize;
  fontWeight?: EmailFontWeight;
  fontFamily?: EmailFontFamily;
  textAlign?: EmailTextAlign;
  lineHeight?: EmailLineHeight;
  paddingTop?: EmailSpacing;
  paddingBottom?: EmailSpacing;
  paddingX?: EmailSpacing;
  borderRadius?: EmailBorderRadius;
  letterSpacing?: 'normal' | 'wide';
  /** Görsel genişliği (%) */
  widthPercent?: EmailImageWidth;
  /** Buton tam genişlik */
  fullWidth?: boolean;
  /** Ayırıcı */
  dividerColor?: string;
  dividerThickness?: 1 | 2 | 3;
  /** Buton metin rengi */
  buttonTextColor?: string;
};

export const EMAIL_FONT_SIZE_PX: Record<EmailFontSize, number> = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

export const EMAIL_FONT_WEIGHT_CSS: Record<EmailFontWeight, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const EMAIL_LINE_HEIGHT_CSS: Record<EmailLineHeight, number> = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.65,
};

export const EMAIL_FONT_FAMILY_CSS: Record<EmailFontFamily, string> = {
  sans: 'Helvetica,Arial,sans-serif',
  serif: 'Georgia,Times New Roman,serif',
};

export type BlockStyleDefaults = {
  color?: string;
  backgroundColor?: string;
  fontSize?: EmailFontSize;
  fontWeight?: EmailFontWeight;
  textAlign?: EmailTextAlign;
  lineHeight?: EmailLineHeight;
};

export function getBlockStyle(
  block: { style?: EmailBlockStyle },
): EmailBlockStyle {
  return block.style ?? {};
}

export function patchBlockStyle(
  block: { style?: EmailBlockStyle },
  patch: Partial<EmailBlockStyle>,
): EmailBlockStyle {
  return { ...getBlockStyle(block), ...patch };
}

export function resolveFontSizePx(
  style: EmailBlockStyle,
  fallback: EmailFontSize,
): number {
  return EMAIL_FONT_SIZE_PX[style.fontSize ?? fallback];
}

export function resolvePadding(style: EmailBlockStyle): {
  top: number;
  bottom: number;
  x: number;
} {
  return {
    top: style.paddingTop ?? 0,
    bottom: style.paddingBottom ?? 0,
    x: style.paddingX ?? 0,
  };
}

/** E-posta HTML inline CSS */
export function blockStyleToInlineCss(
  style: EmailBlockStyle,
  defaults: BlockStyleDefaults,
): string {
  const parts: string[] = [];
  const fontSize = resolveFontSizePx(style, defaults.fontSize ?? 'md');
  const color = style.color ?? defaults.color;
  const bg = style.backgroundColor ?? defaults.backgroundColor;
  const weight = EMAIL_FONT_WEIGHT_CSS[style.fontWeight ?? defaults.fontWeight ?? 'normal'];
  const family = EMAIL_FONT_FAMILY_CSS[style.fontFamily ?? 'sans'];
  const align = style.textAlign ?? defaults.textAlign;
  const lh = EMAIL_LINE_HEIGHT_CSS[style.lineHeight ?? defaults.lineHeight ?? 'normal'];
  const pad = resolvePadding(style);

  parts.push(`font-family:${family}`);
  parts.push(`font-size:${fontSize}px`);
  parts.push(`font-weight:${weight}`);
  parts.push(`line-height:${lh}`);
  if (color) parts.push(`color:${color}`);
  if (bg) parts.push(`background-color:${bg}`);
  if (align) parts.push(`text-align:${align}`);
  if (pad.top) parts.push(`padding-top:${pad.top}px`);
  if (pad.bottom) parts.push(`padding-bottom:${pad.bottom}px`);
  if (style.letterSpacing === 'wide') parts.push('letter-spacing:0.06em');
  if (style.borderRadius != null) parts.push(`border-radius:${style.borderRadius}px`);

  return parts.join(';');
}

/** React canvas için CSSProperties benzeri obje */
export function blockStyleToReactCss(
  style: EmailBlockStyle,
  defaults: BlockStyleDefaults,
): Record<string, string | number> {
  const fontSize = resolveFontSizePx(style, defaults.fontSize ?? 'md');
  const pad = resolvePadding(style);
  const out: Record<string, string | number> = {
    fontFamily: EMAIL_FONT_FAMILY_CSS[style.fontFamily ?? 'sans'],
    fontSize,
    fontWeight: EMAIL_FONT_WEIGHT_CSS[style.fontWeight ?? defaults.fontWeight ?? 'normal'],
    lineHeight: EMAIL_LINE_HEIGHT_CSS[style.lineHeight ?? defaults.lineHeight ?? 'normal'],
  };
  const color = style.color ?? defaults.color;
  const bg = style.backgroundColor ?? defaults.backgroundColor;
  if (color) out.color = color;
  if (bg) out.backgroundColor = bg;
  if (style.textAlign ?? defaults.textAlign) {
    out.textAlign = style.textAlign ?? defaults.textAlign!;
  }
  if (pad.top) out.paddingTop = pad.top;
  if (pad.bottom) out.paddingBottom = pad.bottom;
  if (pad.x) {
    out.paddingLeft = pad.x;
    out.paddingRight = pad.x;
  }
  if (style.letterSpacing === 'wide') out.letterSpacing = '0.06em';
  if (style.borderRadius != null) out.borderRadius = style.borderRadius;
  return out;
}

export const FONT_SIZE_OPTIONS: { value: EmailFontSize; label: string }[] = [
  { value: 'xs', label: '12 px — Çok küçük' },
  { value: 'sm', label: '13 px — Küçük' },
  { value: 'md', label: '15 px — Normal' },
  { value: 'lg', label: '17 px — Orta' },
  { value: 'xl', label: '20 px — Büyük' },
  { value: '2xl', label: '24 px — Başlık' },
  { value: '3xl', label: '30 px — Ana başlık' },
];

export const FONT_WEIGHT_OPTIONS: { value: EmailFontWeight; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Orta' },
  { value: 'semibold', label: 'Yarı kalın' },
  { value: 'bold', label: 'Kalın' },
];

export const SPACING_OPTIONS: { value: EmailSpacing; label: string }[] = [
  { value: 0, label: 'Yok' },
  { value: 4, label: '4 px' },
  { value: 8, label: '8 px' },
  { value: 12, label: '12 px' },
  { value: 16, label: '16 px' },
  { value: 24, label: '24 px' },
  { value: 32, label: '32 px' },
];

export function defaultsForBlockType(
  type: string,
  theme: {
    primaryColor: string;
    textColor: string;
    headingColor: string;
  },
): BlockStyleDefaults {
  switch (type) {
    case 'heading':
      return {
        color: theme.headingColor,
        fontSize: '2xl',
        fontWeight: 'bold',
        lineHeight: 'tight',
        textAlign: 'left',
      };
    case 'paragraph':
      return {
        color: theme.textColor,
        fontSize: 'md',
        fontWeight: 'normal',
        lineHeight: 'relaxed',
        textAlign: 'left',
      };
    case 'button':
      return {
        fontSize: 'sm',
        fontWeight: 'semibold',
        textAlign: 'center',
      };
    case 'highlight':
      return { fontSize: 'sm', lineHeight: 'normal', textAlign: 'left' };
    case 'list':
      return {
        color: theme.textColor,
        fontSize: 'md',
        lineHeight: 'normal',
        textAlign: 'left',
      };
    case 'columns':
      return {
        color: theme.textColor,
        fontSize: 'sm',
        lineHeight: 'normal',
        textAlign: 'left',
      };
    case 'coupon':
      return { textAlign: 'center' };
    case 'social':
      return { fontSize: 'sm', textAlign: 'center' };
    case 'footer':
      return {
        color: '#787774',
        fontSize: 'xs',
        lineHeight: 'normal',
        textAlign: 'center',
      };
    default:
      return {};
  }
}
