export type QuickPalette = {
  name: string;
  dark?: boolean;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
};

/** Hazır paletler: açık ve koyu; metin/zemin kontrastı okunur seviyede tutuldu */
export const QUICK_PALETTES: QuickPalette[] = [
  { name: "Krem", backgroundColor: "#f4efe6", surfaceColor: "#ffffff", textColor: "#1a1916", mutedColor: "#6f6a62", accentColor: "#2f5d50" },
  { name: "Latte", backgroundColor: "#f7f1ea", surfaceColor: "#fffdf9", textColor: "#2b1d14", mutedColor: "#7a5f4c", accentColor: "#b4532a" },
  { name: "Kağıt", backgroundColor: "#fafaf7", surfaceColor: "#ffffff", textColor: "#18181b", mutedColor: "#6b6b70", accentColor: "#18181b" },
  { name: "Okyanus", backgroundColor: "#eef6f8", surfaceColor: "#ffffff", textColor: "#0f2a33", mutedColor: "#52707b", accentColor: "#0f6e8c" },
  { name: "Zeytin", backgroundColor: "#f2f3ec", surfaceColor: "#ffffff", textColor: "#23261a", mutedColor: "#646a4f", accentColor: "#5f6e25" },
  { name: "Gül", backgroundColor: "#fdf3f4", surfaceColor: "#ffffff", textColor: "#3a1d24", mutedColor: "#8e5f69", accentColor: "#b5476a" },
  { name: "Nane", backgroundColor: "#eef7f2", surfaceColor: "#ffffff", textColor: "#12291f", mutedColor: "#557265", accentColor: "#1f8a5b" },
  { name: "Lavanta", backgroundColor: "#f5f3fb", surfaceColor: "#ffffff", textColor: "#221d3a", mutedColor: "#6d6688", accentColor: "#6d4bc4" },
  { name: "Terrakota", backgroundColor: "#f8efe8", surfaceColor: "#fffaf6", textColor: "#2d1a12", mutedColor: "#80604f", accentColor: "#c2552d" },
  { name: "Gökyüzü", backgroundColor: "#f0f5ff", surfaceColor: "#ffffff", textColor: "#0f1c3a", mutedColor: "#5a6788", accentColor: "#2563eb" },
  { name: "Şeftali", backgroundColor: "#fff4ee", surfaceColor: "#ffffff", textColor: "#33201a", mutedColor: "#8a6a5e", accentColor: "#d4532c" },
  { name: "Limon", backgroundColor: "#fbf8e8", surfaceColor: "#ffffff", textColor: "#2a2610", mutedColor: "#6f6a45", accentColor: "#a16207" },
  { name: "Gece", dark: true, backgroundColor: "#1c1714", surfaceColor: "#2a2320", textColor: "#f5f0ea", mutedColor: "#a89b90", accentColor: "#d8a7b1" },
  { name: "Kömür", dark: true, backgroundColor: "#121214", surfaceColor: "#1d1d21", textColor: "#f4f4f5", mutedColor: "#a1a1aa", accentColor: "#f59e0b" },
  { name: "Orman", dark: true, backgroundColor: "#0f1a15", surfaceColor: "#182821", textColor: "#eef4ef", mutedColor: "#94aa9c", accentColor: "#7fc8a0" },
  { name: "Lacivert", dark: true, backgroundColor: "#0e1526", surfaceColor: "#17213a", textColor: "#eef2fb", mutedColor: "#98a3bd", accentColor: "#7aa2ff" },
  { name: "Bordo", dark: true, backgroundColor: "#1f0e12", surfaceColor: "#2c1519", textColor: "#f7ecee", mutedColor: "#b8979e", accentColor: "#e0a458" },
  { name: "Bistro", dark: true, backgroundColor: "#1a1612", surfaceColor: "#26201a", textColor: "#f3ead9", mutedColor: "#b3a48a", accentColor: "#c8a46a" },
];
