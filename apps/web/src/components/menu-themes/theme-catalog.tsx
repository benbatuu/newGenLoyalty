"use client";

import { MenuThemeCanvas } from "./menu-theme-canvas";
import type { MenuThemeCanvasProps } from "./menu-theme-types";

export function ThemeCatalog(props: MenuThemeCanvasProps) {
  return <MenuThemeCanvas {...props} />;
}
