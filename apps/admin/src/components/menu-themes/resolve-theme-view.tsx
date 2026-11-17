"use client";

import { ThemeCatalog } from "./theme-catalog";
import { ThemeEditorial } from "./theme-editorial";
import { ThemeShowcase } from "./theme-showcase";
import type { MenuThemeCanvasProps } from "./menu-theme-types";

export function resolveThemeView(preset: string) {
  if (preset === "catalog") return ThemeCatalog;
  if (preset === "showcase") return ThemeShowcase;
  return ThemeEditorial;
}

export function MenuThemeView(props: MenuThemeCanvasProps) {
  const View = resolveThemeView(props.menu.theme.preset);
  return <View {...props} />;
}
