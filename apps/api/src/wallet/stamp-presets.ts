export type PresetStampTheme = 'COFFEE' | 'DESSERT' | 'STAR' | 'HEART' | 'DONUT';

/** Hazır damga teması (kahve, tatlı, yıldız, kalp, çörek) — cüzdan kartı ve davet sayfası ortak */
export function presetIconSvg(theme: PresetStampTheme | string, filled: boolean, color: string): string {
  const stroke = color;
  const fill = filled ? color : 'none';
  const opacity = filled ? '1' : '0.32';


    switch (theme) {
      case 'DESSERT':
        return `<g opacity="${opacity}">
          <ellipse cx="32" cy="48" rx="22" ry="8" fill="${filled ? color : 'none'}" stroke="${stroke}" stroke-width="3"/>
          <path d="M14 48 C14 28 50 28 50 48" fill="${filled ? color : 'none'}" stroke="${stroke}" stroke-width="3"/>
          <circle cx="24" cy="30" r="3" fill="${stroke}"/>
          <circle cx="32" cy="26" r="3" fill="${stroke}"/>
          <circle cx="40" cy="30" r="3" fill="${stroke}"/>
        </g>`;
      case 'STAR':
        return `<g opacity="${opacity}">
          <path d="M32 10 L38 24 L54 26 L42 36 L46 52 L32 44 L18 52 L22 36 L10 26 L26 24 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>
        </g>`;
      case 'HEART':
        return `<g opacity="${opacity}">
          <path d="M32 50 C32 50 12 36 12 24 C12 16 18 12 24 12 C28 12 31 14 32 18 C33 14 36 12 40 12 C46 12 52 16 52 24 C52 36 32 50 32 50 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
        </g>`;
      case 'DONUT':
        return `<g opacity="${opacity}">
          <circle cx="32" cy="32" r="20" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
          <circle cx="32" cy="32" r="8" fill="none" stroke="${stroke}" stroke-width="3"/>
          <circle cx="22" cy="22" r="2.5" fill="${stroke}"/>
          <circle cx="40" cy="20" r="2.5" fill="${stroke}"/>
          <circle cx="44" cy="34" r="2.5" fill="${stroke}"/>
        </g>`;
      case 'COFFEE':
      default:
        return `<g opacity="${opacity}">
          <path d="M18 22 h28 v22 c0 10 -8 16 -14 16 s-14 -6 -14 -16 z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
          <path d="M46 28 h6 c6 0 10 4 10 10 s-4 10 -10 10 h-6" fill="none" stroke="${stroke}" stroke-width="3"/>
          <path d="M26 12 c0 6 4 6 4 12" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
          <path d="M34 10 c0 6 4 6 4 12" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
        </g>`;
    }
  }
