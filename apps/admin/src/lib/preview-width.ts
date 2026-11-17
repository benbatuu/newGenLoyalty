import { createContext, useContext } from "react";

/** Önizleme genişliğini (px) ayarlayan fonksiyon; QR tasarım sayfası sağlar. */
export const PreviewWidthContext = createContext<((px: number) => void) | null>(null);

/**
 * Sütun kırılımları için önizleme genişlikleri. Değerler, canvas'taki kapsayıcı
 * (@container) eşiklerini (640 / 768 / 1024 / 1280 / 1536) aşacak şekilde seçildi;
 * çerçeve iç boşlukları düşüldükten sonra da eşik geçilir.
 */
export const BREAKPOINT_PREVIEW_WIDTH: Record<string, number> = {
  base: 390,
  md: 800,
  xl: 1400,
};

export function usePreviewWidth() {
  return useContext(PreviewWidthContext);
}

/** Önizleme genişliğinin (px) değeri; menü önizlemesindeki ızgaralar sütun sayısını buna göre seçer. */
export const PreviewWidthValueContext = createContext<number | undefined>(undefined);
export function usePreviewWidthValue() {
  return useContext(PreviewWidthValueContext);
}
