/**
 * Apple Wallet PassKit — storeCard görsel boyutları (piksel).
 * @see https://developer.apple.com/documentation/walletpasses
 */

export type WalletPassImageSpec = {
  id: string;
  label: string;
  description: string;
  width1x: number;
  height1x: number;
  width2x: number;
  height2x: number;
  width3x: number;
  height3x: number;
  /** PassKit dosya adı (uzantısız) */
  passKey: string;
};

/** storeCard pass tipi için resmi slot boyutları */
export const STORE_CARD_IMAGE_SPECS: WalletPassImageSpec[] = [
  {
    id: 'strip',
    label: 'Şerit (strip)',
    description:
      'Damga alanı / üst banner. Özel şerit yüklerseniz damga ikonları bu görselin üzerine basılmaz.',
    width1x: 375,
    height1x: 123,
    width2x: 750,
    height2x: 246,
    width3x: 1125,
    height3x: 369,
    passKey: 'strip',
  },
  {
    id: 'background',
    label: 'Arka plan',
    description: 'Kartın tam arka plan görseli (renk yerine veya renk üzerine).',
    width1x: 180,
    height1x: 220,
    width2x: 360,
    height2x: 440,
    width3x: 540,
    height3x: 660,
    passKey: 'background',
  },
  {
    id: 'logo',
    label: 'Logo',
    description: 'Sol üst marka logosu. En-boy oranı korunur; yükseklik sınırına sığdırılır.',
    width1x: 160,
    height1x: 50,
    width2x: 320,
    height2x: 100,
    width3x: 480,
    height3x: 150,
    passKey: 'logo',
  },
  {
    id: 'icon',
    label: 'Bildirim ikonu',
    description: 'Kilit ekranı / bildirimlerde görünen küçük ikon.',
    width1x: 29,
    height1x: 29,
    width2x: 58,
    height2x: 58,
    width3x: 87,
    height3x: 87,
    passKey: 'icon',
  },
];

export function formatPassImageSize(spec: WalletPassImageSpec): string {
  return `@1x ${spec.width1x}×${spec.height1x} · @2x ${spec.width2x}×${spec.height2x} · @3x ${spec.width3x}×${spec.height3x} px`;
}
